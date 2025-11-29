/**
 * Report Transformer
 * Pure utility functions for transforming raw scan API responses
 * into normalized report structures for UI consumption.
 * 
 * This module has NO side effects - it only transforms data.
 */

import { normalizeSeverity, type SeverityLevel } from './severity';

// ============================================================================
// Raw API Response Types (Input)
// ============================================================================

/** Affected package in a vulnerability */
export interface RawAffectedPackage {
    name?: string;
    version?: string;
    fixed_versions?: string[];
}

/** Raw vulnerability from results array */
export interface RawVulnerability {
    id?: string;
    severity?: string;
    affected_packages?: RawAffectedPackage[];
    package_name?: string;
    name?: string;
    current_version?: string;
    version?: string;
    summary?: string;
    description?: string;
    title?: string;
    cve_id?: string;
    cvss_score?: number;
    recommendation?: string;
    recommendations?: { latest_safe?: string };
}

/** Raw scan result for a single file */
export interface RawFileResult {
    filename?: string;
    ecosystem?: string;
    vulnerabilities?: RawVulnerability[];
    metadata?: {
        total_packages?: number;
        vulnerable_packages?: number;
    };
    packages?: unknown[];
}

/** Location info for SAST/secret findings */
export interface RawFindingLocation {
    path: string;
    line: number;
    end_line?: number;
    column?: number;
    end_column?: number;
}

/** Raw SAST finding */
export interface RawSastFinding {
    id: string;
    confidence?: string;
    severity?: string;
    rule_id?: string;
    description?: string;
    location: RawFindingLocation;
    recommendation?: string;
}

/** Raw secret finding */
export interface RawSecretFinding {
    id: string;
    type?: string;
    confidence?: string;
    severity?: string;
    rule_id?: string;
    description?: string;
    location: RawFindingLocation;
    recommendation?: string;
}

/** Legacy dependency finding */
export interface RawLegacyDependency {
    package_name?: string;
    current_version?: string;
    cves?: Array<{
        id: string;
        severity?: string;
        description?: string;
        cvss_score?: number;
    }>;
    recommendations?: { latest_safe?: string };
}

/** Complete raw scan result from API */
export interface RawScanResult {
    results?: RawFileResult[];
    findings_by_type?: {
        dependencies?: Record<string, RawLegacyDependency>;
        sast?: RawSastFinding[];
        secrets?: RawSecretFinding[];
        api?: unknown[];
    };
    summary?: {
        total_findings?: number;
        by_severity?: SeverityBreakdown;
        by_type?: { sast: number; secrets: number; dependencies: number; api: number };
        modules_completed?: number;
        modules_failed?: number;
    };
    total_vulnerabilities?: number;
    metadata?: {
        total_files?: number;
        duration_ms?: number;
        successful?: number;
        failed?: number;
        total_packages?: number;
    };
    job_id?: string;
    project_id?: string;
    scan_id?: string;
    started_at?: string;
    completed_at?: string;
    finished_at?: string;
}

// ============================================================================
// Transformed Output Types
// ============================================================================

/** Severity breakdown counts */
export interface SeverityBreakdown {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
}

/** Normalized vulnerability */
export interface TransformedVulnerability {
    id: string;
    type: 'dependency' | 'sast' | 'secrets' | 'api';
    severity: SeverityLevel;
    package: string;
    version: string;
    title: string;
    description?: string;
    cve?: string;
    cvss?: number | null;
    affectedFiles?: string[];
    recommendation?: string;
    // SAST/Secret specific
    confidence?: string;
    secretType?: string;
    affected_file_location?: string;
    start_line?: number;
    end_line?: number;
    start_col?: number;
    end_col?: number;
}

/** Analyzed file summary */
export interface FileAnalysisSummary {
    file: string;
    ecosystem: string;
    dependencies: number;
    vulnerable: number;
}

/** Report summary */
export interface ReportSummary {
    files: number;
    dependencies: number;
    vulnerabilities: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info?: number;
}

/** Complete transformed report */
export interface TransformedReport {
    scanId: string;
    jobId?: string;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    detailLevel: string;
    summary: ReportSummary;
    files: FileAnalysisSummary[];
    vulnerabilities: TransformedVulnerability[];
}

/** Transform options */
export interface TransformOptions {
    detailLevel?: string;
    scannedFiles?: Array<{ name: string }>;
}

