export function initThemeToggle() {
    const themeToggle = document.getElementById("theme-toggle");
    const htmlElement = document.documentElement;
  
    themeToggle.addEventListener("change", function () {
      if (this.checked) {
        htmlElement.setAttribute("data-theme", "dark");
        localStorage.setItem("theme", "dark");
      } else {
        htmlElement.setAttribute("data-theme", "light");
        localStorage.setItem("theme", "light");
      }
    });
  
    // Load saved theme
    const savedTheme = localStorage.getItem("theme") || "light";
    htmlElement.setAttribute("data-theme", savedTheme);
    themeToggle.checked = savedTheme === "dark";
  }
  