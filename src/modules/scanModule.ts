import { getCookie } from "../utils/cookies";
import { logger } from "../utils/logger";
import { detectEcosystem } from "../utils/scan-handler";
import { apiClient } from "../utils/api/client";
import { API_ENDPOINTS } from "../config/api";
import { isAuthenticated } from "../utils/api/auth-store";
import { normalizeSeverity } from "../utils/severity";



export class ScanHandler {
  dropzone: HTMLElement;
  input: HTMLInputElement;
  list: HTMLElement;
  btnScan: HTMLButtonElement;
  btnImport: HTMLButtonElement;
  btnReset: HTMLElement;
  repoUrl: HTMLInputElement;
  detailLevelBtns: NodeListOf<HTMLElement>;
  analysisDepthBtns: NodeListOf<HTMLElement>;
  selectedDetailLevel: string = "standard"; // Default
  selectedAnalysisDepth: string = "standard"; // Default
  pickedFiles: File[] = [];
  ALL_MODULES = ["dependencies", "sast", "secrets", "api"];

  // Polling state
  isPolling: boolean = false;
  pollingTimeoutId: any = null;
  importStartTime: number = 0;

  startImportTimer() {
    this.importStartTime = Date.now();
  }

  stopImportTimer() {
    return Date.now() - this.importStartTime;
  }

  stopPolling() {
    this.isPolling = false;
    if (this.pollingTimeoutId) {
      clearTimeout(this.pollingTimeoutId);
      this.pollingTimeoutId = null;
    }
  }

  cleanupImport() {
    this.stopPolling();
    this.btnImport.disabled = false;
    this.btnImport.textContent = "> IMPORT_REPO";
  }

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
    const incoming: File[] = files ? Array.from(files) : [];
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

  /**
   * Map UI detail level to backend analysis_depth values
   * Backend expects: "full", "dependencies_only", "fast_scan"
   */
  mapDetailLevelToAnalysisDepth(detailLevel: string): string {
    const mapping: Record<string, string> = {
      basic: "dependencies_only",
      standard: "fast_scan",
      detailed: "full",
      full: "full",
    };
    return mapping[detailLevel] || "fast_scan"; // default to fast_scan
  }

