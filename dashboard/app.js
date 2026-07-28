const DATA_PATHS = {
  sources: "../sources.json",
  zeroResults: "../logs/zero-results.json",
  diagnoses: "../logs/failure-diagnosis.json",
  report: "../SOURCES_REPORT.md",
};

const state = {
  sources: [],
  filter: "all",
};

const elements = {
  summary: document.querySelector("#summary"),
  rows: document.querySelector("#sourceRows"),
  filters: document.querySelector("#filters"),
  refresh: document.querySelector("#refreshButton"),
  message: document.querySelector("#message"),
  updatedAt: document.querySelector("#updatedAt"),
};

async function fetchOptional(path, type = "json") {
  try {
    const response = await fetch(`${path}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return type === "json" ? [] : "";
    return type === "json" ? response.json() : response.text();
  } catch {
    return type === "json" ? [] : "";
  }
}

function latestBySource(records) {
  const latest = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    const current = latest.get(record.source_id);
    if (!current || new Date(record.timestamp) > new Date(current.timestamp)) {
      latest.set(record.source_id, record);
    }
  }
  return latest;
}

function parseReport(markdown) {
  const rows = new Map();
  const checked = markdown.match(/Verified on (\d{4}-\d{2}-\d{2})/)?.[1];

  for (const line of markdown.split("\n")) {
    if (!line.startsWith("|") || line.includes("---")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length !== 6 || cells[0] === "source_id") continue;
    const http = cells[5].match(/HTTP (200|[45]\d\d|unavailable)/i)?.[1] ?? "—";
    rows.set(cells[0], {
      http,
      jobs: Number.isFinite(Number(cells[3])) ? Number(cells[3]) : null,
      checked,
    });
  }
  return rows;
}

function formatDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined,
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function deriveHealth(source, zero, diagnosis, report) {
  if (zero) {
    return {
      status: "warning",
      label: "🟡 Warning",
      http: zero.http_status,
      checked: zero.timestamp,
      responseTime: zero.response_time_ms ?? null,
      jobs: zero.extracted_links,
      error: diagnosis?.detected_reason ?? "Website may have changed.",
      warning: true,
    };
  }

  if (!source.enabled) {
    return {
      status: "failed",
      label: "🔴 Failed",
      http: report?.http ?? "—",
      checked: report?.checked,
      responseTime: null,
      jobs: report?.jobs ?? 0,
      error: source._note ?? diagnosis?.detected_reason ?? "Source is disabled.",
      warning: false,
    };
  }

  return {
    status: "healthy",
    label: "🟢 Healthy",
    http: report?.http ?? "—",
    checked: report?.checked,
    responseTime: null,
    jobs: report?.jobs ?? null,
    error: null,
    warning: false,
  };
}

function renderSummary() {
  const counts = state.sources.reduce(
    (total, source) => {
      total.all += 1;
      total[source.health.status] += 1;
      return total;
    },
    { all: 0, healthy: 0, warning: 0, failed: 0 }
  );

  elements.summary.innerHTML = [
    ["Total Sources", counts.all, "total"],
    ["Healthy Sources", counts.healthy, "healthy"],
    ["Warning Sources", counts.warning, "warning"],
    ["Failed Sources", counts.failed, "failed"],
  ]
    .map(
      ([label, value, kind]) => `
        <article class="card ${kind}">
          <p class="card-label">${label}</p>
          <p class="card-value">${value}</p>
        </article>`
    )
    .join("");
}

function renderRows() {
  const visible = state.sources.filter(
    (source) => state.filter === "all" || source.health.status === state.filter
  );

  if (!visible.length) {
    elements.rows.innerHTML =
      '<tr><td class="empty" colspan="7">No sources match this filter.</td></tr>';
    return;
  }

  elements.rows.innerHTML = visible
    .map(({ source, health }) => {
      const responseTime =
        health.responseTime == null ? "Not logged" : `${health.responseTime} ms`;
      return `
        <tr>
          <td>
            <span class="source-name">${escapeHtml(source.name)}</span>
            <span class="source-id">${escapeHtml(source.id)}</span>
          </td>
          <td>
            <span class="badge ${health.status}">${health.label}</span>
            ${health.warning ? '<span class="warning-note">Website may have changed.</span>' : ""}
          </td>
          <td class="numeric">${escapeHtml(health.http)}</td>
          <td>${escapeHtml(formatDate(health.checked))}</td>
          <td class="numeric">${escapeHtml(responseTime)}</td>
          <td class="numeric">${health.jobs == null ? "Not logged" : health.jobs}</td>
          <td class="error-cell">${health.error ? escapeHtml(health.error) : '<span class="empty">None</span>'}</td>
        </tr>`;
    })
    .join("");
}

function setMessage(text = "") {
  elements.message.textContent = text;
  elements.message.classList.toggle("visible", Boolean(text));
}

async function loadDashboard() {
  setMessage("");
  const [sourceData, zeroData, diagnosisData, reportMarkdown] = await Promise.all([
    fetchOptional(DATA_PATHS.sources),
    fetchOptional(DATA_PATHS.zeroResults),
    fetchOptional(DATA_PATHS.diagnoses),
    fetchOptional(DATA_PATHS.report, "text"),
  ]);

  if (!Array.isArray(sourceData) || !sourceData.length) {
    setMessage(
      "Dashboard data could not be loaded. Serve the project root with a local web server; browsers block JSON reads when this file is opened directly."
    );
    state.sources = [];
    renderSummary();
    renderRows();
    return;
  }

  const zeroBySource = latestBySource(zeroData);
  const diagnosisBySource = latestBySource(diagnosisData);
  const reportBySource = parseReport(reportMarkdown);

  state.sources = sourceData
    .filter((source) => source.id && !source._comment)
    .map((source) => ({
      source,
      health: deriveHealth(
        source,
        zeroBySource.get(source.id),
        diagnosisBySource.get(source.id),
        reportBySource.get(source.id)
      ),
    }))
    .sort((a, b) => {
      const order = { failed: 0, warning: 1, healthy: 2 };
      return order[a.health.status] - order[b.health.status] ||
        a.source.name.localeCompare(b.source.name);
    });

  elements.updatedAt.textContent = `Dashboard refreshed ${formatDate(new Date().toISOString())}`;
  renderSummary();
  renderRows();
}

elements.filters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  state.filter = button.dataset.filter;
  document.querySelectorAll(".filter").forEach((item) => {
    item.classList.toggle("active", item === button);
  });
  renderRows();
});

elements.refresh.addEventListener("click", () => window.location.reload());

loadDashboard();
