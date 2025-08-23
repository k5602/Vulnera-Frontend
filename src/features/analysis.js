import { CONFIG } from "../config.js";
import { detectEcosystemForApi } from "../utils/ecosystems.js";
import { showError, showSuccess } from "../ui/notifications.js";
import { escapeHtml, safeSeverity, sanitizeMessage, MAX_FILE_BYTES } from "../utils/sanitize.js";

let lastAnalysisData = null;
let lastAnalysisFileName = null;
let lastAnalysisId = null;
let currentPage = 1;
let totalPages = 1;

export async function handleAnalyze() {
    const fileInput = document.getElementById("file-input");
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
        showError("Please select a dependency file first.");
        return;
    }

    const ecosystem = detectEcosystemForApi(file.name);
    if (!ecosystem) {
        showError("This ecosystem isn't supported by the API yet.");
        return;
    }

    const loadingModal = document.getElementById("loading-modal");
    loadingModal.checked = true;

    try {
        // File size guard
        if (file.size > MAX_FILE_BYTES) {
            showError(`File too large (> ${(MAX_FILE_BYTES / 1024).toFixed(0)} KB)`);
            loadingModal.checked = false;
            return;
        }

        const file_content = await file.text();

        if (CONFIG.ENABLE_DEBUG === "true") {
            console.log("🔍 API Request to:", `${CONFIG.API_ENDPOINT}/analyze`);
            console.log("📤 Request data:", { ecosystem, filename: file.name });
        }

        // Create AbortController for request timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);

        const ghToken = (() => {
            try {
                return typeof sessionStorage !== "undefined"
                    ? (sessionStorage.getItem("vulnera.gh.token") || "").trim()
                    : "";
            } catch {
                return "";
            }
        })();

        const res = await fetch(`${CONFIG.API_ENDPOINT}/analyze`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "User-Agent": `${CONFIG.APP_NAME}/${CONFIG.APP_VERSION}`,
                ...(ghToken ? { Authorization: `Bearer ${ghToken}` } : {}),
                ...(ghToken ? { "X-GitHub-Token": ghToken } : {}),
                ...(ghToken ? { "X-GHSA-Token": ghToken } : {}),
            },
            body: JSON.stringify({ ecosystem, file_content, filename: file.name }),
            signal: controller.signal,
        });

        // Clear timeout if request completes
        clearTimeout(timeoutId);

        if (CONFIG.ENABLE_DEBUG === "true") {
            console.log("📥 Response status:", res.status, res.statusText);
        }

        const payload = await res.json().catch(() => ({}));

        if (CONFIG.ENABLE_DEBUG === "true") {
            console.log("📊 Response payload:", payload);
        }

        loadingModal.checked = false;

        if (!res.ok) {
            const code = payload?.code || "ERROR";
            const reqId = payload?.request_id ? ` • Request ID: ${payload.request_id}` : "";
            const message = payload?.message || payload?.error || `Request failed (${res.status})`;
            showError(`[${code}] ${message}${reqId}`);
            return;
        }

        // Store analysis data for download and pagination
        lastAnalysisData = payload;
        lastAnalysisFileName = file.name;
        lastAnalysisId = payload.id;

        // Handle pagination info
        const pagination = payload.pagination || {};
        currentPage = pagination.page || 1;
        totalPages = pagination.total_pages || 1;

        renderPackageView(payload);
    } catch (err) {
        loadingModal.checked = false;

        // Enhanced error handling
        let errorMessage = "Network error while contacting the API.";

        if (err.name === "AbortError") {
            errorMessage = `Request timeout (${CONFIG.API_TIMEOUT}ms). The server might be slow or unavailable.`;
        } else if (err.message.includes("Failed to fetch")) {
            errorMessage = `Cannot reach the API server at ${CONFIG.API_BASE_URL}. Please check your connection or try switching to a different environment.`;
        } else if (err.message) {
            errorMessage = err.message;
        }

        errorMessage = sanitizeMessage(errorMessage);
        showError(errorMessage);

        if (CONFIG.ENABLE_DEBUG === "true") {
            console.error("API Error Details:", {
                error: err,
                apiEndpoint: CONFIG.API_ENDPOINT,
                environment: CONFIG.ENVIRONMENT,
                timestamp: new Date().toISOString(),
            });
        }
        console.error(err);
    }
}

