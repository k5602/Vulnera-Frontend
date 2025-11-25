import { getCookie } from "../utils/cookies";
import { logger } from "../utils/logger";
import { detectEcosystem } from "../utils/scan-handler";
import { apiClient } from "../utils/api/client";
import { API_ENDPOINTS } from "../config/api";


export class ScanHandler {
    dropzone: HTMLElement;
    input: HTMLInputElement;
    list: HTMLElement;
    btnScan : HTMLButtonElement;
    btnImport: HTMLButtonElement;
    btnReset: HTMLElement;
    repoUrl: HTMLInputElement;
    detailLevelBtns : NodeListOf<HTMLElement>;
    analysisDepthBtns : NodeListOf<HTMLElement>;
    selectedDetailLevel: string = "standard"; // Default
    selectedAnalysisDepth: string = "standard"; // Default
    pickedFiles: File[] = [];
    ALL_MODULES = ["dependencies", "sast", "secrets", "api"];

    checkGithubToken() {
      const token = getCookie("github_token");
      const notice = document.getElementById("github-token-notice");

      if (!token) {
        // No token - show notice and disable controls
        notice?.classList.remove("hidden");
      } else {
        // Token exists - hide notice and enable controls
        notice?.classList.add("hidden");
      }

      return token;
    }

    removeActiveBTNDetailClass() {
        this.detailLevelBtns.forEach((b) => {
            b.classList.remove(
              "active",
              "border-cyber-400/60",
              "bg-cyber-400/10",
              "text-cyber-300"
            );
            b.classList.add("border-gray-600/40", "text-gray-400");
          });

    }

    addActiveBTNDetailClass() {
        this.detailLevelBtns.forEach((btn) => {
            btn.addEventListener("click", () => {
            // Remove active class from all buttons
            this.removeActiveBTNDetailClass();

            // Add active class to clicked button
            btn.classList.add(
            "active",
            "border-cyber-400/60",
            "bg-cyber-400/10",
            "text-cyber-300"
            );
            btn.classList.remove("border-gray-600/40", "text-gray-400");

            // Update selected detail level
            this.selectedDetailLevel = btn.getAttribute("data-detail-level")!;
            logger.debug("Detail level selected:", this.selectedDetailLevel);
            });
        });
    }

    removeActiveBTNAnalysisClass() {
        this.analysisDepthBtns.forEach((b) => {
            b.classList.remove(
              "active",
              "border-cyber-400/60",
              "bg-cyber-400/10",
              "text-cyber-300"
            );
            b.classList.add("border-gray-600/40", "text-gray-400");
          });
    }