// ============================================================================
// Transformer Functions
// ============================================================================

/**
 * Extract vulnerabilities from the new results array format
 */
export function extractVulnerabilitiesFromResults(
    results: RawFileResult[]
): TransformedVulnerability[] {
    const vulnerabilities: TransformedVulnerability[] = [];

    results.forEach((scanResult) => {
        if (!scanResult.vulnerabilities || !Array.isArray(scanResult.vulnerabilities)) {
            return;
        }

        scanResult.vulnerabilities.forEach((vuln) => {
            const affectedPackage = vuln.affected_packages?.[0];
            const packageName = affectedPackage?.name || vuln.package_name || vuln.name || 'unknown';
            const packageVersion = affectedPackage?.version || vuln.current_version || vuln.version || 'unknown';
            const severity = normalizeSeverity(vuln.severity);

            let recommendation = vuln.recommendation;
            if (!recommendation && affectedPackage?.fixed_versions?.[0]) {
                recommendation = `Upgrade to ${affectedPackage.fixed_versions[0]}`;
            } else if (!recommendation && vuln.recommendations?.latest_safe) {
                recommendation = `Upgrade to ${vuln.recommendations.latest_safe}`;
            }

            vulnerabilities.push({
                id: vuln.id || `dep-${Date.now()}-${Math.random()}`,
                type: 'dependency',
                severity,
                package: packageName,
                version: packageVersion,
                title: vuln.summary || vuln.description || vuln.title || 'Vulnerable dependency',
                cve: vuln.id || vuln.cve_id,
                cvss: vuln.cvss_score || null,
                affectedFiles: [scanResult.filename || 'unknown'],
                recommendation: recommendation || 'No fix available',
            });
        });
    });

    return vulnerabilities;
}

/**
 * Extract vulnerabilities from legacy findings_by_type.dependencies format
 */
export function extractLegacyDependencyVulnerabilities(
    dependencies: Record<string, RawLegacyDependency>,
    scannedFileNames: string[]
): TransformedVulnerability[] {
    const vulnerabilities: TransformedVulnerability[] = [];

    Object.values(dependencies).forEach((dep) => {
        if (!dep.cves || !Array.isArray(dep.cves)) return;

        dep.cves.forEach((vuln) => {
            vulnerabilities.push({
                id: vuln.id,
                type: 'dependency',
                severity: normalizeSeverity(vuln.severity),
                package: dep.package_name || 'unknown',
                version: dep.current_version || 'unknown',
                title: vuln.description || 'Vulnerable dependency',
                cve: vuln.id,
                cvss: vuln.cvss_score,
                affectedFiles: [scannedFileNames.join(', ')],
                recommendation: dep.recommendations?.latest_safe
                    ? `Upgrade to ${dep.recommendations.latest_safe}`
                    : 'No fix available',
            });
        });
    });

    return vulnerabilities;
}

/**
 * Extract SAST findings
 */
export function extractSastFindings(
    sastFindings: RawSastFinding[]
): TransformedVulnerability[] {
    return sastFindings
        .filter((f) => f.id)
        .map((f) => ({
            id: f.id,
            type: 'sast' as const,
            confidence: f.confidence || 'Not Sure',
            severity: normalizeSeverity(f.severity),
            title: f.rule_id || 'SAST issue detected',
            description: f.description,
            package: f.location.path.split('/').pop() || 'unknown',
            version: `Line ${f.location.line}`,
            affected_file_location: f.location.path,
            start_line: f.location.line,
            end_line: f.location.end_line,
            start_col: f.location.column,
            end_col: f.location.end_column,
            recommendation: f.recommendation,
        }));
}

/**
 * Extract secret findings
 */
export function extractSecretFindings(
    secretFindings: RawSecretFinding[]
): TransformedVulnerability[] {
    return secretFindings
        .filter((f) => f.id)
        .map((f) => ({
            id: f.id,
            type: 'secrets' as const,
            secretType: f.type,
            confidence: f.confidence || 'Not Sure',
            severity: normalizeSeverity(f.severity) || 'MEDIUM',
            title: f.rule_id || 'Secret Vulnerability',
            description: f.description,
            package: f.location.path.split('/').pop() || 'unknown',
            version: `Line ${f.location.line}`,
            affected_file_location: f.location.path,
            start_line: f.location.line,
            end_line: f.location.end_line,
            start_col: f.location.column,
            end_col: f.location.end_column,
            recommendation: f.recommendation,
        }));
}

