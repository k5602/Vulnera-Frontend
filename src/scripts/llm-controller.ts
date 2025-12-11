import { POST } from "../api/api-manage";
import ENDPOINTS from "../utils/api/endpoints";

export class LLMController {
  private selectedAudience: string = "technical";

  constructor() {
    this.init();
  }

  private init() {
    this.setupModeSwitching();
    this.setupExplainMode();
    this.setupFixMode();
    this.setupQueryMode();
  }

  private setupModeSwitching() {
    const modes = ["explain", "fix", "query"] as const;

    modes.forEach(mode => {
      const btn = document.getElementById(`mode-${mode}`);
      btn?.addEventListener("click", () => this.switchMode(mode));
    });
  }

  private switchMode(newMode: "explain" | "fix" | "query") {
    // Update buttons
    ["explain", "fix", "query"].forEach(mode => {
      const btn = document.getElementById(`mode-${mode}`);
      const isActive = mode === newMode;

      // Reset base classes
      btn?.classList.remove(
        "active",
        "bg-cyan-500/20", "text-cyan-400",
        "bg-green-500/20", "text-green-400", "border-r", "border-cyber-500/30",
        "text-green-500/50", "hover:text-green-400",
        "text-purple-500/50", "hover:text-purple-400",
        "text-cyan-500/50", "hover:text-cyan-400"
      );

      if (isActive) {
        if (mode === "explain") {
          btn?.classList.add("active", "bg-cyan-500/20", "text-cyan-400", "border-r", "border-cyber-500/30");
        } else {
          // Both Fix and Query use Matrix Green theme in active state
          btn?.classList.add("active", "bg-green-500/20", "text-green-400");
          if (mode === "fix") btn?.classList.add("border-r", "border-cyber-500/30");
        }
      } else {
        // Inactive states
        if (mode === "explain") {
          btn?.classList.add("text-cyan-500/50", "hover:text-cyan-400", "border-r", "border-cyber-500/30");
        } else {
          btn?.classList.add("text-green-500/50", "hover:text-green-400");
          if (mode === "fix") btn?.classList.add("border-r", "border-cyber-500/30");
        }
      }
    });

    // Show/hide sections
    ["explain", "fix", "query"].forEach(mode => {
      const section = document.getElementById(`${mode}-section`);
      const output = document.getElementById(`${mode}-output`);

      if (mode === newMode) {
        section?.classList.remove("hidden");
        output?.classList.remove("hidden");
      } else {
        section?.classList.add("hidden");
        output?.classList.add("hidden");
      }
    });
  }

