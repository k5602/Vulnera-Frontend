const supportedFiles = {
    "package.json": "Node.js",
    "package-lock.json": "Node.js",
    "yarn.lock": "Node.js",
    "requirements.txt": "Python",
    Pipfile: "Python",
    "pyproject.toml": "Python",
    "pom.xml": "Java",
    "build.gradle": "Java",
    "build.gradle.kts": "Java",
    "Cargo.toml": "Rust",
    "Cargo.lock": "Rust",
    "go.mod": "Go",
    "go.sum": "Go",
    "composer.json": "PHP",
    "composer.lock": "PHP",
    Gemfile: "Ruby",
    "Gemfile.lock": "Ruby",
    "packages.config": ".NET",
    "*.csproj": ".NET",
    "Directory.Packages.props": ".NET",
  };
  
  export function getEcosystem(fileName) {
    return supportedFiles[fileName] || "Unknown";
  }
  
  export function isSupported(fileName) {
    return getEcosystem(fileName) !== "Unknown";
  }
  
  // Map filename to API ecosystem values the backend accepts
  export function detectEcosystemForApi(filename) {
    const name = (filename || "").toLowerCase();
    if (
      name === "package.json" ||
      name === "package-lock.json" ||
      name === "yarn.lock"
    )
      return "npm";
    if (
      name === "requirements.txt" ||
      name === "pipfile" ||
      name === "pyproject.toml"
    )
      return "python"; // accepted by API
    if (
      name === "pom.xml" ||
      name.endsWith("build.gradle") ||
      name.endsWith("build.gradle.kts")
    )
      return "maven";
    if (name === "cargo.toml" || name === "cargo.lock") return "cargo";
    if (name === "go.mod" || name === "go.sum") return "go";
    if (name === "composer.json" || name === "composer.lock") return "composer"; // accepted by API
    // Ruby/.NET not yet supported by backend
    return null;
  }
  