function renderPackageView(data) {
    const resultModal = document.getElementById("result-modal");
    resultModal.checked = true;

    const meta = data?.metadata || {};
    const repo = data?.repository || null;
    const vulns = Array.isArray(data?.vulnerabilities) ? data.vulnerabilities : [];

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

    const sev = meta.severity_breakdown || { critical: 0, high: 0, medium: 0, low: 0 };

    const packageCards = packages
        .map(
            (pkg) => `
      <div class="package-card bg-base-200 rounded-lg p-4 cursor-pointer hover:bg-base-300 transition-colors"
           data-package="${escapeHtml(pkg.name)}"
           data-version="${escapeHtml(pkg.version)}"
           onclick="showPackageVulnerabilities('${escapeHtml(pkg.name)}', '${escapeHtml(pkg.version)}')">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <h3 class="font-semibold text-lg">${escapeHtml(pkg.name)}</h3>
            <p class="text-sm opacity-70">Version: ${escapeHtml(pkg.version)} (${escapeHtml(pkg.ecosystem)})</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="badge ${badgeFromSeverity(pkg.maxSeverity)}">${escapeHtml(pkg.maxSeverity)}</span>
            <span class="text-sm font-medium">${pkg.vulnerabilities.length} vuln${pkg.vulnerabilities.length !== 1 ? "s" : ""}</span>
            <i class="fas fa-chevron-right text-sm opacity-50"></i>
          </div>
        </div>
      </div>
    `,
        )
        .join("");

    // Pagination controls
    const paginationControls =
        totalPages > 1
            ? `
      <div class="flex justify-center items-center gap-2 mt-4">
        <button class="btn btn-sm" ${currentPage <= 1 ? "disabled" : ""} onclick="loadAnalysisPage(${currentPage - 1})">
          <i class="fas fa-chevron-left"></i> Previous
        </button>
        <span class="mx-4">Page ${currentPage} of ${totalPages}</span>
        <button class="btn btn-sm" ${currentPage >= totalPages ? "disabled" : ""} onclick="loadAnalysisPage(${currentPage + 1})">
          Next <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    `
            : "";
    const recommendationCards = recommendations
        .map(
            (r) => `
      <div class="bg-base-200 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-lg">${escapeHtml(r.package)}</h3>
            <p class="text-sm opacity-70">${escapeHtml(r.ecosystem)}${r.current_version ? ` • Current: ${escapeHtml(r.current_version)}` : ""}</p>
          </div>
          <div class="flex flex-wrap gap-2 text-sm">
            ${r.nearest_safe_above_current ? `<span class="badge badge-accent">Nearest: ${escapeHtml(r.nearest_safe_above_current)}${r.nearest_impact ? ` (${escapeHtml(r.nearest_impact)})` : ""}</span>` : ""}
            ${r.most_up_to_date_safe ? `<span class="badge badge-primary">Latest: ${escapeHtml(r.most_up_to_date_safe)}${r.most_up_to_date_impact ? ` (${escapeHtml(r.most_up_to_date_impact)})` : ""}</span>` : ""}
            ${r.prerelease_exclusion_applied ? '<span class="badge badge-ghost">Prereleases excluded</span>' : ""}
          </div>
        </div>
        ${Array.isArray(r.notes) && r.notes.length ? `<div class="mt-2 text-xs opacity-70">Notes: ${r.notes.map((n) => escapeHtml(n)).join("; ")}</div>` : ""}
      </div>
    `,
        )
        .join("");

    // Optional repository summary card
    const repoSummary = repo
        ? `
      <div class="card bg-base-100 shadow">
        <div class="card-body p-3 sm:p-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div class="text-sm">
              <div class="font-semibold">${escapeHtml(repo.owner)}/${escapeHtml(repo.repo)}</div>
              <div class="opacity-70">Commit: ${escapeHtml(repo.commit_sha || "-")}${repo.requested_ref ? ` • Ref: ${escapeHtml(repo.requested_ref)}` : ""}</div>
              ${meta?.duration_ms !== null ? `<div class="opacity-70">Duration: ${escapeHtml(String(meta.duration_ms))} ms</div>` : ""}
            </div>
            <div class="stats stats-horizontal shadow">
              <div class="stat p-2">
                <div class="stat-title text-xs">Files Scanned</div>
                <div class="stat-value text-lg">${escapeHtml(String(meta.total_files_scanned ?? "-"))}</div>
              </div>
              <div class="stat p-2">
                <div class="stat-title text-xs">Analyzed Files</div>
                <div class="stat-value text-lg">${escapeHtml(String(meta.analyzed_files ?? "-"))}</div>
              </div>
              <div class="stat p-2">
                <div class="stat-title text-xs">Unique Packages</div>
                <div class="stat-value text-lg">${escapeHtml(String(meta.unique_packages ?? "-"))}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
        : "";

    document.getElementById("result-content").innerHTML = `
      <div class="space-y-4">
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i>
          <span class="text-sm sm:text-base">Analysis completed successfully</span>
        </div>

        ${repoSummary}

        <div class="stats stats-vertical sm:stats-horizontal shadow w-full">
          <div class="stat p-3 sm:p-4">
            <div class="stat-title text-xs sm:text-sm">Total Packages</div>
            <div class="stat-value text-2xl sm:text-3xl text-primary">${meta.total_packages ?? "-"}</div>
          </div>
          <div class="stat p-3 sm:p-4">
            <div class="stat-title text-xs sm:text-sm">Vulnerable Packages</div>
            <div class="stat-value text-2xl sm:text-3xl text-error">${packages.length}</div>
          </div>
          <div class="stat p-3 sm:p-4">
            <div class="stat-title text-xs sm:text-sm">Total Vulnerabilities</div>
            <div class="stat-value text-2xl sm:text-3xl text-warning">${meta.total_vulnerabilities ?? vulns.length}</div>
          </div>
          <div class="stat p-3 sm:p-4">
            <div class="stat-title text-xs sm:text-sm">Severity Breakdown</div>
            <div class="stat-desc text-xs">C:${sev.critical} H:${sev.high} M:${sev.medium} L:${sev.low}</div>
          </div>
        </div>

        ${
            recommendations.length > 0
                ? `
          <div class="mt-6">
            <h3 class="text-lg font-semibold mb-4">Version Recommendations</h3>
            <div class="space-y-2">
              ${recommendationCards}
            </div>
          </div>
        `
                : ""
        }

        ${
            packages.length > 0
                ? `
          <div class="mt-6">
            <h3 class="text-lg font-semibold mb-4">Vulnerable Packages (click to view details)</h3>
            <div class="space-y-2">
              ${packageCards}
            </div>
            ${paginationControls}
          </div>
        `
                : `
          <div class="alert alert-success">
            <i class="fas fa-check-circle"></i>
            <span>No vulnerable packages found.</span>
          </div>
        `
        }
      </div>
    `;

    setupDownloadButton(data);
}

// Load specific page of analysis results
async function loadAnalysisPage(page) {
    if (!lastAnalysisId || page < 1 || page > totalPages) {
        return;
    }

    const loadingModal = document.getElementById("loading-modal");
    loadingModal.checked = true;

    try {
        const ghToken = (() => {
            try {
                return typeof sessionStorage !== "undefined"
                    ? (sessionStorage.getItem("vulnera.gh.token") || "").trim()
                    : "";
            } catch {
                return "";
            }
        })();

        const res = await fetch(
            `${CONFIG.API_ENDPOINT}/reports/${lastAnalysisId}?page=${page}&per_page=50`,
            {
                headers: {
                    Accept: "application/json",
                    "User-Agent": `${CONFIG.APP_NAME}/${CONFIG.APP_VERSION}`,
                    ...(ghToken ? { Authorization: `Bearer ${ghToken}` } : {}),
                    ...(ghToken ? { "X-GitHub-Token": ghToken } : {}),
                    ...(ghToken ? { "X-GHSA-Token": ghToken } : {}),
                },
            },
        );

        if (!res.ok) {
            let errMsg = `Failed to load page ${page}`;
            try {
                const errPayload = await res.clone().json();
                const code = errPayload?.code || "ERROR";
                const reqId = errPayload?.request_id
                    ? ` • Request ID: ${errPayload.request_id}`
                    : "";
                const message = errPayload?.message || errPayload?.error || errMsg;
                errMsg = `[${code}] ${message}${reqId}`;
            } catch {}
            throw new Error(errMsg);
        }

        const payload = await res.json();
        loadingModal.checked = false;

        lastAnalysisData = payload;
        currentPage = payload.pagination?.page || page;
        totalPages = payload.pagination?.total_pages || totalPages;

        renderPackageView(payload);
    } catch (error) {
        loadingModal.checked = false;
        showError(`Failed to load page ${page}: ${error.message}`);
    }
}

// Show vulnerabilities for a specific package
function showPackageVulnerabilities(packageName, version) {
    const vulns = lastAnalysisData?.vulnerabilities || [];
    const packageVulns = vulns.filter((v) =>
        v.affected_packages?.some((p) => p.name === packageName && p.version === version),
    );

    const vulnItems = packageVulns
        .map(
            (v) => `
      <div class="collapse collapse-arrow bg-base-200 mb-2">
        <input type="checkbox" />
        <div class="collapse-title text-sm sm:text-base font-medium flex items-center gap-2">
          <span class="badge ${badgeFromSeverity(v.severity)}">${escapeHtmlLocal(safeSeverity(v.severity))}</span>
          <span class="truncate">${escapeHtmlLocal(v.id)} — ${escapeHtmlLocal(v.summary)}</span>
        </div>
        <div class="collapse-content text-sm">
          <p class="mb-2 opacity-80">${escapeHtmlLocal(v.description || "")}</p>
          ${
              Array.isArray(v.references) && v.references.length
                  ? `
            <div class="mt-2 flex flex-wrap gap-2">
              ${v.references.map((r) => `<a class="link link-primary text-xs" href="${encodeURI(r)}" target="_blank" rel="noreferrer">${escapeHtmlLocal(r)}</a>`).join("")}
            </div>
          `
                  : ""
          }
        </div>
      </div>
    `,
        )
        .join("");

    // Create package vulnerability modal
    const modalHtml = `
      <div class="modal modal-open modal-bottom sm:modal-middle" id="package-vuln-modal-container" style="z-index: 1001;">
        <div class="modal-box w-11/12 max-w-4xl">
          <div class="flex justify-between items-center mb-4">
            <div class="flex items-center gap-3">
              <button class="btn btn-sm btn-ghost btn-circle" onclick="closePackageModal()" title="Back to package list">
                <i class="fas fa-arrow-left"></i>
              </button>
              <h3 class="font-bold text-lg">
                Vulnerabilities in ${escapeHtml(packageName)} v${escapeHtml(version)}
              </h3>
            </div>
            <button class="btn btn-sm btn-circle btn-ghost" onclick="closePackageModal()" title="Close">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="bg-base-100 p-3 rounded-lg mb-4">
            <div class="flex items-center justify-between text-sm">
              <span class="opacity-70">Package: ${escapeHtml(packageName)}</span>
              <span class="opacity-70">Version: ${escapeHtml(version)}</span>
              <span class="badge badge-neutral">${packageVulns.length} vulnerability${packageVulns.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <div class="max-h-[60vh] overflow-y-auto">
            ${vulnItems || '<p class="text-center py-4">No vulnerabilities found for this package.</p>'}
          </div>
          <div class="modal-action">
            <button class="btn btn-primary" onclick="closePackageModal()">
              <i class="fas fa-arrow-left mr-2"></i>
              Back to Package List
            </button>
          </div>
        </div>
        <div class="modal-backdrop" onclick="closePackageModal()"></div>
      </div>
    `;

    // Remove existing package modal if any
    const existingModal = document.getElementById("package-vuln-modal-container");
    if (existingModal) {
        existingModal.remove();
    }

    // Add new modal to body
    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function closePackageModal() {
    const modalContainer = document.getElementById("package-vuln-modal-container");
    if (modalContainer) {
        // Add fade out animation
        modalContainer.style.opacity = "0";
        modalContainer.style.transition = "opacity 0.3s ease";

        // Remove modal after animation
        setTimeout(() => {
            modalContainer.remove();
        }, 300);

        // Ensure the main result modal stays visible and focused
        setTimeout(() => {
            const resultModal = document.getElementById("result-modal");
            if (resultModal) {
                resultModal.checked = true;
            }

            const resultTitle = document.getElementById("result-title");
            if (resultTitle) {
                resultTitle.focus();
            }
        }, 100);
    }
}

// Make functions globally available for onclick handlers
window.loadAnalysisPage = loadAnalysisPage;
window.showPackageVulnerabilities = showPackageVulnerabilities;
window.closePackageModal = closePackageModal;

// Legacy function - keeping for backward compatibility but not actively used
// eslint-disable-next-line no-unused-vars
function renderAnalysisResult(data) {
    const resultModal = document.getElementById("result-modal");
    resultModal.checked = true;

    const meta = data?.metadata || {};
    const vulns = Array.isArray(data?.vulnerabilities) ? data.vulnerabilities : [];

    const sev = meta.severity_breakdown || {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
    };

    const vulnItems = vulns
        .slice(0, 50)
        .map(
            (v) => `
        <div class="collapse collapse-arrow bg-base-200">
          <input type="checkbox" />
          <div class="collapse-title text-sm sm:text-base font-medium flex items-center gap-2">
            <span class="badge ${badgeFromSeverity(v.severity)}">${escapeHtmlLocal(safeSeverity(v.severity))}</span>
            <span class="truncate">${escapeHtmlLocal(v.id)} — ${escapeHtmlLocal(v.summary)}</span>
          </div>
          <div class="collapse-content text-sm">
            <p class="mb-2 opacity-80">${escapeHtml(v.description || "")}</p>
            ${
                Array.isArray(v.affected_packages) && v.affected_packages.length
                    ? `
              <div class="overflow-x-auto">
                <table class="table table-zebra table-xs sm:table-sm">
                  <thead>
                    <tr><th>Package</th><th>Version</th><th>Ecosystem</th></tr>
                  </thead>
                  <tbody>
                    ${v.affected_packages
                        .map(
                            (p) =>
                                `<tr><td>${escapeHtmlLocal(p.name)}</td><td>${escapeHtmlLocal(p.version)}</td><td>${escapeHtmlLocal(p.ecosystem)}</td></tr>`,
                        )
                        .join("")}
                  </tbody>
                </table>
              </div>`
                    : ""
            }
            ${
                Array.isArray(v.references) && v.references.length
                    ? `
              <div class="mt-2 flex flex-wrap gap-2">
                ${v.references
                    .map(
                        (r) =>
                            `<a class="link link-primary text-xs" href="${encodeURI(r)}" target="_blank" rel="noreferrer">${escapeHtmlLocal(r)}</a>`,
                    )
                    .join("")}
              </div>`
                    : ""
            }
          </div>
        </div>`,
        )
        .join("");

    document.getElementById("result-content").innerHTML = `
      <div class="space-y-3 sm:space-y-4">
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i>
          <span class="text-sm sm:text-base">Analysis completed successfully</span>
        </div>
        <div class="stats stats-vertical sm:stats-horizontal shadow w-full">
          <div class="stat p-3 sm:p-4">
            <div class="stat-title text-xs sm:text-sm">Total Packages</div>
            <div class="stat-value text-2xl sm:text-3xl text-primary">${
                meta.total_packages ?? "-"
            }</div>
          </div>
          <div class="stat p-3 sm:p-4">
            <div class="stat-title text-xs sm:text-sm">Vulnerabilities</div>
            <div class="stat-value text-2xl sm:text-3xl text-error">${
                meta.total_vulnerabilities ?? vulns.length
            }</div>
          </div>
          <div class="stat p-3 sm:p-4">
            <div class="stat-title text-xs sm:text-sm">Severity Breakdown</div>
            <div class="stat-desc text-xs">C:${sev.critical} H:${sev.high} M:${
                sev.medium
            } L:${sev.low}</div>
          </div>
        </div>

        ${
            vulnItems
                ? `<div class="mt-4 space-y-2">${vulnItems}</div>`
                : `
          <div class="alert alert-success">
            <i class="fas fa-check-circle"></i>
            <span>No known vulnerabilities found.</span>
          </div>`
        }
      </div>
    `;

    // Add download functionality
    setupDownloadButton(data);
}

function setupDownloadButton(data) {
    const downloadBtn = document.getElementById("download-report-btn");
    if (downloadBtn && data) {
        downloadBtn.disabled = false;
        downloadBtn.onclick = async () => {
            try {
                // Show loading state

                downloadBtn.innerHTML =
                    '<i class="fas fa-spinner fa-spin mr-2"></i>Creating Zip...';
                downloadBtn.disabled = true;

                const fileName = lastAnalysisFileName || "dependency-analysis";
                const baseFileName = fileName.replace(/\.[^/.]+$/, "");
                const timestamp = new Date().toISOString().split("T")[0];

                // Create ZIP file
                const { default: JSZip } = await import("jszip");
                const zip = new JSZip();

                // 1. Generate HTML report
                const { generateHTMLReport } = await import("../html-report-generator.js");
                const htmlContent = generateHTMLReport(data, fileName);
                zip.file(`vulnera-report-${baseFileName}-${timestamp}.html`, htmlContent);

                // 2. Get original file content and generate fixed version
                const fileInput = document.getElementById("file-input");
                if (fileInput && fileInput.files && fileInput.files[0]) {
                    const originalFile = fileInput.files[0];
                    const originalContent = await originalFile.text();

                    // Generate fixed dependency file
                    const { generateFixedDependencyFile, generateFixLog } = await import(
                        "../utils/fileFixers.js"
                    );
                    const strategy =
                        (downloadBtn && downloadBtn.dataset.fixStrategy) ||
                        (typeof window !== "undefined" && window.VULNERA_FIX_STRATEGY) ||
                        (typeof sessionStorage !== "undefined" &&
                            sessionStorage.getItem("vulnera.fix.strategy")) ||
                        "nearest";
                    const fixResult = generateFixedDependencyFile(
                        originalContent,
                        originalFile.name,
                        data.vulnerabilities || [],
                        data.version_recommendations || [],
                        strategy,
                    );

                    // Add original file to zip
                    zip.file(`original-${originalFile.name}`, originalContent);

                    // Add fixed file to zip
                    const fixedFileName = `fixed-${originalFile.name}`;
                    zip.file(fixedFileName, fixResult.content);

                    // Generate and add fix log
                    const fixLogContent = generateFixLog([fixResult], originalFile.name);
                    zip.file(`FIXES-${baseFileName}-${timestamp}.md`, fixLogContent);

                    // Add README with instructions
                    const readmeContent = `# Vulnera Analysis Results

## Files Included

1. **vulnera-report-${baseFileName}-${timestamp}.html** - Detailed vulnerability report
2. **original-${originalFile.name}** - Your original dependency file
3. **fixed-${originalFile.name}** - Updated dependency file with fixed versions
4. **FIXES-${baseFileName}-${timestamp}.md** - Detailed log of applied fixes

## Quick Start

1. Review the HTML report for vulnerability details
2. Check the FIXES log for applied changes
3. Replace your dependency file with the fixed version
4. Install/update dependencies using your package manager
5. Test thoroughly before deploying

## Next Steps

- **npm/Node.js**: Run \`npm install\` after replacing package.json
- **Python**: Run \`pip install -r requirements.txt\` after replacing requirements.txt
- **Maven**: Run \`mvn clean install\` after replacing pom.xml

## Important Notes

⚠️ **Always test thoroughly before deploying to production**
⚠️ **Some version updates may introduce breaking changes**
⚠️ **Review changelogs for major version updates**

Generated by Vulnera on ${new Date().toLocaleString()}
`;
                    zip.file("README.md", readmeContent);
                }

                // Generate and download ZIP
                const zipBlob = await zip.generateAsync({ type: "blob" });
                const url = URL.createObjectURL(zipBlob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `vulnera-analysis-${baseFileName}-${timestamp}.zip`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);

                showSuccess("Analysis package downloaded successfully!");
            } catch (error) {
                console.error("Download failed:", error);
                showError("Download failed. Please try again.");
            } finally {
                // Restore button state
                downloadBtn.innerHTML = originalText;
                downloadBtn.disabled = false;
            }
        };
    }
}

