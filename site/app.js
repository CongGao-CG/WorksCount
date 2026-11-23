const numberFormat = new Intl.NumberFormat("en-US");
const percentFormat = new Intl.NumberFormat("en-US", {
  style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1,
});
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC", day: "numeric", month: "short", year: "numeric",
});
const years = [2025, 2026];

function hasCounts(journal, field) {
  return years.every(year => {
    const count = journal[`${field}_${year}`];
    return Number.isSafeInteger(count) && count >= 0;
  });
}

function openAlexLink(href, text) {
  const link = document.createElement("a");
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = text;
  return link;
}

function renderRows(rows, journals, field) {
  const fragment = document.createDocumentFragment();
  for (const journal of journals) {
    const row = document.createElement("tr");
    const label = document.createElement("th");
    label.scope = "row";
    label.append(openAlexLink(`https://openalex.org/sources/${journal.source_id}`, journal.name));
    row.append(label);
    for (const year of years) {
      const cell = document.createElement("td");
      cell.className = "numeric";
      const count = journal[`${field}_${year}`];
      const filters = ["type:article", `primary_location.source.id:${journal.source_id}`, `publication_year:${year}`];
      if (field === "cyclone_articles") filters.push("topics.id:T11483");
      const url = new URL("https://openalex.org/works");
      url.searchParams.set("filter", filters.join(","));
      cell.append(openAlexLink(url.href, numberFormat.format(count)));
      if (year === 2026) {
        const previous = journal[`${field}_2025`];
        const ratio = previous === 0 ? "N/A" : percentFormat.format(count / previous);
        cell.append(` (${ratio})`);
      }
      row.append(cell);
    }
    fragment.append(row);
  }
  rows.replaceChildren(fragment);
}

async function loadCounts() {
  const status = document.querySelector("#status");
  try {
    const response = await fetch("./data.json");
    if (!response.ok) throw new Error("Missing count data");
    const { updated_at, journals } = await response.json();
    const date = new Date(updated_at);
    if (typeof updated_at !== "string" || Number.isNaN(date.getTime()) ||
        !Array.isArray(journals) || journals.length === 0 ||
        !journals.every(journal => journal && typeof journal.name === "string" &&
          hasCounts(journal, "articles"))) {
      throw new Error("Invalid count data");
    }
    renderRows(document.querySelector("#rows"), journals, "articles");
    if (journals.every(journal => hasCounts(journal, "cyclone_articles"))) {
      renderRows(document.querySelector("#cyclone-rows"), journals, "cyclone_articles");
      document.querySelector("#cyclone-table").hidden = false;
    } else {
      document.querySelector("#cyclone-status").hidden = false;
    }
    const updated = document.querySelector("#updated");
    updated.dateTime = updated_at;
    updated.textContent = dateFormat.format(date) + " UTC";
    document.querySelector(".snapshot").hidden = false;
    document.querySelector(".counts").hidden = false;
    status.hidden = true;
  } catch {
    status.textContent = "Article counts are currently unavailable. Please check again after the next update.";
  }
}

loadCounts();
