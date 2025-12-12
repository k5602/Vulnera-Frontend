import { GET, POST } from "../api/api-manage";
import ENDPOINTS from "../utils/api/endpoints";
import {
  normalizeSeverity,
  type SeverityLevel,
} from "../utils/severity";
import type {
  FileAnalysis,
  ScanReportData,
  Vulnerability,
} from "../components/report/ScanReport";

// Supported depth levels for the scan requests
export type AnalysisDepth = "minimal" | "standard" | "full";
type SourceType = "git" | "local";

type ScanHandlerElements = {
  dropzone: HTMLElement | null;
  input: HTMLInputElement | null;
  fileList: HTMLElement | null;
  btnScan: HTMLButtonElement | null;
  btnImport: HTMLButtonElement | null;
  btnReset: HTMLButtonElement | null;
  repoUrl: HTMLInputElement | null;
  privateCheckbox: HTMLInputElement | null;
  tokenInput: HTMLInputElement | null;
  tokenContainer: HTMLElement | null;
  sourceToggle: HTMLElement | null;
  analysisDepthButtons: NodeListOf<Element> | null;
};

export class ScanHandler {
  private pickedFiles: File[] = [];
  private sourceType: SourceType = "git";
  private analysisDepth: AnalysisDepth = "standard";

  constructor(private readonly elements: ScanHandlerElements) {}

  init(): void {
    this.setupDropPrevention();
    this.setupAnalysisDepthButtons();
    this.setupDropzone();
    this.setupFileInput();
    this.setupResetButton();
    this.setupPrivateRepoToggle();
    this.setupSourceToggle();
    this.setupScanButton();
    this.setupImportButton();
    this.renderFiles();
  }

  dragAndDropSetup(): void {
    this.setupDropzone();
  }

  handleFiles(fileList: FileList | null): void {
    if (!fileList) return;
    const incoming = Array.from(fileList);
    const deduped = new Map<string, File>();

    [...this.pickedFiles, ...incoming].forEach((file) => {
      const key = `${file.name}-${file.size}-${file.lastModified}`;
      if (!deduped.has(key)) deduped.set(key, file);
    });

    this.pickedFiles = Array.from(deduped.values());
    this.renderFiles();
  }

