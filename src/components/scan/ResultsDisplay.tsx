import React from 'react';
import { ErrorBoundary } from '../ErrorBoundary';

export interface ResultsDisplayProps {
  result: {
    fileAnalyses: Array<{
      file: string;
      ecosystem: string;
      dependencies: number;
      vulnerable: number;
    }>;
    allVulnerabilities: any[];
  } | null;
  isLoading: boolean;
  error: string | null;
}

export default function ResultsDisplay({ result, isLoading, error }: ResultsDisplayProps) {
  if (isLoading) {
    return (
      <div className="terminal-border bg-black/70 rounded-lg p-6 text-center">
        <div className="text-cyber-400 font-mono">SCANNING...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="terminal-border bg-red-900/20 border-red-500/50 rounded-lg p-6">
        <div className="text-red-400 font-mono mb-2">ERROR</div>
        <div className="text-red-300 text-sm">{error}</div>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <ErrorBoundary>
      <div className="terminal-border bg-black/70 rounded-lg p-4 sm:p-6">
        <h3 className="text-cyber-400 font-mono text-base mb-3">SCAN_RESULTS</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-black/60 rounded-lg p-3 border border-matrix-500/20">
            <div className="text-gray-400 text-xs">FILES</div>
            <div className="text-white text-xl">{result.fileAnalyses.length}</div>
          </div>
          <div className="bg-black/60 rounded-lg p-3 border border-matrix-500/20">
            <div className="text-gray-400 text-xs">VULNERABILITIES</div>
            <div className="text-red-300 text-xl">{result.allVulnerabilities.length}</div>
          </div>
        </div>

        {result.fileAnalyses.length > 0 && (
          <div className="mt-4">
            <h4 className="text-cyber-300 font-mono text-sm mb-2">FILES_ANALYZED</h4>
            <ul className="space-y-2 text-xs font-mono">
              {result.fileAnalyses.map((file, idx) => (
                <li key={idx} className="flex justify-between items-center bg-black/40 p-2 rounded">
                  <span className="text-matrix-300">{file.file}</span>
                  <span className="text-gray-400">
                    {file.vulnerable > 0 ? (
                      <span className="text-red-400">{file.vulnerable} vulns</span>
                    ) : (
                      <span className="text-green-400">✓ Safe</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

