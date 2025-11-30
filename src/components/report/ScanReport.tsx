import { useMemo, useState } from 'react';
import { usePagination } from '../../hooks/usePagination';
import { apiClient } from '../../utils/api/client';
import { enrichService, type EnrichedFinding } from '../../utils/api/enrich-service';
import { llmService, type FixResponse } from '../../utils/api/llm-service';
import { getSeverityClasses, SEVERITY_ORDER, type SeverityLevel } from '../../utils/severity';
import { API_ENDPOINTS } from '../../config/api';

// Explain API response type
type ExplainResponse = {
  explanation?: string;
  response?: string;
  result?: string;
  vulnerability_id?: string;
  severity?: string;
  remediation?: string;
  references?: string[];
};

export type Vulnerability = {
  id: string;
  severity: SeverityLevel;
  package: string;
  version: string;
  title: string;
  cve?: string;
  cvss?: number;
  affectedFiles?: string[];
  recommendation?: string;
  // Enriched fields
  explanation?: string;
  remediation_suggestion?: string;
  risk_summary?: string;
  enrichment_successful?: boolean;
};

export type FileAnalysis = {
  file: string;
  ecosystem: string;
  dependencies: number;
  vulnerable: number;
};

export type ScanReportData = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  project?: string;
  jobId?: string; // Added for enrichment
  detailLevel?: 'minimal' | 'standard' | 'full';
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  files: FileAnalysis[];
  vulnerabilities: Vulnerability[];
};

function SeverityBadge({ level }: { level: SeverityLevel }) {
  return (
    <span className={`px-2 py-0.5 rounded-md text-xs font-mono border ${getSeverityClasses(level)}`}>
      {level}
    </span>
  );
}

