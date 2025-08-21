# Vulnera Frontend

Vulnera Frontend is a browser-based Single Page Application (SPA) for analyzing dependency files and reporting vulnerabilities. It is built using Vite, Tailwind CSS, and DaisyUI, with no framework.

## Features

- Drag-and-drop or file input for uploading dependency files (e.g., `package.json`, `requirements.txt`, `pom.xml`, etc.)
- Automatic detection of supported ecosystems (Node.js, Python, Java, Rust, Go, PHP, etc.)
- Sends files to a backend API for vulnerability analysis
- Displays vulnerabilities grouped by package, with severity badges
- Supports paginated results for large reports
- Generates downloadable HTML reports and ZIP bundles (including fixed files and a fix log)
- Automatic file fixing for supported formats (Node.js, Python, Java)
- User notifications for errors, successes, and info
- Strict sanitization and file size limits (max 1MB)

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```
2. Run the development server:
   ```
   npm run dev
   ```
3. Open your browser to `http://localhost:5173` (default Vite port).

## Build & Preview

- Build for production:
  ```
  npm run build
  ```
- Preview the production build:
  ```
  npm run preview
  ```

## Configuration

- Environment variables are managed via Vite (`.env`), runtime config (`public/runtime-config.js`), or defaults.
- Main config keys: `API_BASE_URL`, `API_VERSION`, `APP_NAME`, `APP_VERSION`, `ENABLE_DEBUG`, `API_TIMEOUT`, `ENVIRONMENT`.

## File Structure

- `src/features/`: Analysis, drag-and-drop, GitHub scan, sample file logic
- `src/ui/`: Theme, modals, notifications, focus management
- `src/utils/`: Ecosystem detection, file fixing, sanitization
- `src/config.js`: Environment config
- `src/html-report-generator.js`: HTML report generation

## Backend

This frontend communicates with the Vulnera backend API.
Find the backend project here: [Vulnera Backend](https://github.com/k5602/Vulnera.git)

## License

This project is private and not licensed for public use.