  getReportData(result: any) {
    const allVulnerabilities: any[] = [];
    const allFindings = {
      dependencies: [] as any[],
      sast: [] as any[],
      secrets: [] as any[],
      api: [] as any[],
    };

    // Handle new response format with results array
    const resultsArray = result.results || [];

    // Process each result (e.g., package.json, requirements.txt, etc.)
    resultsArray.forEach((scanResult: any) => {
      // Process dependency vulnerabilities from this result
      if (scanResult.vulnerabilities && Array.isArray(scanResult.vulnerabilities)) {
        scanResult.vulnerabilities.forEach((vuln: any) => {
          // Extract package info from affected_packages if available
          const affectedPackage = vuln.affected_packages?.[0];
          const packageName = affectedPackage?.name || vuln.package_name || vuln.name || "unknown";
          const packageVersion = affectedPackage?.version || vuln.current_version || vuln.version || "unknown";

          // Get severity using centralized utility
          const severity = normalizeSeverity(vuln.severity);

          const depvuln = {
            id: vuln.id || `dep-${Date.now()}-${Math.random()}`,
            type: "dependency",
            severity: severity,
            package: packageName,
            version: packageVersion,
            title: vuln.summary || vuln.description || vuln.title || "Vulnerable dependency",
            cve: vuln.id || vuln.cve_id,
            affectedFiles: [scanResult.filename || "unknown"],
            cvss: vuln.cvss_score || null,
            recommendation: affectedPackage?.fixed_versions?.[0]
              ? `Upgrade to ${affectedPackage.fixed_versions[0]}`
              : vuln.recommendation || (vuln.recommendations?.latest_safe
                ? `Upgrade to ${vuln.recommendations.latest_safe}`
                : "No fix available"),
          };
          allVulnerabilities.push(depvuln);
          allFindings.dependencies.push(depvuln);
        });
      }
    });

    // Also support legacy findings_by_type format for backward compatibility
    if (result.findings_by_type?.dependencies) {
      Object.values(result.findings_by_type.dependencies).forEach((depen: any) => {
        if (depen.cves && Array.isArray(depen.cves)) {
          depen.cves.forEach((vuln: any) => {
            const depvuln = {
              id: vuln.id,
              type: "dependency",
              severity: normalizeSeverity(vuln.severity),
              package: depen.package_name || "unknown",
              version: depen.current_version || "unknown",
              title: vuln.description || "Vulnerable dependency",
              cve: vuln.id,
              affectedFiles: [this.pickedFiles.map(f => f.name).join(", ")],
              cvss: vuln.cvss_score,
              recommendation: depen.recommendations.latest_safe ?
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
          confidence: sastFind.confidence || "Not Sure",
          severity: normalizeSeverity(sastFind.severity),
          title: sastFind.rule_id || "SAST issue detected",
          description: sastFind.description,
          package: sastFind.location.path.split('/').pop(), // Show filename as package
          version: `Line ${sastFind.location.line}`, // Show line number as version
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
          confidence: secret.confidence || "Not Sure",
          severity: secret.severity?.toUpperCase() || "UNDECIDED",
          title: secret.rule_id || "Secret Vulnerability",
          description: secret.description,
          package: secret.location.path.split('/').pop(), // Show filename as package
          version: `Line ${secret.location.line}`, // Show line number as version
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
    // Support both new and legacy response formats

    // Calculate severity breakdown from actual vulnerabilities
    const severityBreakdown = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    };

    allVulnerabilities.forEach((v: any) => {
      const sev = v.severity?.toLowerCase() || 'info';
      if (sev === 'critical') severityBreakdown.critical++;
      else if (sev === 'high') severityBreakdown.high++;
      else if (sev === 'medium') severityBreakdown.medium++;
      else if (sev === 'low') severityBreakdown.low++;
      else severityBreakdown.info++;
    });

    const summary = result.summary || {
      total_findings: result.total_vulnerabilities || allVulnerabilities.length,
      by_severity: severityBreakdown,
      by_type: {
        sast: 0,
        secrets: 0,
        dependencies: allFindings.dependencies.length,
        api: 0
      },
      modules_completed: result.metadata?.successful || result.successful || 0,
      modules_failed: result.metadata?.failed || result.failed || 0
    };

    const report = {
      scanId: result.project_id || result.scan_id || `scan-${Date.now()}`,
      jobId: result.job_id || result.scan_id, // Ensure jobId is passed for enrichment
      startedAt: result.started_at || new Date().toISOString(),
      finishedAt: result.completed_at || result.finished_at || new Date().toISOString(),
      durationMs: result.metadata?.duration_ms || 0,
      detailLevel: this.selectedDetailLevel,
      summary: {
        files: result.metadata?.total_files || this.pickedFiles.length,
        dependencies: result.metadata?.total_packages || 0,
        vulnerabilities: summary.total_findings || allVulnerabilities.length,
        critical: summary.by_severity?.critical || 0,
        high: summary.by_severity?.high || 0,
        medium: summary.by_severity?.medium || 0,
        low: summary.by_severity?.low || 0,
      },
      files: resultsArray.map((r: any) => ({
        file: r.filename || "unknown",
        ecosystem: r.ecosystem || "unknown",
        dependencies: r.metadata?.total_packages || r.packages?.length || 0,
        vulnerable: r.metadata?.vulnerable_packages || 0
      })),
      vulnerabilities: allVulnerabilities,
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
        critical: report.summary.critical,
        high: report.summary.high,
        medium: report.summary.medium,
        low: report.summary.low,
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

  getRepoReportData(result: unknown, repoInfo: { owner: string; repo: string }, durationMs: number, _jobId: string) {
    // Similar to getReportData but tailored for repo scans
    // _jobId reserved for future use (e.g., linking to job details page)
    // We can reuse getReportData logic for now, but wrap it to inject repo info
    const data = result as { metadata?: { duration_ms?: number } };

    // Construct a synthetic file object for the repo
    const repoFile = {
      name: `${repoInfo.owner}/${repoInfo.repo}`,
      size: 0,
      type: "git-repo"
    };

    // Hack: Add to pickedFiles so getReportData processes it correctly
    // In a real refactor, we should separate data processing from UI state
    this.pickedFiles = [repoFile as unknown as File];

    // Inject duration if missing
    if (!data.metadata) data.metadata = {};
    if (!data.metadata.duration_ms) data.metadata.duration_ms = durationMs;

    this.getReportData(data);
  }
  async startScan() {
    if (!this.pickedFiles.length) {
      alert("Select files to scan.");
      return;
    }

    try {
      this.btnScan.disabled = true;
      this.btnScan.textContent = "> SCANNING...";

      if (!isAuthenticated()) {
        alert("⚠️ Session expired. Please log in again.");
        return;
      }

      // -------------------------------------------
      // 1) Build filesPayload (read content)
      // -------------------------------------------
      const filesPayload = [];

      for (const file of this.pickedFiles) {
        try {
          const content = await file.text();
          const ecosystem = detectEcosystem(file.name);

          filesPayload.push({
            filename: file.name,
            ecosystem: ecosystem,
            file_content: content
          });

        } catch (e) {
          logger.error(`Error reading file ${file.name}`, e);
        }
      }

      if (!filesPayload.length) {
        alert("No valid files to analyze");
        return;
      }

      // -------------------------------------------
      // 2) Build final payload for /api/v1/analyze/job
      // -------------------------------------------
      const payload = {
        source_type: "file_upload",
        source_uri: "inline",
        analysis_depth: this.mapDetailLevelToAnalysisDepth(this.selectedDetailLevel),

        files: filesPayload.map(f => ({
          filename: f.filename,
          ecosystem: f.ecosystem,
          content: f.file_content
        }))
      };

      logger.debug("Sending scan payload", { fileCount: filesPayload.length });

      // -------------------------------------------
      // 3) Send request to backend
      // -------------------------------------------
      const apiResponse = await apiClient.post(
        API_ENDPOINTS.ANALYSIS.ANALYZE,
        payload
      );

      if (!apiResponse.ok) {
        if (apiResponse.status === 401) {
          alert("⚠️ Session expired. Please log in again.");
          return;
        }
        if (apiResponse.status === 404) {
          alert("⚠️ Endpoint not found in backend.");
          return;
        }
        if (apiResponse.status === 429) {
          alert("⚠️ Rate limit exceeded. Try again later.");
          return;
        }
        const errorMsg = typeof apiResponse.error === 'string' ? apiResponse.error : `HTTP ${apiResponse.status}`;
        throw new Error(errorMsg);
      }

      const result = apiResponse.data as {
        results?: unknown[];
        total_vulnerabilities?: number;
        metadata?: { total_files?: number };
      } | null;

      logger.debug("Full API response:", {
        ok: apiResponse.ok,
        status: apiResponse.status,
        data: result,
        dataType: typeof result,
        dataKeys: result ? Object.keys(result) : null,
      });

      if (!result) {
        logger.error("Empty or null response from API", {
          status: apiResponse.status,
          error: apiResponse.error
        });
        throw new Error("Empty response from server. Please check backend logs.");
      }

      logger.info("Scan data received", {
        hasResults: !!result.results,
        totalVulnerabilities: result.total_vulnerabilities,
        filesProcessed: result.metadata?.total_files || result.results?.length,
      });

      this.getReportData(result);

    } catch (e: any) {
      logger.error("Scan processing error", {
        message: e.message,
        code: e.code,
        stack: e.stack,
      });
      alert("Failed to process scan: " + (e.message || "Unknown error"));

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

    try {
      this.btnImport.disabled = true;
      this.btnImport.textContent = "> IMPORTING...";

      if (!isAuthenticated()) {
        alert("⚠️ Session expired. Please log in again.");
        return;
      }

      const urlObj = new URL(url);
      const parts = urlObj.pathname.split("/").filter((p) => p);
      const owner = parts[0];
      const repo = parts[1]?.replace(/\.git$/, "");

      if (!owner || !repo) {
        throw new Error("Invalid GitHub URL format.");
      }

      // For git repositories, source_uri is the GitHub URL
      // Valid analysis_depth: "full", "dependencies_only", "fast_scan"
      const requestBody = {
        source_type: "git" as const,
        source_uri: `https://github.com/${owner}/${repo}.git`,
        analysis_depth: this.mapDetailLevelToAnalysisDepth(this.selectedAnalysisDepth),
        callback_url: undefined, // Optional: can be added if needed
      };

      const apiResponse = await apiClient.post(
        API_ENDPOINTS.ANALYSIS.ANALYZE,
        requestBody
      );

      if (!apiResponse.ok) {
        if (apiResponse.status === 401) {
          throw new Error("Session expired. Please log in again.");
        }
        if (apiResponse.status === 404) {
          throw new Error(
            "Backend /api/v1/analyze/job endpoint not implemented."
          );
        }
        if (apiResponse.status === 429) {
          throw new Error("Rate limit exceeded. Try again later.");
        }
        const errorMsg = typeof apiResponse.error === 'string' ? apiResponse.error : `HTTP ${apiResponse.status}`;
        throw new Error(errorMsg);
      }

      const result = apiResponse.data as {
        job_id?: string;
        status?: string;
        message?: string;
        error?: string;
        results?: unknown[];
        findings_by_type?: unknown;
      } | null;

      // New job-based API returns job info, not immediate results
      if (result?.job_id) {
        logger.info("Repository scan job submitted", {
          job_id: result.job_id,
          status: result.status,
          message: result.message,
        });

        this.btnImport.textContent = "> PROCESSING...";

        // Start polling for results
        this.btnImport.textContent = "> INITIALIZING...";
        logger.info("Waiting 10s before polling job status...");

        // Start timer
        this.startImportTimer();

        // Wait 10 seconds before first poll as requested
        await new Promise(resolve => setTimeout(resolve, 10000));

        this.btnImport.textContent = "> PROCESSING...";

        // Pass repo info to polling function
        await this.pollJobStatus(result.job_id, { owner, repo });
        return;
      }

      // Legacy format support - if we get immediate results
      if (result?.status === "failed") {
        throw new Error("Repository analysis failed.");
      }

      // If we somehow got immediate results, process them
      if (result?.results || result?.findings_by_type) {
        this.getReportData(result);
      }

    } catch (e: any) {
      logger.error("Repository import error", e);
      alert("Failed: " + e.message);
      this.cleanupImport();
    } finally {
      // Only reset if not polling (polling handles its own reset)
      if (!this.isPolling) {
        this.btnImport.disabled = false;
        this.btnImport.textContent = "> IMPORT_REPO";
      }
    }
  }

  async pollJobStatus(jobId: string, repoInfo?: { owner: string; repo: string }) {
    const POLL_INTERVAL = 2000; // 2 seconds
    const MAX_ATTEMPTS = 150; // 5 minutes timeout (150 * 2s)
    let attempts = 0;

    // Prevent multiple polling instances
    if (this.isPolling) {
      logger.warn("Polling already in progress, ignoring duplicate call");
      return;
    }

    this.isPolling = true;

    const checkStatus = async () => {
      // Check if polling was cancelled
      if (!this.isPolling) {
        logger.info("Polling cancelled");
        return;
      }

      try {
        attempts++;
        logger.debug(`Polling attempt ${attempts}/${MAX_ATTEMPTS} for job ${jobId}`);

        if (attempts > MAX_ATTEMPTS) {
          throw new Error("Scan timed out after 5 minutes. Please check back later.");
        }

        const endpoint = API_ENDPOINTS.ANALYSIS.GET_JOB.replace(":job_id", jobId);
        const response = await apiClient.get(endpoint);

        if (!response.ok) {
          // Don't retry on auth errors
          if (response.status === 401) {
            throw new Error("Session expired. Please log in again.");
          }
          if (response.status === 404) {
            throw new Error(`Job ${jobId} not found. It may have been deleted.`);
          }
          throw new Error(`Failed to check job status: HTTP ${response.status}`);
        }

        const job = response.data as {
          status?: string;
          error?: string;
          message?: string;
          [key: string]: unknown;
        } | null;
        const status = job?.status?.toLowerCase() || "unknown";

        logger.debug("Job status poll:", {
          id: jobId,
          status: status,
          attempt: attempts,
          rawStatus: job?.status
        });

        // Handle terminal states
        if (status === "completed" || status === "succeeded") {
          // Job done! Stop timer and process results
          const durationMs = this.stopImportTimer();
          this.stopPolling();

          // Use repo-specific report generator for proper formatting
          if (repoInfo && job) {
            this.getRepoReportData(job, repoInfo, durationMs, jobId);
          } else if (job) {
            this.getReportData(job);
          }

          // Reset button
          this.btnImport.disabled = false;
          this.btnImport.textContent = "> IMPORT_REPO";
          return;
        }

        if (status === "failed" || status === "error") {
          throw new Error(job?.error || job?.message || "Scan job failed");
        }

        if (status === "cancelled") {
          throw new Error("Scan job was cancelled");
        }

        // Handle in-progress states: queued, running, pending, processing
        if (status === "queued" || status === "running" || status === "pending" || status === "processing") {
          // Still in progress, schedule next poll
          this.pollingTimeoutId = setTimeout(checkStatus, POLL_INTERVAL);
          return;
        }

        // Unknown status - log warning and continue polling (but with a limit)
        logger.warn(`Unknown job status: "${status}". Will continue polling.`);
        if (attempts < MAX_ATTEMPTS) {
          this.pollingTimeoutId = setTimeout(checkStatus, POLL_INTERVAL);
        } else {
          throw new Error(`Job stuck in unknown status: ${status}`);
        }

      } catch (e: any) {
        logger.error("Polling error", {
          error: e.message,
          jobId,
          attempts
        });
        this.cleanupImport();
        alert(e.message || "Error checking scan status");
      }
    };

    // Start polling
    logger.info(`Starting to poll job ${jobId}`);
    checkStatus();
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