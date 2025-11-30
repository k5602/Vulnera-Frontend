import { getCookie, setCookie } from "../utils/cookies";
import { logger } from "../utils/logger";
import { detectEcosystem } from "../utils/scan-handler";
import { apiClient } from "../utils/api/client";
import { API_ENDPOINTS } from "../config/api";
import { isAuthenticated } from "../utils/api/auth-store";
import { normalizeSeverity } from "../utils/severity";
import { getWebhookConfig, isLocalhostEnv } from "../utils/webhook-store";
import {
  transformScanResult,
  createScanHistoryRecord,
  type RawScanResult,
  type TransformedReport,
} from "../utils/report-transformer";



export class ScanHandler {
  dropzone: HTMLElement;
  input: HTMLInputElement;
  list: HTMLElement;
  btnScan: HTMLButtonElement;
  btnImport: HTMLButtonElement;
  btnReset: HTMLElement;
  repoUrl: HTMLInputElement;
  chkPrivateRepo: HTMLInputElement;
  githubTokenInput: HTMLInputElement;
  authTokenLabel: HTMLElement;
  sourceTypeToggle: HTMLElement;
  currentSourceType: 'git' | 's3' = 'git';
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
    return getCookie("github_token");
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
        // Update selected analysis depth
        const depthValue = btn.getAttribute("data-analysis-depth");
        this.selectedAnalysisDepth = depthValue || "standard";
        logger.debug("Analysis depth selected:", this.selectedAnalysisDepth);

        // Update UI for ALL buttons to match the selected depth
        this.analysisDepthBtns.forEach((b) => {
          const bDepth = b.getAttribute("data-analysis-depth");
          if (bDepth === this.selectedAnalysisDepth) {
            // Add active class
            b.classList.add("active");
            b.classList.remove("border-gray-600/40", "text-gray-400", "border-transparent");

            // Check if it's in the upload section (cyan) or github section (purple)
            // This is a bit hacky, but we can check the parent or just apply generic active styles
            // For now, let's try to preserve the specific color if possible, or just use a neutral active color
            // Or better: check if the button contains specific classes or is in a specific container.
            // Simpler: Just re-apply the classes that were there initially for "active" state.
            // But the initial HTML has different colors (purple vs cyan).

            if (b.closest('#github-import-section')) {
              b.classList.add("border-purple-500/30", "bg-purple-500/10", "text-purple-300");
              b.classList.remove("text-gray-500");
            } else {
              // Upload section (Cyan)
              b.classList.add("border-cyan-500/30", "bg-cyan-500/10", "text-cyan-300");
              b.classList.remove("text-gray-500");
            }
          } else {
            // Remove active class
            b.classList.remove(
              "active",
              "border-purple-500/30", "bg-purple-500/10", "text-purple-300",
              "border-cyan-500/30", "bg-cyan-500/10", "text-cyan-300"
            );
            b.classList.add("border-transparent", "text-gray-500");
          }
        });
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

  /**
   * Process scan results and dispatch report
   * Uses report-transformer for data transformation
   * Accepts unknown data and safely casts to RawScanResult
   */
  getReportData(result: unknown) {
    // Use the centralized transformer for data processing
    // The transformer handles unknown input safely
    const report = transformScanResult(result as RawScanResult, {
      detailLevel: this.selectedDetailLevel,
      scannedFiles: this.pickedFiles,
    });

    logger.info("Scan completed successfully", {
      reportId: report.startedAt,
      vulnerabilities: report.vulnerabilities.length,
    });

    // Save scan result to localStorage for dashboard
    this.saveScanToHistory(report);

    // Dispatch report event for UI consumption
    this.dispatchReport(report);

    // Reset UI state
    this.pickedFiles = [];
    this.renderFiles();
  }

  /**
   * Save scan report to localStorage history
   */
  private saveScanToHistory(report: TransformedReport) {
    try {
      const scanHistory = JSON.parse(
        localStorage.getItem("scan_history") || "[]"
      );

      const ecosystems = this.pickedFiles.map((f) => detectEcosystem(f.name));
      const scanRecord = createScanHistoryRecord(report, this.pickedFiles, ecosystems);

      scanHistory.unshift(scanRecord);
      // Keep only last 50 scans
      if (scanHistory.length > 50) scanHistory.length = 50;
      localStorage.setItem("scan_history", JSON.stringify(scanHistory));
    } catch (e) {
      logger.error("Failed to save scan to history", e);
    }
  }