    addActiveBTNAnalysisClass() {
        this.analysisDepthBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          // Remove active class from all buttons
            this.removeActiveBTNAnalysisClass();
          // Add active class to clicked button
          btn.classList.add(
            "active",
            "border-cyber-400/60",
            "bg-cyber-400/10",
            "text-cyber-300"
          );
          btn.classList.remove("border-gray-600/40", "text-gray-400");

          // Update selected analysis depth
          const depthValue = btn.getAttribute("data-analysis-depth");
          this.selectedAnalysisDepth = depthValue || "standard";
          logger.debug("Analysis depth selected:", this.selectedAnalysisDepth);
        });
      });
    }

    renderFiles() {
        if (!this.list) return;
        this.list.innerHTML = "";
        if (this.pickedFiles.length === 0) {
          this.list.innerHTML =
            '<li class="text-gray-500 text-center py-2">No files selected</li>';
          return;
        }
        this.pickedFiles.forEach((f, index) => {
          const li = document.createElement("li");
          li.className =
            "flex items-center justify-between gap-2 bg-black/40 border border-matrix-500/30 rounded px-3 py-2 hover:bg-black/60 transition-colors";

          const fileInfo = document.createElement("div");
          fileInfo.className = "flex items-center gap-2 flex-1 min-w-0";

          const icon = document.createElement("span");
          icon.textContent = "📄";
          icon.className = "text-sm";

          const text = document.createElement("span");
          text.className = "truncate text-xs sm:text-sm";
          text.textContent = `${f.name}`;

          const size = document.createElement("span");
          size.className = "text-xs text-gray-500 whitespace-nowrap";
          size.textContent = `(${Math.round(f.size / 1024)} KB)`;

          fileInfo.appendChild(icon);
          fileInfo.appendChild(text);
          fileInfo.appendChild(size);

          const removeBtn = document.createElement("button");
          removeBtn.className =
            "text-red-400 hover:text-red-300 text-xs px-2 py-1 hover:bg-red-400/10 rounded transition-colors";
          removeBtn.textContent = "✕";
          removeBtn.title = "Remove file";
          removeBtn.onclick = () => {
            this.pickedFiles.splice(index, 1);
            this.renderFiles();
          };

          li.appendChild(fileInfo);
          li.appendChild(removeBtn);
          this.list.appendChild(li);
        });
    }

    handleFiles(files: FileList | null) {
        const incoming: File[] = files ? Array.from(files) : [] ;
        if (!incoming.length) return;
        this.pickedFiles = [...this.pickedFiles, ...incoming].slice(0, 50);
        this.renderFiles();
    }

    dragAndDropSetup() {
        this.dropzone?.addEventListener("dragenter", (e) => {
        e.preventDefault();
        this.dropzone.classList.add("bg-black/50");
      });

      this.dropzone?.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
        this.dropzone.classList.add("bg-black/50");
      });

      this.dropzone?.addEventListener("dragleave", () => {
        this.dropzone.classList.remove("bg-black/50");
      });

      this.dropzone?.addEventListener("drop", (e) => {
        e.preventDefault();
        this.dropzone.classList.remove("bg-black/50");
        this.handleFiles(e.dataTransfer?.files ?? null);
      });
    }

    dispatchReport(report: any) {
        window.dispatchEvent(
          new CustomEvent("vulnera:scan-report", { detail: report })
        );
    }

    getSelectedModules() {
        return this.ALL_MODULES;
    }

    getReportData(result: any) {
        const allVulnerabilities: any[] = [];
          const allFindings = {
            dependencies: [] as any[],
            sast: [] as any[],
            secrets: [] as any[],
            api: [] as any[],
          };

              // Process dependency vulnerabilities
            if (result.findings_by_type?.dependencies) {
               Object.values(result.findings_by_type.dependencies).forEach((depen: any) => {
                if (depen.cves && Array.isArray(depen.cves)) {
                    depen.cves.forEach((vuln: any) => {
                    const depvuln = {
                    id: vuln.id,
                    type: "dependency",
                    severity: vuln.severity?.toUpperCase() || "UNKNOWN",
                    package: depen.package_name || "unknown",
                    version: depen.current_version || "unknown",
                    title: vuln.description || "Vulnerable dependency",
                    cve: vuln.id,
                    affectedFiles: [this.pickedFiles.map(f => f.name).join(", ")],
                    cvss: vuln.cvss_score,
                    recommendation: depen.recommendations.latest_safe?
                        `Upgrade to ${depen.recommendations.latest_safe}`
                      : "No fix available",
                  };
                  allVulnerabilities.push(depvuln);
                  allFindings.dependencies.push(depvuln);
                    });
                }
                });
              }

              // Process SAST findings
              if (result.findings_by_type?.sast) {
                result.findings_by_type.sast.forEach((sastFind: any) => {
                    if (!sastFind.id) return;
                  const sastFinding = {
                    id: sastFind.id,
                    type: "sast",
                    confidence:sastFind.confidence || "Not Sure",
                    severity: sastFind.severity?.toUpperCase() || "UNDECIDED",
                    title: sastFind.rule_id || "SAST issue detected",
                    description: sastFind.description,
                    affected_file_location: sastFind.location.path,
                    start_line: sastFind.location.line,
                    end_line: sastFind.location.end_line,
                    start_col: sastFind.location.column,
                    end_col: sastFind.location.end_column,
                    recommendation: sastFind.recommendation,
                  };
                  allVulnerabilities.push(sastFinding);
                  allFindings.sast.push(sastFinding);

                });
              }

              // Process Secrets findings
              if (result.findings_by_type?.secrets) {
                result.findings_by_type.secrets.forEach((secret: any) => {
                    if (!secret.id) return;
                    const secretFinding = {
                        id: secret.id,
                        secretType: secret.type,
                        confidence:secret.confidence || "Not Sure",
                        severity: secret.severity?.toUpperCase() || "UNDECIDED",
                        title: secret.rule_id || "Secret Vulnerability",
                        description: secret.description,
                        affected_file_location: secret.location.path,
                        start_line: secret.location.line,
                        end_line: secret.location.end_line,
                        start_col: secret.location.column,
                        end_col: secret.location.end_column,
                        recommendation: secret.recommendation,
                  };
                  allVulnerabilities.push(secretFinding);
                  allFindings.secrets.push(secretFinding);
                });
              }

              // Process API Security findings (to be implemented)
            //   if (result.findings_by_type?.api) {
            //     result.findings_by_type.api.forEach((finding: any) => {
            //       const apiFinding = {
            //         id: finding.id || `api-${Date.now()}-${Math.random()}`,
            //         type: "api",
            //         severity: finding.severity?.toUpperCase() || "MEDIUM",
            //         title: finding.title || "API security issue",
            //         description: finding.description,
            //         endpoint: finding.endpoint,
            //         method: finding.method,
            //         affected_file_location: finding.location.path,
            //         start_line: finding.location.line,
            //         end_line: finding.location.end_line,
            //         start_col: finding.location.column,
            //         end_col: finding.location.end_column,
            //         recommendation: finding.recommendation,
            //       };
            //       allVulnerabilities.push(apiFinding);
            //       allFindings.api.push(apiFinding);
            //     });
            //   }

          // Build consolidated report with detail level
          const report = {
            scanId: result.project_id,
            startedAt: result.started_at,
            finishedAt: result.completed_at,
            detailLevel: this.selectedDetailLevel, // Add detail level to report
            summary: {
              totalFiles: this.pickedFiles.length,
              totalVulnerabilities: result.summary.total_findings,
              sortBySeverity: {
                critical: result.summary.by_severity.critical,
                high: result.summary.by_severity.high,
                medium: result.summary.by_severity.medium,
                low: result.summary.by_severity.low,
                info: result.summary.by_severity.info
                },
              sortByType:{
                sast: result.summary.by_type.sast,
                secrets: result.summary.by_type.secrets,
                dependencies: result.summary.by_type.dependencies,
                api: result.summary.by_type.api
                },
              modules: {
                Completed: result.summary.modules_completed,
                Failed: result.summary.modules_failed
                },
            },
            files: this.pickedFiles.map((f) => ({file: f.name, ecosystem: detectEcosystem(f.name)})),
            vulnerabilities: allVulnerabilities,
            findings: allFindings,
            modules: result.modules.map((mod: any) => ({
                module: mod.name,
                status: mod.status,
                filesScanned: mod.files_scanned,
                duration: mod.duration_ms,
                error: mod.error? mod.error : "No errors",
            })),
          };

          logger.info("Scan completed successfully", {
            reportId: report.startedAt,
          });

          // Save scan result to localStorage for dashboard
          try {
            const scanHistory = JSON.parse(
              localStorage.getItem("scan_history") || "[]"
            );
            const scanRecord = {
              id: report.scanId,
              timestamp: report.finishedAt,
              filesCount: this.pickedFiles.length,
              vulnerabilities: allVulnerabilities.length,
              critical: report.summary.sortBySeverity.critical,
              high: report.summary.sortBySeverity.high,
              medium: report.summary.sortBySeverity.medium,
              low: report.summary.sortBySeverity.low,
              files: this.pickedFiles.map((f) => f.name),
              ecosystems: [...new Set(this.pickedFiles.map((f) => detectEcosystem(f.name)))],
              report: report,
            };
            scanHistory.unshift(scanRecord); // Add to beginning
            // Keep only last 50 scans
            if (scanHistory.length > 50) scanHistory.length = 50;
            localStorage.setItem("scan_history", JSON.stringify(scanHistory));
          } catch (e) {
            logger.error("Failed to save scan to history", e);
          }

          this.dispatchReport(report);

          this.pickedFiles = [];
          this.renderFiles();
    }

    async startScan() {
        if (!this.pickedFiles.length) {
          alert("Select files to scan.");
          return;
        }

        try {
          this.btnScan.disabled = true;
          this.btnScan.textContent = "> SCANNING...";

          // Check authentication
          const token = getCookie("auth_token");
          const apiKey = getCookie("api_key");
          if (!token && !apiKey) {
            alert(
              "⚠️ Authentication required\n\nPlease log in first or generate an API key in Settings."
            );
            return;
          }

          // Prepare batch request for all files
          const filesPayload = [];

          for (const file of this.pickedFiles) {
            try {
              const content = await file.text();

              // Detect ecosystem from filename
              const ecosystem = detectEcosystem(file.name);

              filesPayload.push({
                filename: file.name,
                ecosystem: ecosystem,
                file_content: content,
              });
            } catch (e) {
              logger.error(`Error reading file ${file.name}`, e);
            }
          }

          if (!filesPayload.length) {
            alert("No valid files to analyze");
            return;
          }

          // Build query parameters
          const queryParams = new URLSearchParams({
            detail_level: this.selectedDetailLevel,
          });

          // Add selected modules
          this.ALL_MODULES.forEach((module) => {
            queryParams.append("modules", module);
          });

          // Call new batch dependencies analyze endpoint using apiClient
          const endpoint = `${API_ENDPOINTS.ANALYSIS.ANALYZE_DEPENDENCIES}?${queryParams.toString()}`;
          const apiResponse = await apiClient.post(endpoint, {
            files: filesPayload,
          });

          if (!apiResponse.success) {
            if (apiResponse.status === 401) {
              alert(
                "⚠️ Authentication Error\n\nYour session has expired. Please log in again."
              );
              return;
            }
            if (apiResponse.status === 404) {
              alert(
                "⚠️ Endpoint Not Found\n\nThe backend API endpoint does not exist. Please check backend implementation."
              );
              return;
            }
            if (apiResponse.status === 429) {
              alert(
                "⚠️ Rate Limit Exceeded\n\nToo many requests. Please try again later."
              );
              return;
            }
            throw new Error(apiResponse.error || `HTTP ${apiResponse.status}`);
          }

          const result = apiResponse.data;

          this.getReportData(result);

          // Transform new API response to report format
        } catch (e: any) {
          logger.error("Scan error", e);
          alert("Failed to start scan: " + (e.message || "Unknown error"));
        } finally {
          this.btnScan.disabled = false;
          this.btnScan.textContent = "> START_SCAN";
        }
    }

    async importRepository() {
        const url = this.repoUrl?.value?.trim?.() ?? "";
        if (!url || !/^https?:\/\/github.com\//i.test(url)) {
          alert("Please enter a valid GitHub repository URL.");
          return;
        }

        // Get GitHub token from cookie

        try {
          this.btnImport.disabled = true;
          this.btnImport.textContent = "> IMPORTING...";

          // Check authentication (apiClient handles auth automatically)
          const token = getCookie("auth_token");
          const apiKey = getCookie("api_key");
          if (!token && !apiKey) {
            alert(
              "⚠️ Authentication required\n\nPlease log in first or generate an API key in Settings."
            );
            return;
          }

          // Note: GitHub token (X-GitHub-Token header) would need to be added to apiClient if needed
          // For now, apiClient handles standard auth (API key or Bearer token)
          // Extract owner and repo from GitHub URL
          const urlObj = new URL(url);
          const pathParts = urlObj.pathname.split("/").filter((p) => p);
          const owner = pathParts[0];
          const repo = pathParts[1]?.replace(/\.git$/, "");

          if (!owner || !repo) {
            throw new Error(
              "Invalid GitHub URL. Expected format: https://github.com/owner/repo"
            );
          }

          // Ensure analysis_depth is a valid value
        //   const validDepths = ["minimal", "standard", "full"];
        //   const analysisDepth = validDepths.includes(selectedAnalysisDepth)
        //     ? selectedAnalysisDepth
        //     : "standard";

          // Build request body according to OpenAPI spec
          const requestBody = {
            source_type: "git",
            source_uri: `https://github.com/${owner}/${repo}.git`,
            analysis_depth: "full",
          };

          // Call analyze/job endpoint
          const apiResponse = await apiClient.post(
            API_ENDPOINTS.ANALYSIS.ANALYZE,
            requestBody
          );

          if (!apiResponse.success) {
            if (apiResponse.status === 401) {
              throw new Error(
                "Authentication failed: Your session has expired or the token is invalid. Please log in again."
              );
            }
            if (apiResponse.status === 404) {
              throw new Error(
                "Endpoint not found: The backend API endpoint /api/v1/analyze/job does not exist. Please check backend implementation."
              );
            }
            if (apiResponse.status === 429) {
              throw new Error("Rate limit exceeded. Please try again later.");
            }
            throw new Error(
              apiResponse.error || `HTTP ${apiResponse.status}: Request failed`
            );
          }

          const result = apiResponse.data;

          // Check job status
          if (result.status === "failed") {
            throw new Error(
              "Repository analysis failed. Please check the repository URL and try again."
            );
          }

          // Transform job response to report format
          this.getReportData(result);

        } catch (e) {
          logger.error("Repository import error", e);
          let errorMsg = "Unknown error";

          // Handle fetch abort/timeout
          if (e instanceof Error && e.name === "AbortError") {
            errorMsg =
              "Request timeout: The repository analysis took too long. The backend may be busy or the repository may be very large. Please try again later.";
          } else if (e instanceof Error) {
            errorMsg = e.message;
          } else if (typeof e === "string") {
            errorMsg = e;
          } else {
            errorMsg = JSON.stringify(e);
          }

          // Add fallback message if error is empty
          if (!errorMsg || errorMsg.trim() === "") {
            errorMsg =
              "Backend endpoint may not be implemented or server is unreachable";
          }

          // Enhanced error messages based on error type
          let alertTitle = "❌ Failed to import repository";
          let suggestions =
            "Please check:\n• Repository URL is correct\n• Repository is public or you have access\n• Backend server is running and accessible";

          if (
            errorMsg.includes("Authentication failed") ||
            errorMsg.includes("expired") ||
            errorMsg.includes("401")
          ) {
            alertTitle = "⚠️ Authentication Error";
            suggestions = "Please log in again to continue.";
          } else if (
            errorMsg.includes("404") ||
            errorMsg.includes("not found") ||
            errorMsg.includes("Endpoint not found")
          ) {
            alertTitle = "⚠️ Backend API Not Available";
            suggestions =
              "The backend endpoint does not exist.\n\nThis feature requires:\n• Backend API v1 with /api/v1/analyze/job endpoint\n• Proper backend deployment and configuration";
          } else if (errorMsg.includes("JSON") || errorMsg.includes("parse")) {
            alertTitle = "⚠️ Invalid Backend Response";
            suggestions =
              "The backend returned an unexpected response format.\n\nPossible causes:\n• Backend is not running\n• Backend returned HTML error page\n• API endpoint returns wrong content type";
          } else if (
            errorMsg.includes("NetworkError") ||
            errorMsg.includes("Failed to fetch")
          ) {
            alertTitle = "⚠️ Network Error";
            suggestions =
              "Cannot connect to backend server.\n\nPlease check:\n• Backend server is running\n• CORS is properly configured\n• Check API configuration";
          }

          alert(`${alertTitle}\n\n${errorMsg}\n\n${suggestions}`);
        } finally {
          this.btnImport.disabled = false;
          this.btnImport.textContent = "> IMPORT_REPO";
        }
      }


    constructor(dropzone: HTMLElement, input: HTMLInputElement, list: HTMLElement, btnScan: HTMLButtonElement, btnImport: HTMLButtonElement, btnReset: HTMLButtonElement, repoUrl: HTMLInputElement, detailLevelBtns: NodeListOf<HTMLButtonElement>, analysisDepthBtns: NodeListOf<HTMLButtonElement>) {
        this.dropzone = dropzone;
        this.input = input;
        this.list = list;
        this.btnScan = btnScan;
        this.btnImport = btnImport;
        this.btnReset = btnReset;
        this.repoUrl = repoUrl;
        this.detailLevelBtns = detailLevelBtns;
        this.analysisDepthBtns = analysisDepthBtns;
    }
}