  renderFiles(): void {
    const listEl = this.elements.fileList;
    if (!listEl) return;

    listEl.innerHTML = "";
    if (!this.pickedFiles.length) {
      listEl.innerHTML = '<li class="text-gray-600 text-sm">No files selected.</li>';
      return;
    }

    this.pickedFiles.forEach((file, index) => {
      const li = document.createElement("li");
      li.className = "flex items-center justify-between bg-white/5 border border-white/10 px-4 py-2 rounded-md text-gray-200";
      const sizeKb = Math.max(1, Math.round(file.size / 1024));
      li.textContent = `${file.name} (${sizeKb} KB)`;

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "ml-4 text-xs text-red-400 hover:text-red-200";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", () => {
        this.pickedFiles.splice(index, 1);
        this.renderFiles();
      });

      li.appendChild(removeBtn);
      listEl.appendChild(li);
    });
  }

  startScan = async (): Promise<void> => {
    if (!this.elements.btnScan) return;
    if (!this.pickedFiles.length) {
      window.alert("Please add at least one file before scanning.");
      return;
    }

    const depth = this.getSelectedAnalysisDepth();
    this.setButtonState(this.elements.btnScan, true, "SCANNING...");

    try {
      const filesPayload = await this.buildFilesPayload();

      const response = await POST(ENDPOINTS.ANALYSIS.POST_dependencies_analyze, {
        detail_level: depth,
        files: filesPayload,
      });

      const report = this.buildReport(response.data, {
        project: `File Upload (${this.pickedFiles.length} files)`,
        detailLevel: depth,
      });

      this.persistHistory(report, {
        source: "upload",
        filesCount: this.pickedFiles.length,
      });

      this.dispatchReport(report);
      this.pickedFiles = [];
      this.renderFiles();
    } catch (error) {
      this.handleRequestError(error, "Unable to complete file scan.");
    } finally {
      this.setButtonState(this.elements.btnScan, false, "SCAN_FILES");
    }
  };

  importRepository = async (): Promise<void> => {
    console.log("=== importRepository called ===");
    if (!this.elements.btnImport) {
      console.log("No import button element found");
      return;
    }
    const repoUrl = this.elements.repoUrl?.value.trim();
    console.log("Repo URL:", repoUrl);

    if (!repoUrl) {
      window.alert("Please enter a repository URL.");
      return;
    }

    console.log("About to get selected analysis depth...");
    const depth = this.getSelectedAnalysisDepth();
    console.log("Depth returned:", depth);
    const isPrivate = Boolean(this.elements.privateCheckbox?.checked);
    const token = this.elements.tokenInput?.value.trim();

    this.setButtonState(this.elements.btnImport, true, "IMPORTING...");

    try {
      const payload = {
        source_type: this.sourceType,
        source_uri: repoUrl,
        is_private: isPrivate,
        auth_token: isPrivate ? token : undefined,
        analysis_depth: depth,
        callback_url: this.getWebhookUrl(),
      };

      console.log("Sending repo import with payload:", payload);
      const response = await POST(ENDPOINTS.ANALYSIS.POST_analysis_job, payload);
      const jobId = response?.data?.job_id || response?.data?.id;

      const resolved = jobId ? await this.fetchJob(jobId, depth, repoUrl) : null;
      const report = resolved ?? this.buildReport(response.data, {
        project: this.getProjectLabel(repoUrl),
        detailLevel: depth,
      });

      this.persistHistory(report, {
        source: "repo",
        repoUrl,
      });

      this.dispatchReport(report);
    } catch (error) {
      this.handleRequestError(error, "Unable to import repository.");
    } finally {
      this.setButtonState(this.elements.btnImport, false, "IMPORT_AND_SCAN");
    }
  };

  addActiveBTNDetailClass(): void {
    // Legacy helper preserved for backward compatibility
  }

  addActiveBTNAnalysisClass(): void {
    this.setupAnalysisDepthButtons();
  }

  private setupDropPrevention(): void {
    const prevent = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener("dragover", prevent);
    document.addEventListener("drop", prevent);
  }

  private setupDropzone(): void {
    const dz = this.elements.dropzone;
    if (!dz) return;

    dz.addEventListener("dragover", (event) => {
      event.preventDefault();
      dz.classList.add("border-cyan-500/50", "bg-white/5");
    });

    dz.addEventListener("dragleave", (event) => {
      event.preventDefault();
      dz.classList.remove("border-cyan-500/50", "bg-white/5");
    });

    dz.addEventListener("drop", (event) => {
      event.preventDefault();
      dz.classList.remove("border-cyan-500/50", "bg-white/5");
      const files = (event.dataTransfer && event.dataTransfer.files) || null;
      this.handleFiles(files);
    });

    dz.addEventListener("click", () => this.elements.input?.click());
  }

  private setupFileInput(): void {
    this.elements.input?.addEventListener("change", () => {
      this.handleFiles(this.elements.input?.files ?? null);
    });
  }

  private setupResetButton(): void {
    this.elements.btnReset?.addEventListener("click", () => {
      this.pickedFiles = [];
      this.renderFiles();
      if (this.elements.repoUrl) this.elements.repoUrl.value = "";
    });
  }

  private setupPrivateRepoToggle(): void {
    const checkbox = this.elements.privateCheckbox;
    if (!checkbox) return;

    const toggleVisibility = () => {
      const container = this.elements.tokenContainer;
      if (!container) return;
      if (checkbox.checked) {
        container.classList.remove("hidden");
      } else {
        container.classList.add("hidden");
      }
    };

    checkbox.addEventListener("change", toggleVisibility);
    toggleVisibility();
  }

  private setupSourceToggle(): void {
    const toggle = this.elements.sourceToggle;
    if (!toggle) return;

    toggle.addEventListener("click", () => {
      this.sourceType = this.sourceType === "git" ? "local" : "git";
      toggle.textContent = this.sourceType.toUpperCase();
    });
  }

  private setupAnalysisDepthButtons(): void {
    const buttons = this.analysisButtons;
    if (!buttons.length) return;

    // Find and set initial active button (standard by default)
    const defaultActive = buttons.find((btn) => btn.classList.contains("active")) || 
                          buttons.find((btn) => btn.dataset.analysisDepth === "standard");
    
    if (defaultActive) {
      const depth = (defaultActive.dataset.analysisDepth as AnalysisDepth) || "standard";
      this.analysisDepth = depth;
    }

    buttons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        
        // Determine which tab we're in (repo import uses purple, file scan uses cyan)
        const isRepoTab = btn.closest("#content-import") !== null;
        
        // Remove active state from all buttons
        buttons.forEach((b) => {
          b.classList.remove("active");
          // Reset to inactive styles
          b.classList.remove(
            "border-2", "border-purple-500/50", "border-cyan-500/50",
            "bg-purple-500/10", "bg-cyan-500/10", "text-purple-400", "text-cyan-400"
          );
          b.classList.add("border", "border-white/10", "bg-black", "text-gray-500");
        });
        
        // Add active state to clicked button
        btn.classList.add("active");
        btn.classList.remove("border", "border-white/10", "bg-black", "text-gray-500");
        
        if (isRepoTab) {
          btn.classList.add("border-2", "border-purple-500/50", "bg-purple-500/10", "text-purple-400");
        } else {
          btn.classList.add("border-2", "border-cyan-500/50", "bg-cyan-500/10", "text-cyan-400");
        }
        
        // Update analysis depth value
        this.analysisDepth = (btn.dataset.analysisDepth as AnalysisDepth) || "standard";
        console.log("Analysis depth set to:", this.analysisDepth);
      });
    });
  }

  private setupScanButton(): void {
    this.elements.btnScan?.addEventListener("click", this.startScan);
  }

  private setupImportButton(): void {
    this.elements.btnImport?.addEventListener("click", this.importRepository);
  }

  private getSelectedAnalysisDepth(): AnalysisDepth {
    // Simply return the current value set by button clicks
    console.log("Getting selected analysis depth, current value:", this.analysisDepth);
    return this.analysisDepth;
  }

  private getWebhookUrl(): string {
    try {
      return new URL("/api/v1/webhooks/scan-complete", window.location.origin).toString();
    } catch {
      return "/api/v1/webhooks/scan-complete";
    }
  }

  private getProjectLabel(repoUrl: string): string {
    try {
      const url = new URL(repoUrl);
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
      return url.hostname;
    } catch {
      return repoUrl;
    }
  }

  private buildReport(raw: any, meta: { project: string; detailLevel: AnalysisDepth }): ScanReportData {
    const startedAt = raw?.started_at || raw?.startedAt || new Date().toISOString();
    const finishedAt = raw?.completed_at || raw?.finishedAt || startedAt;

    const severitySummary = raw?.summary?.by_severity || raw?.summary || raw?.metadata || {};
    const summary = {
      critical: Number(severitySummary.critical || severitySummary.critical_count) || 0,
      high: Number(severitySummary.high || severitySummary.high_count) || 0,
      medium: Number(severitySummary.medium || severitySummary.medium_count) || 0,
      low: Number(severitySummary.low || severitySummary.low_count) || 0,
      info: Number(severitySummary.info || severitySummary.info_count) || 0,
    };

    const vulnerabilities: Vulnerability[] = this.extractVulnerabilities(raw);
    const files: FileAnalysis[] = this.extractFiles(raw);

    // If summary is empty but we have vulnerabilities, derive counts on the fly
    if (!summary.critical && !summary.high && !summary.medium && !summary.low && !summary.info && vulnerabilities.length) {
      vulnerabilities.forEach((v) => {
        switch (v.severity) {
          case "CRITICAL":
            summary.critical += 1;
            break;
          case "HIGH":
            summary.high += 1;
            break;
          case "MEDIUM":
            summary.medium += 1;
            break;
          case "LOW":
            summary.low += 1;
            break;
          default:
            summary.info += 1;
        }
      });
    }

    const durationMs = raw?.metadata?.duration_ms || raw?.duration_ms || 0;

    return {
      startedAt,
      finishedAt,
      durationMs,
      project: meta.project,
      jobId: raw?.job_id || raw?.id,
      detailLevel: meta.detailLevel,
      summary,
      files,
      vulnerabilities,
    };
  }

  private mapFindingToVulnerability(finding: any): Vulnerability {
    const severity = typeof finding?.severity === "string" ? normalizeSeverity(finding.severity) : "UNKNOWN";

    const affectedPath = finding?.location?.path;
    const line = finding?.location?.line;
    const affectedLabel = affectedPath ? `${affectedPath}${line ? `:${line}` : ""}` : undefined;
    const affectedFiles = affectedLabel ? [affectedLabel] : affectedPath ? [String(affectedPath)] : undefined;

    const generatedId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `finding-${Date.now()}-${Math.random()}`;

    const derivedPackage = finding?.package
      ?? finding?.component
      ?? (affectedPath ? this.baseName(String(affectedPath)) : undefined)
      ?? finding?.rule_id
      ?? "Unknown";

    return {
      id: String(finding?.id ?? generatedId),
      severity: severity as SeverityLevel,
      package: String(derivedPackage),
      version: finding?.version ?? finding?.package_version ?? "",
      title: String(finding?.title ?? finding?.description ?? "Potential issue"),
      cve: finding?.cve,
      cvss: typeof finding?.cvss === "number" ? finding.cvss : undefined,
      affectedFiles,
      recommendation: finding?.recommendation,
    };
  }

  private mapDependencyFinding(pkgName: string, entry: any): Vulnerability {
    const cve = Array.isArray(entry?.cves) && entry.cves.length > 0 ? entry.cves[0]?.id : undefined;
    const severity = typeof entry?.severity === "string" ? normalizeSeverity(entry.severity) : "UNKNOWN";

    return {
      id: entry?.id ? String(entry.id) : `${pkgName}-${entry?.current_version || "unknown"}`,
      severity,
      package: pkgName,
      version: entry?.current_version || "",
      title: entry?.summary || entry?.description || "Dependency vulnerability",
      cve,
      recommendation: entry?.recommendations?.nearest_safe || entry?.recommendations?.latest_safe,
    };
  }

  private extractVulnerabilities(raw: any): Vulnerability[] {
    const vulns: Vulnerability[] = [];

    // Generic findings array
    if (Array.isArray(raw?.findings)) {
      raw.findings.forEach((f: any) => vulns.push(this.mapFindingToVulnerability(f)));
    }

    // Job response: findings_by_type
    const byType = raw?.findings_by_type;
    if (byType) {
      const sections = ["api", "sast", "secrets"] as const;
      sections.forEach((section) => {
        const list = byType[section];
        if (Array.isArray(list)) {
          list.forEach((f: any) => vulns.push(this.mapFindingToVulnerability(f)));
        }
      });

      const dependencies = byType.dependencies;
      if (dependencies && typeof dependencies === "object") {
        Object.entries(dependencies).forEach(([pkgName, entry]) => {
          vulns.push(this.mapDependencyFinding(pkgName, entry));
        });
      }
    }

    // Dependency analyze response: results[].vulnerabilities
    if (Array.isArray(raw?.results)) {
      raw.results.forEach((result: any) => {
        if (Array.isArray(result?.vulnerabilities)) {
          result.vulnerabilities.forEach((v: any) => {
            // Normalize severity (API returns title case like "High", normalize to UPPERCASE)
            const rawSeverity = v?.severity || v?.Severity || "UNKNOWN";
            const severity = normalizeSeverity(String(rawSeverity));
            
            const pathLabel = result?.filename || result?.path;
            const lineLabel = v?.location?.line ? `${pathLabel ?? ""}:${v.location.line}` : pathLabel;
            const affectedFiles = lineLabel ? [lineLabel] : undefined;

            vulns.push({
              id: String(v?.id || v?.cve || v?.summary || crypto.randomUUID?.() || Date.now()),
              severity,
              package: v?.affected_packages?.[0]?.name || v?.package || this.baseName(pathLabel || "Unknown"),
              version: v?.affected_packages?.[0]?.version || "",
              title: v?.summary || v?.description || "Potential vulnerability",
              cve: v?.id,
              recommendation: v?.references?.[0],
              affectedFiles,
            });
          });
        }
      });
    }

    return vulns;
  }

  private extractFiles(raw: any): FileAnalysis[] {
    if (!Array.isArray(raw?.results)) return [];

    return raw.results.map((result: any) => this.mapResultToFileAnalysis(result));
  }

  private async buildFilesPayload(): Promise<Array<{ filename: string; ecosystem?: string; file_content: string; workspace_path?: string }>> {
    const payload: Array<{ filename: string; ecosystem?: string; file_content: string; workspace_path?: string }> = [];

    for (const file of this.pickedFiles) {
      const content = await file.text();
      payload.push({
        filename: file.name,
        ecosystem: this.guessEcosystem(file.name),
        file_content: content,
      });
    }

    return payload;
  }

  private guessEcosystem(filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.endsWith("package.json")) return "npm";
    if (lower.endsWith("requirements.txt")) return "pypi";
    if (lower.endsWith("poetry.lock")) return "pypi";
    if (lower.endsWith("pom.xml")) return "maven";
    if (lower.endsWith("build.gradle") || lower.endsWith("build.gradle.kts")) return "gradle";
    if (lower.endsWith("go.mod") || lower.endsWith("go.sum")) return "go";
    if (lower.endsWith("composer.lock") || lower.endsWith("composer.json")) return "composer";
    if (lower.endsWith("package-lock.json") || lower.endsWith("yarn.lock") || lower.endsWith("pnpm-lock.yaml")) return "npm";
    return "unknown";
  }

  private async fetchJob(jobId: string, depth: AnalysisDepth, repoUrl: string): Promise<ScanReportData | null> {
    try {
      const res = await GET(ENDPOINTS.ANALYSIS.GET_jobs(jobId));
      if (res.status !== 200 || !res.data) return null;

      return this.buildReport(res.data, {
        project: this.getProjectLabel(repoUrl),
        detailLevel: depth,
      });
    } catch (error) {
      this.handleRequestError(error, "Unable to retrieve job results.");
      return null;
    }
  }

  private mapResultToFileAnalysis(result: any): FileAnalysis {
    return {
      file: String(result?.filename ?? result?.path ?? "Unknown"),
      ecosystem: String(result?.ecosystem ?? result?.language ?? "unknown"),
      dependencies: Number(result?.metadata?.total_packages ?? result?.dependencies ?? 0) || 0,
      vulnerable: Array.isArray(result?.vulnerabilities) ? result.vulnerabilities.length : Number(result?.vulnerable ?? 0) || 0,
    };
  }

  private baseName(path: string): string {
    const parts = path.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : path;
  }

  private dispatchReport(report: ScanReportData): void {
    window.dispatchEvent(new CustomEvent("vulnera:scan-report", { detail: report }));
  }

  private persistHistory(report: ScanReportData, meta: { source: "upload" | "repo"; repoUrl?: string; filesCount?: number }): void {
    try {
      const entry = {
        id: report.jobId ?? `scan-${Date.now()}`,
        project: report.project || (meta.source === "repo" ? meta.repoUrl : "File Upload"),
        critical: report.summary.critical,
        high: report.summary.high,
        medium: report.summary.medium,
        low: report.summary.low,
        vulnerabilities: report.vulnerabilities.length,
        timestamp: report.finishedAt,
        filesCount: meta.filesCount ?? report.files.length,
        ecosystems: report.files.map((file) => file.ecosystem),
      };

      const existingRaw = localStorage.getItem("scan_history");
      const existing = existingRaw ? JSON.parse(existingRaw) : [];

      const updated = [entry, ...existing].slice(0, 50);
      localStorage.setItem("scan_history", JSON.stringify(updated));
    } catch (error) {
      console.debug("Failed to persist scan history", error);
    }
  }

  private handleRequestError(error: unknown, fallback: string): void {
    let message = fallback;

    if (error && typeof error === "object" && "response" in error) {
      const err = error as { response?: { data?: any; status?: number } };
      message = err.response?.data?.message || err.response?.data?.error || fallback;
    } else if (error instanceof Error && error.message) {
      message = error.message;
    }

    window.alert(message);
  }

  private setButtonState(button: HTMLButtonElement, isLoading: boolean, label: string): void {
    button.disabled = isLoading;
    button.textContent = label;
  }

  private get analysisButtons(): HTMLButtonElement[] {
    return Array.from(this.elements.analysisDepthButtons ?? []).filter(
      (btn): btn is HTMLButtonElement => btn instanceof HTMLButtonElement,
    );
  }
}
