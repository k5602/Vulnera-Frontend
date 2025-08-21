import { getEcosystem, isSupported } from '../utils/ecosystems.js';
import { handleAnalyze } from './analysis.js';
import { escapeHtml, MAX_FILE_BYTES } from '../utils/sanitize.js';

export function initDragAndDrop() {
    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("file-input");
    const fileInfo = document.getElementById("file-info");
    const analyzeBtn = document.getElementById("analyze-btn");

    // Make dropZone focusable & add keyboard trigger
    dropZone.setAttribute('tabindex','0');
    dropZone.setAttribute('role','button');
    dropZone.setAttribute('aria-label','Upload dependency file');
    dropZone.addEventListener('keydown', (e)=> {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });
  
    // Handle drag events
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(eventName, preventDefaults, false);
      document.body.addEventListener(eventName, preventDefaults, false);
    });
  
    ["dragenter", "dragover"].forEach((eventName) => {
      dropZone.addEventListener(eventName, highlight, false);
    });
  
    ["dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(eventName, unhighlight, false);
    });
  
    dropZone.addEventListener("drop", handleDrop, false);
    dropZone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", handleFileSelect);
    analyzeBtn.addEventListener("click", handleAnalyze);
  
    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }
  
    function highlight() {
      dropZone.classList.add("border-primary", "bg-primary/5");
    }
  
    function unhighlight() {
      dropZone.classList.remove("border-primary", "bg-primary/5");
    }
  
    function handleDrop(e) {
      const dt = e.dataTransfer;
      const files = dt.files;
      handleFiles(files);
    }
  
    function handleFileSelect(e) {
      const files = e.target.files;
      handleFiles(files);
    }
  
    function handleFiles(files) {
      if (files.length > 0) {
        const file = files[0];
        if (file.size > MAX_FILE_BYTES) {
          alert('File too large (>1MB).');
          return;
        }
        displayFileInfo(file);
      }
    }
  
    function displayFileInfo(file) {
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
    }
  }
