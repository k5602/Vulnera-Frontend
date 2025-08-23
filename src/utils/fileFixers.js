import { escapeHtml } from "./sanitize.js";

/**
 * Generates fixed versions of dependency files based on vulnerability analysis results
 * Now prefers server-provided version recommendations when available and deduplicates fix logs.
 */

export function generateFixedPackageJson(originalContent, vulnerabilities, recommendations = null) {
    try {
        const packageData = JSON.parse(originalContent);
        const fixedPackageData = JSON.parse(originalContent); // Clone

        let fixedCount = 0;
        const fixLog = [];

        // Build target versions per package using recommendations when available
        const targetVersionByPackage = new Map();
        const getRecVersion = (pkgName, currentVersion, fixedVersions) => {
            let v = null;
            if (recommendations && Array.isArray(recommendations)) {
                const rec = recommendations.find(
                    (r) =>
                        r &&
                        r.package === pkgName &&
                        String(r.ecosystem || "").toLowerCase() === "npm",
                );
                if (rec) {
                    v =
                        rec.nearest_safe_above_current ||
                        rec.next_safe_minor_within_current_major ||
                        rec.most_up_to_date_safe ||
                        null;
                }
            }
            if (!v && Array.isArray(fixedVersions) && fixedVersions.length > 0) {
                v = getLatestVersion(fixedVersions);
            }
            return v;
        };
        // Collect desired versions
        vulnerabilities.forEach((vuln) => {
            if (Array.isArray(vuln.affected_packages)) {
                vuln.affected_packages.forEach((pkg) => {
                    const currentVersion =
                        (fixedPackageData.dependencies &&
                            fixedPackageData.dependencies[pkg.name]) ||
                        (fixedPackageData.devDependencies &&
                            fixedPackageData.devDependencies[pkg.name]) ||
                        (fixedPackageData.peerDependencies &&
                            fixedPackageData.peerDependencies[pkg.name]) ||
                        null;
                    const chosen = getRecVersion(pkg.name, currentVersion, pkg.fixed_versions);
                    if (chosen) {
                        if (!targetVersionByPackage.has(pkg.name)) {
                            targetVersionByPackage.set(pkg.name, chosen);
                        } else {
                            const prev = targetVersionByPackage.get(pkg.name);
                            targetVersionByPackage.set(pkg.name, getLatestVersion([prev, chosen]));
                        }
                    }
                });
            }
        });
        // Apply updates once per package and per section
        for (const [name, version] of targetVersionByPackage.entries()) {
            if (fixedPackageData.dependencies && fixedPackageData.dependencies[name]) {
                const oldVersion = fixedPackageData.dependencies[name];
                if (oldVersion !== `^${version}`) {
                    fixedPackageData.dependencies[name] = `^${version}`;
                    fixLog.push(`Updated ${name}: ${oldVersion} → ^${version}`);
                    fixedCount++;
                }
            }
            if (fixedPackageData.devDependencies && fixedPackageData.devDependencies[name]) {
                const oldVersion = fixedPackageData.devDependencies[name];
                if (oldVersion !== `^${version}`) {
                    fixedPackageData.devDependencies[name] = `^${version}`;
                    fixLog.push(`Updated ${name} (dev): ${oldVersion} → ^${version}`);
                    fixedCount++;
                }
            }
            if (fixedPackageData.peerDependencies && fixedPackageData.peerDependencies[name]) {
                const oldVersion = fixedPackageData.peerDependencies[name];
                if (oldVersion !== `^${version}`) {
                    fixedPackageData.peerDependencies[name] = `^${version}`;
                    fixLog.push(`Updated ${name} (peer): ${oldVersion} → ^${version}`);
                    fixedCount++;
                }
            }
        }

        return {
            content: JSON.stringify(fixedPackageData, null, 2),
            fixedCount,
            fixLog,
        };
    } catch (error) {
        console.error("Error generating fixed package.json:", error);
        return {
            content: originalContent,
            fixedCount: 0,
            fixLog: ["Error: Could not parse or fix package.json"],
        };
    }
}

