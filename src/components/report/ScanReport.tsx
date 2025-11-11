import { useMemo } from 'react';

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

  // Filter vulnerabilities based on detail level
  const displayedVulnerabilities = useMemo(() => {
    if (detailLevel === 'minimal') {
      // Show only CRITICAL and HIGH for minimal
      return data.vulnerabilities.filter(v => v.severity === 'CRITICAL' || v.severity === 'HIGH');
    }
    // Show all for standard and full
    return data.vulnerabilities;
  }, [data.vulnerabilities, detailLevel]);

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
    const header = ['id','severity','package','version','title','cve','cvss','affectedFiles','recommendation'];
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
    const header = ['file','ecosystem','dependencies','vulnerable'];
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
            <span className={`px-2 py-0.5 rounded text-xs font-mono border ${
              detailLevel === 'minimal' ? 'bg-gray-500/10 text-gray-300 border-gray-500/30' :
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
            <div className="text-red-300 text-xl">{data.summary.critical + data.summary.high}</div>
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
          {detailLevel === 'minimal' && data.vulnerabilities.length > displayedVulnerabilities.length && (
            <span className="text-xs text-gray-400 font-mono">
              Showing {displayedVulnerabilities.length} of {data.vulnerabilities.length} (Critical/High only)
            </span>
          )}
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
                    <span className="text-gray-400">@ {v.version}</span>
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
            </li>
          ))}
        </ul>
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
