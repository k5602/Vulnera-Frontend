import { getEcosystem, isSupported } from '../utils/ecosystems.js';
import { escapeHtml, MAX_FILE_BYTES } from '../utils/sanitize.js';

export function initSampleFile() {
    document.getElementById("sample-btn").addEventListener("click", function () {
      // Create a sample file for testing
      const sampleContent = {
        name: "vulnerable-app",
        version: "1.0.0",
        description: "Sample package.json for testing vulnerability analysis",
        dependencies: {
          express: "4.17.1",
          lodash: "4.17.20",
          axios: "0.21.1",
          moment: "2.29.1",
          jquery: "3.5.1",
        },
        devDependencies: {
          jest: "26.6.3",
          eslint: "7.32.0",
        },
      };
  
      const blob = new Blob([JSON.stringify(sampleContent, null, 2)], {
        type: "application/json",
      });
      const file = new File([blob], "package.json", { type: "application/json" });
      if (file.size > MAX_FILE_BYTES) { alert('Sample file exceeds limit'); return; }
  
      // Simulate file selection
      const fileInput = document.getElementById("file-input");
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
  
      // Create file info display function locally
      const fileInfo = document.getElementById("file-info");
      const analyzeBtn = document.getElementById("analyze-btn");
  
      const ecosystem = getEcosystem(file.name);
      const supported = isSupported(file.name);
  
      fileInfo.innerHTML = `
        <div class="alert ${supported ? 'alert-success' : 'alert-warning'} mb-4">
          <i class="fas ${supported ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm sm:text-base truncate">${escapeHtml(file.name)}</div>
            <div class="text-xs sm:text-sm opacity-70">
              <span class="font-medium">${escapeHtml(ecosystem)}</span>
              <span class="hidden xs:inline"> - ${(file.size / 1024).toFixed(2)} KB</span>
            </div>
          </div>
        </div>
      `;
  
      analyzeBtn.disabled = !supported;
      analyzeBtn.classList.toggle("btn-disabled", !supported);
    });
  }
