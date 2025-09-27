// Simple mock data utilities for the Dashboard

export type MockReport = {
  id: string;
  project: string;
  createdAt: string; // ISO
  severity: 'critical' | 'high' | 'medium' | 'low' | 'none';
  issues: number;
};

export type MockProject = {
  name: string;
  ecosystem: 'npm' | 'pypi' | 'maven' | 'cargo' | 'nuget' | 'rubygems';
  lastScanAt: string; // ISO
  vulnerabilities: number;
};

export type MockOverview = {
  reportsTotal: number;
  projectsAnalyzed: number;
  lastScanAt: string;
  vulnerableProjects: number;
};

function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[randInt(0, arr.length - 1)]; }

export function generateOverview(): MockOverview {
  const projectsAnalyzed = randInt(12, 58);
  const reportsTotal = randInt(40, 320);
  const vulnerableProjects = randInt(2, Math.max(2, Math.floor(projectsAnalyzed * 0.4)));
  const lastScanAt = new Date(Date.now() - randInt(5, 72) * 3600_000).toISOString();
  return { reportsTotal, projectsAnalyzed, lastScanAt, vulnerableProjects };
}

export function generateReports(n = 8): MockReport[] {
  const sev: MockReport['severity'][] = ['critical','high','medium','low','none'];
  const projects = ['alpha-api','beta-ui','gamma-core','delta-cli','epsilon-worker','zeta-service'];
  return Array.from({ length: n }).map((_, i) => ({
    id: `${Date.now()}-${i}-${randInt(100,999)}`,
    project: pick(projects),
    // ensure dates are within the last 14 days (strictly greater than 14 days ago)
    createdAt: new Date(Date.now() - randInt(0, 13) * 86_400_000).toISOString(),
    severity: pick(sev),
    issues: randInt(0, 42),
  }));
}

export function generateProjects(n = 6): MockProject[] {
  const names = ['alpha-api','beta-ui','gamma-core','delta-cli','epsilon-worker','zeta-service','theta-lib','lambda-svc'];
  const ecos: MockProject['ecosystem'][] = ['npm','pypi','maven','cargo','nuget','rubygems'];
  return Array.from({ length: n }).map(() => ({
    name: pick(names),
    ecosystem: pick(ecos),
    lastScanAt: new Date(Date.now() - randInt(2, 96) * 3600_000).toISOString(),
    vulnerabilities: randInt(0, 25),
  }));
}

export function generateTrend(days = 7): { day: string; reports: number; vulns: number }[] {
  const out: { day: string; reports: number; vulns: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    out.push({
      day: d.toISOString().slice(0, 10),
      reports: randInt(1, 30),
      vulns: randInt(0, 60),
    });
  }
  return out;
}
