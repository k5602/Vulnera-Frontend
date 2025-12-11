import { GET } from '../api/api-manage.js';
import ENDPOINTS from '../utils/api/endpoints.js';
import { organization, loadUserOrganization } from './orgData.js';

export class OrgDashboardHandler {
  criticalElement: HTMLElement;
  highElement: HTMLElement;
  scanElement: HTMLElement;
  totalFindingsElement: HTMLElement;
  monthActivity: HTMLElement;
  reportBody: HTMLElement;
  historicalUsageBody: HTMLElement;
  chartSvg: HTMLElement;
  currentReportsFiltered: any[] = [];
  ecoSelect: HTMLSelectElement;
  monthTag: HTMLElement;

  renderOverview(data: any) {
    if (this.criticalElement) this.criticalElement.textContent = String(data.criticalFindings ?? "--");
    if (this.highElement) this.highElement.textContent = String(data.highFindings ?? "--");
    if (this.scanElement) this.scanElement.textContent = String(data.scans ?? "--");
    if (this.totalFindingsElement) this.totalFindingsElement.textContent = String(data.findingsMonth ?? "--");
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


  renderReports(reports: any[]) {
    if (!this.reportBody) return;
    this.reportBody.innerHTML = '';
    for (const r of reports) {
      const tr = document.createElement('tr');

      // ID
      const tdId = document.createElement('td');
      tdId.className = "py-2 pr-4 text-gray-400";
      tdId.textContent = r.id.slice(-6);
      tr.appendChild(tdId);

      // Project
      const tdProject = document.createElement('td');
      tdProject.className = "py-2 pr-4";
      tdProject.textContent = r.project; // Safe: textContent escapes HTML
      tr.appendChild(tdProject);

      // Severity
      const tdSev = document.createElement('td');
      tdSev.className = "py-2 pr-4";
      const spanSev = document.createElement('span');
      spanSev.textContent = r.severity.toUpperCase();
      tdSev.appendChild(spanSev);
      tr.appendChild(tdSev);

      // Issues
      const tdIssues = document.createElement('td');
      tdIssues.className = "py-2 pr-4";
      tdIssues.textContent = String(r.issues);
      tr.appendChild(tdIssues);

      // Date
      const tdDate = document.createElement('td');
      tdDate.className = "py-2";
      tdDate.textContent = new Date(r.createdAt).toLocaleString();
      tr.appendChild(tdDate);

      this.reportBody.appendChild(tr);
    }
  }

  renderHistoricalUsage(usage: any[]) {
    if (!this.historicalUsageBody) return;
    this.historicalUsageBody.innerHTML = '';
    for (const r of usage) {
      const tr = document.createElement('tr');

      // month
      const tdMonth = document.createElement('td');
      tdMonth.className = "py-2 pr-4 text-gray-400";
      tdMonth.textContent = r.month;
      tr.appendChild(tdMonth);

      // reports
      const tdReports = document.createElement('td');
      tdReports.className = "py-2 pr-2 text-gray-400";
      tdReports.textContent = String(r.reports_generated);
      tr.appendChild(tdReports);

      // criticals
      const tdCriticals = document.createElement('td');
      tdCriticals.className = "py-2 pr-2 text-red-400";
      tdCriticals.textContent = String(r.critical_findings);
      tr.appendChild(tdCriticals);

      // highs
      const tdHighs = document.createElement('td');
      tdHighs.className = "py-2 pr-2 text-orange-400";
      tdHighs.textContent = String(r.high_findings);
      tr.appendChild(tdHighs);

      // mediums
      const tdMediums = document.createElement('td');
      tdMediums.className = "py-2 pr-2 text-yellow-400";
      tdMediums.textContent = String(r.medium_findings);
      tr.appendChild(tdMediums);

      // lows
      const tdLows = document.createElement('td');
      tdLows.className = "py-2 pr-2 text-matrix-400";
      tdLows.textContent = String(r.low_findings);
      tr.appendChild(tdLows);

      // totals
      const tdTotals = document.createElement('td');
      tdTotals.className = "py-2 pr-2 text-white-400";
      tdTotals.textContent = String(r.total_findings);
      tr.appendChild(tdTotals);

      // total scans
      const tdTotalScans = document.createElement('td');
      tdTotalScans.className = "py-2 pr-2 text-white-400";
      tdTotalScans.textContent = String(r.scans_completed);
      tr.appendChild(tdTotalScans);

      // api calls
      const tdApiCalls = document.createElement('td');
      tdApiCalls.className = "py-2 pr-2 text-white-400";
      tdApiCalls.textContent = String(r.api_calls);
      tr.appendChild(tdApiCalls);

      this.historicalUsageBody.appendChild(tr);
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
    // Use debounced request with 2 second delay to avoid rate limiting
    // Key includes orgId to prevent duplicates when requesting same org
    this._performLoadReportsAndProjects();
  }

  private async _performLoadReportsAndProjects() {
    // Load scan history from local storage
    let scanHistory: any[] = [];
    try {
      const storedHistory = localStorage.getItem("scan_history");
      if (storedHistory) {
        scanHistory = JSON.parse(storedHistory);
      }
    } catch (e) {
      console.error("Failed to load local scan history", e);
    }


    if (!organization.orgId) {
      await loadUserOrganization();
      this.changeDashboard('organization');
    }

    let criticalFindings = 0;
    let highFindings = 0;
    let scans = 0;
    let currMonth = "";
    let findingsMonth = 0;
    let historicalUsage = [];

    // Skip organization API calls if orgId is not available
    if (organization.orgId) {
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
        const res = await GET(ENDPOINTS.ORG_ANALYTICS.GET_dashboard_stats(organization.orgId));

        if (res.status === 200 && res.data) {
          const data = res.data;
          historicalUsage = data.months

        } else if (res.status === 404) {
          console.debug("Organization not found, using local scan history only");
        } else {
          console.debug("Failed to load organization stats:", res.status);
        }
      } catch (e) {
        console.debug("Failed to load organization stats:", e);
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
        const resHist = await GET(ENDPOINTS.ORG_ANALYTICS.GET_historical_usage(organization.orgId));

        if (resHist.status === 200 && resHist.data) {
          const data = resHist.data.months;

          console.log("Org history Stats Data:", data);
        } else if (resHist.status === 404) {
          console.debug("Organization not found, using local scan history only");
        } else {
          console.debug("Failed to load organization stats:", resHist.status);
        }
      } catch (e) {
        console.debug("Failed to load organization stats:", e);
      }
    } else {
      console.debug("Organization ID not available, skipping organization analytics");
    }
    // Calculate overview stats

    const overviewMonth = {
      criticalFindings,
      highFindings,
      scans,
      currMonth,
      findingsMonth
    };

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

    this.renderOverview(overviewMonth);
    this.renderMonthActivity([
      `Month: ${overviewMonth.currMonth}`,
      `Critical Findings: ${overviewMonth.criticalFindings}`,
      `High Findings: ${overviewMonth.highFindings}`,
      `Total Scans: ${overviewMonth.scans}`,
      `Total Vulnerabilities: ${overviewMonth.findingsMonth}`,
    ]);
    this.renderChartData(trend);
    this.renderReports(reports);
    this.renderHistoricalUsage(historicalUsage);
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
    scanElement: HTMLElement,
    totalFindingsElement: HTMLElement,
    monthActivity: HTMLElement,
    reportBody: HTMLElement,
    historicalUsageBody: HTMLElement,
    chartSvg: HTMLElement,
    ecoSelect: HTMLSelectElement,
    monthTag: HTMLElement) {
    this.criticalElement = criticalElement;
    this.highElement = highElement;
    this.scanElement = scanElement;
    this.totalFindingsElement = totalFindingsElement;
    this.monthActivity = monthActivity;
    this.reportBody = reportBody;
    this.historicalUsageBody = historicalUsageBody;
    this.chartSvg = chartSvg;
    this.ecoSelect = ecoSelect;
    this.monthTag = monthTag;
  }

}

export class DashboardHandler {
  criticalElement: HTMLElement;
  highElement: HTMLElement;
  medElement: HTMLElement;
  lowElement: HTMLElement;
  monthActivity: HTMLElement;
  reportBody: HTMLElement;
  historicalUsageBody: HTMLElement;
  chartSvg: HTMLElement;
  currentReportsFiltered: any[] = [];
  ecoSelect: HTMLSelectElement;
  monthTag: HTMLElement;


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


