const DEFAULT_THRESHOLD = 1000;
const DEFAULT_LABEL_FONT_SIZE = 14;
const HIDDEN_OTHER_KEY = '__grouped_other__';
const csvParse = window.csvParser && window.csvParser.parseCSV;
if (typeof csvParse !== 'function') {
  throw new Error('CSV parser failed to load.');
}
let currentParsedCsv = null;
let currentFilePath = null;
const hiddenGroups = new Map();

const applyThresholdButton = document.getElementById('apply-threshold');
const thresholdInput = document.getElementById('threshold-input');
const labelFontSizeInput = document.getElementById('label-font-size-input');
const toggleHiddenGroupsButton = document.getElementById('toggle-hidden-groups');
const hiddenGroupsPanel = document.getElementById('hidden-groups-panel');
const hiddenGroupsList = document.getElementById('hidden-groups-list');

// Listen for file selection from File menu
window.electronAPI.onOpenFileSelected(async (filePath) => {
  console.debug('CSV load: file selected', { filePath });
  try {
    console.debug('CSV load: reading file');
    const result = await window.electronAPI.readAndParseFile(filePath);
    console.debug('CSV load: read result', {
      filePath: result && result.filePath,
      hasContent: Boolean(result && result.content),
      error: result && result.error
    });
    if (result.error) {
      console.error('Failed to parse file:', result.error);
      return;
    }
    console.debug('CSV load: parsing content');
    const parsedCsv = csvParse(result.content);
    console.debug('CSV load: parsed CSV', {
      headerCount: parsedCsv.headers.length,
      rowCount: parsedCsv.rows.length
    });
    currentParsedCsv = parsedCsv;
    currentFilePath = result.filePath;
    console.debug('CSV load: handle CSV');
    handleCSV(parsedCsv, result.filePath);
  } catch (error) {
    console.debug('CSV load: error', error);
    console.error('Failed to parse file:', error.message);
  }
});

// Handle save request from File menu
window.electronAPI.onGetSaveData(async () => {
  if (!currentParsedCsv) {
    return null;
  }
  return convertParsedCSVToString(currentParsedCsv);
});

// Handle raw data request from View -> Raw Data menu
window.electronAPI.onRequestRawData(() => {
  if (!currentParsedCsv || !currentFilePath) {
    return;
  }
  window.electronAPI.sendRawData({
    filePath: currentFilePath,
    headers: currentParsedCsv.headers,
    rows: currentParsedCsv.rows
  });
});

toggleHiddenGroupsButton.addEventListener('click', () => {
  setHiddenGroupsVisible(hiddenGroupsPanel.hidden);
});

applyThresholdButton.addEventListener('click', () => {
  renderCurrentSankey();
});

thresholdInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    renderCurrentSankey();
  }
});

labelFontSizeInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    renderCurrentSankey();
  }
});

function handleCSV(parsedCsv, filePath) {
  console.debug('CSV load: handleCSV', {
    filePath,
    headerCount: parsedCsv.headers.length,
    rowCount: parsedCsv.rows.length
  });
  hiddenGroups.clear();
  renderCurrentSankey();
}

function setHiddenGroupsVisible(isVisible) {
  hiddenGroupsPanel.hidden = !isVisible;
  toggleHiddenGroupsButton.setAttribute('aria-expanded', String(isVisible));
}

function renderCurrentSankey() {
  if (!currentParsedCsv) return;
  renderSankey(currentParsedCsv, readThresholdValue(), readLabelFontSizeValue());
}

function readThresholdValue() {
  const threshold = Number.parseFloat(thresholdInput.value);
  if (!Number.isFinite(threshold) || threshold < 0) {
    thresholdInput.value = String(DEFAULT_THRESHOLD);
    return DEFAULT_THRESHOLD;
  }
  return threshold;
}

function readLabelFontSizeValue() {
  const fontSize = Number.parseFloat(labelFontSizeInput.value);
  if (!Number.isFinite(fontSize) || fontSize <= 0) {
    labelFontSizeInput.value = String(DEFAULT_LABEL_FONT_SIZE);
    return DEFAULT_LABEL_FONT_SIZE;
  }
  return fontSize;
}

