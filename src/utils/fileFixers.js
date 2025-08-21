import { escapeHtml } from './sanitize.js';

/**
 * Generates fixed versions of dependency files based on vulnerability analysis results
 */

export function generateFixedPackageJson(originalContent, vulnerabilities) {
  try {
    const packageData = JSON.parse(originalContent);
    const fixedPackageData = JSON.parse(originalContent); // Clone
    
    let fixedCount = 0;
    const fixLog = [];
    
    // Process vulnerabilities to find fixed versions
    vulnerabilities.forEach(vuln => {
      if (Array.isArray(vuln.affected_packages)) {
        vuln.affected_packages.forEach(pkg => {
          if (Array.isArray(pkg.fixed_versions) && pkg.fixed_versions.length > 0) {
            const latestFixedVersion = getLatestVersion(pkg.fixed_versions);
            
            // Update dependencies
            if (fixedPackageData.dependencies && fixedPackageData.dependencies[pkg.name]) {
              const oldVersion = fixedPackageData.dependencies[pkg.name];
              fixedPackageData.dependencies[pkg.name] = `^${latestFixedVersion}`;
              fixLog.push(`Updated ${pkg.name}: ${oldVersion} → ^${latestFixedVersion} (fixes ${vuln.id})`);
              fixedCount++;
            }
            
            // Update devDependencies
            if (fixedPackageData.devDependencies && fixedPackageData.devDependencies[pkg.name]) {
              const oldVersion = fixedPackageData.devDependencies[pkg.name];
              fixedPackageData.devDependencies[pkg.name] = `^${latestFixedVersion}`;
              fixLog.push(`Updated ${pkg.name} (dev): ${oldVersion} → ^${latestFixedVersion} (fixes ${vuln.id})`);
              fixedCount++;
            }
            
            // Update peerDependencies
            if (fixedPackageData.peerDependencies && fixedPackageData.peerDependencies[pkg.name]) {
              const oldVersion = fixedPackageData.peerDependencies[pkg.name];
              fixedPackageData.peerDependencies[pkg.name] = `^${latestFixedVersion}`;
              fixLog.push(`Updated ${pkg.name} (peer): ${oldVersion} → ^${latestFixedVersion} (fixes ${vuln.id})`);
              fixedCount++;
            }
          }
        });
      }
    });
    
    return {
      content: JSON.stringify(fixedPackageData, null, 2),
      fixedCount,
      fixLog
    };
  } catch (error) {
    console.error('Error generating fixed package.json:', error);
    return {
      content: originalContent,
      fixedCount: 0,
      fixLog: ['Error: Could not parse or fix package.json']
    };
  }
}

export function generateFixedRequirementsTxt(originalContent, vulnerabilities) {
  try {
    const lines = originalContent.split('\n');
    const fixedLines = [...lines];
    let fixedCount = 0;
    const fixLog = [];
    
    vulnerabilities.forEach(vuln => {
      if (Array.isArray(vuln.affected_packages)) {
        vuln.affected_packages.forEach(pkg => {
          if (Array.isArray(pkg.fixed_versions) && pkg.fixed_versions.length > 0) {
            const latestFixedVersion = getLatestVersion(pkg.fixed_versions);
            
            // Find and update the package line
            for (let i = 0; i < fixedLines.length; i++) {
              const line = fixedLines[i].trim();
              if (line.startsWith(pkg.name) && (line.includes('==') || line.includes('>=') || line.includes('~=') || line.includes('>='))) {
                const oldLine = fixedLines[i];
                fixedLines[i] = `${pkg.name}>=${latestFixedVersion}`;
                fixLog.push(`Updated ${pkg.name}: ${oldLine.trim()} → ${pkg.name}>=${latestFixedVersion} (fixes ${vuln.id})`);
                fixedCount++;
                break;
              } else if (line === pkg.name) {
                const oldLine = fixedLines[i];
                fixedLines[i] = `${pkg.name}>=${latestFixedVersion}`;
                fixLog.push(`Updated ${pkg.name}: ${oldLine.trim()} → ${pkg.name}>=${latestFixedVersion} (fixes ${vuln.id})`);
                fixedCount++;
                break;
              }
            }
          }
        });
      }
    });
    
    return {
      content: fixedLines.join('\n'),
      fixedCount,
      fixLog
    };
  } catch (error) {
    console.error('Error generating fixed requirements.txt:', error);
    return {
      content: originalContent,
      fixedCount: 0,
      fixLog: ['Error: Could not parse or fix requirements.txt']
    };
  }
}

export function generateFixedPomXml(originalContent, vulnerabilities) {
  try {
    let fixedContent = originalContent;
    let fixedCount = 0;
    const fixLog = [];
    
    vulnerabilities.forEach(vuln => {
      if (Array.isArray(vuln.affected_packages)) {
        vuln.affected_packages.forEach(pkg => {
          if (Array.isArray(pkg.fixed_versions) && pkg.fixed_versions.length > 0) {
            const latestFixedVersion = getLatestVersion(pkg.fixed_versions);
            
            // Simple regex replacement for Maven dependencies
            const dependencyRegex = new RegExp(
              `(<dependency>\\s*<groupId>[^<]*</groupId>\\s*<artifactId>${pkg.name}</artifactId>\\s*<version>)([^<]+)(</version>)`,
              'g'
            );
            
            const oldContent = fixedContent;
            fixedContent = fixedContent.replace(dependencyRegex, (match, prefix, oldVersion, suffix) => {
              fixLog.push(`Updated ${pkg.name}: ${oldVersion} → ${latestFixedVersion} (fixes ${vuln.id})`);
              fixedCount++;
              return prefix + latestFixedVersion + suffix;
            });
          }
        });
      }
    });
    
    return {
      content: fixedContent,
      fixedCount,
      fixLog
    };
  } catch (error) {
    console.error('Error generating fixed pom.xml:', error);
    return {
      content: originalContent,
      fixedCount: 0,
      fixLog: ['Error: Could not parse or fix pom.xml']
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
    fixLogs.forEach(log => {
      if (log.fixLog.length > 0) {
        log.fixLog.forEach(entry => {
          content += `- ${entry}\n`;
        });
      }
    });
  }
  
  content += `\n## Next Steps\n`;
  content += `1. Review the updated dependency file\n`;
  content += `2. Test your application with the new versions\n`;
  content += `3. Run your package manager to install updates:\n`;
  
  if (fileName.endsWith('.json')) {
    content += `   - npm install (for npm)\n`;
    content += `   - yarn install (for Yarn)\n`;
  } else if (fileName.includes('requirements')) {
    content += `   - pip install -r requirements.txt\n`;
  } else if (fileName.endsWith('.xml')) {
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
    return '0.0.0';
  }
  
  // Sort versions and return the latest
  // This is a simple sort - in production you might want to use semver library
  return versions.sort((a, b) => {
    const aParts = a.split('.').map(num => parseInt(num) || 0);
    const bParts = b.split('.').map(num => parseInt(num) || 0);
    
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

export function generateFixedDependencyFile(originalContent, fileName, vulnerabilities) {
  if (fileName.endsWith('.json')) {
    return generateFixedPackageJson(originalContent, vulnerabilities);
  } else if (fileName.includes('requirements') && fileName.endsWith('.txt')) {
    return generateFixedRequirementsTxt(originalContent, vulnerabilities);
  } else if (fileName.endsWith('.xml')) {
    return generateFixedPomXml(originalContent, vulnerabilities);
  } else {
    return {
      content: originalContent,
      fixedCount: 0,
      fixLog: ['Error: Unsupported file type for automatic fixing']
    };
  }
}