export function generateFixedRequirementsTxt(
    originalContent,
    vulnerabilities,
    recommendations = null,
) {
    try {
        const lines = originalContent.split("\n");
        const fixedLines = [...lines];
        let fixedCount = 0;
        const fixLog = [];

        const targetVersionByPackage = new Map();
        const ecoMatch = (e) => {
            const x = String(e || "").toLowerCase();
            return x === "python" || x === "pypi" || x === "pip";
        };
        const getRecVersion = (pkgName, fixedVersions) => {
            let v = null;
            if (recommendations && Array.isArray(recommendations)) {
                const rec = recommendations.find(
                    (r) => r && r.package === pkgName && ecoMatch(r.ecosystem),
                );
                if (rec) {
                    v =
                        rec.nearest_safe_above_current ||
                        rec.next_safe_minor_within_current_major ||
                        rec.most_up_to_date_safe ||
                        null;
                }
            }
            if (!v && Array.isArray(fixedVersions) && fixedVersions.length > 0) {
                v = getLatestVersion(fixedVersions);
            }
            return v;
        };
        vulnerabilities.forEach((vuln) => {
            if (Array.isArray(vuln.affected_packages)) {
                vuln.affected_packages.forEach((pkg) => {
                    const chosen = getRecVersion(pkg.name, pkg.fixed_versions);
                    if (chosen) {
                        if (!targetVersionByPackage.has(pkg.name)) {
                            targetVersionByPackage.set(pkg.name, chosen);
                        } else {
                            const prev = targetVersionByPackage.get(pkg.name);
                            targetVersionByPackage.set(pkg.name, getLatestVersion([prev, chosen]));
                        }
                    }
                });
            }
        });
        const updatedPackages = new Set();
        for (let i = 0; i < fixedLines.length; i++) {
            const rawLine = fixedLines[i];
            const line = rawLine.trim();
            if (!line || line.startsWith("#")) continue;
            const pkgName = line.split(/[<>=~! ]/)[0];
            if (targetVersionByPackage.has(pkgName) && !updatedPackages.has(pkgName)) {
                const version = targetVersionByPackage.get(pkgName);
                const newLine = `${pkgName}>=${version}`;
                if (rawLine !== newLine) {
                    fixLog.push(`Updated ${pkgName}: ${rawLine.trim()} → ${newLine}`);
                    fixedLines[i] = newLine;
                    fixedCount++;
                    updatedPackages.add(pkgName);
                }
            }
        }

        return {
            content: fixedLines.join("\n"),
            fixedCount,
            fixLog,
        };
    } catch (error) {
        console.error("Error generating fixed requirements.txt:", error);
        return {
            content: originalContent,
            fixedCount: 0,
            fixLog: ["Error: Could not parse or fix requirements.txt"],
        };
    }
}

export function generateFixedPomXml(originalContent, vulnerabilities, recommendations = null) {
    try {
        let fixedContent = originalContent;
        let fixedCount = 0;
        const fixLog = [];

        const targetVersionByPackage = new Map();
        const getRecVersion = (pkgName, fixedVersions) => {
            let v = null;
            if (recommendations && Array.isArray(recommendations)) {
                const rec = recommendations.find(
                    (r) =>
                        r &&
                        r.package === pkgName &&
                        String(r.ecosystem || "").toLowerCase() === "maven",
                );
                if (rec) {
                    v =
                        rec.nearest_safe_above_current ||
                        rec.next_safe_minor_within_current_major ||
                        rec.most_up_to_date_safe ||
                        null;
                }
            }
            if (!v && Array.isArray(fixedVersions) && fixedVersions.length > 0) {
                v = getLatestVersion(fixedVersions);
            }
            return v;
        };
        vulnerabilities.forEach((vuln) => {
            if (Array.isArray(vuln.affected_packages)) {
                vuln.affected_packages.forEach((pkg) => {
                    const chosen = getRecVersion(pkg.name, pkg.fixed_versions);
                    if (chosen) {
                        if (!targetVersionByPackage.has(pkg.name)) {
                            targetVersionByPackage.set(pkg.name, chosen);
                        } else {
                            const prev = targetVersionByPackage.get(pkg.name);
                            targetVersionByPackage.set(pkg.name, getLatestVersion([prev, chosen]));
                        }
                    }
                });
            }
        });
        for (const [name, version] of targetVersionByPackage.entries()) {
            const dependencyRegex = new RegExp(
                `(<dependency>\\s*<groupId>[^<]*</groupId>\\s*<artifactId>${name}</artifactId>\\s*<version>)([^<]+)(</version>)`,
                "g",
            );
            let replaced = false;
            fixedContent = fixedContent.replace(
                dependencyRegex,
                (match, prefix, oldVersion, suffix) => {
                    replaced = true;
                    return prefix + version + suffix;
                },
            );
            if (replaced) {
                fixLog.push(`Updated ${name} → ${version}`);
                fixedCount++;
            }
        }

        return {
            content: fixedContent,
            fixedCount,
            fixLog,
        };
    } catch (error) {
        console.error("Error generating fixed pom.xml:", error);
        return {
            content: originalContent,
            fixedCount: 0,
            fixLog: ["Error: Could not parse or fix pom.xml"],
        };
    }
}

