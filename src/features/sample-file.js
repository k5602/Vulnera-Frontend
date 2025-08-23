import { getEcosystem, isSupported } from '../utils/ecosystems.js';
import { escapeHtml, MAX_FILE_BYTES } from '../utils/sanitize.js';

export function initSampleFile() {
  document.getElementById('sample-btn').addEventListener('click', function() {
    // Create a sample file for testing
    const sampleContent = [
      'django==2.2.9',
      'flask==0.12.2',
      'jinja2==2.10',
      'markupsafe==1.1.1',
      'pyyaml==3.12',
      'urllib3==1.24.1',
      'requests==2.19.1',
      'lxml==4.6.1',
      'pillow==6.2.0',
      'tornado==4.4.2'
    ].join('\n');

    const blob = new Blob([sampleContent], {
      type: 'text/plain'
    });
    const file = new File([blob], 'requirements.txt', { type: 'text/plain' });
    if (file.size > MAX_FILE_BYTES) {
      alert('Sample file exceeds limit');
      return;
    }

    // Simulate file selection
    const fileInput = document.getElementById('file-input');
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    // Create file info display function locally
    const fileInfo = document.getElementById('file-info');
    const analyzeBtn = document.getElementById('analyze-btn');

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
    analyzeBtn.classList.toggle('btn-disabled', !supported);
  });
}