function renderSankey(parsedCsv, threshold, labelFontSizePt) {
  const container = document.getElementById('sankey-container');
  container.innerHTML = '';

  if (!window.d3 || !d3.sankey) {
    container.innerHTML = '<p class="sankey-empty">Missing d3 or d3-sankey dependency.</p>';
    return;
  }

  const transactions = extractTransactions(parsedCsv.rows);
  const groupedTopCategories = computeGroupedTopCategories(transactions, threshold);
  const visibleTransactions = filterHiddenTransactions(transactions, groupedTopCategories);
  updateHiddenGroupsUI(transactions, groupedTopCategories);
  const graph = buildSankeyGraph(visibleTransactions, groupedTopCategories);
  if (graph.links.length === 0) {
    container.innerHTML = '<p class="sankey-empty">No valid Category/Amount transactions were found.</p>';
    return;
  }

  const width = Math.max(container.clientWidth || 0, 900);
  const height = Math.max(container.clientHeight || 0, 360);
  const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  const color = d3.scaleOrdinal()
    .domain(graph.nodes.map((node) => node.name))
    .range(d3.schemeTableau10);

  const sankey = d3.sankey()
    .nodeId((node) => node.id)
    .nodeWidth(14)
    .nodePadding(10)
    .extent([[8, 8], [width - 8, height - 8]]);

  const sankeyData = sankey({
    nodes: graph.nodes.map((node) => ({ ...node })),
    links: graph.links.map((link) => ({ ...link }))
  });

  const svg = d3.select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height].join(' '));

  svg.append('g')
    .selectAll('path')
    .data(sankeyData.links)
    .join('path')
    .attr('class', 'sankey-link')
    .attr('d', d3.sankeyLinkHorizontal())
    .attr('stroke', '#6b7280')
    .attr('stroke-width', (link) => Math.max(1, link.width))
    .append('title')
    .text((link) => link.source.name + ' → ' + link.target.name + ': ' + currency.format(link.value));

  const node = svg.append('g')
    .selectAll('g')
    .data(sankeyData.nodes)
    .join('g')
    .attr('class', 'sankey-node');

  node.on('click', (event, d) => {
    if (d.id === 'root') return;
    const group = createHiddenGroupFromNode(d, groupedTopCategories);
    if (!group || hiddenGroups.has(group.key)) return;
    const count = countTransactionsForGroup(group, transactions, groupedTopCategories);
    if (count === 0) return;
    const message = 'Hide ' + count + ' entries in ' + group.label + '?';
    if (window.confirm(message)) {
      hiddenGroups.set(group.key, group);
      setHiddenGroupsVisible(true);
      renderCurrentSankey();
    }
  });

  node.append('rect')
    .attr('x', (d) => d.x0)
    .attr('y', (d) => d.y0)
    .attr('width', (d) => d.x1 - d.x0)
    .attr('height', (d) => Math.max(1, d.y1 - d.y0))
    .attr('fill', (d) => color(d.name))
    .append('title')
    .text((d) => d.name + ': ' + currency.format(d.value));

  node.append('text')
    .attr('x', (d) => (d.id === 'root' ? d.x1 + 6 : d.x0 - 6))
    .attr('y', (d) => (d.y0 + d.y1) / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', (d) => (d.id === 'root' ? 'start' : 'end'))
    .style('font-size', labelFontSizePt + 'pt')
    .text((d) => d.name + ': ' + currency.format(d.value));
}

function extractTransactions(rows) {
  const transactions = [];
  for (const row of rows) {
    const category = row.Category || row.category || '';
    const amount = parseCurrency(row.Amount || row.amount || '');
    if (!Number.isFinite(amount) || amount === 0) continue;
    transactions.push({
      segments: parseCategoryPath(category),
      value: Math.abs(amount)
    });
  }
  return transactions;
}

function parseCategoryPath(categoryValue) {
  const segments = String(categoryValue || '')
    .split(':')
    .map((segment) => segment.trim())
    .filter(Boolean);
  return segments.length ? segments : ['Uncategorized'];
}

function parseCurrency(rawValue) {
  const text = String(rawValue || '').trim();
  if (!text) return Number.NaN;

  const isWrappedNegative = text.startsWith('(') && text.endsWith(')');
  const normalized = text
    .replace(/^\(/, '')
    .replace(/\)$/, '')
    .replace(/[$,\s]/g, '');
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return Number.NaN;
  return isWrappedNegative ? -parsed : parsed;
}

function buildSankeyGraph(transactions, groupedTopCategories) {
  const rootId = 'root';
  const nodes = new Map([[rootId, { id: rootId, name: 'Transactions' }]]);
  const links = new Map();

  transactions.forEach((transaction) => {
    const shouldGroupTopCategory = groupedTopCategories.has(transaction.segments[0]);
    const segments = shouldGroupTopCategory ? ['Other'] : transaction.segments;
    let sourceId = rootId;
    let path = '';

    segments.forEach((segment, index) => {
      path = path ? path + '::' + segment : segment;
      const targetId = String(index + 1) + ':' + path;
      if (!nodes.has(targetId)) {
        nodes.set(targetId, { id: targetId, name: segment });
      }

      const linkKey = sourceId + '->' + targetId;
      const existing = links.get(linkKey);
      if (existing) {
        existing.value += transaction.value;
      } else {
        links.set(linkKey, { source: sourceId, target: targetId, value: transaction.value });
      }
      sourceId = targetId;
    });
  });

  return {
    nodes: Array.from(nodes.values()),
    links: Array.from(links.values())
  };
}

