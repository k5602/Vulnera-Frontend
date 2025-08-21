function initializeNotyf() {
    // Add role="status" and aria-live="polite" to the container
    // to ensure screen readers announce the notifications.
    const container = document.createElement("div");
    container.id = "notyf-container";
    container.setAttribute("role", "status");
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-relevant", "additions");
    document.body.appendChild(container);

    return new Notyf({
      duration: 5000,
      position: { x: "right", y: "top" },
      types: [
        {
          type: "info",
          background: "hsl(var(--in))",
          icon: {
            className: "fas fa-info-circle",
            tagName: "i",
            color: "hsl(var(--inc))",
          },
          className: "notyf__toast--info",
        },
        {
          type: "warning",
          background: "hsl(var(--wa))",
          icon: {
            className: "fas fa-exclamation-triangle",
            tagName: "i",
            color: "hsl(var(--wac))",
          },
          className: "notyf__toast--warning",
        },
        {
          type: "success",
          background: "#10B981",
          icon: {
            className: "fas fa-check-circle",
            tagName: "i",
            color: "white",
          },
        },
        {
          type: "github",
          background: "#1F2937",
          icon: {
            className: "fab fa-github",
            tagName: "i",
            color: "white",
          },
        },
      ],
      container: container,
    });
  }
  
  const notyf = initializeNotyf();
  
  export function initNotyf() {
      notyf = new Notyf({
          duration: 5000,
          position: {
            x: "right",
            y: "top",
          },
          types: [
            {
              type: "info",
              background: "#3B82F6",
              icon: {
                className: "fas fa-info-circle",
                tagName: "i",
                color: "white",
              },
            },
            {
              type: "warning",
              background: "#F59E0B",
              icon: {
                className: "fas fa-exclamation-triangle",
                tagName: "i",
                color: "white",
              },
            },
            {
              type: "success",
              background: "#10B981",
              icon: {
                className: "fas fa-check-circle",
                tagName: "i",
                color: "white",
              },
            },
            {
              type: "github",
              background: "#1F2937",
              icon: {
                className: "fab fa-github",
                tagName: "i",
                color: "white",
              },
            },
          ],
        });
  }
  
  
  export function showError(message) {
      try {
        notyf?.open({ type: "warning", message });
      } catch (_) {
        alert(message);
      }
    }
  
    export function showSuccess(message) {
      try {
        notyf?.open({ type: "success", message });
      } catch (_) {
        alert(message);
      }
    }
  
    export function showInfo(message) {
      try {
        notyf?.open({ type: "info", message });
      } catch (_) {
        alert(message);
      }
    }
  
    export function showGitHubComingSoon() {
      // Show coming soon notification
      notyf.open({
        type: "github",
        message:
          "🚀 GitHub Repository Scanning - Coming Soon! Scan entire repos for vulnerabilities across all dependency files.",
      });
  
      // Show additional info after 2.5 seconds
      setTimeout(() => {
        notyf.open({
          type: "info",
          message:
            "✨ Features: OAuth integration, bulk scanning, automated CI/CD workflows, and comprehensive reporting.",
        });
      }, 2500);
  
      // Show feature timeline after 5 seconds
      setTimeout(() => {
          notyf.open({
              type: "success",
              message:
              "📅 Expected Release: Q1 2026 | Follow our GitHub for beta access and updates!",
          });
      }, 5000);
    }