  renderReports(reports: any[]) {
    if (!this.reportBody) return;
    this.reportBody.innerHTML = '';
    for (const r of reports) {
      const tr = document.createElement('tr');

      // ID
      const tdId = document.createElement('td');
      tdId.className = "py-2 pr-4 text-gray-400";
      tdId.textContent = r.id.slice(-6);
      tr.appendChild(tdId);

      // Project
      const tdProject = document.createElement('td');
      tdProject.className = "py-2 pr-4";
      tdProject.textContent = r.project; // Safe: textContent
      tr.appendChild(tdProject);

      // Severity
      const tdSev = document.createElement('td');
      tdSev.className = "py-2 pr-4";
      const spanSev = document.createElement('span');
      spanSev.textContent = r.severity.toUpperCase();
      tdSev.appendChild(spanSev);
      tr.appendChild(tdSev);

      // Issues
      const tdIssues = document.createElement('td');
      tdIssues.className = "py-2 pr-4";
      tdIssues.textContent = String(r.issues);
      tr.appendChild(tdIssues);

      // Date
      const tdDate = document.createElement('td');
      tdDate.className = "py-2";
      tdDate.textContent = new Date(r.createdAt).toLocaleString();
      tr.appendChild(tdDate);

      this.reportBody.appendChild(tr);
    }
  }