export default function ScanReport({ data }: { data: ScanReportData }) {
  const fmtDuration = useMemo(() => `${Math.max(1, Math.round(data.durationMs / 1000))}s`, [data.durationMs]);
  const detailLevel = data.detailLevel || 'standard';

  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichedData, setEnrichedData] = useState<Record<string, EnrichedFinding>>({});

  const [fixingFindingId, setFixingFindingId] = useState<string | null>(null);
  const [fixData, setFixData] = useState<Record<string, FixResponse & { error?: string }>>({});

  // Explain feature state
  const [explainingFindingId, setExplainingFindingId] = useState<string | null>(null);
  const [explainData, setExplainData] = useState<Record<string, ExplainResponse & { error?: string }>>({});
  
  // Track which action mode is selected for each vulnerability (explain or fix)
  const [actionMode, setActionMode] = useState<Record<string, 'explain' | 'fix'>>({});

  const handleExplain = async (finding: Vulnerability) => {
    setExplainingFindingId(finding.id);
    try {
      const response = await apiClient.post<ExplainResponse>(API_ENDPOINTS.LLM.EXPLAIN, {
        vulnerability_id: finding.cve || finding.id,
        affected_component: finding.package + (finding.version ? `@${finding.version}` : ''),
        description: finding.title,
        audience: 'technical',
      });

      if (!response.ok) {
        const errorData = response.error as { message?: string; error?: string } | undefined;
        throw new Error(errorData?.message || errorData?.error || 'Failed to explain vulnerability');
      }

      setExplainData(prev => ({
        ...prev,
        [finding.id]: response.data!
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to explain vulnerability. Please try again.';
      setExplainData(prev => ({
        ...prev,
        [finding.id]: { error: errorMessage }
      }));
    } finally {
      setExplainingFindingId(null);
    }
  };

  const handleFix = async (finding: Vulnerability) => {
    setFixingFindingId(finding.id);
    try {
      // 1. Try to get language from file analysis data first
      let language = 'javascript'; // Default

      // Try to match affected file to analysis results to get ecosystem/language
      if (finding.affectedFiles && finding.affectedFiles.length > 0) {
        const affectedFile = finding.affectedFiles[0];
        const fileAnalysis = data.files.find(f => f.file === affectedFile);

        if (fileAnalysis?.ecosystem) {
          const eco = fileAnalysis.ecosystem.toLowerCase();
          if (eco === 'npm' || eco === 'node') language = 'javascript';
          else if (eco === 'pypi' || eco === 'python') language = 'python';
          else if (eco === 'maven' || eco === 'gradle' || eco === 'java') language = 'java';
          else if (eco === 'go' || eco === 'golang') language = 'go';
          else if (eco === 'composer' || eco === 'php') language = 'php';
          else if (eco === 'rubygems' || eco === 'ruby') language = 'ruby';
          else if (eco === 'rust' || eco === 'cargo') language = 'rust';
        }

        // Fallback to extension if ecosystem didn't give us a clear language
        if (language === 'javascript') {
          if (affectedFile.endsWith('.py')) language = 'python';
          else if (affectedFile.endsWith('.java')) language = 'java';
          else if (affectedFile.endsWith('.go')) language = 'go';
          else if (affectedFile.endsWith('.ts') || affectedFile.endsWith('.tsx')) language = 'typescript';
          else if (affectedFile.endsWith('.php')) language = 'php';
          else if (affectedFile.endsWith('.rb')) language = 'ruby';
          else if (affectedFile.endsWith('.rs')) language = 'rust';
          else if (affectedFile.endsWith('.c')) language = 'c';
          else if (affectedFile.endsWith('.cpp')) language = 'cpp';
          else if (affectedFile.endsWith('.cs')) language = 'csharp';
        }
      }

      const response = await llmService.fix({
        context: finding.affectedFiles?.[0] || finding.package,
        language: language,
        vulnerability_id: finding.id,
        vulnerable_code: finding.title || "Code not available", // Fallback as we don't have code content here
      });

      if (response.ok && response.data) {
        setFixData(prev => ({
          ...prev,
          [finding.id]: response.data!
        }));
      } else {
        throw new Error(String(response.error) || "Failed to generate fix");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate fix. Please try again.";
      // Store error in state instead of alerting
      setFixData(prev => ({
        ...prev,
        [finding.id]: {
          confidence: 0,
          explanation: "",
          fixed_code: "",
          error: errorMessage
        }
      }));
    } finally {
      setFixingFindingId(null);
    }
  };

  const handleEnrich = async () => {
    if (!data.jobId) {
      // No Job ID available for enrichment - silently return
      return;
    }

    setIsEnriching(true);
    try {
      // 1. Prioritize findings (Critical > High > Medium > Low > Info)
      const sortedVulns = [...data.vulnerabilities].sort((a, b) => {
        return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      });

      // 2. Take top N findings (e.g., 10)
      const topFindings = sortedVulns.slice(0, 10);
      const findingIds = topFindings.map(v => v.id);

      // 3. Collect code contexts (if available)
      // Note: Currently the frontend might not have full code context unless passed in data
      // We'll send what we have or empty map if not available
      const codeContexts: Record<string, string> = {};

      // 4. Call enrichment service with payload
      const response = await enrichService.enrichJob(data.jobId, {
        finding_ids: findingIds,
        code_contexts: codeContexts
      });

      if (response.ok && response.data) {
        const newEnrichedData: Record<string, EnrichedFinding> = {};
        response.data.findings.forEach(f => {
          newEnrichedData[f.id] = f;
        });
        setEnrichedData(newEnrichedData);
      }
    } catch {
      // Error during enrichment - silently fail, UI will show unenriched state
    } finally {
      setIsEnriching(false);
    }
  };

  // Filter vulnerabilities based on detail level
  const filteredVulnerabilities = useMemo(() => {
    if (detailLevel === 'minimal') {
      // Show only CRITICAL and HIGH for minimal
      return data.vulnerabilities.filter(v => v.severity === 'CRITICAL' || v.severity === 'HIGH');
    }
    // Show all for standard and full
    return data.vulnerabilities;
  }, [data.vulnerabilities, detailLevel]);

  // Paginate vulnerabilities
  const {
    currentItems: displayedVulnerabilities,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
    goToPage,
  } = usePagination({
    items: filteredVulnerabilities,
    itemsPerPage: 20,
  });

  function downloadBlob(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function escapeCSV(val: unknown) {
    const s = String(val ?? '');
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function toVulnsCSV(vulns: Vulnerability[]) {
    const header = ['id', 'severity', 'package', 'version', 'title', 'cve', 'cvss', 'affectedFiles', 'recommendation'];
    const rows = vulns.map(v => [
      v.id,
      v.severity,
      v.package,
      v.version,
      v.title,
      v.cve ?? '',
      typeof v.cvss === 'number' ? v.cvss.toFixed(1) : '',
      (v.affectedFiles ?? []).join('; '),
      v.recommendation ?? ''
    ]);
    return [header, ...rows].map(r => r.map(escapeCSV).join(',')).join('\n');
  }

  function printReport() {
    const root = document.getElementById('scan-report-root');
    if (!root) { window.print(); return; }
    const container = document.createElement('div');
    container.id = 'print-container';
    // Clone the report content so we can print it at top-level
    const clone = root.cloneNode(true) as HTMLElement;
    container.appendChild(clone);
    document.body.appendChild(container);
    const onAfter = () => {
      container.remove();
      document.body.classList.remove('print-overlay');
      window.removeEventListener('afterprint', onAfter);
    };
    document.body.classList.add('print-overlay');
    window.addEventListener('afterprint', onAfter);
    window.print();
  }

  return (
    <section id="scan-report-root" className="mt-8 sm:mt-10 space-y-6 font-mono text-green-500">
      {/* Header */}
      <div className="bg-black/80 backdrop-blur-sm p-6 border border-green-500/30 shadow-[0_0_15px_rgba(0,255,65,0.1)] relative overflow-hidden group">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage: 'linear-gradient(rgba(0,255,65,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-green-500"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-green-500"></div>
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-green-500"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-green-500"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <h2 className="text-green-400 text-2xl font-bold tracking-widest uppercase drop-shadow-[0_0_5px_rgba(0,255,65,0.5)]">
              SYSTEM_REPORT
            </h2>
            <span className={`px-2 py-0.5 text-xs font-bold border ${detailLevel === 'minimal' ? 'bg-gray-900 text-gray-400 border-gray-600' :
              detailLevel === 'full' ? 'bg-green-900/20 text-green-400 border-green-500' :
                'bg-green-900/10 text-green-500/80 border-green-500/50'
              }`}>
              [{detailLevel.toUpperCase()}]
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* AI Enrichment Button - Primary */}
            {data.jobId && (
              <button
                onClick={handleEnrich}
                disabled={isEnriching || Object.keys(enrichedData).length > 0}
                className={`relative overflow-hidden px-6 py-2 text-sm font-bold border transition-all duration-150 flex items-center gap-2 uppercase tracking-wider ${Object.keys(enrichedData).length > 0
                  ? 'border-green-500/20 text-green-500/50 bg-black cursor-default'
                  : isEnriching
                    ? 'border-green-500 text-green-400 bg-green-900/20 animate-pulse cursor-wait'
                    : 'bg-green-600 text-black border-green-500 hover:bg-green-500 hover:shadow-[0_0_15px_rgba(0,255,65,0.6)]'
                  }`}
                title="Enrich findings with AI insights"
              >
                {isEnriching ? (
                  <>
                    <span className="animate-pulse">PROCESSING...</span>
                  </>
                ) : Object.keys(enrichedData).length > 0 ? (
                  <>
                    <span>[ ENRICHED ]</span>
                  </>
                ) : (
                  <>
                    <span>[ ENRICH_SYSTEM ]</span>
                  </>
                )}
              </button>
            )}

            {/* Secondary Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadBlob(`vulnera_report_${Date.now()}.json`, JSON.stringify(data, null, 2), 'application/json')}
                className="px-3 py-2 text-xs font-bold border border-green-500/30 text-green-500 hover:bg-green-500/10 hover:border-green-500 transition-colors uppercase"
                title="Download JSON"
              >
                JSON
              </button>
              <button
                onClick={() => downloadBlob(`vulnera_vulnerabilities_${Date.now()}.csv`, toVulnsCSV(data.vulnerabilities), 'text/csv')}
                className="px-3 py-2 text-xs font-bold border border-green-500/30 text-green-500 hover:bg-green-500/10 hover:border-green-500 transition-colors uppercase"
                title="Download CSV"
              >
                CSV
              </button>
              <button
                onClick={printReport}
                className="px-3 py-2 text-xs font-bold border border-green-500/30 text-green-500 hover:bg-green-500/10 hover:border-green-500 transition-colors uppercase"
                title="Print / PDF"
              >
                PRINT
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="bg-black/40 p-4 border border-green-500/20 hover:border-green-500/50 transition-colors group">
            <div className="text-green-500/60 text-xs font-bold tracking-widest mb-1 group-hover:text-green-400">Critical</div>
            <div className="text-green-400 text-2xl font-bold">{data.summary.critical}</div>
          </div>
          <div className="bg-black/40 p-4 border border-green-500/20 hover:border-green-500/50 transition-colors group">
            <div className="text-green-500/60 text-xs font-bold tracking-widest mb-1 group-hover:text-green-400">High</div>
            <div className="text-green-400 text-2xl font-bold">{data.summary.high}</div>
          </div>
          <div className="bg-black/40 p-4 border border-green-500/20 hover:border-red-500/50 transition-colors group">
            <div className="text-green-500/60 text-xs font-bold tracking-widest mb-1 group-hover:text-red-400">Medium</div>
            <div className="text-red-500 text-2xl font-bold drop-shadow-[0_0_3px_rgba(220,38,38,0.5)]">{data.summary.medium}</div>
          </div>
          <div className="bg-black/40 p-4 border border-green-500/20 hover:border-red-500/50 transition-colors group">
            <div className="text-green-500/60 text-xs font-bold tracking-widest mb-1 group-hover:text-red-400">CRITICAL_HIGH</div>
            <div className="text-red-500 text-2xl font-bold drop-shadow-[0_0_3px_rgba(220,38,38,0.5)]">{(data.summary.critical || 0) + (data.summary.high || 0)}</div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end text-xs text-green-500/50 font-mono">
          <span>EXECUTION_TIME: <span className="text-green-400">{fmtDuration}</span></span>
        </div>
      </div>

      {/* Files table - Show for standard and full levels */}
      {detailLevel !== 'minimal' && (
        <div className="bg-black/80 backdrop-blur-sm p-6 border border-green-500/20 relative">
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-green-500/50"></div>
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-green-500/50"></div>
          <h3 className="text-green-400 text-base mb-4 tracking-wider uppercase font-bold">Files_Analysis</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="text-green-500/50 border-b border-green-500/20">
                  <th className="text-left py-2 pr-3 uppercase tracking-wider">File</th>
                  <th className="text-left py-2 pr-3 uppercase tracking-wider">Ecosystem</th>
                  <th className="text-right py-2 pr-3 uppercase tracking-wider">Deps</th>
                  <th className="text-right py-2 uppercase tracking-wider">Vulns</th>
                </tr>
              </thead>
              <tbody>
                {data.files.map((f) => (
                  <tr key={f.file} className="border-b border-green-500/10 hover:bg-green-500/5 transition-colors">
                    <td className="py-2 pr-3 text-green-300 break-anywhere">{f.file}</td>
                    <td className="py-2 pr-3 text-green-500/70">{f.ecosystem}</td>
                    <td className="py-2 pr-3 text-right text-green-500/70">{f.dependencies}</td>
                    <td className={`py-2 text-right font-bold ${f.vulnerable ? 'text-red-500' : 'text-green-500/30'}`}>{f.vulnerable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vulnerabilities */}
      <div className="bg-black/80 backdrop-blur-sm p-6 border border-green-500/20 relative">
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-green-500/50"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-green-500/50"></div>

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-green-400 text-lg font-bold tracking-wider uppercase flex items-center gap-2">
            DETECTED_THREATS
          </h3>
          <div className="flex items-center gap-4">
            {detailLevel === 'minimal' && data.vulnerabilities.length > filteredVulnerabilities.length && (
              <span className="text-xs text-green-500/50 border border-green-500/20 px-2 py-1">
                FILTERED: {filteredVulnerabilities.length}/{data.vulnerabilities.length}
              </span>
            )}
            {totalPages > 1 && (
              <span className="text-xs text-green-500/50">
                PAGE {currentPage}/{totalPages}
              </span>
            )}
          </div>
        </div>

        {displayedVulnerabilities.length === 0 && (
          <div className="text-center py-12 border border-green-500/20 border-dashed bg-black/40">
            <div className="text-green-500 text-lg font-bold tracking-widest">SYSTEM_CLEAN</div>
            <div className="text-green-500/50 text-sm mt-1">NO_THREATS_DETECTED</div>
          </div>
        )}

        <ul className="space-y-4">
          {displayedVulnerabilities.map((v) => (
            <li
              key={v.id}
              className={`relative border bg-black/60 p-5 transition-all hover:bg-black/80 group overflow-hidden ${v.severity === 'CRITICAL' ? 'border-red-500 shadow-[0_0_10px_rgba(220,38,38,0.2)]' :
                v.severity === 'HIGH' ? 'border-orange-500 shadow-[0_0_10px_rgba(234,88,12,0.2)]' :
                  v.severity === 'MEDIUM' ? 'border-yellow-500' :
                    'border-blue-500'
                }`}
            >
              {/* Corner markers for tech look */}
              <div className={`absolute top-0 right-0 w-0 h-0 border-t-[10px] border-r-[10px] border-t-transparent ${v.severity === 'CRITICAL' ? 'border-r-red-500' :
                v.severity === 'HIGH' ? 'border-r-orange-500' :
                  v.severity === 'MEDIUM' ? 'border-r-yellow-500' :
                    'border-r-blue-500'
                }`}></div>

              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 relative">
                <div className="space-y-2 flex-1 min-w-0 overflow-hidden">
                  <div className="flex flex-wrap items-center gap-3">
                    <SeverityBadge level={v.severity} />
                    <span className="text-green-100 font-bold text-lg tracking-tight break-all">{v.package}</span>
                    {v.version && v.version !== '-' && (
                      <span className="text-green-500/60 text-sm">v{v.version}</span>
                    )}
                  </div>
                  <div className="text-green-400/80 font-medium leading-relaxed break-words overflow-wrap-anywhere">{v.title}</div>

                  {/* Metadata Row */}
                  {detailLevel !== 'minimal' && (
                    <div className="flex flex-wrap items-center gap-4 text-xs text-green-500/50 mt-2">
                      {v.cve && (
                        <span className="flex items-center gap-1.5">
                          <span>CVE:</span>
                          <span className="text-green-400">{v.cve}</span>
                        </span>
                      )}
                      {typeof v.cvss === 'number' && (
                        <span className="flex items-center gap-1.5">
                          <span>CVSS:</span>
                          <span className={`font-bold ${v.cvss >= 9 ? 'text-red-500' : v.cvss >= 7 ? 'text-orange-500' : 'text-yellow-500'}`}>
                            {v.cvss.toFixed(1)}
                          </span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Affected Files */}
                  {detailLevel === 'full' && v.affectedFiles?.length ? (
                    <div className="mt-3 text-xs">
                      <span className="text-green-500/40 uppercase tracking-wider text-[10px] font-bold">Affected Files:</span>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {v.affectedFiles.map((file, idx) => (
                          <span key={idx} className="bg-green-900/10 text-green-400 px-2 py-1 border border-green-500/20">
                            {file}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* AI Actions - Toggle Slider + Execute Button */}
                <div className="flex-shrink-0 pt-1 md:self-start self-end">
                  <div className="flex flex-col gap-2">
                    {/* Toggle Slider */}
                    <div className="flex items-center bg-black/60 border border-green-500/30 rounded-sm overflow-hidden">
                      <button
                        onClick={() => setActionMode(prev => ({ ...prev, [v.id]: 'explain' }))}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                          (actionMode[v.id] || 'explain') === 'explain'
                            ? 'bg-cyan-500/20 text-cyan-400 border-r border-cyan-500/30'
                            : 'text-green-500/50 hover:text-green-400 border-r border-green-500/20'
                        }`}
                      >
                        EXPLAIN
                      </button>
                      <button
                        onClick={() => setActionMode(prev => ({ ...prev, [v.id]: 'fix' }))}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                          actionMode[v.id] === 'fix'
                            ? 'bg-green-500/20 text-green-400'
                            : 'text-green-500/50 hover:text-green-400'
                        }`}
                      >
                        FIX
                      </button>
                    </div>

                    {/* Execute Button - Changes based on selected mode */}
                    {(actionMode[v.id] || 'explain') === 'explain' ? (
                      // Explain Button
                      !explainData[v.id] && (
                        <button
                          onClick={() => handleExplain(v)}
                          disabled={explainingFindingId === v.id}
                          className={`px-4 py-2 text-xs font-bold border transition-all duration-150 flex items-center gap-2 uppercase tracking-wider ${
                            explainingFindingId === v.id
                              ? 'border-cyan-500 text-cyan-400 bg-cyan-900/20 animate-pulse cursor-wait'
                              : 'bg-cyan-900/10 text-cyan-400 border-cyan-500 hover:bg-cyan-500 hover:text-black hover:shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                          }`}
                        >
                          {explainingFindingId === v.id ? (
                            <span>ANALYZING...</span>
                          ) : (
                            <span>[ EXPLAIN_CVE ]</span>
                          )}
                        </button>
                      )
                    ) : (
                      // Fix Button
                      !fixData[v.id] && (
                        <button
                          onClick={() => handleFix(v)}
                          disabled={fixingFindingId === v.id}
                          className={`px-4 py-2 text-xs font-bold border transition-all duration-150 flex items-center gap-2 uppercase tracking-wider ${
                            fixingFindingId === v.id
                              ? 'border-green-500 text-green-400 bg-green-900/20 animate-pulse cursor-wait'
                              : 'bg-green-900/10 text-green-400 border-green-500 hover:bg-green-500 hover:text-black hover:shadow-[0_0_10px_rgba(0,255,65,0.4)]'
                          }`}
                        >
                          {fixingFindingId === v.id ? (
                            <span>GENERATING...</span>
                          ) : (
                            <span>[ EXECUTE_FIX ]</span>
                          )}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Recommendation Box */}
              {detailLevel !== 'minimal' && v.recommendation && (
                <div className="mt-4 border-l-2 border-green-500/30 pl-3 py-1 text-sm">
                  <div className="text-green-500/40 text-xs font-bold uppercase tracking-wider mb-1">
                    RECOMMENDATION
                  </div>
                  <div className="text-green-300/80 leading-relaxed text-xs sm:text-sm">{v.recommendation}</div>
                </div>
              )}

              {/* AI Explain Results */}
              {explainData[v.id] && (
                <div className={`mt-4 border-2 overflow-hidden ${explainData[v.id].error ? 'border-red-500/50' : 'border-cyan-500/50'} bg-black/80`}>
                  <div className={`px-4 py-2 border-b flex flex-wrap items-center justify-between gap-2 ${explainData[v.id].error ? 'bg-red-900/20 border-red-500/30' : 'bg-cyan-900/20 border-cyan-500/30'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs font-bold tracking-widest uppercase ${explainData[v.id].error ? 'text-red-500' : 'text-cyan-500'}`}>
                        {explainData[v.id].error ? 'ERROR: EXPLAIN_FAILED' : 'VULNERABILITY_EXPLAINED'}
                      </span>
                    </div>
                    {!explainData[v.id].error && explainData[v.id].severity && (
                      <span className="text-[10px] text-cyan-500/60 flex-shrink-0">
                        SEVERITY: {explainData[v.id].severity}
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-3 overflow-x-auto">
                    {explainData[v.id].error ? (
                      <div className="text-sm text-red-400 font-mono break-words whitespace-pre-wrap">
                        {explainData[v.id].error}
                      </div>
                    ) : (
                      <>
                        {/* Main Explanation */}
                        {(explainData[v.id].explanation || explainData[v.id].response || explainData[v.id].result) && (
                          <div className="text-sm text-cyan-300/80 leading-relaxed">
                            <span className="text-cyan-500 font-bold text-xs uppercase tracking-wider block mb-1">Detailed Explanation</span>
                            <div className="whitespace-pre-wrap break-words border-l-2 border-cyan-500/30 pl-3">
                              {explainData[v.id].explanation || explainData[v.id].response || explainData[v.id].result}
                            </div>
                          </div>
                        )}

                        {/* Remediation */}
                        {explainData[v.id].remediation && (
                          <div className="mt-3 text-sm text-green-300/80 leading-relaxed">
                            <span className="text-green-500 font-bold text-xs uppercase tracking-wider block mb-1">Remediation</span>
                            <div className="whitespace-pre-wrap break-words bg-green-900/10 p-3 border border-green-500/20">
                              {explainData[v.id].remediation}
                            </div>
                          </div>
                        )}

                        {/* References */}
                        {explainData[v.id].references && explainData[v.id].references!.length > 0 && (
                          <div className="mt-3">
                            <span className="text-cyan-500/60 font-bold text-[10px] uppercase tracking-wider block mb-2">References</span>
                            <ul className="space-y-1 overflow-hidden">
                              {explainData[v.id].references!.map((ref, idx) => (
                                <li key={idx} className="truncate">
                                  <a 
                                    href={ref} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-cyan-400 text-xs font-mono hover:underline hover:text-cyan-300 transition-colors break-all"
                                    title={ref}
                                  >
                                    {ref}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* AI Fix Results */}
              {fixData[v.id] && (
                <div className={`mt-4 border-2 overflow-hidden ${fixData[v.id].error ? 'border-red-500/50' : 'border-green-500/50'} bg-black/80`}>
                  <div className={`px-4 py-2 border-b flex flex-wrap items-center justify-between gap-2 ${fixData[v.id].error ? 'bg-red-900/20 border-red-500/30' : 'bg-green-900/20 border-green-500/30'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs font-bold tracking-widest uppercase ${fixData[v.id].error ? 'text-red-500' : 'text-green-500'}`}>
                        {fixData[v.id].error ? 'ERROR: GENERATION_FAILED' : 'FIX_SUGGESTION_READY'}
                      </span>
                    </div>
                    {!fixData[v.id].error && (
                      <span className="text-[10px] text-green-500/60 flex-shrink-0">
                        CONFIDENCE: {(fixData[v.id].confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-3 overflow-x-auto">
                    {fixData[v.id].error ? (
                      <div className="text-sm text-red-400 font-mono break-words whitespace-pre-wrap">
                        {fixData[v.id].error}
                      </div>
                    ) : (
                      <>
                        <div className="text-sm text-green-300/80 leading-relaxed break-words">
                          <span className="text-green-500 font-bold text-xs uppercase tracking-wider block mb-1">Analysis</span>
                          {fixData[v.id].explanation}
                        </div>
                        <div className="mt-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                            <span className="text-green-500 font-bold text-xs uppercase tracking-wider">Patch Code</span>
                            <button
                              onClick={() => navigator.clipboard.writeText(fixData[v.id].fixed_code)}
                              className="text-[10px] text-green-500/50 hover:text-green-400 transition-colors uppercase tracking-wider flex-shrink-0"
                            >
                              [ COPY_CODE ]
                            </button>
                          </div>
                          <pre className="bg-black p-3 border border-green-500/30 text-xs text-green-400 overflow-x-auto custom-scrollbar whitespace-pre-wrap break-words">
                            {fixData[v.id].fixed_code}
                          </pre>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* AI Enrichment Details */}
              {(enrichedData[v.id] || v.explanation || (enrichedData[v.id] && enrichedData[v.id].enrichment_successful === false)) && (
                <div className={`mt-4 border-2 ${enrichedData[v.id]?.enrichment_successful === false ? 'border-red-500/50' : 'border-green-500/50'} bg-black/80`}>
                  <div className={`px-4 py-1 border-b flex items-center gap-2 ${enrichedData[v.id]?.enrichment_successful === false ? 'bg-red-900/20 border-red-500/30' : 'bg-green-900/20 border-green-500/30'}`}>
                    <span className={`text-xs font-bold tracking-widest uppercase ${enrichedData[v.id]?.enrichment_successful === false ? 'text-red-500' : 'text-green-500'}`}>
                      {enrichedData[v.id]?.enrichment_successful === false ? 'ERROR: ENRICHMENT_FAILED' : 'AI_INSIGHTS_LOADED'}
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* Use enriched data if available, otherwise fall back to static data if it exists */}
                    {(() => {
                      const enriched = enrichedData[v.id] || v;

                      if (enriched.enrichment_successful === false) {
                        return (
                          <div className="text-sm text-red-400 font-mono">
                            {enriched.enrichment_error || "Failed to generate AI insights for this finding."}
                          </div>
                        );
                      }

                      // Parse explanation if it's a JSON string containing structured data
                      let parsedInsights: { explanation?: string; remediation?: string; risk_summary?: string } | null = null;
                      if (enriched.explanation && typeof enriched.explanation === 'string') {
                        try {
                          // Check if it's JSON (starts with { or contains typical JSON patterns)
                          const trimmed = enriched.explanation.trim();
                          if (trimmed.startsWith('{') || trimmed.startsWith('```json')) {
                            // Extract JSON from markdown code block if present
                            const jsonMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/);
                            const jsonStr = jsonMatch ? jsonMatch[1] : trimmed;
                            parsedInsights = JSON.parse(jsonStr);
                          }
                        } catch {
                          // Not JSON, use as plain text
                          parsedInsights = null;
                        }
                      }

                      // Use parsed insights if available, otherwise use original fields
                      const riskSummary = parsedInsights?.risk_summary || enriched.risk_summary;
                      const explanation = parsedInsights?.explanation || (parsedInsights ? null : enriched.explanation);
                      const remediation = parsedInsights?.remediation || enriched.remediation_suggestion;

                      return (
                        <>
                          {riskSummary && (
                            <div className="text-sm text-green-300/90">
                              <span className="text-green-500 font-bold text-xs uppercase tracking-wider block mb-1">Risk Assessment</span>
                              {riskSummary}
                            </div>
                          )}
                          {explanation && (
                            <div className="text-sm text-green-300/80 mt-3">
                              <span className="text-green-500 font-bold text-xs uppercase tracking-wider block mb-1">Technical Detail</span>
                              {explanation}
                            </div>
                          )}
                          {remediation && (
                            <div className="text-sm text-green-300/80 mt-3 border-l-2 border-green-500/30 pl-3">
                              <span className="text-green-500 font-bold text-xs uppercase tracking-wider block mb-1">Remediation Strategy</span>
                              <div className="whitespace-pre-wrap">{remediation}</div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-green-500/20 pt-4">
            <button
              onClick={previousPage}
              disabled={!hasPreviousPage}
              className="px-4 py-2 text-xs font-bold border border-green-500/30 text-green-500 hover:bg-green-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase"
            >
              &lt; PREV
            </button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`w-8 h-8 flex items-center justify-center text-xs font-bold border transition-all ${currentPage === page
                    ? 'border-green-500 bg-green-500 text-black'
                    : 'border-transparent text-green-500/50 hover:text-green-400'
                    }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={nextPage}
              disabled={!hasNextPage}
              className="px-4 py-2 text-xs font-bold border border-green-500/30 text-green-500 hover:bg-green-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase"
            >
              NEXT &gt;
            </button>
          </div>
        )}
      </div>

      {/* Recommendations summary - Show for standard and full levels */}
      {detailLevel !== 'minimal' && data.vulnerabilities.length > 0 && (
        <div className="bg-black/80 backdrop-blur-sm p-6 border border-green-500/20 relative">
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-green-500/50"></div>
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-green-500/50"></div>
          <h3 className="text-green-400 text-base mb-3 tracking-wider uppercase font-bold">Recommended_Actions</h3>
          <ul className="list-disc pl-6 text-sm text-green-300/80 space-y-1 marker:text-green-500">
            <li>Prioritize updating packages with <span className="text-red-500 font-bold">CRITICAL</span> and <span className="text-red-400 font-bold">HIGH</span> vulnerabilities.</li>
            {detailLevel === 'full' && (
              <>
                <li>Enable CI scanning to prevent regressions.</li>
                <li>Lock dependency versions and review transitive dependencies.</li>
                <li>Review security advisories and update dependencies regularly.</li>
              </>
            )}
            {detailLevel === 'standard' && (
              <>
                <li>Enable CI scanning to prevent regressions.</li>
                <li>Lock dependency versions and review transitive dependencies.</li>
              </>
            )}
          </ul>
        </div>
      )}
    </section>
  );
}
