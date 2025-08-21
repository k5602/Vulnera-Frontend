import { CONFIG } from '../config.js';
import { detectEcosystemForApi } from '../utils/ecosystems.js';
import { showError, showSuccess } from '../ui/notifications.js';
import { generateHTMLReport } from '../html-report-generator.js';

let lastAnalysisData = null;
let lastAnalysisFileName = null;

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
      const file_content = await file.text();
      
      if (CONFIG.ENABLE_DEBUG === 'true') {
        console.log("🔍 API Request to:", `${CONFIG.API_ENDPOINT}/analyze`);
        console.log("📤 Request data:", { ecosystem, filename: file.name });
      }

      // Create AbortController for request timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);

      const res = await fetch(`${CONFIG.API_ENDPOINT}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": `${CONFIG.APP_NAME}/${CONFIG.APP_VERSION}`,
        },
        body: JSON.stringify({ ecosystem, file_content, filename: file.name }),
        signal: controller.signal,
      });

      // Clear timeout if request completes
      clearTimeout(timeoutId);

      if (CONFIG.ENABLE_DEBUG === 'true') {
        console.log("📥 Response status:", res.status, res.statusText);
      }
      
      const payload = await res.json().catch(() => ({}));
      
      if (CONFIG.ENABLE_DEBUG === 'true') {
        console.log("📊 Response payload:", payload);
      }

      loadingModal.checked = false;

      if (!res.ok) {
        const message =
          payload?.message ||
          payload?.error ||
          `Request failed (${res.status})`;
        showError(message);
        return;
      }

      // Store analysis data for download
      lastAnalysisData = payload;
      lastAnalysisFileName = file.name;

      renderAnalysisResult(payload);
    } catch (err) {
      loadingModal.checked = false;
      
      // Enhanced error handling
      let errorMessage = "Network error while contacting the API.";
      
      if (err.name === 'AbortError') {
        errorMessage = `Request timeout (${CONFIG.API_TIMEOUT}ms). The server might be slow or unavailable.`;
      } else if (err.message.includes('Failed to fetch')) {
        errorMessage = `Cannot reach the API server at ${CONFIG.API_BASE_URL}. Please check your connection or try switching to a different environment.`;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      showError(errorMessage);
      
      if (CONFIG.ENABLE_DEBUG === 'true') {
        console.error("API Error Details:", {
          error: err,
          apiEndpoint: CONFIG.API_ENDPOINT,
          environment: CONFIG.ENVIRONMENT,
          timestamp: new Date().toISOString()
        });
      }
      console.error(err);
    }
  }

  function renderAnalysisResult(data) {
    const resultModal = document.getElementById("result-modal");
    resultModal.checked = true;

    const meta = data?.metadata || {};
    const vulns = Array.isArray(data?.vulnerabilities)
      ? data.vulnerabilities
      : [];

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
            <span class="badge ${badgeFromSeverity(v.severity)}">${
          v.severity
        }</span>
            <span class="truncate">${escapeHtml(v.id)} — ${escapeHtml(
          v.summary
        )}</span>
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
                          `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(
                            p.version
                          )}</td><td>${escapeHtml(p.ecosystem)}</td></tr>`
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
                      `<a class="link link-primary text-xs" href="${encodeURI(
                        r
                      )}" target="_blank" rel="noreferrer">${escapeHtml(r)}</a>`
                  )
                  .join("")}
              </div>`
                : ""
            }
          </div>
        </div>`
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
          // Generate HTML report
          const fileName = lastAnalysisFileName || "dependency-analysis";
          const htmlContent = generateHTMLReport(data, fileName);

          // Create and download HTML file
          const blob = new Blob([htmlContent], {
            type: "text/html;charset=utf-8",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `vulnera-report-${fileName.replace(/\.[^/.]+$/, "")}-${
            new Date().toISOString().split("T")[0]
          }.html`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);

          showSuccess("HTML report downloaded successfully!");

        } catch (error) {
          console.error("Download failed:", error);
          showError("Download failed. Please try again.");
        }
      };
    }
  }

  function badgeFromSeverity(sev) {
    const s = String(sev || "").toLowerCase();
    if (s === "critical") return "badge-error";
    if (s === "high") return "badge-warning";
    if (s === "medium") return "badge-accent";
    return "badge-ghost";
  }

  function escapeHtml(str) {
    return String(str || "").replace(
      /[&<>"]+/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
        }[c])
    );
  }
  