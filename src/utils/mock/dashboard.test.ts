import { describe, it, expect } from 'vitest';
import { 
  generateOverview,
  generateReports,
  generateProjects,
  generateTrend,
  type MockReport,
  type MockProject,
  type MockOverview
} from './dashboard';

describe('Dashboard Mock Data Generators', () => {
  describe('generateOverview', () => {
    it('should generate overview with correct structure', () => {
      const overview = generateOverview();
      
      expect(overview).toHaveProperty('reportsTotal');
      expect(overview).toHaveProperty('projectsAnalyzed');
      expect(overview).toHaveProperty('lastScanAt');
      expect(overview).toHaveProperty('vulnerableProjects');
    });

    it('should have realistic numeric values', () => {
      const overview = generateOverview();
      
      expect(typeof overview.reportsTotal).toBe('number');
      expect(typeof overview.projectsAnalyzed).toBe('number');
      expect(typeof overview.vulnerableProjects).toBe('number');
      
      expect(overview.reportsTotal).toBeGreaterThanOrEqual(40);
      expect(overview.reportsTotal).toBeLessThanOrEqual(320);
      expect(overview.projectsAnalyzed).toBeGreaterThanOrEqual(12);
      expect(overview.projectsAnalyzed).toBeLessThanOrEqual(58);
      expect(overview.vulnerableProjects).toBeLessThanOrEqual(overview.projectsAnalyzed);
    });

    it('should have valid ISO date string', () => {
      const overview = generateOverview();
      
      expect(typeof overview.lastScanAt).toBe('string');
      expect(() => new Date(overview.lastScanAt)).not.toThrow();
      
      const scanDate = new Date(overview.lastScanAt);
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 3600 * 1000);
      
      expect(scanDate.getTime()).toBeLessThanOrEqual(now.getTime());
      expect(scanDate.getTime()).toBeGreaterThanOrEqual(threeDaysAgo.getTime());
    });

    it('should generate different values on multiple calls', () => {
      const overview1 = generateOverview();
      const overview2 = generateOverview();
      
      // At least one property should be different (statistical probability)
      const isDifferent = 
        overview1.reportsTotal !== overview2.reportsTotal ||
        overview1.projectsAnalyzed !== overview2.projectsAnalyzed ||
        overview1.vulnerableProjects !== overview2.vulnerableProjects ||
        overview1.lastScanAt !== overview2.lastScanAt;
      
      expect(isDifferent).toBe(true);
    });
  });

  describe('generateReports', () => {
    it('should generate default number of reports', () => {
      const reports = generateReports();
      expect(reports).toHaveLength(8); // default
    });

    it('should generate custom number of reports', () => {
      const count = 5;
      const reports = generateReports(count);
      expect(reports).toHaveLength(count);
    });

    it('should generate reports with correct structure', () => {
      const reports = generateReports(3);
      
      reports.forEach((report: MockReport) => {
        expect(report).toHaveProperty('id');
        expect(report).toHaveProperty('project');
        expect(report).toHaveProperty('createdAt');
        expect(report).toHaveProperty('severity');
        expect(report).toHaveProperty('issues');
        
        expect(typeof report.id).toBe('string');
        expect(typeof report.project).toBe('string');
        expect(typeof report.createdAt).toBe('string');
        expect(['critical', 'high', 'medium', 'low', 'none'].includes(report.severity)).toBe(true);
        expect(typeof report.issues).toBe('number');
      });
    });

    it('should generate unique IDs', () => {
      const reports = generateReports(10);
      const ids = reports.map((r: MockReport) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid dates within the last 14 days', () => {
      const reports = generateReports(5);
      const now = new Date();
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 3600 * 1000);
      
      reports.forEach((report: MockReport) => {
        const reportDate = new Date(report.createdAt);
        expect(reportDate.getTime()).toBeLessThanOrEqual(now.getTime());
        expect(reportDate.getTime()).toBeGreaterThan(fourteenDaysAgo.getTime());
      });
    });

    it('should have realistic issue counts', () => {
      const reports = generateReports(10);
      
      reports.forEach((report: MockReport) => {
        expect(report.issues).toBeGreaterThanOrEqual(0);
        expect(report.issues).toBeLessThanOrEqual(42);
      });
    });

    it('should handle edge cases', () => {
      expect(generateReports(0)).toHaveLength(0);
      expect(generateReports(1)).toHaveLength(1);
      expect(generateReports(100)).toHaveLength(100);
    });
  });

  describe('generateProjects', () => {
    it('should generate default number of projects', () => {
      const projects = generateProjects();
      expect(projects).toHaveLength(6); // default
    });

    it('should generate custom number of projects', () => {
      const count = 4;
      const projects = generateProjects(count);
      expect(projects).toHaveLength(count);
    });

    it('should generate projects with correct structure', () => {
      const projects = generateProjects(3);
      
      projects.forEach((project: MockProject) => {
        expect(project).toHaveProperty('name');
        expect(project).toHaveProperty('ecosystem');
        expect(project).toHaveProperty('lastScanAt');
        expect(project).toHaveProperty('vulnerabilities');
        
        expect(typeof project.name).toBe('string');
        expect(['npm', 'pypi', 'maven', 'cargo', 'nuget', 'rubygems'].includes(project.ecosystem)).toBe(true);
        expect(typeof project.lastScanAt).toBe('string');
        expect(typeof project.vulnerabilities).toBe('number');
      });
    });

    it('should have valid dates', () => {
      const projects = generateProjects(5);
      const now = new Date();
      const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 3600 * 1000);
      
      projects.forEach((project: MockProject) => {
        const scanDate = new Date(project.lastScanAt);
        expect(scanDate.getTime()).toBeLessThanOrEqual(now.getTime());
        expect(scanDate.getTime()).toBeGreaterThan(fourDaysAgo.getTime());
      });
    });

    it('should have realistic vulnerability counts', () => {
      const projects = generateProjects(10);
      
      projects.forEach((project: MockProject) => {
        expect(project.vulnerabilities).toBeGreaterThanOrEqual(0);
        expect(project.vulnerabilities).toBeLessThanOrEqual(25);
      });
    });

    it('should handle edge cases', () => {
      expect(generateProjects(0)).toHaveLength(0);
      expect(generateProjects(1)).toHaveLength(1);
      expect(generateProjects(50)).toHaveLength(50);
    });
  });

  describe('generateTrend', () => {
    it('should generate default 7 days of trend data', () => {
      const trend = generateTrend();
      expect(trend).toHaveLength(7);
    });

    it('should generate custom number of days', () => {
      const days = 14;
      const trend = generateTrend(days);
      expect(trend).toHaveLength(days);
    });

    it('should generate trend data with correct structure', () => {
      const trend = generateTrend(5);
      
      trend.forEach((entry: { day: string; reports: number; vulns: number }) => {
        expect(entry).toHaveProperty('day');
        expect(entry).toHaveProperty('reports');
        expect(entry).toHaveProperty('vulns');
        
        expect(typeof entry.day).toBe('string');
        expect(typeof entry.reports).toBe('number');
        expect(typeof entry.vulns).toBe('number');
      });
    });

    it('should have valid date strings in YYYY-MM-DD format', () => {
      const trend = generateTrend(7);
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      
      trend.forEach((entry: { day: string; reports: number; vulns: number }) => {
        expect(entry.day).toMatch(dateRegex);
        expect(() => new Date(entry.day)).not.toThrow();
      });
    });

    it('should have chronological dates (oldest to newest)', () => {
      const trend = generateTrend(7);
      
      for (let i = 1; i < trend.length; i++) {
        const prevDate = new Date(trend[i - 1].day);
        const currDate = new Date(trend[i].day);
        expect(currDate.getTime()).toBeGreaterThan(prevDate.getTime());
      }
    });

    it('should have realistic report and vulnerability counts', () => {
      const trend = generateTrend(10);
      
      trend.forEach((entry: { day: string; reports: number; vulns: number }) => {
        expect(entry.reports).toBeGreaterThanOrEqual(1);
        expect(entry.reports).toBeLessThanOrEqual(30);
        expect(entry.vulns).toBeGreaterThanOrEqual(0);
        expect(entry.vulns).toBeLessThanOrEqual(60);
      });
    });

    it('should handle edge cases', () => {
      expect(generateTrend(0)).toHaveLength(0);
      expect(generateTrend(1)).toHaveLength(1);
      expect(generateTrend(365)).toHaveLength(365);
    });

    it('should have today as the last entry when generating 1 day', () => {
      const trend = generateTrend(1);
      const today = new Date().toISOString().slice(0, 10);
      expect(trend[0].day).toBe(today);
    });
  });
});