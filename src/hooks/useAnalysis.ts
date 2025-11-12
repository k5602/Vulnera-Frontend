import { useState, useCallback } from 'react';
import { apiClient } from '../utils/api/client';
import { API_ENDPOINTS } from '../config/api';
import { transformScanResponse } from '../utils/scan-handler';

export interface AnalysisOptions {
  detailLevel: 'minimal' | 'standard' | 'full';
  modules: string[];
}

export interface AnalysisResult {
  fileAnalyses: Array<{
    file: string;
    ecosystem: string;
    dependencies: number;
    vulnerable: number;
  }>;
  allVulnerabilities: any[];
  allFindings: {
    dependencies: any[];
    sast: any[];
    secrets: any[];
    api: any[];
  };
}

export function useAnalysis() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const analyzeFiles = useCallback(async (
    files: File[],
    options: AnalysisOptions
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      // Prepare files payload
      const filesPayload = [];
      for (const file of files) {
        try {
          const content = await file.text();
          const ecosystem = detectEcosystem(file.name);

          filesPayload.push({
            filename: file.name,
            ecosystem: ecosystem,
            file_content: content,
          });
        } catch (e) {
          console.error(`Error reading file ${file.name}:`, e);
        }
      }

      if (!filesPayload.length) {
        throw new Error('No valid files to analyze');
      }

      // Build query parameters
      const queryParams = new URLSearchParams({
        detail_level: options.detailLevel,
      });

      options.modules.forEach((module) => {
        queryParams.append("modules", module);
      });

      // Call API
      const endpoint = `${API_ENDPOINTS.ANALYSIS.ANALYZE_DEPENDENCIES}?${queryParams.toString()}`;
      const apiResponse = await apiClient.post(endpoint, { files: filesPayload });

      if (!apiResponse.success) {
        throw new Error(apiResponse.error || 'Analysis failed');
      }

      // Transform response
      const transformed = transformScanResponse(apiResponse.data);
      setResult(transformed);

      return transformed;
    } catch (err: any) {
      const errorMessage = err?.message || 'Analysis failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    analyzeFiles,
    isLoading,
    error,
    result,
    reset,
  };
}

function detectEcosystem(filename: string): string {
  const lowerName = filename.toLowerCase();

  if (lowerName.includes("pom.xml")) return "maven";
  if (lowerName.includes("cargo.lock") || lowerName.includes("cargo.toml")) return "cargo";
  if (lowerName.includes("go.mod")) return "go";
  if (lowerName.includes("composer.json")) return "packagist";
  if (lowerName.includes("gemfile")) return "ruby";
  if (lowerName.includes("requirements") && lowerName.includes(".txt")) return "pypi";
  if (lowerName.endsWith(".json")) return "npm";

  return "npm";
}

