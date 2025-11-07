/**
 * API Usage Examples and Hooks
 * Demonstrates how to use all the API endpoints in the frontend
 */

import {
  healthService,
  vulnerabilityService,
  repositoryService,
  scanService,
} from './index';

/**
 * Health Monitoring Examples
 */
export const healthExamples = {
  /**
   * Example: Check system health status
   */
  async checkSystemHealth() {
    const response = await healthService.checkHealth();
    if (response.success && response.data) {
      console.log('✅ Health check completed');
      return response.data;
    }
    console.error('❌ Health check failed');
    return null;
  },

  /**
   * Example: Get system metrics for monitoring
   */
  async getSystemMetrics() {
    const response = await healthService.getMetrics();
    if (response.success && response.data) {
      console.log('✅ Metrics retrieved');
      return response.data;
    }
    console.error('❌ Failed to get metrics');
    return null;
  },

  /**
   * Example: Start continuous health monitoring
   */
  startHealthMonitor() {
    const stopMonitoring = healthService.startHealthMonitoring(30000, (status) => {
      if (status.status !== 'healthy') {
        console.warn('⚠️ System health degraded');
      }
    });
    return stopMonitoring;
  },
};

/**
 * Vulnerability Endpoints Examples
 */
export const vulnerabilityExamples = {
  /**
   * Example: List vulnerabilities with pagination
   * GET /api/v1/vulnerabilities
   */
  async listVulnerabilities(page = 1, pageSize = 20) {
    const response = await vulnerabilityService.listVulnerabilities(page, pageSize);
    if (response.success && response.data) {
      console.log('✅ Vulnerabilities retrieved');
      return response.data;
    }
    console.error('❌ Failed to get vulnerabilities');
    return null;
  },

  /**
   * Example: Refresh popular packages vulnerability cache
   * POST /api/v1/vulnerabilities/refresh-cache
   */
  async refreshCache() {
    const response = await vulnerabilityService.refreshCache();
    if (response.success && response.data) {
      console.log('✅ Cache refreshed successfully');
      return response.data;
    }
    console.error('❌ Cache refresh failed');
    return null;
  },
};

/**
 * Repository Analysis Examples
 */
export const repositoryExamples = {
  /**
   * Example: Analyze entire repository for vulnerabilities
   * POST /api/v1/analyze/repository
   */
  async analyzeRepository(repoUrl: string, branch = 'main') {
    const response = await repositoryService.analyzeRepository({
      url: repoUrl,
      branch,
      includeDevDependencies: true,
    });

    if (response.success && response.data) {
      return response.data;
    }
    return null;
  },
};

/**
 * Scan Endpoints Examples
 */
export const scanExamples = {
  /**
   * Example: Create a new vulnerability scan
   */
  async createScan(packageName: string, packageVersion: string, ecosystem: string) {
    const response = await scanService.createScan({
      packageName,
      packageVersion,
      ecosystem,
    });

    if (response.success && response.data) {
      return response.data;
    }
    return null;
  },
};

/**
 * Integration Example: Full Workflow
 */
export async function fullAnalysisWorkflow(repoUrl: string) {
  console.log('🚀 Starting analysis workflow');

  try {
    console.log('1️⃣ Checking system health');
    await healthExamples.checkSystemHealth();

    console.log('2️⃣ Refreshing vulnerability cache');
    await vulnerabilityExamples.refreshCache();

    console.log('3️⃣ Analyzing repository');
    const analysis = await repositoryExamples.analyzeRepository(repoUrl);

    if (analysis) {
      console.log('✅ Analysis workflow completed');
    }
  } catch (error) {
    console.error('❌ Workflow error');
  }
}