  private setupExplainMode() {
    const form = document.getElementById("explain-form") as HTMLFormElement;
    const btn = document.getElementById("btn-explain") as HTMLButtonElement;
    const audienceBtns = document.querySelectorAll(".audience-btn-explain");

    audienceBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        audienceBtns.forEach((b) => {
          b.classList.remove("active", "border-2", "border-cyan-500/50", "bg-cyan-500/10", "text-cyan-400");
          b.classList.add("border", "border-white/10", "bg-black", "text-gray-500");
        });
        btn.classList.remove("border", "border-white/10", "bg-black", "text-gray-500");
        btn.classList.add("active", "border-2", "border-cyan-500/50", "bg-cyan-500/10", "text-cyan-400");
        this.selectedAudience = (btn as HTMLElement).dataset.audience || "technical";
      });
    });

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const vulnerability_id = formData.get("vulnerability_id") as string;
      const description = formData.get("description") as string;
      const affected_component = formData.get("affected_component") as string;

      if (!vulnerability_id) return;

      this.showState("explain", "loading");
      btn.disabled = true;

      try {
        const payload = {
          vulnerability_id,
          description: description || "Vulnerability analysis requested",
          affected_component: affected_component || "Unknown Component",
          audience: this.selectedAudience,
        };

        const response = await POST(ENDPOINTS.LLM.POST_explain, payload);
        this.formatExplainResult(response.data);
        this.showState("explain", "result");
      } catch (err: any) {
        const errMsg = document.getElementById("error-message");
        if (errMsg) errMsg.textContent = err.response?.data?.message || err.message || "An error occurred";
        this.showState("explain", "error");
      } finally {
        btn.disabled = false;
      }
    });
  }

  private setupFixMode() {
    const form = document.getElementById("fix-form") as HTMLFormElement;
    const btn = document.getElementById("btn-fix") as HTMLButtonElement;

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const vulnerability_id = formData.get("vulnerability_id") as string;
      const context = formData.get("context") as string;
      const language = formData.get("language") as string;

      if (!vulnerability_id) return;

      this.showState("fix", "loading");
      btn.disabled = true;

      try {
        const payload = {
          vulnerability_id,
          context: context || "N/A",
          language: language || "javascript",
          vulnerable_code: "Vulnerability reference",
        };

        const response = await POST(ENDPOINTS.LLM.POST_fixCode, payload);
        this.formatFixResult(response.data);
        this.showState("fix", "result");
      } catch (err: any) {
        const errMsg = document.getElementById("fix-error-message");
        if (errMsg) errMsg.textContent = err.response?.data?.message || err.message || "An error occurred";
        this.showState("fix", "error");
      } finally {
        btn.disabled = false;
      }
    });
  }

  private setupQueryMode() {
    const form = document.getElementById("query-form") as HTMLFormElement;
    const btn = document.getElementById("btn-query") as HTMLButtonElement;

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const query = formData.get("query") as string;

      if (!query) return;

      this.showState("query", "loading");
      btn.disabled = true;

      try {
        const response = await POST(ENDPOINTS.LLM.POST_naturalLanguageQuery, { query });
        this.formatQueryResult(response.data);
        this.showState("query", "result");
      } catch (err: any) {
        const errMsg = document.getElementById("query-error-message");
        if (errMsg) errMsg.textContent = err.response?.data?.message || err.message || "An error occurred";
        this.showState("query", "error");
      } finally {
        btn.disabled = false;
      }
    });
  }

  private showState(mode: string, state: "empty" | "loading" | "result" | "error") {
    const empty = document.getElementById(`${mode}-empty-state`);
    const loading = document.getElementById(`${mode}-loading-state`);
    const result = document.getElementById(`${mode}-result-content`);
    const error = document.getElementById(`${mode}-error-state`);

    empty?.classList.toggle("hidden", state !== "empty");
    loading?.classList.toggle("hidden", state !== "loading");
    result?.classList.toggle("hidden", state !== "result");
    error?.classList.toggle("hidden", state !== "error");
  }

  private formatExplainResult(data: any) {
    const container = document.getElementById("result-content");
    if (!container) return;

    let html = "";
    if (typeof data === "string") {
      html = `< div class="bg-cyan-950/20 border border-cyan-500/20 rounded-lg p-4" >
  <div class="text-cyan-300/90 text-sm font-mono whitespace-pre-wrap leading-relaxed" > ${this.escapeHtml(data)} </div>
    </div>`;
    } else if (data.explanation || data.response || data.result) {
      const content = data.explanation || data.response || data.result;
      html = `
        <div class="space-y-4">
          ${data.vulnerability_id ? `
            <div class="flex items-center gap-3 flex-wrap">
              <div class="flex items-center gap-2">
                <span class="text-[10px] text-cyan-500/60 uppercase tracking-wider">CVE ID</span>
                <span class="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded font-mono text-sm text-cyan-400">${this.escapeHtml(data.vulnerability_id)}</span>
              </div>
              ${data.severity ? `
              <div class="flex items-center gap-2">
                <span class="text-[10px] text-red-500/60 uppercase tracking-wider">Severity</span>
                <span class="px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded font-mono text-sm text-red-400">${this.escapeHtml(data.severity)}</span>
              </div>` : ""}
            </div>` : ""}
          
          <div class="bg-cyan-950/20 border border-cyan-500/20 rounded-lg p-5">
            <div class="flex items-center gap-2 mb-3">
              <div class="w-1 h-4 bg-cyan-500 rounded-full"></div>
              <h3 class="text-cyan-400 font-mono text-sm font-bold uppercase tracking-wider">Analysis</h3>
            </div>
            <div class="text-cyan-300/90 text-sm font-mono whitespace-pre-wrap leading-relaxed pl-3 border-l-2 border-cyan-500/30">
              ${this.escapeHtml(content)}
            </div>
          </div>
          
          ${data.remediation ? `
          <div class="bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-5">
            <div class="flex items-center gap-2 mb-3">
              <div class="w-1 h-4 bg-emerald-500 rounded-full"></div>
              <h3 class="text-emerald-400 font-mono text-sm font-bold uppercase tracking-wider">Remediation</h3>
            </div>
            <div class="text-emerald-300/90 text-sm font-mono whitespace-pre-wrap leading-relaxed pl-3 border-l-2 border-emerald-500/30">
              ${this.escapeHtml(data.remediation)}
            </div>
          </div>` : ""}
          
          <div class="flex items-center justify-between pt-3 border-t border-cyan-500/20">
            <div class="text-[10px] text-cyan-500/60 font-mono uppercase tracking-widest">
              <span class="inline-block w-2 h-2 bg-cyan-500 rounded-full animate-pulse mr-2"></span>
              ANALYSIS_COMPLETE
            </div>
            <div class="text-[10px] text-cyan-500/40 font-mono">
              ${new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>`;
    }
    container.innerHTML = html;
  }

  private formatFixResult(data: any) {
    const container = document.getElementById("fix-result-content");
    if (!container) return;

    // Extract data with fallbacks
    const confidence = data?.confidence ?? 0;
    const explanation = data?.explanation || data?.analysis || "No explanation provided";
    const fixedCode = data?.fixed_code || data?.code || data?.fix || "No code available";

    // Escape code for inline JavaScript
    const escapedCode = fixedCode.replace(/`/g, "\\`").replace(/\$/g, "\\$").replace(/\\/g, "\\\\");

    container.innerHTML = `
      <div class="space-y-4">
        <!-- Confidence Section -->
        <div class="bg-green-950/20 border border-green-500/20 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-1 h-4 bg-green-500 rounded-full"></div>
              <span class="text-green-400 font-mono text-sm font-bold uppercase tracking-wider">Confidence Level</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="h-2 w-32 bg-black/50 rounded-full overflow-hidden border border-green-500/30">
                <div class="h-full bg-gradient-to-r from-green-600 to-emerald-500" style="width: ${(confidence * 100).toFixed(0)}%"></div>
              </div>
              <span class="text-green-300 font-mono text-sm font-bold">${(confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        <!-- Analysis Section -->
        <div class="bg-green-950/20 border border-green-500/20 rounded-lg p-5">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-1 h-4 bg-green-500 rounded-full"></div>
            <h3 class="text-green-400 font-mono text-sm font-bold uppercase tracking-wider">Vulnerability Analysis</h3>
          </div>
          <div class="text-green-300/90 text-sm font-mono whitespace-pre-wrap leading-relaxed pl-3 border-l-2 border-green-500/30">
            ${this.escapeHtml(explanation)}
          </div>
        </div>

        <!-- Fixed Code Section -->
        <div class="bg-green-950/20 border border-green-500/20 rounded-lg p-5">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="w-1 h-4 bg-emerald-500 rounded-full"></div>
              <h3 class="text-emerald-400 font-mono text-sm font-bold uppercase tracking-wider">Secure Code</h3>
            </div>
            <button 
              type="button" 
              onclick="navigator.clipboard.writeText(\`${escapedCode}\`); this.textContent='[COPIED]'; setTimeout(() => this.textContent='[COPY CODE]', 2000)" 
              class="text-xs text-green-500/70 hover:text-green-400 font-mono transition-colors px-2 py-1 border border-green-500/30 rounded hover:bg-green-500/10"
            >
              [COPY CODE]
            </button>
          </div>
          <div class="rounded-lg overflow-hidden border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
            <pre class="bg-black/90 p-4 text-xs text-green-300 overflow-x-auto custom-scrollbar font-mono whitespace-pre-wrap">${this.escapeHtml(fixedCode)}</pre>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between pt-3 border-t border-green-500/20">
          <div class="text-[10px] text-green-500/60 font-mono uppercase tracking-widest">
            <span class="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
            FIX_GENERATED
          </div>
          <div class="text-[10px] text-green-500/40 font-mono">
            ${new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>`;
  }

  private formatQueryResult(data: any) {
    const container = document.getElementById("query-result-content");
    if (!container) return;

    let content = data.answer || data.response || JSON.stringify(data, null, 2);

    // Enhanced Markdown Parsing for Professional Matrix Theme

    // 1. Code Blocks with Language Support (```language\ncode```)
    content = content.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_match: string, lang: string, code: string) => {
      const language = lang ? `<div class="text-[10px] text-green-500/60 mb-2 uppercase tracking-wider">${lang}</div>` : '';
      return `<div class="my-4 rounded-lg overflow-hidden border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                ${language}
                <pre class="bg-black/90 p-4 text-xs text-green-300 overflow-x-auto custom-scrollbar font-mono whitespace-pre-wrap">${this.escapeHtml(code.trim())}</pre>
            </div>`;
    });

    // 2. Headers (## Header, ### Header)
    content = content.replace(/^### (.*?)$/gm, '<h4 class="text-green-400 font-bold text-base font-mono mt-6 mb-3 pb-2 border-b border-green-500/20">$1</h4>');
    content = content.replace(/^## (.*?)$/gm, '<h3 class="text-green-300 font-bold text-lg font-mono mt-8 mb-4 pb-2 border-b border-green-500/30">$1</h3>');
    content = content.replace(/^# (.*?)$/gm, '<h2 class="text-green-200 font-bold text-xl font-mono mt-8 mb-4 pb-3 border-b-2 border-green-500/40">$1</h2>');

    // 3. Bold and Italic (**bold**, *italic*)
    content = content.replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="text-green-300 font-bold italic">$1</strong>');
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-green-400 font-bold">$1</strong>');
    content = content.replace(/\*(.*?)\*/g, '<em class="text-green-300/90 italic">$1</em>');

    // 4. Inline Code (`code`)
    content = content.replace(/`([^`]+)`/g, '<code class="bg-green-900/40 text-green-300 px-2 py-0.5 rounded border border-green-500/20 text-xs font-mono">$1</code>');

    // 5. Numbered Lists (1. item)
    content = content.replace(/^(\d+)\.\s+(.*)/gm, '<div class="flex items-start gap-3 mb-2 ml-2"><span class="text-green-500 font-bold min-w-[20px]">$1.</span><span class="flex-1">$2</span></div>');

    // 6. Bullet Points (- item, * item)
    content = content.replace(/^[-*]\s+(.*)/gm, '<div class="flex items-start gap-3 mb-2 ml-2"><span class="text-green-500 text-lg leading-none">›</span><span class="flex-1 pt-0.5">$1</span></div>');

    // 7. Links ([text](url))
    content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-green-400 underline hover:text-green-300 transition-colors" target="_blank" rel="noopener noreferrer">$1</a>');

    // 8. Horizontal Rules (---, ***)
    content = content.replace(/^(---|\*\*\*)$/gm, '<hr class="my-6 border-t border-green-500/30" />');

    container.innerHTML = `
      <div class="space-y-3 animate-in fade-in duration-500">
        <div class="bg-green-950/20 border border-green-500/20 rounded-lg p-4 text-green-300/90 text-sm font-mono leading-relaxed">
          ${content}
        </div>
        <div class="flex items-center justify-between pt-3 border-t border-green-500/20">
          <div class="text-[10px] text-green-500/60 font-mono uppercase tracking-widest">
            <span class="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
            TRANSMISSION_COMPLETE
          </div>
          <div class="text-[10px] text-green-500/40 font-mono">
            ${new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new LLMController();
});