  /**
   * Process repository scan results
   */
  getRepoReportData(result: unknown, repoInfo: { owner: string; repo: string }, durationMs: number, _jobId: string) {
    const data = result as RawScanResult;

    // Construct a synthetic file object for the repo
    const repoFile = {
      name: `${repoInfo.owner}/${repoInfo.repo}`,
      size: 0,
      type: "git-repo"
    };

    // Set pickedFiles for history record
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

    // Check for private repo checkbox and token input
    const isPrivateChecked = this.chkPrivateRepo?.checked;
    const manualToken = this.githubTokenInput?.value;

    // Use manual token if provided, otherwise fallback to cookie
    const token = manualToken || this.checkGithubToken();
    const isPrivate = !!token || isPrivateChecked;

    logger.debug("Importing repository", { url, isPrivate, hasToken: !!token, manualToken: !!manualToken });

    try {
      this.btnImport.disabled = true;
      this.btnImport.textContent = "> IMPORTING...";

      if (!isAuthenticated()) {
        alert("⚠️ Session expired. Please log in again.");
        return;
      }
      let owner, repo;
      if (this.currentSourceType === 'git') {
        const urlObj = new URL(url);
        const parts = urlObj.pathname.split("/").filter((p) => p);
        if (parts.length < 2) {
          alert("⚠️ Invalid GitHub URL. Format: https://github.com/owner/repo");
          this.btnImport.disabled = false;
          this.btnImport.textContent = "🚀 IMPORT_AND_SCAN";
          return;
        }
        owner = parts[0];
        repo = parts[1]?.replace(/\.git$/, "");
      } else {
        // For S3, we might not need owner/repo parsing in the same way, or we parse bucket/key
        // For now, let's just use the URL as is or do basic validation
        if (!url.startsWith('s3://') && !url.startsWith('https://')) {
          // Basic check, though https s3 urls exist too
        }
        // For S3, owner/repo might not be directly applicable, or we can derive bucket/key
        // For now, we'll leave them undefined or set to empty strings if not used.
        owner = "";
        repo = "";
      }

      if (!owner && this.currentSourceType === 'git' || !repo && this.currentSourceType === 'git') {
        throw new Error("Invalid GitHub URL format.");
      }

      // If private checked but no token
      if (isPrivateChecked && !token) {
        alert("⚠️ Please enter a GitHub token for private repositories.");
        this.btnImport.disabled = false;
        this.btnImport.textContent = "🚀 IMPORT_AND_SCAN";
        return;
      }

      // For git repositories, source_uri is the GitHub URL
      // Valid analysis_depth: "full", "dependencies_only", "fast_scan"

      // Get webhook config (null if localhost - webhook unreachable)
      const webhookConfig = getWebhookConfig();
      const useWebhook = webhookConfig !== null;

      if (useWebhook) {
        logger.info('Webhook enabled for scan', { callback_url: webhookConfig.callback_url });
      } else {
        logger.info('Webhook disabled (localhost) - using polling only');
      }

      const requestBody: {
        source_type: 'git';
        source_uri: string;
        analysis_depth: string;
        callback_url?: string;
        webhook_secret?: string;
      } = {
        source_type: "git" as const,
        source_uri: `https://github.com/${owner}/${repo}.git`,
        analysis_depth: this.mapDetailLevelToAnalysisDepth(this.selectedAnalysisDepth),
      };

      // Add webhook config if not localhost
      if (webhookConfig) {
        requestBody.callback_url = webhookConfig.callback_url;
        requestBody.webhook_secret = webhookConfig.webhook_secret;
      if (manualToken && this.currentSourceType === 'git') {
        setCookie("github_token", manualToken, { days: 1 / 24, sameSite: "Strict", secure: true });
      }

      const headers: Record<string, string> = {};
      if (token) {
        if (this.currentSourceType === 'git') {
          headers["X-GitHub-Token"] = token;
        } else {
          headers["X-AWS-Credentials"] = token;
        }
      }

      const apiResponse = await apiClient.post(
        API_ENDPOINTS.ANALYSIS.ANALYZE,
        requestBody,
        { headers }
      );

      // Check for authentication/authorization errors that indicate private repo
      if (!apiResponse.ok) {
        if (apiResponse.status === 401 || apiResponse.status === 403 || apiResponse.status === 404) {
          // Check if this might be a private repo issue
          if (!isPrivateChecked && this.currentSourceType === 'git') {
            const errorData = apiResponse.data as { error?: string; message?: string; detail?: string } | null;
            const errorMsg = errorData?.error || errorData?.message || errorData?.detail || '';
            const isPrivateRepoError =
              errorMsg.toLowerCase().includes('private') ||
              errorMsg.toLowerCase().includes('not found') ||
              errorMsg.toLowerCase().includes('authentication') ||
              errorMsg.toLowerCase().includes('unauthorized') ||
              apiResponse.status === 404;

            if (isPrivateRepoError) {
              alert(
                "🔒 Repository Access Denied\n\n" +
                "This repository may be private or require authentication.\n\n" +
                "Please:\n" +
                "1. Check the 'Private Repository' checkbox\n" +
                "2. Enter your GitHub Personal Access Token (PAT)\n\n" +
                "You can generate a token at:\n" +
                "https://github.com/settings/tokens/new?scopes=repo"
              );
              this.btnImport.disabled = false;
              this.btnImport.textContent = "🚀 IMPORT_AND_SCAN";
              return;
            }
          }
          // If private was checked but still failed, show different message
          if (isPrivateChecked) {
            alert(
              "🔒 Authentication Failed\n\n" +
              "Could not access the repository with the provided token.\n\n" +
              "Please verify:\n" +
              "• The token has 'repo' scope for private repositories\n" +
              "• The token is not expired\n" +
              "• You have access to this repository"
            );
            this.btnImport.disabled = false;
            this.btnImport.textContent = "🚀 IMPORT_AND_SCAN";
            return;
          }
        }

        // Handle other errors
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
    const MAX_ATTEMPTS = 90; // 3 minutes timeout (90 * 2s) - reduced since webhook should be faster
    let attempts = 0;

    // Check if webhook mode is active (not localhost)
    const webhookEnabled = !isLocalhostEnv();

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
          throw new Error("Scan timed out after 3 minutes. Please check back later.");
        }

        // Step 1: Check webhook cache first (faster than polling backend)
        if (webhookEnabled) {
          try {
            const webhookCheckUrl = `${API_ENDPOINTS.WEBHOOKS.SCAN_COMPLETE}?job_id=${encodeURIComponent(jobId)}`;
            const webhookResponse = await apiClient.get(webhookCheckUrl);

            if (webhookResponse.ok && webhookResponse.data) {
              const webhookData = webhookResponse.data as { found?: boolean; data?: unknown };

              if (webhookData.found && webhookData.data) {
                logger.info('Webhook result found, processing immediately', { jobId });

                const durationMs = this.stopImportTimer();
                this.stopPolling();

                // Process webhook result
                const job = webhookData.data as {
                  status?: string;
                  [key: string]: unknown;
                };

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
            }
          } catch (webhookErr) {
            // Webhook check failed, fall through to backend polling
            logger.debug('Webhook cache check failed, falling back to backend poll', webhookErr);
          }
        }

        const endpoint = API_ENDPOINTS.ANALYSIS.GET_JOB.replace(":id", jobId);
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
          rawStatus: job?.status,
          webhookEnabled
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


  constructor(
    dropzone: HTMLElement,
    input: HTMLInputElement,
    list: HTMLElement,
    btnScan: HTMLButtonElement,
    btnImport: HTMLButtonElement,
    btnReset: HTMLButtonElement,
    repoUrl: HTMLInputElement,
    chkPrivateRepo: HTMLInputElement,
    githubTokenInput: HTMLInputElement,
    authTokenLabel: HTMLElement,
    sourceTypeToggle: HTMLElement,
    detailLevelBtns: NodeListOf<HTMLElement>,
    analysisDepthBtns: NodeListOf<HTMLElement>
  ) {
    this.dropzone = dropzone;
    this.input = input;
    this.list = list;
    this.btnScan = btnScan;
    this.btnImport = btnImport;
    this.btnReset = btnReset;
    this.repoUrl = repoUrl;
    this.chkPrivateRepo = chkPrivateRepo;
    this.githubTokenInput = githubTokenInput;
    this.authTokenLabel = authTokenLabel;
    this.sourceTypeToggle = sourceTypeToggle;
    this.detailLevelBtns = detailLevelBtns;
    this.analysisDepthBtns = analysisDepthBtns;

    // Initialize checkbox listener
    this.chkPrivateRepo?.addEventListener('change', () => {
      const tokenContainer = document.getElementById('token-input-container');
      if (this.chkPrivateRepo.checked) {
        tokenContainer?.classList.remove('hidden');
      } else {
        tokenContainer?.classList.add('hidden');
      }
    });

    // Initialize source type toggle listener
    this.sourceTypeToggle?.addEventListener('click', () => {
      if (this.currentSourceType === 'git') {
        this.currentSourceType = 's3';
        this.sourceTypeToggle.textContent = 'AWS S3';
        this.sourceTypeToggle.classList.add('text-orange-400', 'border-orange-500/50', 'bg-orange-500/10');
        this.sourceTypeToggle.classList.remove('text-gray-500', 'border-white/10', 'bg-white/5');
        this.repoUrl.placeholder = 's3://bucket-name/path/to/repo';
        this.authTokenLabel.textContent = 'AWS Credentials';
        this.githubTokenInput.placeholder = 'Access Key:Secret Key';
      } else {
        this.currentSourceType = 'git';
        this.sourceTypeToggle.textContent = 'GIT';
        this.sourceTypeToggle.classList.remove('text-orange-400', 'border-orange-500/50', 'bg-orange-500/10');
        this.sourceTypeToggle.classList.add('text-gray-500', 'border-white/10', 'bg-white/5');
        this.repoUrl.placeholder = 'https://github.com/owner/repo';
        this.authTokenLabel.textContent = 'GitHub Token (PAT)';
        this.githubTokenInput.placeholder = 'ghp_...';
      }
      logger.debug("Source type switched to:", this.currentSourceType);
    });
  }
}
