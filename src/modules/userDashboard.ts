import { apiClient } from '../utils/index.js';
import { logger } from '../utils/logger.js';
import { getSeverityTextColor } from '../utils/severity.js';
import { organization, loadUserOrganization } from './orgData.js';
export class OrgDashboardHandler {
  criticalElement: HTMLElement;
  highElement: HTMLElement;
  medElement: HTMLElement;
  lowElement: HTMLElement;
  monthActivity: HTMLElement;
  reportBody: HTMLElement;
  projectGrid: HTMLElement;
  chartSvg: HTMLElement;
  currentReportsFiltered: any[] = [];
  ecoSelect: HTMLSelectElement;
  scansCompletedElement: HTMLElement;
  scansFailedElement: HTMLElement;
  apiCallsElement: HTMLElement;
  totalVulnElement: HTMLElement;


  renderOverview(data: any) {
    if (this.criticalElement) this.criticalElement.textContent = String(data.mCriticalFindings ?? 0);
    if (this.highElement) this.highElement.textContent = String(data.mHighFindings ?? 0);
    if (this.medElement) this.medElement.textContent = String(data.mMediumFindings ?? 0);
    if (this.lowElement) this.lowElement.textContent = String(data.mLowFindings ?? 0);
    if (this.scansCompletedElement) this.scansCompletedElement.textContent = String(data.scansCompleted ?? 0);
    if (this.scansFailedElement) this.scansFailedElement.textContent = String(data.scansFailed ?? 0);
    if (this.apiCallsElement) this.apiCallsElement.textContent = String(data.apiCalls ?? 0);
    if (this.totalVulnElement) this.totalVulnElement.textContent = String(data.totalVuln ?? 0);
  }

  renderMonthActivity(list: any[]) {
    if (!this.monthActivity) return;
    this.monthActivity.innerHTML = '';
    for (const it of list) {
      const li = document.createElement('li');
      li.textContent = it;
      this.monthActivity.appendChild(li);
    }
  }

  sevClass(s: string) {
    return getSeverityTextColor(s);
  }


