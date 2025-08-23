import { escapeHtml, safeSeverity } from "./utils/sanitize.js";

// HTML Report Generator for Vulnera
function generateHTMLReport(data, filename = "unknown") {
    const meta = data?.metadata || {};
    const vulns = Array.isArray(data?.vulnerabilities) ? data.vulnerabilities : [];
    const pagination = data?.pagination || {};
    const sev = meta.severity_breakdown || { critical: 0, high: 0, medium: 0, low: 0 };
    const reportDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    const recommendations = Array.isArray(data?.version_recommendations)
        ? data.version_recommendations
        : [];

    // Group vulnerabilities by affected packages
    const packageMap = new Map();

    vulns.forEach((vuln) => {
        if (Array.isArray(vuln.affected_packages)) {
            vuln.affected_packages.forEach((pkg) => {
                const key = `${pkg.name}@${pkg.version}`;
                if (!packageMap.has(key)) {
                    packageMap.set(key, {
                        name: pkg.name,
                        version: pkg.version,
                        ecosystem: pkg.ecosystem,
                        vulnerabilities: [],
                        maxSeverity: "low",
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
        return "#6366f1";
    };

    const getSeverityBg = (severity) => {
        const s = safeSeverity(severity);
        if (s === "critical") return "#fef2f2"; // red-50
        if (s === "high") return "#fff7ed"; // orange-50
        if (s === "medium") return "#fffbeb"; // amber-50
        if (s === "low") return "#f9fafb"; // gray-50
        return "#eef2ff";
    };

    const packageCards = packages
        .map((pkg) => {
            const severitySafe = safeSeverity(pkg.maxSeverity);

            // Create collapsible vulnerability sections for better UX
            const vulnItems = pkg.vulnerabilities
                .map(
                    (v, index) => `
      <details class="vulnerability-item" ${index === 0 ? "open" : ""}>
        <summary class="vulnerability-summary" style="border-left: 3px solid ${getSeverityColor(safeSeverity(v.severity))}; background: ${getSeverityBg(safeSeverity(v.severity))};">
          <div class="vulnerability-item-header">
            <span class="severity-badge" style="background: ${getSeverityColor(safeSeverity(v.severity))}; color: white;">${escapeHtml(safeSeverity(v.severity).toUpperCase())}</span>
            <h4 class="vulnerability-item-title">${escapeHtml(v.id)}</h4>
          </div>
        </summary>
        <div class="vulnerability-content">
          <p class="vulnerability-item-summary"><strong>Summary:</strong> ${escapeHtml(v.summary || "No summary available")}</p>
          ${v.description ? `<p class="vulnerability-item-description"><strong>Description:</strong> ${escapeHtml(v.description)}</p>` : ""}
          ${
              Array.isArray(v.references) && v.references.length
                  ? `
            <div class="references">
              <h5>References:</h5>
              <ul>
                ${v.references
                    .slice(0, 5)
                    .map(
                        (r) =>
                            `<li><a href="${encodeURI(r)}" target="_blank" rel="noreferrer noopener">${escapeHtml(r)}</a></li>`,
                    )
                    .join("")}
                ${v.references.length > 5 ? `<li><em>... and ${v.references.length - 5} more references</em></li>` : ""}
              </ul>
            </div>
          `
                  : ""
          }
        </div>
      </details>
    `,
                )
                .join("");

            return `
    <details class="package-card" style="border-left: 4px solid ${getSeverityColor(severitySafe)};">
      <summary class="package-header">
        <div class="package-info">
          <h3 class="package-name">${escapeHtml(pkg.name)}</h3>
          <p class="package-version">Version: ${escapeHtml(pkg.version)} • Ecosystem: ${escapeHtml(pkg.ecosystem)}</p>
        </div>
        <div class="package-meta">
          <span class="severity-badge" style="background: ${getSeverityColor(severitySafe)}; color: white;">${escapeHtml(severitySafe).toUpperCase()}</span>
          <span class="vuln-count">${pkg.vulnerabilities.length} vulnerability${pkg.vulnerabilities.length !== 1 ? "s" : ""}</span>
        </div>
      </summary>
      <div class="package-vulnerabilities">
        ${(() => {
            const r = (recommendations || []).find(
                (x) => x.package === pkg.name && x.ecosystem === pkg.ecosystem,
            );
            return r
                ? `
          <div class="recommendation-inline" style="margin-bottom: 0.75rem;">
            ${r.current_version ? `<span class="rec-pill" style="margin-right: 0.5rem;">Current: ${escapeHtml(r.current_version)}</span>` : ""}
            ${r.nearest_safe_above_current ? `<span class="rec-pill" style="margin-right: 0.5rem;">Nearest: ${escapeHtml(r.nearest_safe_above_current)}${r.nearest_impact ? ` (${escapeHtml(r.nearest_impact)})` : ""}</span>` : ""}
            ${r.most_up_to_date_safe ? `<span class="rec-pill" style="margin-right: 0.5rem;">Latest: ${escapeHtml(r.most_up_to_date_safe)}${r.most_up_to_date_impact ? ` (${escapeHtml(r.most_up_to_date_impact)})` : ""}</span>` : ""}
            ${r.prerelease_exclusion_applied ? `<span class="rec-pill">Prereleases excluded</span>` : ""}
          </div>
          `
                : "";
        })()}
        ${vulnItems}
      </div>
    </details>
  `;
        })
        .join("");

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
            margin-bottom: 0.25rem;
        }

        .stat-desc {
            color: #9ca3af;
            font-size: 0.75rem;
            margin-top: 0.25rem;
        }

        .pagination-info {
            margin-bottom: 2rem;
        }

        .pagination-card {
            background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
            padding: 2rem;
            border-radius: 12px;
            border: 1px solid #d1d5db;
        }

        .pagination-card h3 {
            color: #374151;
            margin-bottom: 1rem;
            font-size: 1.25rem;
        }

        .pagination-card p {
            color: #4b5563;
            margin-bottom: 0.75rem;
            line-height: 1.6;
        }

        .pagination-note {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            padding: 1rem;
            border-radius: 8px;
            margin-top: 1rem;
            color: #92400e;
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
            gap: 1.5rem;
            margin-top: 1.5rem;
        }

        .severity-bar {
            text-align: left;
        }

        .severity-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
            font-weight: 600;
        }

        .severity-icon {
            font-size: 1.1rem;
        }

        .severity-bar-container {
            background: #f3f4f6;
            height: 12px;
            border-radius: 6px;
            overflow: hidden;
            margin-bottom: 0.5rem;
        }

        .severity-bar-fill {
            height: 100%;
            border-radius: 6px;
            transition: width 0.3s ease;
        }

        .severity-desc {
            font-size: 0.8rem;
            color: #6b7280;
            font-style: italic;
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
            background: white;
            border-radius: 12px;
            padding: 2rem 2rem 2rem 3rem;
            margin-bottom: 2rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
            position: relative;
        }

        .package-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid #f3f4f6;
            cursor: pointer;
            list-style: none;
            position: relative;
        }

        .package-header:hover {
            background-color: #f9fafb;
            border-radius: 8px;
            margin: -0.5rem;
            padding: 0.5rem 0.5rem 1.5rem 0.5rem;
        }

        .package-header::-webkit-details-marker {
            display: none;
        }

        .package-header::before {
            content: "▶";
            position: absolute;
            left: -1.5rem;
            font-size: 0.8rem;
            color: #6b7280;
            transition: transform 0.2s ease;
        }

        .package-card[open] .package-header::before {
            transform: rotate(90deg);
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
            font-weight: 500;
        }

        .package-meta {
            display: flex;
            align-items: center;
            gap: 1rem;
            flex-wrap: wrap;
        }

        .vuln-count {
            background: #f3f4f6;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 600;
            color: #374151;
        }

        .package-vulnerabilities {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            margin-top: 1.5rem;
            transition: opacity 0.2s ease;
        }

        .vulnerability-item {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
        }

        .vulnerability-summary {
            padding: 1rem;
            cursor: pointer;
            user-select: none;
            transition: background-color 0.2s ease;
        }

        .vulnerability-summary:hover {
            background-color: rgba(0, 0, 0, 0.02);
        }

        .vulnerability-item-header {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .vulnerability-item-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #1f2937;
            margin: 0;
        }

        .vulnerability-content {
            padding: 1rem;
            background: #fafbfc;
            border-top: 1px solid #e5e7eb;
        }

        .vulnerability-item-summary {
            margin-bottom: 1rem;
            color: #4b5563;
            line-height: 1.6;
        }

        .vulnerability-item-description {
            margin-bottom: 1rem;
            color: #6b7280;
            font-size: 0.9rem;
            line-height: 1.6;
        }

        .severity-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
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
                <div class="stat-desc">Analyzed in scan</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: #ef4444;">${packages.length}</div>
                <div class="stat-label">Vulnerable Packages</div>
                <div class="stat-desc">Requiring attention</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: #f59e0b;">${meta.total_vulnerabilities ?? vulns.length}</div>
                <div class="stat-label">Total Vulnerabilities</div>
                <div class="stat-desc">Security issues found</div>
            </div>
            ${
                pagination.total_pages
                    ? `
            <div class="stat-card">
                <div class="stat-value" style="color: #8b5cf6;">Page ${pagination.page || 1} of ${pagination.total_pages}</div>
                <div class="stat-label">Report Pagination</div>
                <div class="stat-desc">${pagination.per_page || 50} items per page</div>
            </div>
            `
                    : ""
            }
        </div>

        ${
            pagination.total_pages > 1
                ? `
        <div class="pagination-info">
            <div class="pagination-card">
                <h3>📄 Pagination Information</h3>
                <p>This report shows <strong>page ${pagination.page || 1} of ${pagination.total_pages}</strong> pages.</p>
                <p>Displaying <strong>${packages.length} vulnerable packages</strong> out of <strong>${meta.total_packages || "unknown"} total packages</strong>.</p>
                <p>Each page contains up to <strong>${pagination.per_page || 50} packages</strong> for optimal loading performance.</p>
                ${
                    pagination.page < pagination.total_pages
                        ? `
                <div class="pagination-note">
                    <strong>💡 Note:</strong> To see additional vulnerable packages, generate reports for pages ${(pagination.page || 1) + 1}-${pagination.total_pages}.
                </div>
                `
                        : ""
                }
            </div>
        </div>
        `
                : ""
        }

        <div class="severity-summary">
            <h2 class="section-title">🛡️ Security Risk Breakdown</h2>
            <div class="severity-bars">
                <div class="severity-bar">
                    <div class="severity-label" style="color: #dc2626;">
                        <span class="severity-icon">🔴</span>
                        <strong>Critical: ${sev.critical}</strong>
                    </div>
                    <div class="severity-bar-container">
                        <div class="severity-bar-fill" style="background: #dc2626; width: ${Math.max(5, (sev.critical / Math.max(1, meta.total_vulnerabilities || vulns.length)) * 100)}%;"></div>
                    </div>
                    <div class="severity-desc">Immediate action required</div>
                </div>
                <div class="severity-bar">
                    <div class="severity-label" style="color: #ea580c;">
                        <span class="severity-icon">🟠</span>
                        <strong>High: ${sev.high}</strong>
                    </div>
                    <div class="severity-bar-container">
                        <div class="severity-bar-fill" style="background: #ea580c; width: ${Math.max(5, (sev.high / Math.max(1, meta.total_vulnerabilities || vulns.length)) * 100)}%;"></div>
                    </div>
                    <div class="severity-desc">Action needed soon</div>
                </div>
                <div class="severity-bar">
                    <div class="severity-label" style="color: #d97706;">
                        <span class="severity-icon">🟡</span>
                        <strong>Medium: ${sev.medium}</strong>
                    </div>
                    <div class="severity-bar-container">
                        <div class="severity-bar-fill" style="background: #d97706; width: ${Math.max(5, (sev.medium / Math.max(1, meta.total_vulnerabilities || vulns.length)) * 100)}%;"></div>
                    </div>
                    <div class="severity-desc">Plan for resolution</div>
                </div>
                <div class="severity-bar">
                    <div class="severity-label" style="color: #6b7280;">
                        <span class="severity-icon">⚪</span>
                        <strong>Low: ${sev.low}</strong>
                    </div>
                    <div class="severity-bar-container">
                        <div class="severity-bar-fill" style="background: #6b7280; width: ${Math.max(5, (sev.low / Math.max(1, meta.total_vulnerabilities || vulns.length)) * 100)}%;"></div>
                    </div>
                    <div class="severity-desc">Monitor and review</div>
                </div>
            </div>
        </div>

        <div class="vulnerabilities-section">
            <h2 class="section-title">
                ${packages.length > 0 ? `Vulnerable Packages (${packages.length})` : "No Vulnerable Packages Found"}
            </h2>

            ${
                packages.length > 0
                    ? packageCards
                    : `
                <div class="no-vulnerabilities">
                    <h3>🎉 Great News!</h3>
                    <p>No known vulnerabilities were found in your dependencies.</p>
                    <p>Your project appears to be secure based on current vulnerability databases.</p>
                </div>
            `
            }
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
                ${
                    pagination.total_pages
                        ? `
                <div class="metadata-item">
                    <span>Pagination Info:</span>
                    <strong>Page ${pagination.page || 1} of ${pagination.total_pages} (${pagination.per_page || 50} per page)</strong>
                </div>
                `
                        : ""
                }
                <div class="metadata-item">
                    <span>Sources Queried:</span>
                    <strong>${(meta.sources_queried || ["OSV", "NVD", "GHSA"]).join(", ")}</strong>
                </div>
                <div class="metadata-item">
                    <span>Report ID:</span>
                    <strong>${data.id || "N/A"}</strong>
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
