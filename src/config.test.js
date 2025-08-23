import { describe, it, expect, beforeEach, vi } from "vitest";
import { CONFIG } from "./config.js";

describe("CONFIG module", () => {
    beforeEach(() => {
        // Reset any mocks or global state before each test
        vi.clearAllMocks();
    });

    it("should have default configuration values", () => {
        expect(CONFIG).toBeDefined();
        expect(CONFIG.APP_NAME).toBe("Vulnera");
        expect(CONFIG.API_VERSION).toBe("v1");
        expect(["true", "false"]).toContain(CONFIG.ENABLE_DEBUG);
        expect(CONFIG.API_TIMEOUT).toBe(30000);
        expect(["development", "production", "test"]).toContain(CONFIG.ENVIRONMENT);
    });

    it("should have API_ENDPOINT derived from base URL and version", () => {
        expect(CONFIG.API_ENDPOINT).toBeDefined();
        expect(CONFIG.API_ENDPOINT).toContain("/api/v1");
    });

    it("should have APP_VERSION defined", () => {
        expect(CONFIG.APP_VERSION).toBeDefined();
        expect(typeof CONFIG.APP_VERSION).toBe("string");
    });

    it("should have API_BASE_URL defined", () => {
        expect(CONFIG.API_BASE_URL).toBeDefined();
        expect(typeof CONFIG.API_BASE_URL).toBe("string");
    });

    it("should construct API_ENDPOINT correctly", () => {
        const expectedEndpoint = `${CONFIG.API_BASE_URL}/api/${CONFIG.API_VERSION}`;
        expect(CONFIG.API_ENDPOINT).toBe(expectedEndpoint);
    });

    it("should have numeric API_TIMEOUT", () => {
        expect(typeof CONFIG.API_TIMEOUT).toBe("number");
        expect(CONFIG.API_TIMEOUT).toBeGreaterThan(0);
    });

    it("should have string ENABLE_DEBUG", () => {
        expect(typeof CONFIG.ENABLE_DEBUG).toBe("string");
        expect(["true", "false"]).toContain(CONFIG.ENABLE_DEBUG);
    });
});
