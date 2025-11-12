import React, { useState, useEffect } from 'react';

export interface ImportFormProps {
  onImport: (url: string, depth: string) => void;
  isLoading?: boolean;
}

export default function ImportForm({ onImport, isLoading = false }: ImportFormProps) {
  const [url, setUrl] = useState('');
  const [depth, setDepth] = useState('standard');
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    // Check for GitHub token
    const checkToken = () => {
      const nameEQ = 'github_token=';
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const trimmed = cookie.trim();
        if (trimmed.startsWith(nameEQ)) {
          setHasToken(true);
          return;
        }
      }
      setHasToken(false);
    };

    checkToken();
    window.addEventListener('github-token-updated', checkToken);
    return () => window.removeEventListener('github-token-updated', checkToken);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && hasToken) {
      onImport(url.trim(), depth);
    }
  };

  if (!hasToken) {
    return (
      <div className="p-2 sm:p-3 bg-purple-900/20 border border-purple-500/40 rounded-lg">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔐</span>
            <h3 className="text-xs sm:text-sm text-purple-400 font-bold font-mono">
              GitHub Token Required
            </h3>
          </div>
          <p className="text-xs text-gray-300">Add token in Settings to import repos.</p>
          <a
            href="/settings#api-keys"
            className="text-xs text-purple-300 hover:text-purple-200 underline"
          >
            Go to Settings →
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="repo-url" className="block text-xs text-matrix-300 font-mono mb-1">
          REPOSITORY_URL
        </label>
        <input
          id="repo-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          className="w-full bg-black/60 border border-cyber-400/30 text-matrix-200 px-3 py-2 rounded-lg text-xs sm:text-sm font-mono focus:border-cyber-400 focus:ring-2 focus:ring-cyber-400/20"
          required
        />
      </div>

      <div>
        <label className="block text-xs text-matrix-300 font-mono mb-1">
          ANALYSIS_DEPTH
        </label>
        <div className="flex gap-2">
          {['minimal', 'standard', 'full'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDepth(d)}
              className={`flex-1 px-3 py-1.5 rounded-lg font-mono text-xs border transition-all ${
                depth === d
                  ? 'border-cyber-400/60 bg-cyber-400/10 text-cyber-300'
                  : 'border-gray-600/40 text-gray-400 hover:bg-gray-600/10'
              }`}
            >
              {d.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading || !url.trim()}
        className="w-full inline-flex items-center justify-center bg-gradient-to-r from-cyber-600 to-matrix-600 hover:from-cyber-500 hover:to-matrix-500 text-black px-3 py-2 rounded-lg font-mono text-xs sm:text-sm terminal-border cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="mr-1">&gt;</span> {isLoading ? 'IMPORTING...' : 'IMPORT_REPO'}
      </button>
    </form>
  );
}

