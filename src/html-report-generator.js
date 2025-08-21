import { escapeHtml, safeSeverity } from './utils/sanitize.js';

// HTML Report Generator for Vulnera
function generateHTMLReport(data, filename = "unknown") {
  const meta = data?.metadata || {};
  const vulns = Array.isArray(data?.vulnerabilities) ? data.vulnerabilities : [];
  const pagination = data?.pagination || {};
  const sev = meta.severity_breakdown || { critical: 0, high: 0, medium: 0, low: 0 };
  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Group vulnerabilities by affected packages
  const packageMap = new Map();
  
  vulns.forEach(vuln => {
    if (Array.isArray(vuln.affected_packages)) {
      vuln.affected_packages.forEach(pkg => {
        const key = `${pkg.name}@${pkg.version}`;
        if (!packageMap.has(key)) {
          packageMap.set(key, {
            name: pkg.name,
            version: pkg.version,
            ecosystem: pkg.ecosystem,
            vulnerabilities: [],
            maxSeverity: 'low'
          });
        }
        
        const packageData = packageMap.get(key);
        packageData.vulnerabilities.push(vuln);
        
        // Update max severity
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, unknown: 0 };
        const vulnSeverity = safeSeverity(vuln.severity);
        if (severityOrder[vulnSeverity] > severityOrder[packageData.maxSeverity]) {
          packageData.maxSeverity = vulnSeverity;
        }
      });
    }
  });

  const packages = Array.from(packageMap.values()).sort((a, b) => {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, unknown: 0 };
    return severityOrder[b.maxSeverity] - severityOrder[a.maxSeverity];
  });

  const getSeverityColor = (severity) => {
    const s = safeSeverity(severity);
    if (s === "critical") return "#dc2626"; // red-600
    if (s === "high") return "#ea580c"; // orange-600
    if (s === "medium") return "#d97706"; // amber-600
    if (s === "low") return "#6b7280"; // gray-500
    return '#6366f1';
  };

  const getSeverityBg = (severity) => {
    const s = safeSeverity(severity);
    if (s === "critical") return "#fef2f2"; // red-50
    if (s === "high") return "#fff7ed"; // orange-50
    if (s === "medium") return "#fffbeb"; // amber-50
    if (s === "low") return "#f9fafb"; // gray-50
    return '#eef2ff';
  };

  const packageCards = packages.map(pkg => {
    const severitySafe = safeSeverity(pkg.maxSeverity);
    const vulnItems = pkg.vulnerabilities.map(v => `
      <div class="vulnerability-item" style="border-left: 3px solid ${getSeverityColor(safeSeverity(v.severity))}; background: ${getSeverityBg(safeSeverity(v.severity))};">
        <div class="vulnerability-item-header">
          <span class="severity-badge" style="background: ${getSeverityColor(safeSeverity(v.severity))};">${escapeHtml(safeSeverity(v.severity))}</span>
          <h4 class="vulnerability-item-title">${escapeHtml(v.id)}</h4>
        </div>
        <p class="vulnerability-item-summary">${escapeHtml(v.summary || "")}</p>
        ${v.description ? `<p class="vulnerability-item-description">${escapeHtml(v.description)}</p>` : ""}
        ${Array.isArray(v.references) && v.references.length ? `
          <div class="references">
            <h5>References:</h5>
            <ul>
              ${v.references.map(r => `<li><a href="${encodeURI(r)}" target="_blank" rel="noreferrer noopener">${escapeHtml(r)}</a></li>`).join("")}
            </ul>
          </div>
        ` : ""}
      </div>
    `).join("");

    return `
    <div class="package-card" style="border-left: 4px solid ${getSeverityColor(severitySafe)}; background: white;">
      <div class="package-header">
        <div class="package-info">
          <h3 class="package-name">${escapeHtml(pkg.name)}</h3>
          <p class="package-version">Version: ${escapeHtml(pkg.version)} (${escapeHtml(pkg.ecosystem)})</p>
        </div>
        <div class="package-meta">
          <span class="severity-badge" style="background: ${getSeverityColor(severitySafe)};">${escapeHtml(severitySafe)}</span>
          <span class="vuln-count">${pkg.vulnerabilities.length} vulnerability${pkg.vulnerabilities.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div class="package-vulnerabilities">
        ${vulnItems}
      </div>
    </div>
  `;}).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self' 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vulnera Security Report - ${escapeHtml(filename)}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #374151;
            background: #f8fafc;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 3rem 2rem;
            border-radius: 12px;
            margin-bottom: 2rem;
            text-align: center;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }

        .header .subtitle {
            font-size: 1.2rem;
            opacity: 0.9;
            margin-bottom: 1rem;
        }

        .header .filename {
            background: rgba(255, 255, 255, 0.2);
            padding: 0.5rem 1rem;
            border-radius: 6px;
            display: inline-block;
            font-family: 'Monaco', 'Consolas', monospace;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            text-align: center;
            border: 1px solid #e5e7eb;
        }

        .stat-value {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }

        .stat-label {
            color: #6b7280;
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .severity-summary {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            margin-bottom: 2rem;
        }

        .severity-bars {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }

        .severity-bar {
            text-align: center;
        }

        .severity-bar-fill {
            height: 8px;
            border-radius: 4px;
            margin: 0.5rem 0;
        }

        .vulnerabilities-section {
            margin-top: 2rem;
        }

        .section-title {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 1.5rem;
            color: #1f2937;
        }

        .vulnerability-card {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
        }

        .package-card {
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
        }

        .package-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #e5e7eb;
        }

        .package-info h3 {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 0.25rem;
        }

        .package-version {
            color: #6b7280;
            font-size: 0.9rem;
        }

        .package-meta {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .vuln-count {
            background: #f3f4f6;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 500;
            color: #374151;
        }

        .package-vulnerabilities {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .vulnerability-item {
            border-radius: 8px;
            padding: 1.5rem;
            border: 1px solid #e5e7eb;
        }

        .vulnerability-item-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 0.75rem;
        }

        .vulnerability-item-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #1f2937;
        }

        .vulnerability-item-summary {
            font-size: 1rem;
            margin-bottom: 0.75rem;
            color: #4b5563;
        }

        .vulnerability-item-description {
            margin-bottom: 1rem;
            color: #6b7280;
            font-size: 0.9rem;
        }

        .vulnerability-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
        }

        .severity-badge {
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .vulnerability-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: #1f2937;
        }

        .vulnerability-summary {
            font-size: 1.1rem;
            margin-bottom: 1rem;
            color: #4b5563;
        }

        .vulnerability-description {
            margin-bottom: 1.5rem;
            color: #6b7280;
        }

        .affected-packages, .references {
            margin-top: 1.5rem;
        }

        .affected-packages h4, .references h4 {
            font-weight: 600;
            margin-bottom: 0.75rem;
            color: #374151;
        }

        .packages-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 0.5rem;
        }

        .package-item {
            background: #f9fafb;
            padding: 0.75rem;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
        }

        .ecosystem {
            color: #6b7280;
            font-size: 0.875rem;
        }

        .references {
            margin-top: 1rem;
        }

        .references h4, .references h5 {
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #374151;
            font-size: 0.9rem;
        }

        .references ul {
            list-style: none;
        }

        .references li {
            margin-bottom: 0.25rem;
        }

        .references a {
            color: #3b82f6;
            text-decoration: none;
            word-break: break-all;
            font-size: 0.875rem;
        }

        .references a:hover {
            text-decoration: underline;
        }

        .no-vulnerabilities {
            background: #ecfdf5;
            border: 1px solid #a7f3d0;
            color: #065f46;
            padding: 2rem;
            border-radius: 12px;
            text-align: center;
            font-size: 1.1rem;
        }

        .footer {
            margin-top: 3rem;
            padding: 2rem;
            text-align: center;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
        }

        .metadata {
            background: white;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            margin-top: 2rem;
        }

        .metadata-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
        }

        .metadata-item {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid #f3f4f6;
        }

        .metadata-item:last-child {
            border-bottom: none;
        }

        @media print {
            body { background: white; }
            .container { padding: 1rem; }
            .vulnerability-card { break-inside: avoid; }
        }

        @media (max-width: 768px) {
            .header h1 { font-size: 2rem; }
            .container { padding: 1rem; }
            .stat-card { padding: 1.5rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ Vulnera Security Report</h1>
            <p class="subtitle">Comprehensive Vulnerability Analysis</p>
            <div class="filename">${escapeHtml(filename)}</div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value" style="color: #3b82f6;">${meta.total_packages ?? "-"}</div>
                <div class="stat-label">Total Packages</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: #ef4444;">${packages.length}</div>
                <div class="stat-label">Vulnerable Packages</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: #f59e0b;">${meta.total_vulnerabilities ?? vulns.length}</div>
                <div class="stat-label">Total Vulnerabilities</div>
            </div>
            ${pagination.total_pages ? `
            <div class="stat-card">
                <div class="stat-value" style="color: #8b5cf6;">${pagination.page || 1} / ${pagination.total_pages}</div>
                <div class="stat-label">Report Page</div>
            </div>
            ` : ''}
        </div>

        <div class="severity-summary">
            <h2 class="section-title">Severity Breakdown</h2>
            <div class="severity-bars">
                <div class="severity-bar">
                    <div style="color: #dc2626; font-weight: 600;">Critical: ${sev.critical}</div>
                    <div class="severity-bar-fill" style="background: #dc2626; width: ${Math.max(10, (sev.critical / Math.max(1, meta.total_vulnerabilities || vulns.length)) * 100)}%;"></div>
                </div>
                <div class="severity-bar">
                    <div style="color: #ea580c; font-weight: 600;">High: ${sev.high}</div>
                    <div class="severity-bar-fill" style="background: #ea580c; width: ${Math.max(10, (sev.high / Math.max(1, meta.total_vulnerabilities || vulns.length)) * 100)}%;"></div>
                </div>
                <div class="severity-bar">
                    <div style="color: #d97706; font-weight: 600;">Medium: ${sev.medium}</div>
                    <div class="severity-bar-fill" style="background: #d97706; width: ${Math.max(10, (sev.medium / Math.max(1, meta.total_vulnerabilities || vulns.length)) * 100)}%;"></div>
                </div>
                <div class="severity-bar">
                    <div style="color: #6b7280; font-weight: 600;">Low: ${sev.low}</div>
                    <div class="severity-bar-fill" style="background: #6b7280; width: ${Math.max(10, (sev.low / Math.max(1, meta.total_vulnerabilities || vulns.length)) * 100)}%;"></div>
                </div>
            </div>
        </div>

        <div class="vulnerabilities-section">
            <h2 class="section-title">
                ${packages.length > 0 ? `Vulnerable Packages (${packages.length})` : 'No Vulnerable Packages Found'}
            </h2>

            ${packages.length > 0 ? packageCards : `
                <div class="no-vulnerabilities">
                    <h3>🎉 Great News!</h3>
                    <p>No known vulnerabilities were found in your dependencies.</p>
                    <p>Your project appears to be secure based on current vulnerability databases.</p>
                </div>
            `}
        </div>

        <div class="metadata">
            <h3 class="section-title">Analysis Details</h3>
            <div class="metadata-grid">
                <div class="metadata-item">
                    <span>Report Generated:</span>
                    <strong>${reportDate}</strong>
                </div>
                <div class="metadata-item">
                    <span>Analysis Duration:</span>
                    <strong>${meta.analysis_duration_ms || 0}ms</strong>
                </div>
                ${pagination.total_pages ? `
                <div class="metadata-item">
                    <span>Pagination Info:</span>
                    <strong>Page ${pagination.page || 1} of ${pagination.total_pages} (${pagination.per_page || 50} per page)</strong>
                </div>
                ` : ''}
                <div class="metadata-item">
                    <span>Sources Queried:</span>
                    <strong>${(meta.sources_queried || ['OSV', 'NVD', 'GHSA']).join(', ')}</strong>
                </div>
                <div class="metadata-item">
                    <span>Report ID:</span>
                    <strong>${data.id || 'N/A'}</strong>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Generated by <strong>Vulnera</strong> - Comprehensive Vulnerability Analysis Platform</p>
            <p>Report Date: ${reportDate}</p>
        </div>
    </div>
</body>
</html>`;
}

// Export the function for use in main.js
export { generateHTMLReport };
