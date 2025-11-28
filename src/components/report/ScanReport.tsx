import { useMemo, useState } from 'react';
import { usePagination } from '../../hooks/usePagination';
import { enrichService, type EnrichedFinding } from '../../utils/api/enrich-service';
import { fixService, type FixResponse } from '../../utils/api/fix-service';

export type Vulnerability = {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
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
    files: number;
    dependencies: number;
    vulnerabilities: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  files: FileAnalysis[];
  vulnerabilities: Vulnerability[];
};

function SeverityBadge({ level }: { level: Vulnerability['severity'] }) {
  const map: Record<Vulnerability['severity'], string> = {
    CRITICAL: 'bg-red-600/20 text-red-400 border-red-500/40',
    HIGH: 'bg-red-500/15 text-red-300 border-red-400/30',
    MEDIUM: 'bg-yellow-500/15 text-yellow-300 border-yellow-400/30',
    LOW: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30',
    INFO: 'bg-matrix-500/10 text-matrix-300 border-matrix-400/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-xs font-mono border ${map[level]}`}>{level}</span>
  );
}

export default function ScanReport({ data }: { data: ScanReportData }) {
  const fmtDuration = useMemo(() => `${Math.max(1, Math.round(data.durationMs / 1000))}s`, [data.durationMs]);
  const detailLevel = data.detailLevel || 'standard';

  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichedData, setEnrichedData] = useState<Record<string, EnrichedFinding>>({});

  const [fixingFindingId, setFixingFindingId] = useState<string | null>(null);
  const [fixData, setFixData] = useState<Record<string, FixResponse & { error?: string }>>({});

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

      const response = await fixService.generateFix({
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
        throw new Error(response.error || "Failed to generate fix");
      }
    } catch (error: any) {
      console.error("Fix generation failed:", error);
      // Store error in state instead of alerting
      setFixData(prev => ({
        ...prev,
        [finding.id]: {
          confidence: 0,
          explanation: "",
          fixed_code: "",
          error: error.message || "Failed to generate fix. Please try again."
        }
      }));
    } finally {
      setFixingFindingId(null);
    }
  };

  const handleEnrich = async () => {
    if (!data.jobId) {
      console.error("No Job ID available for enrichment");
      return;
    }

    setIsEnriching(true);
    try {
      // 1. Prioritize findings (Critical > High > Medium > Low > Info)
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
      const sortedVulns = [...data.vulnerabilities].sort((a, b) => {
        return severityOrder[a.severity] - severityOrder[b.severity];
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
    } catch (error) {
      console.error("Enrichment failed:", error);
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

  function toFilesCSV(files: FileAnalysis[]) {
    const header = ['file', 'ecosystem', 'dependencies', 'vulnerable'];
    const rows = files.map(f => [f.file, f.ecosystem, String(f.dependencies), String(f.vulnerable)]);
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
    <section id="scan-report-root" className="mt-8 sm:mt-10">
      {/* Header */}
      <div className="terminal-border bg-black/80 rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h2 className="text-cyber-400 font-mono text-lg">SCAN_REPORT</h2>
            <span className={`px-2 py-0.5 rounded text-xs font-mono border ${detailLevel === 'minimal' ? 'bg-gray-500/10 text-gray-300 border-gray-500/30' :
              detailLevel === 'full' ? 'bg-purple-500/10 text-purple-300 border-purple-500/30' :
                'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
              }`}>
              {detailLevel.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadBlob(`vulnera_report_${Date.now()}.json`, JSON.stringify(data, null, 2), 'application/json')}
              className="px-2 py-1 text-xs font-mono rounded-md border border-cyber-400/40 text-cyber-300 hover:bg-cyber-500/10"
              title="Download JSON"
            >DOWNLOAD_JSON</button>
            <button
              onClick={() => downloadBlob(`vulnera_vulnerabilities_${Date.now()}.csv`, toVulnsCSV(data.vulnerabilities), 'text/csv')}
              className="px-2 py-1 text-xs font-mono rounded-md border border-red-500/40 text-red-300 hover:bg-red-500/10"
              title="Download vulnerabilities as CSV"
            >DOWNLOAD_VULNS_CSV</button>
            <button
              onClick={() => downloadBlob(`vulnera_files_${Date.now()}.csv`, toFilesCSV(data.files), 'text/csv')}
              className="px-2 py-1 text-xs font-mono rounded-md border border-matrix-500/40 text-matrix-300 hover:bg-matrix-500/10"
              title="Download files analysis as CSV"
            >DOWNLOAD_FILES_CSV</button>
            <button
              onClick={printReport}
              className="px-2 py-1 text-xs font-mono rounded-md border border-cyber-400/40 text-cyber-300 hover:bg-cyber-500/10"
              title="Print or Save as PDF"
            >PRINT_PDF</button>

            {/* AI Enrichment Button */}
            {data.jobId && (
              <button
                onClick={handleEnrich}
                disabled={isEnriching || Object.keys(enrichedData).length > 0}
                className={`px-2 py-1 text-xs font-mono rounded-md border transition-all duration-300 flex items-center gap-2 ${Object.keys(enrichedData).length > 0
                  ? 'border-cyber-500/40 text-cyber-300 bg-cyber-500/10 cursor-default'
                  : isEnriching
                    ? 'border-cyber-500/40 text-cyber-400 animate-pulse cursor-wait'
                    : 'border-cyber-400/40 text-cyber-300 hover:bg-cyber-500/10 hover:shadow-[0_0_10px_rgba(0,229,209,0.3)]'
                  }`}
                title="Enrich findings with AI insights"
              >
                {isEnriching ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-cyber-400 animate-ping" />
                    ENRICHING...
                  </>
                ) : Object.keys(enrichedData).length > 0 ? (
                  <>
                    <span className="text-cyber-400">✨</span>
                    AI_ENRICHED
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    ENRICH_WITH_AI
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm font-mono">
          <div className="bg-black/60 rounded-lg p-3 border border-matrix-500/20">
            <div className="text-gray-400">FILES</div>
            <div className="text-white text-xl">{data.summary.files}</div>
          </div>
          <div className="bg-black/60 rounded-lg p-3 border border-matrix-500/20">
            <div className="text-gray-400">DEPENDENCIES</div>
            <div className="text-white text-xl">{data.summary.dependencies}</div>
          </div>
          <div className="bg-black/60 rounded-lg p-3 border border-red-500/30">
            <div className="text-red-400">VULNERABILITIES</div>
            <div className="text-red-300 text-xl">{data.summary.vulnerabilities}</div>
          </div>
          <div className="bg-black/60 rounded-lg p-3 border border-red-600/40">
            <div className="text-red-400">CRITICAL/HIGH</div>
            <div className="text-red-300 text-xl">{(data.summary.critical || 0) + (data.summary.high || 0)}</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-400 font-mono">Duration: {fmtDuration}</div>
      </div>

      {/* Files table - Show for standard and full levels */}
      {detailLevel !== 'minimal' && (
        <div className="mt-6 terminal-border bg-black/80 rounded-xl p-4 sm:p-6">
          <h3 className="text-cyber-400 font-mono text-base mb-3">FILES_ANALYSIS</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="text-gray-400 border-b border-cyber-500/20">
                  <th className="text-left py-2 pr-3">FILE</th>
                  <th className="text-left py-2 pr-3">ECOSYSTEM</th>
                  <th className="text-right py-2 pr-3">DEPENDENCIES</th>
                  <th className="text-right py-2">VULNERABLE</th>
                </tr>
              </thead>
              <tbody>
                {data.files.map((f) => (
                  <tr key={f.file} className="border-b border-cyber-500/10">
                    <td className="py-2 pr-3 text-matrix-300 break-anywhere">{f.file}</td>
                    <td className="py-2 pr-3 text-gray-300">{f.ecosystem}</td>
                    <td className="py-2 pr-3 text-right text-gray-200">{f.dependencies}</td>
                    <td className={`py-2 text-right ${f.vulnerable ? 'text-red-400' : 'text-matrix-300'}`}>{f.vulnerable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vulnerabilities */}
      <div className="mt-6 terminal-border bg-black/80 rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-cyber-400 font-mono text-base">VULNERABILITIES</h3>
          <div className="flex items-center gap-3">
            {detailLevel === 'minimal' && data.vulnerabilities.length > filteredVulnerabilities.length && (
              <span className="text-xs text-gray-400 font-mono">
                {filteredVulnerabilities.length} of {data.vulnerabilities.length} (Critical/High only)
              </span>
            )}
            {totalPages > 1 && (
              <span className="text-xs text-gray-400 font-mono">
                Page {currentPage} of {totalPages}
              </span>
            )}
          </div>
        </div>
        {displayedVulnerabilities.length === 0 && (
          <div className="text-matrix-300 text-sm">
            {data.vulnerabilities.length === 0
              ? 'No vulnerabilities detected. ✅'
              : 'No critical or high severity vulnerabilities. ✅'}
          </div>
        )}
        <ul className="space-y-3">
          {displayedVulnerabilities.map((v) => (
            <li key={v.id} className="rounded-lg border border-cyber-500/20 bg-black/60 p-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <SeverityBadge level={v.severity} />
                    <span className="text-white font-semibold">{v.package}</span>
                    {v.version && v.version !== '-' && (
                      <span className="text-gray-400">@ {v.version}</span>
                    )}
                  </div>
                  <div className="text-red-300">{v.title}</div>

                  {/* Show CVE and CVSS for standard and full levels */}
                  {detailLevel !== 'minimal' && (
                    <div className="text-xs text-gray-400 font-mono">
                      {v.cve && <span className="mr-4">CVE: {v.cve}</span>}
                      {typeof v.cvss === 'number' && <span>CVSS: {v.cvss.toFixed(1)}</span>}
                    </div>
                  )}

                  {/* Show affected files only for full level */}
                  {detailLevel === 'full' && v.affectedFiles?.length ? (
                    <div className="text-xs text-gray-300">
                      Affected: {v.affectedFiles.join(', ')}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Show recommendations for standard and full levels */}
              {detailLevel !== 'minimal' && v.recommendation && (
                <div className="mt-2 bg-black/50 border border-red-500/20 rounded-md p-2 text-xs text-red-200">
                  <div className="text-red-400 mb-1">RECOMMENDATION</div>
                  {v.recommendation}
                </div>
              )}

              {/* Fix with AI Button */}
              <div className="mt-2 flex justify-end">
                {!fixData[v.id] && (
                  <button
                    onClick={() => handleFix(v)}
                    disabled={fixingFindingId === v.id}
                    className={`px-2 py-1 text-xs font-mono rounded-md border flex items-center gap-2 ${fixingFindingId === v.id
                      ? 'border-cyber-500/40 text-cyber-400 animate-pulse cursor-wait'
                      : 'border-cyber-400/40 text-cyber-300 hover:bg-cyber-500/10 hover:shadow-[0_0_10px_rgba(0,229,209,0.3)]'
                      }`}
                  >
                    {fixingFindingId === v.id ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-cyber-400 animate-ping" />
                        GENERATING_FIX...
                      </>
                    ) : (
                      <>
                        <span>🔧</span>
                        FIX_WITH_AI
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* AI Fix Results */}
              {fixData[v.id] && (
                <div className={`mt-3 border rounded-lg overflow-hidden ${fixData[v.id].error ? 'border-red-500/30' : 'border-green-500/30'}`}>
                  <div className={`px-3 py-1 border-b flex items-center gap-2 ${fixData[v.id].error ? 'bg-red-950/30 border-red-500/20' : 'bg-green-950/30 border-green-500/20'}`}>
                    <span className={`text-xs font-mono ${fixData[v.id].error ? 'text-red-400' : 'text-green-400'}`}>
                      {fixData[v.id].error ? '⚠️ FIX_GENERATION_FAILED' : '🔧 AI_FIX_SUGGESTION'}
                    </span>
                    {!fixData[v.id].error && (
                      <span className="text-[10px] text-green-500/70 ml-auto">Confidence: {(fixData[v.id].confidence * 100).toFixed(0)}%</span>
                    )}
                  </div>
                  <div className="p-3 bg-black/40 space-y-2">
                    {fixData[v.id].error ? (
                      <div className="text-sm text-red-300">
                        <span className="text-red-500 font-mono text-xs uppercase tracking-wider block mb-1">Error</span>
                        {fixData[v.id].error}
                      </div>
                    ) : (
                      <>
                        <div className="text-sm text-gray-300">
                          <span className="text-green-500 font-mono text-xs uppercase tracking-wider block mb-1">Explanation</span>
                          {fixData[v.id].explanation}
                        </div>
                        <div className="mt-2">
                          <span className="text-green-500 font-mono text-xs uppercase tracking-wider block mb-1">Fixed Code</span>
                          <pre className="bg-black/80 p-2 rounded border border-green-500/20 text-xs text-green-300 overflow-x-auto font-mono">
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
                <div className={`mt-3 border rounded-lg overflow-hidden ${enrichedData[v.id]?.enrichment_successful === false ? 'border-red-500/30' : 'border-cyber-500/30'}`}>
                  <div className={`px-3 py-1 border-b flex items-center gap-2 ${enrichedData[v.id]?.enrichment_successful === false ? 'bg-red-950/30 border-red-500/20' : 'bg-cyber-950/50 border-cyber-500/20'}`}>
                    <span className={`text-xs font-mono ${enrichedData[v.id]?.enrichment_successful === false ? 'text-red-400' : 'text-cyber-400'}`}>
                      {enrichedData[v.id]?.enrichment_successful === false ? '⚠️ ENRICHMENT_FAILED' : '✨ AI_INSIGHTS'}
                    </span>
                  </div>
                  <div className="p-3 bg-black/40 space-y-2">
                    {/* Use enriched data if available, otherwise fall back to static data if it exists */}
                    {(() => {
                      const enriched = enrichedData[v.id] || v;

                      if (enriched.enrichment_successful === false) {
                        return (
                          <div className="text-sm text-red-300">
                            <span className="text-red-500 font-mono text-xs uppercase tracking-wider block mb-1">Error</span>
                            {enriched.enrichment_error || "Failed to generate AI insights for this finding."}
                          </div>
                        );
                      }

                      return (
                        <>
                          {enriched.risk_summary && (
                            <div className="text-sm text-gray-200">
                              <span className="text-cyber-500 font-mono text-xs uppercase tracking-wider block mb-1">Risk Summary</span>
                              {enriched.risk_summary}
                            </div>
                          )}
                          {enriched.explanation && (
                            <div className="text-sm text-gray-300 mt-2">
                              <span className="text-cyber-500 font-mono text-xs uppercase tracking-wider block mb-1">Explanation</span>
                              {enriched.explanation}
                            </div>
                          )}
                          {enriched.remediation_suggestion && (
                            <div className="text-sm text-gray-300 mt-2 bg-cyber-900/20 p-2 rounded border border-cyber-500/10">
                              <span className="text-cyber-500 font-mono text-xs uppercase tracking-wider block mb-1">Remediation</span>
                              {enriched.remediation_suggestion}
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
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={previousPage}
              disabled={!hasPreviousPage}
              className="px-3 py-1 text-xs font-mono rounded-md border border-cyber-400/40 text-cyber-300 hover:bg-cyber-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`px-2 py-1 text-xs font-mono rounded-md border ${currentPage === page
                    ? 'border-cyber-400 bg-cyber-500/20 text-cyber-300'
                    : 'border-cyber-400/40 text-cyber-300 hover:bg-cyber-500/10'
                    }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={nextPage}
              disabled={!hasNextPage}
              className="px-3 py-1 text-xs font-mono rounded-md border border-cyber-400/40 text-cyber-300 hover:bg-cyber-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Recommendations summary - Show for standard and full levels */}
      {detailLevel !== 'minimal' && data.vulnerabilities.length > 0 && (
        <div className="mt-6 terminal-border bg-black/80 rounded-xl p-4 sm:p-6">
          <h3 className="text-cyber-400 font-mono text-base mb-3">NEXT_STEPS</h3>
          <ul className="list-disc pl-6 text-sm text-gray-200 space-y-1">
            <li>Prioritize updating packages with <span className="text-red-400">CRITICAL</span> and <span className="text-red-300">HIGH</span> vulnerabilities.</li>
            {detailLevel === 'full' && (
              <>
                <li>Enable CI scanning to prevent regressions.</li>
                <li>Lock dependency versions and review transitive dependencies.</li>
                <li>Review security advisories and update dependencies regularly.</li>
                <li>Consider using automated tools for continuous monitoring.</li>
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
