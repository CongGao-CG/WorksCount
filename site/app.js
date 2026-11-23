const numberFormat = new Intl.NumberFormat("en-US");
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC", day: "numeric", month: "short", year: "numeric",
});
const years = [2025, 2026];
const rows = document.querySelector("#rows");

function countCell(count, year, maximum) {
  const cell = document.createElement("td");
  cell.className = "numeric";
  cell.textContent = numberFormat.format(count);

  const track = document.createElement("div");
  track.className = "bar-track";
  track.setAttribute("aria-hidden", "true");
  const bar = document.createElement("span");
  bar.className = `bar year-${year}`;
  bar.style.width = `${maximum ? 100 * count / maximum : 0}%`;
  track.append(bar);
  cell.append(track);
  return cell;
}

function renderRows(journals, maximum) {
  const fragment = document.createDocumentFragment();
  for (const journal of journals) {
    const row = document.createElement("tr");
    const label = document.createElement("th");
    label.scope = "row";
    label.textContent = journal.name;
    row.append(label);
    for (const year of years) {
      row.append(countCell(journal[`articles_${year}`], year, maximum));
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
          years.every(year => Number.isSafeInteger(journal[`articles_${year}`]) &&
            journal[`articles_${year}`] >= 0))) {
      throw new Error("Invalid count data");
    }
    const maximum = Math.max(...journals.flatMap(journal => years.map(year => journal[`articles_${year}`])));
    renderRows(journals, maximum);
    const updated = document.querySelector("#updated");
    updated.dateTime = updated_at;
    updated.textContent = dateFormat.format(date) + " UTC";
    document.querySelector(".snapshot").hidden = false;
    document.querySelector(".counts").hidden = false;
    document.querySelector(".data-link").hidden = false;
    status.hidden = true;
  } catch {
    status.textContent = "Article counts are currently unavailable. Please check again after the next update.";
  }
}

loadCounts();