  renderReports(reports: any[]) {
    if (!this.reportBody) return;
    this.reportBody.innerHTML = '';
    for (const r of reports) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="py-2 pr-4 text-gray-400">${r.id.slice(-6)}</td>
                        <td class="py-2 pr-4">${r.project}</td>
                        <td class="py-2 pr-4"><span class="${this.sevClass(r.severity)}">${r.severity.toUpperCase()}</span></td>
                        <td class="py-2 pr-4">${r.issues}</td>
                        <td class="py-2">${new Date(r.createdAt).toLocaleString()}</td>`;
      this.reportBody.appendChild(tr);
    }
  }

  renderProjects(projects: any[]) {
    if (!this.projectGrid) return;
    this.projectGrid.innerHTML = '';
    for (const p of projects) {
      const card = document.createElement('div');
      card.className = 'terminal-border bg-black/60 rounded-lg p-4 flex flex-col gap-1';
      card.innerHTML = `<div class="text-white font-mono">${p.name}</div>
                          <div class="text-xs text-cyber-300">ECO: ${p.ecosystem.toUpperCase()}</div>
                          <div class="text-xs text-matrix-300">Last: ${new Date(p.lastScanAt).toLocaleString()}</div>
                          <div class="text-xs ${p.vulnerabilities > 0 ? 'text-yellow-300' : 'text-cyber-300'}">Vulns: ${p.vulnerabilities}</div>`;
      this.projectGrid.appendChild(card);
    }
  }

  renderChartData(trend: { day: string, reports: number, vulns: number }[]) {
    if (!(this.chartSvg instanceof SVGElement)) return;
    // Remove existing paths
    this.chartSvg.querySelectorAll('path[data-series]').forEach(n => n.remove());
    this.chartSvg.querySelectorAll('text[data-tick]').forEach(n => n.remove());

    const X0 = 40, Y0 = 200, X1 = 580, Y1 = 20;
    const n = trend.length;
    const maxReports = Math.max(1, ...trend.map(t => t.reports));
    const maxVulns = Math.max(1, ...trend.map(t => t.vulns));
    const maxY = Math.max(maxReports, maxVulns);
    const stepX = (X1 - X0) / Math.max(1, n - 1);

    const toPoint = (i: number, v: number) => {
      const x = X0 + i * stepX;
      const y = Y0 - (v / maxY) * (Y0 - Y1);
      return `${x},${y}`;
    };

    const reportsPts = trend.map((t, i) => toPoint(i, t.reports)).join(' ');
    const vulnsPts = trend.map((t, i) => toPoint(i, t.vulns)).join(' ');

    const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    p1.setAttribute('points', reportsPts);
    p1.setAttribute('stroke', '#1affef');
    p1.setAttribute('fill', 'none');
    p1.setAttribute('stroke-width', '2');
    p1.setAttribute('data-series', 'reports');
    this.chartSvg.appendChild(p1);

    const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    p2.setAttribute('points', vulnsPts);
    p2.setAttribute('stroke', '#4ade80');
    p2.setAttribute('fill', 'none');
    p2.setAttribute('stroke-width', '2');
    p2.setAttribute('data-series', 'vulns');
    this.chartSvg.appendChild(p2);

    // X ticks
    trend.forEach((t, i) => {
      const tx = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      tx.setAttribute('x', String(X0 + i * stepX));
      tx.setAttribute('y', '212');
      tx.setAttribute('fill', '#86efac');
      tx.setAttribute('font-size', '10');
      tx.setAttribute('text-anchor', 'middle');
      tx.setAttribute('data-tick', 'x');
      tx.textContent = t.day.slice(5);
      this.chartSvg.appendChild(tx);
    });
  }

  async loadReportsAndProjects() {
    // Load scan history from local storage
    let scanHistory: any[] = [];
    try {
      const storedHistory = localStorage.getItem("org_scan_history");
      if (storedHistory) {
        scanHistory = JSON.parse(storedHistory);
      }
    } catch (e) {
      logger.error("Failed to load local scan history", e);
    }


    if (!organization.orgId) {
      await loadUserOrganization();
      this.changeDashboard('organization');
    }

    let scansCompleated = 0;
    let scansFailed = 0;
    let totalVuln = 0;
    let apiCallsMth = 0;
    let criticalFindings = 0;
    let highFindings = 0;
    let scans = 0;
    let currMonth = "";
    let findingsMonth = 0;
    let mCriticalFindings = 0;
    let mHighFindings = 0;
    let mMediumFindings = 0;
    let mLowFindings = 0;
    

    interface OrgStats {
      critical_this_month: number,
      current_month: string,
      findings_this_month: number,
      findings_trend_percent: number,
      high_this_month: number,
      organization_id: string,
      scans_this_month: number,
      scans_trend_percent: number
    }

    try {
      const res = await apiClient.get<OrgStats>(`/api/v1/organizations/${organization.orgId}/analytics/dashboard`);

      if (res.ok && res.data) {
        const data = res.data;
        criticalFindings = data.critical_this_month;
        highFindings = data.high_this_month;
        scans = data.scans_this_month;
        currMonth = data.current_month;
        findingsMonth = data.findings_this_month;

        console.log("Org Stats Data:", data);
      }
    } catch (e) {
      logger.error("Failed to load organization stats:", e);
    }

    interface OrgHStats {
      months: [
        {
      api_calls: number,
      critical_findings: number,
      high_findings: number,
      low_findings: number,
      medium_findings: number,
      month: string,
      reports_generated: number,
      scans_completed: number,
      scans_failed: number,
      total_findings: number
    }
      ]
    }
    //load organization historical stats
    try {
      const res = await apiClient.get<OrgHStats>(`/api/v1/organizations/${organization.orgId}/analytics/usage`);

      if (res.ok && res.data) {
        const data = res.data.months[0];
        scansCompleated = data.scans_completed;
        scansFailed = data.scans_failed;
        totalVuln = data.total_findings;
        apiCallsMth = data.api_calls;
        mCriticalFindings = data.critical_findings;
        mHighFindings = data.high_findings;
        mMediumFindings = data.medium_findings;
        mLowFindings = data.low_findings;

        console.log("Org history Stats Data:", data);
      }
    } catch (e) {
      logger.error("Failed to load organization stats:", e);
    }
    // Calculate overview stats

    const overviewMonth = {
      criticalFindings,
      highFindings,
      scans,
      currMonth,
      findingsMonth
    };

    const overviewStatus = {
      mCriticalFindings,
      mHighFindings,
      mMediumFindings,
      mLowFindings,
      totalVuln,
      scansCompleated,
      scansFailed,
      apiCallsMth
    }
    console.log("Overview Status:", overviewStatus);
    console.log("month", overviewMonth);
    

    // Transform scan history to reports format
    const reports = scanHistory.map(scan => {
      const severity = scan.critical > 0 ? 'critical'
        : scan.high > 0 ? 'high'
          : scan.medium > 0 ? 'medium'
            : scan.low > 0 ? 'low'
              : 'none';
      return {
        id: scan.id,
        project: scan.project || `Files (${scan.filesCount || 0})`,
        severity: severity,
        issues: scan.vulnerabilities || 0,
        createdAt: scan.timestamp
      };
    });

    this.currentReportsFiltered = reports;

    // Group by project for projects view
    const projectsMap: any = {};
    scanHistory.forEach(scan => {
      const projectName = scan.project || 'File Upload';
      if (!projectsMap[projectName]) {
        projectsMap[projectName] = {
          name: projectName,
          ecosystem: scan.ecosystems?.[0] || 'multiple',
          lastScanAt: scan.timestamp,
          vulnerabilities: 0,
          scans: 0
        };
      }
      projectsMap[projectName].vulnerabilities += scan.vulnerabilities || 0;
      projectsMap[projectName].scans += 1;
      // Keep most recent scan time
      if (new Date(scan.timestamp) > new Date(projectsMap[projectName].lastScanAt)) {
        projectsMap[projectName].lastScanAt = scan.timestamp;
      }
    });
    const projects = Object.values(projectsMap);

    // Calculate 7-day trend
    const now = new Date();
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayScans = scanHistory.filter(s => s.timestamp.startsWith(dateStr));
      trend.push({
        day: dateStr,
        reports: dayScans.length,
        vulns: dayScans.reduce((sum, s) => sum + (s.vulnerabilities || 0), 0)
      });
    }

    // Apply filters (client-side) to reports/projects
    const filteredProjects = projects.filter((p: any) => (this.ecoSelect.value === 'all' ? true : p.ecosystem === this.ecoSelect.value));

    this.renderOverview(overviewStatus);
    this.renderMonthActivity([
      `Month: ${overviewMonth.currMonth}`,
      `Critical Findings: ${overviewMonth.criticalFindings}`,
      `High Findings: ${overviewMonth.highFindings}`,
      `Total Scans: ${overviewMonth.scans}`,
      `Total Vulnerabilities: ${overviewMonth.findingsMonth}`,
    ]);
    this.renderProjects(filteredProjects);
    this.renderChartData(trend);
    this.renderReports(reports);
  }

  changeDashboard(selection: string) {
    const titleEl = document.getElementById('dash-title') as HTMLElement;
    const subtitleEl = document.getElementById('dash-subtitle') as HTMLElement;
    if (selection == "organization") {
      titleEl.innerHTML = `<span class="text-cyber-400">&gt;</span> ORGANIZATION_DASHBOARD`;
      subtitleEl.innerHTML = `ORGANIZATION_NAME: ${organization.orgName || 'N/A'} ||
                                DESCRIPTION: ${organization.orgDescription || 'N/A'} ||
                                TIER: ${organization.tier || 'N/A'} ||
                                CREATED_AT: ${organization.createdAt || 'N/A'} ||
                                MEMBERS_COUNT: ${organization.membersCount || 'N/A'}`;
    };
    if (selection == "member") {
      titleEl.innerHTML = `<span class="text-cyber-400">&gt;</span> MEMBER_DASHBOARD`;
      subtitleEl.innerHTML = `MEMBER_OF_ORGANIZATION: ${organization.orgName || 'N/A'} ||
                                DESCRIPTION: ${organization.orgDescription || 'N/A'} ||
                                CREATED_AT: ${organization.createdAt || 'N/A'}`;
    }
  }




  constructor(criticalElement: HTMLElement,
    highElement: HTMLElement,
    medElement: HTMLElement,
    lowElement: HTMLElement,
    monthActivity: HTMLElement,
    reportBody: HTMLElement,
    projectGrid: HTMLElement,
    chartSvg: HTMLElement,
    ecoSelect: HTMLSelectElement,
    scansCompletedElement: HTMLElement,
    scansFailedElement: HTMLElement,
    apiCallsElement: HTMLElement,
    totalVulnElement: HTMLElement) {
    this.criticalElement = criticalElement;
    this.highElement = highElement;
    this.medElement = medElement;
    this.lowElement = lowElement;
    this.monthActivity = monthActivity;
    this.reportBody = reportBody;
    this.projectGrid = projectGrid;
    this.chartSvg = chartSvg;
    this.ecoSelect = ecoSelect;
    this.scansCompletedElement = scansCompletedElement;
    this.scansFailedElement = scansFailedElement;
    this.apiCallsElement = apiCallsElement;
    this.totalVulnElement = totalVulnElement;
  }

}   

export class DashboardHandler {
  criticalElement: HTMLElement;
  highElement: HTMLElement;
  medElement: HTMLElement;
  lowElement: HTMLElement;
  monthActivity: HTMLElement;
  reportBody: HTMLElement;
  projectGrid: HTMLElement;
  chartSvg: HTMLElement;
  currentReportsFiltered: any[] = [];
  ecoSelect: HTMLSelectElement;


  renderOverview(data: any) {
    if (this.criticalElement) this.criticalElement.textContent = String(data.critical_findings ?? 0);
    if (this.highElement) this.highElement.textContent = String(data.high_findings ?? 0);
    if (this.medElement) this.medElement.textContent = String(data.medium_findings ?? 0);
    if (this.lowElement) this.lowElement.textContent = String(data.low_findings ?? 0);
  }

  renderMonthActivity(list: any[]) {
    if (!this.monthActivity) return;
    this.monthActivity.innerHTML = '';
    for (const it of list) {
      const li = document.createElement('li');
      li.textContent = it;
      this.monthActivity.appendChild(li);
    }
  }

  sevClass(s: string) {
    return getSeverityTextColor(s);
  }


  renderReports(reports: any[]) {
    if (!this.reportBody) return;
    this.reportBody.innerHTML = '';
    for (const r of reports) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="py-2 pr-4 text-gray-400">${r.id.slice(-6)}</td>
                        <td class="py-2 pr-4">${r.project}</td>
                        <td class="py-2 pr-4"><span class="${this.sevClass(r.severity)}">${r.severity.toUpperCase()}</span></td>
                        <td class="py-2 pr-4">${r.issues}</td>
                        <td class="py-2">${new Date(r.createdAt).toLocaleString()}</td>`;
      this.reportBody.appendChild(tr);
    }
  }

  renderProjects(projects: any[]) {
    if (!this.projectGrid) return;
    this.projectGrid.innerHTML = '';
    for (const p of projects) {
      const card = document.createElement('div');
      card.className = 'terminal-border bg-black/60 rounded-lg p-4 flex flex-col gap-1';
      card.innerHTML = `<div class="text-white font-mono">${p.name}</div>
                          <div class="text-xs text-cyber-300">ECO: ${p.ecosystem.toUpperCase()}</div>
                          <div class="text-xs text-matrix-300">Last: ${new Date(p.lastScanAt).toLocaleString()}</div>
                          <div class="text-xs ${p.vulnerabilities > 0 ? 'text-yellow-300' : 'text-cyber-300'}">Vulns: ${p.vulnerabilities}</div>`;
      this.projectGrid.appendChild(card);
    }
  }

  renderChartData(trend: { day: string, reports: number, vulns: number }[]) {
    if (!(this.chartSvg instanceof SVGElement)) return;
    // Remove existing paths
    this.chartSvg.querySelectorAll('path[data-series]').forEach(n => n.remove());
    this.chartSvg.querySelectorAll('text[data-tick]').forEach(n => n.remove());

    const X0 = 40, Y0 = 200, X1 = 580, Y1 = 20;
    const n = trend.length;
    const maxReports = Math.max(1, ...trend.map(t => t.reports));
    const maxVulns = Math.max(1, ...trend.map(t => t.vulns));
    const maxY = Math.max(maxReports, maxVulns);
    const stepX = (X1 - X0) / Math.max(1, n - 1);

    const toPoint = (i: number, v: number) => {
      const x = X0 + i * stepX;
      const y = Y0 - (v / maxY) * (Y0 - Y1);
      return `${x},${y}`;
    };

    const reportsPts = trend.map((t, i) => toPoint(i, t.reports)).join(' ');
    const vulnsPts = trend.map((t, i) => toPoint(i, t.vulns)).join(' ');

    const p1 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    p1.setAttribute('points', reportsPts);
    p1.setAttribute('stroke', '#1affef');
    p1.setAttribute('fill', 'none');
    p1.setAttribute('stroke-width', '2');
    p1.setAttribute('data-series', 'reports');
    this.chartSvg.appendChild(p1);

    const p2 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    p2.setAttribute('points', vulnsPts);
    p2.setAttribute('stroke', '#4ade80');
    p2.setAttribute('fill', 'none');
    p2.setAttribute('stroke-width', '2');
    p2.setAttribute('data-series', 'vulns');
    this.chartSvg.appendChild(p2);

    // X ticks
    trend.forEach((t, i) => {
      const tx = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      tx.setAttribute('x', String(X0 + i * stepX));
      tx.setAttribute('y', '212');
      tx.setAttribute('fill', '#86efac');
      tx.setAttribute('font-size', '10');
      tx.setAttribute('text-anchor', 'middle');
      tx.setAttribute('data-tick', 'x');
      tx.textContent = t.day.slice(5);
      this.chartSvg.appendChild(tx);
    });
  }

  async loadReportsAndProjects() {
    // Load scan history from local storage
    let scanHistory: any[] = [];
    try {
      const storedHistory = localStorage.getItem("scan_history");
      if (storedHistory) {
        scanHistory = JSON.parse(storedHistory);
      }
    } catch (e) {
      logger.error("Failed to load local scan history", e);
    }

    // Removed organization check as we are now using user analytics

    interface UserDashboardStats {
      critical_this_month: number;
      current_month: string;
      findings_this_month: number;
      findings_trend_percent: number;
      high_this_month: number;
      low_this_month: number;
      medium_this_month: number;
      scans_this_month: number;
      scans_trend_percent: number;
      user_id: string;
    }

    let criticalFindings = 0;
    let highFindings = 0;
    let mediumFindings = 0;
    let lowFindings = 0;
    let totalScan = 0;
    let totalVuln = 0;

    try {
      const res = await apiClient.get<UserDashboardStats>(`/api/v1/me/analytics/dashboard`);

      if (res.ok && res.data) {
        const data = res.data;
        criticalFindings = data.critical_this_month;
        highFindings = data.high_this_month;
        mediumFindings = data.medium_this_month;
        lowFindings = data.low_this_month;
        totalScan = data.scans_this_month;
        totalVuln = data.findings_this_month;
      }
    } catch (e) {
      logger.error("Failed to load user analytics:", e);
    }
    // Calculate overview stats

    const overviewStatus = {
      critical_findings: criticalFindings,
      high_findings: highFindings,
      medium_findings: mediumFindings,
      low_findings: lowFindings
    }

    // Transform scan history to reports format
    const reports = scanHistory.map(scan => {
      const severity = scan.critical > 0 ? 'critical'
        : scan.high > 0 ? 'high'
          : scan.medium > 0 ? 'medium'
            : scan.low > 0 ? 'low'
              : 'none';
      return {
        id: scan.id,
        project: scan.project || `Files (${scan.filesCount || 0})`,
        severity: severity,
        issues: scan.vulnerabilities || 0,
        createdAt: scan.timestamp
      };
    });

    this.currentReportsFiltered = reports;

    // Group by project for projects view
    const projectsMap: any = {};
    scanHistory.forEach(scan => {
      const projectName = scan.project || 'File Upload';
      if (!projectsMap[projectName]) {
        projectsMap[projectName] = {
          name: projectName,
          ecosystem: scan.ecosystems?.[0] || 'multiple',
          lastScanAt: scan.timestamp,
          vulnerabilities: 0,
          scans: 0
        };
      }
      projectsMap[projectName].vulnerabilities += scan.vulnerabilities || 0;
      projectsMap[projectName].scans += 1;
      // Keep most recent scan time
      if (new Date(scan.timestamp) > new Date(projectsMap[projectName].lastScanAt)) {
        projectsMap[projectName].lastScanAt = scan.timestamp;
      }
    });
    const projects = Object.values(projectsMap);

    // Calculate 7-day trend
    const now = new Date();
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayScans = scanHistory.filter(s => s.timestamp.startsWith(dateStr));
      trend.push({
        day: dateStr,
        reports: dayScans.length,
        vulns: dayScans.reduce((sum, s) => sum + (s.vulnerabilities || 0), 0)
      });
    }

    // Apply filters (client-side) to reports/projects
    const filteredProjects = projects.filter((p: any) => (this.ecoSelect.value === 'all' ? true : p.ecosystem === this.ecoSelect.value));

    this.renderOverview(overviewStatus);
    this.renderMonthActivity([
      `Scans this month: ${totalScan}`,
      `Findings this month: ${totalVuln}`,
    ]);
    this.renderProjects(filteredProjects);
    this.renderChartData(trend);
    this.renderReports(reports);
  }

  // changeDashboard method removed as it depends on organization object which is not used anymore
  // and we are showing user analytics now.




  constructor(criticalElement: HTMLElement,
    highElement: HTMLElement,
    medElement: HTMLElement,
    lowElement: HTMLElement,
    monthActivity: HTMLElement,
    reportBody: HTMLElement,
    projectGrid: HTMLElement,
    chartSvg: HTMLElement,
    ecoSelect: HTMLSelectElement) {
    this.criticalElement = criticalElement;
    this.highElement = highElement;
    this.medElement = medElement;
    this.lowElement = lowElement;
    this.monthActivity = monthActivity;
    this.reportBody = reportBody;
    this.projectGrid = projectGrid;
    this.chartSvg = chartSvg;
    this.ecoSelect = ecoSelect;
  }

}   