function badgeFromSeverity(sev) {
    const s = safeSeverity(sev);
    if (s === "critical") {
        return "badge-error";
    }
    if (s === "high") {
        return "badge-warning";
    }
    if (s === "medium") {
        return "badge-accent";
    }
    if (s === "low") {
        return "badge-ghost";
    }
    return "badge-neutral";
}

function escapeHtmlLocal(str) {
    return escapeHtml(str);
}

// Public presenter to reuse UI for repository analyses too
// Normalizes metadata shape if needed and renders the package view
export function presentAnalysisPayload(payload, _options = {}) {
    try {
        const normalized = JSON.parse(JSON.stringify(payload || {}));
        const meta = normalized.metadata || {};

        // If repository analysis metadata is present, adapt to expected keys
        if (meta && meta.total_packages === null && typeof meta.unique_packages === "number") {
            meta.total_packages = meta.unique_packages;
        }
        if (!normalized.pagination) {
            normalized.pagination = { page: 1, total_pages: 1, per_page: 50 };
        }

        lastAnalysisData = normalized;
        lastAnalysisId = normalized.id || null;
        // For repository scans, set a pseudo filename for report packaging if missing
        if (!lastAnalysisFileName) {
            const repo = normalized?.repository;
            if (repo?.owner && repo?.repo) {
                lastAnalysisFileName = `${repo.owner}-${repo.repo}.repo.json`;
            } else {
                lastAnalysisFileName = "repository-analysis.json";
            }
        }
        currentPage = 1;
        totalPages = normalized.pagination.total_pages || 1;

        renderPackageView(normalized);
        setupDownloadButton(normalized);
    } catch (e) {
        console.error("Failed to present analysis payload", e);
    }
}
