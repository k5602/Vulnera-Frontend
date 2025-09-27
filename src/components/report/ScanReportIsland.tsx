import React, { useEffect, useRef, useState } from 'react';
import ScanReport from './ScanReport';
import type { ScanReportData } from './ScanReport';

export default function ScanReportIsland() {
  const [data, setData] = useState<ScanReportData | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function handleReport(evt: CustomEvent<ScanReportData>) {
      setData(evt.detail);
      // Focus close button when modal opens
      requestAnimationFrame(() => closeBtnRef.current?.focus());
    }

    window.addEventListener('vulnera:scan-report', handleReport as EventListener);
    return () => window.removeEventListener('vulnera:scan-report', handleReport as EventListener);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setData(null);
    }
    if (data) {
      document.body.classList.add('overflow-hidden');
      window.addEventListener('keydown', onKey);
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
      window.removeEventListener('keydown', onKey);
    };
  }, [data]);

  if (!data) return null;

  return (
    <div className="fixed inset-0 z-50" aria-hidden={false}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => setData(null)}
      />
      {/* Dialog */}
      <div className="relative z-10 h-full w-full flex items-start sm:items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Scan report"
          className="w-full max-w-5xl terminal-border bg-black/90 rounded-xl shadow-xl"
        >
          {/* Header actions */}
          <div className="flex items-center justify-between px-4 pt-4">
            <div className="text-cyber-400 font-mono text-sm">REPORT_VIEW</div>
            <button
              ref={closeBtnRef}
              onClick={() => setData(null)}
              className="px-2 py-1 text-xs font-mono rounded-md border border-cyber-400/40 text-cyber-300 hover:bg-cyber-500/10"
              aria-label="Close report"
            >CLOSE</button>
          </div>

          {/* Content scroll */}
          <div className="max-h-[80vh] overflow-y-auto px-2 sm:px-4 pb-4">
            <ScanReport data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
