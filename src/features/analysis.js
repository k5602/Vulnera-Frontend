/**
 * Legacy analysis module placeholder.
 *
 * The original DOM-driven analysis implementation has been removed in favor of the
 * revamped React/Island workflow that powers the Scan page. The file remains so that
 * any lingering imports fail loudly with a clear migration hint instead of breaking
 * the build.
 */

const legacyWarning = (method) => {
  throw new Error(`${method} is no longer available. Use the Scan page workflow instead.`);
};

export const handleAnalyze = async () => legacyWarning('handleAnalyze');
export const handleAnalyzeRepository = async () => legacyWarning('handleAnalyzeRepository');
export const loadAnalysisPage = async () => legacyWarning('loadAnalysisPage');

export default {
  handleAnalyze,
  handleAnalyzeRepository,
  loadAnalysisPage,
};