  renderHistoricalUsage(usage: any[]) {
    if (!this.historicalUsageBody) return;
    this.historicalUsageBody.innerHTML = '';
    for (const r of usage) {
      const tr = document.createElement('tr');

      // month
      const tdMonth = document.createElement('td');
      tdMonth.className = "py-2 pr-4 text-gray-400";
      tdMonth.textContent = r.month;
      tr.appendChild(tdMonth);

      // reports
      const tdReports = document.createElement('td');
      tdReports.className = "py-2 pr-2 text-gray-400";
      tdReports.textContent = String(r.reports_generated);
      tr.appendChild(tdReports);

      // criticals
      const tdCriticals = document.createElement('td');
      tdCriticals.className = "py-2 pr-2 text-red-400";
      tdCriticals.textContent = String(r.critical_findings);
      tr.appendChild(tdCriticals);

      // highs
      const tdHighs = document.createElement('td');
      tdHighs.className = "py-2 pr-2 text-orange-400";
      tdHighs.textContent = String(r.high_findings);
      tr.appendChild(tdHighs);

      // mediums
      const tdMediums = document.createElement('td');
      tdMediums.className = "py-2 pr-2 text-yellow-400";
      tdMediums.textContent = String(r.medium_findings);
      tr.appendChild(tdMediums);

      // lows
      const tdLows = document.createElement('td');
      tdLows.className = "py-2 pr-2 text-matrix-400";
      tdLows.textContent = String(r.low_findings);
      tr.appendChild(tdLows);

      // totals
      const tdTotals = document.createElement('td');
      tdTotals.className = "py-2 pr-2 text-white-400";
      tdTotals.textContent = String(r.total_findings);
      tr.appendChild(tdTotals);

      // total scans
      const tdTotalScans = document.createElement('td');
      tdTotalScans.className = "py-2 pr-2 text-white-400";
      tdTotalScans.textContent = String(r.scans_completed);
      tr.appendChild(tdTotalScans);

      // api calls
      const tdApiCalls = document.createElement('td');
      tdApiCalls.className = "py-2 pr-2 text-white-400";
      tdApiCalls.textContent = String(r.api_calls);
      tr.appendChild(tdApiCalls);

      this.historicalUsageBody.appendChild(tr);
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
    // Use debounced request with 2 second delay to avoid rate limiting
    const requestKey = 'user-dashboard-analytics';

    this._performLoadReportsAndProjects();
  }

  private async _performLoadReportsAndProjects() {
    // Load scan history from local storage
    let scanHistory: any[] = [];
    try {
      const storedHistory = localStorage.getItem("scan_history");
      if (storedHistory) {
        scanHistory = JSON.parse(storedHistory);
      }
    } catch (e) {
      console.error("Failed to load local scan history", e);
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
    let currMonth = "";
    let historicalUsage: any[] = [];

    try {
      const res = await GET(ENDPOINTS.PERSONAL_ANALYTICS.GET_stats);

      if (res.status === 200 && res.data) {
        const data = res.data;
        criticalFindings = data.critical_this_month;
        highFindings = data.high_this_month;
        mediumFindings = data.medium_this_month;
        lowFindings = data.low_this_month;
        totalScan = data.scans_this_month;
        totalVuln = data.findings_this_month;
        currMonth = data.current_month;
      } else if (res.status === 404 || res.status !== 200) {
        // No analytics data available yet (user is new or hasn't scanned anything)
        console.debug("No analytics data available, using local scan history only", { status: res.status });
      }

      const resHist = await GET(ENDPOINTS.PERSONAL_ANALYTICS.GET_historical_usage);

      if (resHist.status === 200 && resHist.data) {
        historicalUsage = resHist.data.months;
      } else if (resHist.status === 404 || resHist.status !== 200) {
        console.debug("No historical analytics data available, using local scan history only", { status: resHist.status });
      }
    } catch (e) {
      console.debug("Failed to load user analytics (expected for new users):", e);
      // Continue with local scan history data
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

    this.renderOverview(overviewStatus);
    this.monthTag.textContent = `Month: ${currMonth}`;
    this.renderMonthActivity([
      `Scans this month: ${totalScan}`,
      `Findings this month: ${totalVuln}`,
    ]);
    this.renderChartData(trend);
    this.renderReports(reports);
    this.renderHistoricalUsage(historicalUsage);
  }

  // changeDashboard method removed as it depends on organization object which is not used anymore
  // and we are showing user analytics now.




  constructor(criticalElement: HTMLElement,
    highElement: HTMLElement,
    medElement: HTMLElement,
    lowElement: HTMLElement,
    monthActivity: HTMLElement,
    reportBody: HTMLElement,
    historicalUsageBody: HTMLElement,
    chartSvg: HTMLElement,
    ecoSelect: HTMLSelectElement,
    monthTag: HTMLElement) {
    this.criticalElement = criticalElement;
    this.highElement = highElement;
    this.medElement = medElement;
    this.lowElement = lowElement;
    this.monthActivity = monthActivity;
    this.reportBody = reportBody;
    this.historicalUsageBody = historicalUsageBody;
    this.chartSvg = chartSvg;
    this.ecoSelect = ecoSelect;
    this.monthTag = monthTag;
  }

}