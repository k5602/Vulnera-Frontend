/**
 * Scan processing utilities
 * Handles transformation of API responses to report format
 */

export interface FileResult {
  filename: string;
  ecosystem?: string;
  error?: string;
  vulnerabilities?: any[];
  metadata?: {
    total_packages?: number;
    vulnerable_packages?: number;
  };
}

export interface ScanResult {
  results?: FileResult[];
}

export interface TransformedReport {
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

/**
 * Transform API response to report format
 */
export function transformScanResponse(result: ScanResult): TransformedReport {
  const fileAnalyses: TransformedReport['fileAnalyses'] = [];
  const allVulnerabilities: any[] = [];
  const allFindings = {
    dependencies: [],
    sast: [],
    secrets: [],
    api: [],
  };

  if (result.results && Array.isArray(result.results)) {
    result.results.forEach((fileResult) => {
      if (fileResult.error) {
        return;
      }

      // Add file analysis
      fileAnalyses.push({
        file: fileResult.filename,
        ecosystem: fileResult.ecosystem || "unknown",
        dependencies: fileResult.metadata?.total_packages || 0,
        vulnerable: fileResult.metadata?.vulnerable_packages || 0,
      });

      // Process dependency vulnerabilities
      if (
        fileResult.vulnerabilities &&
        Array.isArray(fileResult.vulnerabilities)
      ) {
        fileResult.vulnerabilities.forEach((vuln) => {
          const vulnerability = {
            id: vuln.id,
            type: "dependency",
            severity: vuln.severity?.toUpperCase() || "UNKNOWN",
            package: vuln.affected_packages?.[0]?.name || "unknown",
            version: vuln.affected_packages?.[0]?.version || "",
            title: vuln.summary || vuln.description || "No description",
            cve: vuln.id,
            affectedFiles: [fileResult.filename],
            cvss: vuln.cvss_score,
            recommendation: vuln.affected_packages?.[0]
              ?.fixed_versions?.[0]
              ? `Upgrade to ${vuln.affected_packages[0].fixed_versions[0]}`
              : undefined,
          };
          allVulnerabilities.push(vulnerability);
          allFindings.dependencies.push(vulnerability);
        });
      }
    });
  }

  return {
    fileAnalyses,
    allVulnerabilities,
    allFindings,
  };
}

/**
 * Detect ecosystem from filename
 */
export function detectEcosystem(filename: string): string {
  const lowerName = filename.toLowerCase();

  if (lowerName.includes("pom.xml")) return "maven";
  if (lowerName.includes("cargo.lock") || lowerName.includes("cargo.toml")) return "cargo";
  if (lowerName.includes("go.mod")) return "go";
  if (lowerName.includes("composer.json")) return "packagist";
  if (lowerName.includes("gemfile")) return "ruby";
  if (lowerName.includes("requirements") && lowerName.includes(".txt")) return "pypi";
  if (lowerName.endsWith(".json")) return "npm";

  return "npm"; // default
}