/**
 * Calculate severity breakdown from vulnerabilities
 */
export function calculateSeverityBreakdown(
    vulnerabilities: TransformedVulnerability[]
): SeverityBreakdown {
    const breakdown: SeverityBreakdown = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
    };

    vulnerabilities.forEach((v) => {
        const sev = v.severity?.toLowerCase() || 'info';
        if (sev === 'critical') breakdown.critical++;
        else if (sev === 'high') breakdown.high++;
        else if (sev === 'medium') breakdown.medium++;
        else if (sev === 'low') breakdown.low++;
        else breakdown.info++;
    });

    return breakdown;
}

/**
 * Main transformer function - converts raw API response to normalized report
 */
export function transformScanResult(
    result: RawScanResult,
    options: TransformOptions = {}
): TransformedReport {
    const allVulnerabilities: TransformedVulnerability[] = [];
    const scannedFileNames = options.scannedFiles?.map((f) => f.name) || [];

    // Extract from new results array format
    const resultsArray = result.results || [];
    allVulnerabilities.push(...extractVulnerabilitiesFromResults(resultsArray));

    // Extract from legacy findings_by_type format
    if (result.findings_by_type?.dependencies) {
        allVulnerabilities.push(
            ...extractLegacyDependencyVulnerabilities(
                result.findings_by_type.dependencies,
                scannedFileNames
            )
        );
    }

    if (result.findings_by_type?.sast) {
        allVulnerabilities.push(...extractSastFindings(result.findings_by_type.sast));
    }

    if (result.findings_by_type?.secrets) {
        allVulnerabilities.push(...extractSecretFindings(result.findings_by_type.secrets));
    }

    // Calculate severity breakdown
    const severityBreakdown = calculateSeverityBreakdown(allVulnerabilities);

    // Build summary using API data or calculated values
    const apiSummary = result.summary;
    const totalFindings = apiSummary?.total_findings ?? result.total_vulnerabilities ?? allVulnerabilities.length;

    // Build file analysis summaries
    const files: FileAnalysisSummary[] = resultsArray.map((r) => ({
        file: r.filename || 'unknown',
        ecosystem: r.ecosystem || 'unknown',
        dependencies: r.metadata?.total_packages || r.packages?.length || 0,
        vulnerable: r.metadata?.vulnerable_packages || 0,
    }));

    return {
        scanId: result.project_id || result.scan_id || `scan-${Date.now()}`,
        jobId: result.job_id || result.scan_id || undefined,
        startedAt: result.started_at || new Date().toISOString(),
        finishedAt: result.completed_at || result.finished_at || new Date().toISOString(),
        durationMs: result.metadata?.duration_ms || 0,
        detailLevel: options.detailLevel || 'standard',
        summary: {
            files: result.metadata?.total_files || scannedFileNames.length || files.length,
            dependencies: result.metadata?.total_packages || 0,
            vulnerabilities: totalFindings,
            critical: apiSummary?.by_severity?.critical ?? severityBreakdown.critical,
            high: apiSummary?.by_severity?.high ?? severityBreakdown.high,
            medium: apiSummary?.by_severity?.medium ?? severityBreakdown.medium,
            low: apiSummary?.by_severity?.low ?? severityBreakdown.low,
            info: apiSummary?.by_severity?.info ?? severityBreakdown.info,
        },
        files,
        vulnerabilities: allVulnerabilities,
    };
}

/**
 * Create a scan history record for localStorage
 */
export function createScanHistoryRecord(
    report: TransformedReport,
    scannedFiles: Array<{ name: string }>,
    ecosystems: string[]
): {
    id: string;
    timestamp: string;
    filesCount: number;
    vulnerabilities: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    files: string[];
    ecosystems: string[];
    report: TransformedReport;
} {
    return {
        id: report.scanId,
        timestamp: report.finishedAt,
        filesCount: scannedFiles.length,
        vulnerabilities: report.vulnerabilities.length,
        critical: report.summary.critical,
        high: report.summary.high,
        medium: report.summary.medium,
        low: report.summary.low,
        files: scannedFiles.map((f) => f.name),
        ecosystems: [...new Set(ecosystems)],
        report,
    };
}
