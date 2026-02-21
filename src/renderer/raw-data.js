// Listen for raw data from main process
window.electronAPI.onRawDataLoaded((data) => {
  displayRawData(data);
});

function displayRawData(data) {
  const container = document.getElementById('raw-data-container');
  
  if (!data || !data.headers || !data.rows) {
    container.innerHTML = '<p class="raw-data-empty">No data loaded.</p>';
    return;
  }

  const { filePath, headers, rows } = data;
  
  // Build HTML content
  let html = '<h2>Loaded: ' + escapeHtml(filePath) + '</h2>';
  html += '<p>Parsed ' + rows.length + ' rows across ' + headers.length + ' columns.</p>';
  html += '<div class="sample-lines"><div class="line"><strong>Headers:</strong> ' + headers.map(escapeHtml).join(', ') + '</div></div>';

  if (rows.length > 0) {
    // Show ALL rows (not just first 10)
    const allRows = rows.map((row, index) => {
      const rowValues = headers.map((header) => escapeHtml(row[header] || '')).join(' | ');
      return '<div class="line">' + (index + 1) + '. ' + rowValues + '</div>';
    }).join('');
    html += '<div class="sample-lines">' + allRows + '</div>';
  }

  container.innerHTML = html;
}

function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/[&<>"']/g, function (m) { 
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]; 
  });
}