function computeGroupedTopCategories(transactions, threshold) {
  const groupedTopCategories = new Set();
  if (!Number.isFinite(threshold) || threshold <= 0) return groupedTopCategories;

  const topCategoryTotals = new Map();
  transactions.forEach((transaction) => {
    const topCategory = transaction.segments[0];
    topCategoryTotals.set(topCategory, (topCategoryTotals.get(topCategory) || 0) + transaction.value);
  });

  topCategoryTotals.forEach((total, category) => {
    if (total < threshold) groupedTopCategories.add(category);
  });

  return groupedTopCategories;
}

function filterHiddenTransactions(transactions, groupedTopCategories) {
  return transactions.filter((transaction) => !isTransactionHidden(transaction, groupedTopCategories));
}

function isTransactionHidden(transaction, groupedTopCategories) {
  for (const group of hiddenGroups.values()) {
    if (group.type === 'other') {
      if (groupedTopCategories.has(transaction.segments[0])) return true;
      continue;
    }
    if (matchesSegmentsPrefix(transaction.segments, group.pathSegments)) return true;
  }
  return false;
}

function matchesSegmentsPrefix(segments, prefix) {
  if (prefix.length > segments.length) return false;
  for (let i = 0; i < prefix.length; i += 1) {
    if (segments[i] !== prefix[i]) return false;
  }
  return true;
}

function createHiddenGroupFromNode(node, groupedTopCategories) {
  const pathSegments = parseNodePath(node.id);
  if (!pathSegments.length) return null;
  if (pathSegments.length === 1 && pathSegments[0] === 'Other') {
    if (groupedTopCategories.size === 0) return null;
    return {
      key: HIDDEN_OTHER_KEY,
      type: 'other',
      label: 'Other'
    };
  }
  return {
    key: pathSegments.join('::'),
    type: 'path',
    label: pathSegments.join(' -> '),
    pathSegments
  };
}

function parseNodePath(nodeId) {
  if (nodeId === 'root') return [];
  const separatorIndex = nodeId.indexOf(':');
  if (separatorIndex === -1) return [];
  return nodeId
    .slice(separatorIndex + 1)
    .split('::')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function countTransactionsForGroup(group, transactions, groupedTopCategories) {
  if (group.type === 'other') {
    return transactions.filter((transaction) => groupedTopCategories.has(transaction.segments[0])).length;
  }
  return transactions.filter((transaction) => matchesSegmentsPrefix(transaction.segments, group.pathSegments)).length;
}

function updateHiddenGroupsUI(transactions, groupedTopCategories) {
  const count = hiddenGroups.size;
  toggleHiddenGroupsButton.textContent = count ? 'Hidden groups (' + count + ')' : 'Hidden groups';
  hiddenGroupsList.innerHTML = '';

  if (count === 0) {
    hiddenGroupsList.innerHTML = '<p class="hidden-groups-empty">No hidden groups.</p>';
    return;
  }

  hiddenGroups.forEach((group, key) => {
    const entryCount = countTransactionsForGroup(group, transactions, groupedTopCategories);
    const item = document.createElement('div');
    item.className = 'hidden-group-item';

    const label = document.createElement('span');
    label.textContent = group.label + ' (' + entryCount + ' entries)';

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Restore';
    button.addEventListener('click', () => {
      hiddenGroups.delete(key);
      renderCurrentSankey();
    });

    item.appendChild(label);
    item.appendChild(button);
    hiddenGroupsList.appendChild(item);
  });
}

function convertParsedCSVToString(parsedCsv) {
  const { headers, rows } = parsedCsv;
  
  // Escape CSV values that contain special characters
  const escapeCSVValue = (value) => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return '"' + stringValue.replace(/"/g, '""') + '"';
    }
    return stringValue;
  };
  
  // Create header line
  const headerLine = headers.map(escapeCSVValue).join(',');
  
  // Create data lines
  const dataLines = rows.map(row => {
    return headers.map(header => escapeCSVValue(row[header] || '')).join(',');
  });
  
  return [headerLine, ...dataLines].join('\n');
}

function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/[&<>"']/g, function (m) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]); });
}
