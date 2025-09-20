import http from '../http';

export type StatsOverview = {
  reportsTotal: number;
  projectsAnalyzed: number;
  lastScanAt?: string;
  vulnerableProjects?: number;
};

export async function getOverview(): Promise<StatsOverview> {
  const { data } = await http.get('/stats/overview');
  const d = data || {};
  return {
    reportsTotal: Number(d.reportsTotal ?? 0),
    projectsAnalyzed: Number(d.projectsAnalyzed ?? 0),
    lastScanAt: typeof d.lastScanAt === 'string' ? d.lastScanAt : undefined,
    vulnerableProjects: d.vulnerableProjects != null ? Number(d.vulnerableProjects) : undefined,
  };
}