export function generateFixLog(fixLogs, fileName) {
    const timestamp = new Date().toISOString();
    const totalFixes = fixLogs.reduce((sum, log) => sum + log.fixedCount, 0);

    let content = `# Vulnera Fix Log\n`;
    content += `Generated: ${timestamp}\n`;
    content += `Original File: ${fileName}\n`;
    content += `Total Fixes Applied: ${totalFixes}\n\n`;

    if (totalFixes === 0) {
        content += `## No Fixes Applied\n`;
        content += `No vulnerable packages found with available fixed versions.\n\n`;
    } else {
        content += `## Applied Fixes\n\n`;
        fixLogs.forEach((log) => {
            if (log.fixLog.length > 0) {
                log.fixLog.forEach((entry) => {
                    content += `- ${entry}\n`;
                });
            }
        });
    }

    content += `\n## Next Steps\n`;
    content += `1. Review the updated dependency file\n`;
    content += `2. Test your application with the new versions\n`;
    content += `3. Run your package manager to install updates:\n`;

    if (fileName.endsWith(".json")) {
        content += `   - npm install (for npm)\n`;
        content += `   - yarn install (for Yarn)\n`;
    } else if (fileName.includes("requirements")) {
        content += `   - pip install -r requirements.txt\n`;
    } else if (fileName.endsWith(".xml")) {
        content += `   - mvn clean install\n`;
    }

    content += `4. Re-run Vulnera to verify fixes\n\n`;
    content += `## Important Notes\n`;
    content += `- Always test thoroughly before deploying to production\n`;
    content += `- Some fixes may introduce breaking changes\n`;
    content += `- Consider semantic versioning compatibility\n`;
    content += `- Review changelogs for updated packages\n`;

    return content;
}

function getLatestVersion(versions) {
    if (!Array.isArray(versions) || versions.length === 0) {
        return "0.0.0";
    }

    // Sort versions and return the latest
    // This is a simple sort - in production you might want to use semver library
    return versions.sort((a, b) => {
        const aParts = a.split(".").map((num) => parseInt(num) || 0);
        const bParts = b.split(".").map((num) => parseInt(num) || 0);

        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aDiff = aParts[i] || 0;
            const bDiff = bParts[i] || 0;
            if (aDiff !== bDiff) {
                return bDiff - aDiff; // Descending order
            }
        }
        return 0;
    })[0];
}

export function generateFixedDependencyFile(
    originalContent,
    fileName,
    vulnerabilities,
    recommendations = null,
) {
    if (fileName.endsWith(".json")) {
        return generateFixedPackageJson(originalContent, vulnerabilities, recommendations);
    } else if (fileName.includes("requirements") && fileName.endsWith(".txt")) {
        return generateFixedRequirementsTxt(originalContent, vulnerabilities, recommendations);
    } else if (fileName.endsWith(".xml")) {
        return generateFixedPomXml(originalContent, vulnerabilities, recommendations);
    } else {
        return {
            content: originalContent,
            fixedCount: 0,
            fixLog: ["Error: Unsupported file type for automatic fixing"],
        };
    }
}
