/* LabFlow Sample Measurements feature. Loaded before app.js. */
function saveMeasurementBoard() { browserWrite(BROWSER_MEASUREMENTS_KEY, measurementBoard); queueCloudSave(); }
function normalizeMeasurementBoard() {
  measurementBoard.measurements = Array.isArray(measurementBoard.measurements) ? measurementBoard.measurements : [];
  measurementBoard.samples = Array.isArray(measurementBoard.samples) ? measurementBoard.samples : [];
  measurementBoard.groups = Array.isArray(measurementBoard.groups) ? measurementBoard.groups : [];
  if (!measurementBoard.groups.some(group => group.id === "ungrouped")) {
    measurementBoard.groups.unshift({ id: "ungrouped", name: "Ungrouped", collapsed: false });
  }
  const groupIds = new Set(measurementBoard.groups.map(group => group.id));
  measurementBoard.sampleGroups = measurementBoard.samples.map((_, index) =>
    groupIds.has(measurementBoard.sampleGroups?.[index]) ? measurementBoard.sampleGroups[index] : "ungrouped"
  );
  measurementBoard.groups = measurementBoard.groups.filter(group => group.id === "ungrouped" || measurementBoard.sampleGroups.includes(group.id));
  if (measurementBoardGroupFilter !== "all" && !measurementBoard.groups.some(group => group.id === measurementBoardGroupFilter)) measurementBoardGroupFilter = "all";
  measurementBoard.cells = measurementBoard.samples.map((_, r) =>
    measurementBoard.measurements.map((_, c) => {
      const value = measurementBoard.cells?.[r]?.[c];
      return value === "planned" || value === "delegated" || value === "completed" || value === "not-required" ? value : "";
    })
  );
}
function loadMeasurementBoard() { measurementBoard = browserRead(BROWSER_MEASUREMENTS_KEY, INITIAL_MEASUREMENTS); normalizeMeasurementBoard(); render(); }
function measurementGroupFilterMarkup() {
  const selected = measurementBoard.groups.find(group => group.id === measurementBoardGroupFilter);
  const label = selected ? selected.name : "All groups";
  return '<details class="measurement-group-picker" id="measurement-group-picker"><summary><span>' + escapeHtml(label) + '</span><span class="measurement-group-chevron" aria-hidden="true"></span></summary><div class="measurement-group-menu" role="menu">' +
    '<button type="button" data-measurement-group-option="all"' + (measurementBoardGroupFilter === "all" ? ' class="is-selected"' : '') + '>All groups</button>' +
    measurementBoard.groups.filter(group => measurementBoard.sampleGroups.includes(group.id)).map(group => '<button type="button" data-measurement-group-option="' + escapeHtml(group.id) + '"' + (measurementBoardGroupFilter === group.id ? ' class="is-selected"' : '') + '>' + escapeHtml(group.name) + '</button>').join("") +
    '</div></details>';
}
function measurementRow(r, editing) {
  const name = measurementBoard.samples[r];
  let html = '<tr draggable="' + editing + '" data-board-kind="row" data-board-index="' + r + '" class="' + (editing ? 'board-draggable' : '') + '"><th>';
  html += '<div class="sample-row-content"><div class="sample-edit-controls' + (editing ? '' : ' is-placeholder') + '"><input class="measurement-select" type="checkbox" data-measurement-select="' + r + '" aria-label="Select ' + escapeHtml(name) + '"><span class="drag-handle" title="Drag to reorder" aria-label="Drag to reorder" role="img">⠿</span></div>';
  html += '<input class="sample-label" data-sample-label="' + r + '" value="' + escapeHtml(name) + '" aria-label="Sample ' + (r + 1) + '"' + (editing ? '' : ' readonly') + '>';
  html += '</div></th>';
  measurementBoard.measurements.forEach((_, c) => {
    const cell = measurementBoard.cells[r][c];
    const label = cell === "completed" ? "Completed" : cell === "not-required" ? "Not required" : cell === "delegated" ? "Delegated" : cell === "planned" ? "Planned" : "Not planned";
    const mark = cell === "completed" ? "✓" : cell === "not-required" ? "×" : cell === "delegated" ? "△" : cell === "planned" ? "○" : "";
    html += '<td><button type="button" class="measurement-check status-' + (cell || "empty") + '" data-board-cell="' + r + ':' + c + '" aria-label="' + label + '">' + mark + '</button></td>';
  });
  return html + '</tr>';
}
function renderMeasurementRows(editing) {
  let html = "";
  measurementBoard.groups.forEach(group => {
    const indices = measurementBoard.samples.map((_, index) => index).filter(index => measurementBoard.sampleGroups[index] === group.id).filter(index => measurementBoardGroupFilter === "all" || measurementBoardGroupFilter === group.id);
    if (!indices.length) return;
    html += '<tr class="measurement-group-row"><th><span class="measurement-group-name">' + escapeHtml(group.name) + '</span> <span class="measurement-group-count">(' + indices.length + ' samples)</span></th><td colspan="' + measurementBoard.measurements.length + '"></td></tr>';
    indices.forEach(index => { html += measurementRow(index, editing); });
  });
  return html;
}
function measurementProgressMarkup() {
  const visibleRows = measurementBoard.samples.map((_, row) => row).filter(row =>
    measurementBoardGroupFilter === "all" || measurementBoard.sampleGroups[row] === measurementBoardGroupFilter
  );
  const visibleCells = visibleRows.flatMap(row => measurementBoard.cells[row] || []);
  const total = visibleRows.length * measurementBoard.measurements.length;
  const notRequired = visibleCells.filter(cell => cell === "not-required").length;
  const done = visibleCells.filter(cell => cell === "completed").length;
  const delegated = visibleCells.filter(cell => cell === "delegated").length;
  const planned = visibleCells.filter(cell => cell === "planned").length;
  const effectiveTotal = Math.max(0, total - notRequired);
  const rest = Math.max(0, total - notRequired - done - delegated);
  return '<div class="measurement-progress" aria-label="Measurement progress"><span>Total: <b>' + effectiveTotal + '</b></span><span>Plan: <b>' + planned + '</b></span><span>Rest: <b>' + rest + '</b></span></div>';
}
function renderMeasurements() {
  normalizeMeasurementBoard();
  const editing = measurementBoardEditing;
  return '<div class="page"><div class="page-heading"><div class="heading-copy"><h1>Sample Measurements</h1></div><div class="heading-actions"><button type="button" class="secondary-button" id="addMeasurementSample">+ Sample</button><button type="button" class="secondary-button" id="addMeasurementColumn">+ Measurement</button></div></div>' +
    '<section class="measurement-board-card"><div class="measurement-board-tools"><div class="measurement-board-leading">' + measurementGroupFilterMarkup() + measurementProgressMarkup() + '<div class="measurement-legend" aria-label="Measurement status legend"><span><b>○</b> Planned</span><span><b>△</b> Delegated</span><span><b>✓</b> Done</span><span><b>×</b> Not required</span></div>' +
    '</div><div class="measurement-board-actions">' + (editing ? '<button type="button" class="danger-icon-button" id="deleteSelectedMeasurements" aria-label="Delete selected samples" title="Delete selected samples"><svg class="trash-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 10v7M14 10v7" /></svg></button><button type="button" class="secondary-button" id="groupSelectedMeasurements">Group</button>' : '<button type="button" class="danger-icon-button group-selected-placeholder" id="deleteSelectedMeasurements" tabindex="-1" aria-hidden="true"><svg class="trash-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 10v7M14 10v7" /></svg></button><button type="button" class="secondary-button group-selected-placeholder" id="groupSelectedMeasurements" tabindex="-1" aria-hidden="true">Group</button>') + '<button type="button" class="secondary-button" id="toggleMeasurementEdit">' + (editing ? "Done" : "Edit") + '</button>' +
    '</div></div><div class="measurement-table-wrap"><table class="measurement-table measurement-board-table ' + (editing ? "is-editing" : "") + '"><colgroup><col class="measurement-sample-column">' + measurementBoard.measurements.map(() => '<col class="measurement-column">').join("") + '</colgroup><thead><tr><th>Sample</th>' +
    measurementBoard.measurements.map((name, i) => '<th draggable="' + editing + '" data-board-kind="column" data-board-index="' + i + '" class="' + (editing ? "board-draggable" : "") + '">' + '<span class="drag-handle' + (editing ? '' : ' is-placeholder') + '" aria-hidden="true">⠿</span>' + '<input class="measurement-label" data-measurement-label="' + i + '" value="' + escapeHtml(name) + '" aria-label="Measurement ' + (i + 1) + '"' + (editing ? "" : " readonly") + '></th>').join("") +
    '</tr></thead><tbody>' + renderMeasurementRows(editing) + '</tbody></table></div></section></div>';
}
