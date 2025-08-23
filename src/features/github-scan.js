import { CONFIG } from "../config.js";
import { showError, showInfo, showSuccess } from "../ui/notifications.js";
import { presentAnalysisPayload } from "./analysis.js";

const GH_URL_REGEX =
    /^(https?:\/\/)?(www\.)?github\.com\/(?!enterprise)([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\/(tree|commit)\/([^\s\/]+))?(?:\.git)?\/?$/i;

function parseGitHubUrl(repoUrl) {
    try {
        const m = repoUrl.match(GH_URL_REGEX);
        if (!m) return {};
        const owner = m[3];
        const repo = m[4];
        const ref = m[6] || undefined;
        return { owner, repo, ref };
    } catch {
        return {};
    }
}

export function initGitHubScanning() {
    const scanBtn = document.getElementById("github-scan-btn");
    const urlInput = document.getElementById("github-url-input");
    if (!scanBtn || !urlInput) return;

    scanBtn.addEventListener("click", async () => {
        const url = (urlInput.value || "").trim();
        if (!url) {
            showError("Please enter a GitHub repository URL.");
            return;
        }
        if (!GH_URL_REGEX.test(url)) {
            showError(
                "Enter a valid public GitHub URL like https://github.com/owner/repo or /tree/main",
            );
            return;
        }

        // Open loading modal
        const loadingModal = document.getElementById("loading-modal");
        if (loadingModal) loadingModal.checked = true;

        try {
            showInfo("Starting repository scan…");
            const controller = new AbortController();
            const timeoutId = setTimeout(
                () => controller.abort(),
                Math.min(CONFIG.API_TIMEOUT * 2, 120000),
            );

            // Read advanced options
            const includeLockfiles = !!document.getElementById("gh-include-lockfiles")?.checked;
            const maxFilesRaw = document.getElementById("gh-max-files")?.value;
            const maxFiles = Math.max(1, Math.min(500, parseInt(maxFilesRaw || "200", 10) || 200));
            const includePathsRaw = (
                document.getElementById("gh-include-paths")?.value || ""
            ).trim();
            const excludePathsRaw = (
                document.getElementById("gh-exclude-paths")?.value || ""
            ).trim();
            const ref = (document.getElementById("gh-ref")?.value || "").trim();
            const token = (document.getElementById("gh-token")?.value || "").trim();
            const customHeadersRaw = (
                document.getElementById("gh-custom-headers")?.value || ""
            ).trim();
            const customHeaders = {};
            if (customHeadersRaw) {
                customHeadersRaw.split("\n").forEach((line) => {
                    const idx = line.indexOf(":");
                    if (idx > 0) {
                        const k = line.slice(0, idx).trim();
                        const v = line.slice(idx + 1).trim();
                        if (
                            k &&
                            v &&
                            !/^(content-type|accept|user-agent|authorization)$/i.test(k)
                        ) {
                            customHeaders[k] = v;
                        }
                    }
                });
            }

            const parsed = parseGitHubUrl(url);
            const hasParsed = !!(parsed.owner && parsed.repo);

            const body = {
                repository_url: hasParsed ? null : url,
                include_lockfiles: includeLockfiles,
                return_packages: false,
                max_files: maxFiles,
                include_paths: includePathsRaw
                    ? includePathsRaw
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                    : null,
                exclude_paths: excludePathsRaw
                    ? excludePathsRaw
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                    : null,
                ref: ref || parsed.ref || null,
                owner: parsed.owner || null,
                repo: parsed.repo || null,
            };

            // Remember token in session if requested
            try {
                const remember = !!document.getElementById("gh-remember-token")?.checked;
                if (typeof sessionStorage !== "undefined") {
                    if (remember && token) sessionStorage.setItem("vulnera.gh.token", token);
                    else sessionStorage.removeItem("vulnera.gh.token");
                }
            } catch {}

            if (CONFIG.ENABLE_DEBUG === "true") {
                console.group("[RepoScan] Request");
                console.log("Endpoint:", `${CONFIG.API_ENDPOINT}/analyze/repository`);
                console.log("Body:", body);
                console.groupEnd();
            }

            const res = await fetch(`${CONFIG.API_ENDPOINT}/analyze/repository`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "User-Agent": `${CONFIG.APP_NAME}/${CONFIG.APP_VERSION}`,
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    ...(token ? { "X-GitHub-Token": token } : {}),
                    ...(token ? { "X-GHSA-Token": token } : {}),
                    ...customHeaders,
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            const payload = await res.json().catch(() => ({}));

            if (CONFIG.ENABLE_DEBUG === "true") {
                console.group("[RepoScan] Response");
                console.log("Status:", res.status, res.statusText);
                console.log("Payload:", payload);
                console.groupEnd();
            }

            if (!res.ok) {
                const code = payload?.code || "ERROR";
                const reqId = payload?.request_id ? ` • Request ID: ${payload.request_id}` : "";
                let msg =
                    payload?.message || payload?.error || `Repository scan failed (${res.status})`;
                if (String(msg).toLowerCase().includes("service configuration")) {
                    msg +=
                        " — Tip: Provide a GitHub token in Advanced options or verify backend GitHub integration.";
                }
                throw new Error(`[${code}] ${msg}${reqId}`);
            }

            // Show results using the shared presenter
            if (loadingModal) loadingModal.checked = false;
            presentAnalysisPayload(payload);
            showSuccess("Repository analysis completed.");
        } catch (err) {
            if (loadingModal) loadingModal.checked = false;
            const reason =
                err?.name === "AbortError" ? "Request timed out" : err?.message || "Scan failed";
            showError(reason);
            console.error("GitHub scan error:", err);
        }
    });
}
