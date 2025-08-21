import { showGitHubComingSoon } from '../ui/notifications.js';

export function initGitHubScanning() {
    // GitHub scan button in hero section
    document
      .getElementById("github-scan-btn")
      .addEventListener("click", function () {
        showGitHubComingSoon();
      });
  
    // GitHub scan preview button in coming soon section
    document
      .getElementById("github-scan-preview")
      .addEventListener("click", function () {
        showGitHubComingSoon();
      });
  }
  