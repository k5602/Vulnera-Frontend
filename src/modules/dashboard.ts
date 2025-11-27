import { organization } from './orgData.js';
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


    renderOverview(o: any) {
      if (this.criticalElement) this.criticalElement.textContent = String(o.reportsTotal ?? 0);
      if (this.highElement) this.highElement.textContent = String(o.projectsAnalyzed ?? 0);
      if (this.medElement) this.medElement.textContent =  String(o.vulnerableProjects ?? 0);
      if (this.lowElement) this.lowElement.textContent = String(o.lastScanAt ?? 0);
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
      switch (s) {
        case 'critical': return 'text-red-400';
        case 'high': return 'text-red-300';
        case 'medium': return 'text-yellow-300';
        case 'low': return 'text-matrix-300';
        default: return 'text-gray-400';
      }
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
                          <div class="text-xs ${p.vulnerabilities>0?'text-yellow-300':'text-cyber-300'}">Vulns: ${p.vulnerabilities}</div>`;
        this.projectGrid.appendChild(card);
      }
    }

    renderChartData(trend: {day: string, reports: number, vulns: number}[]) {
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
      console.log("Loading reports and projects...");
      // loading scan history is to be implemented
      let scanHistory: any[] = [];

      // Calculate overview stats
      const reportsTotal = scanHistory.length;
      const projectsAnalyzed = new Set(scanHistory.map(s => s.project || 'File Upload')).size;
      const vulnerableProjects = scanHistory.filter(s => (s.vulnerabilities || 0) > 0).length;
      const lastScan = scanHistory[0];
      const lastScanAt = lastScan ? new Date(lastScan.timestamp).toLocaleString() : '--';

      const overview = { 
        reportsTotal, 
        projectsAnalyzed, 
        vulnerableProjects, 
        lastScanAt 
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
      const filteredProjects = projects.filter((p:any) => (this.ecoSelect.value === 'all' ? true : p.ecosystem === this.ecoSelect.value));

      this.renderOverview(overview);
      this.renderMonthActivity([
        `Total Scans: ${overview.reportsTotal}`,
        `Total Vulnerabilities: ${overview.projectsAnalyzed}`,
        `API calls this month: ${overview.vulnerableProjects}`,
      ]);
      this.renderProjects(filteredProjects);
      this.renderChartData(trend);
    }

    changeDashboard(selection: string) {
      const titleEl = document.getElementById('dash-title') as HTMLElement;
      const subtitleEl = document.getElementById('dash-subtitle') as HTMLElement;
      if (selection == "organization") {
        titleEl.innerHTML = `<span class="text-cyber-400">&gt;</span> ORGANIZATION_DASHBOARD`;
        subtitleEl.innerHTML = `ORGANIZATION_NAME: ${organization.orgName || 'N/A' } ||
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
                ecoSelect: HTMLSelectElement) {
        this.criticalElement = criticalElement;
        this.highElement = highElement;
        this.medElement =  medElement;
        this.lowElement = lowElement;
        this.monthActivity = monthActivity;
        this.reportBody = reportBody;
        this.projectGrid = projectGrid;
        this.chartSvg = chartSvg;
        this.ecoSelect = ecoSelect;
    }

}   