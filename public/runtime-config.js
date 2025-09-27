/**
 * Runtime Configuration Helper for Vulnera Frontend
 *
 * This script allows configuring the Vulnera frontend at runtime
 * without rebuilding. Useful for Docker containers, CDN deployments,
 * or when you need to change configuration after build.
 *
        /**
         * Load configuration from a JSON endpoint
         * @param {string} configUrl - URL to fetch configuration from
         * @returns {Promise} Promise that resolves when config is loaded
         */
        loadFromUrl: function (configUrl) {
            // Disabled network fetch in frontend-only mode. To configure at
            // runtime, call VulneraRuntimeConfig.setConfig({...}) directly.
            console.warn('runtime-config.loadFromUrl is disabled in frontend-only mode:', configUrl);
            return Promise.reject(new Error('loadFromUrl disabled in frontend-only mode'));
        },
         * @param {boolean} config.enableDebug - Enable debug mode
         * @param {number} config.apiTimeout - API timeout in milliseconds
         * @param {string} config.environment - Environment name
         */
        setConfig: function (config) {
            if (config.apiBaseUrl) {
                window.VULNERA_API_BASE_URL = config.apiBaseUrl;
            }
            if (config.apiVersion) {
                window.VULNERA_API_VERSION = config.apiVersion;
            }
            if (config.appName) {
                window.VULNERA_APP_NAME = config.appName;
            }
            if (config.appVersion) {
                window.VULNERA_APP_VERSION = config.appVersion;
            }
            if (config.enableDebug !== undefined) {
                window.VULNERA_ENABLE_DEBUG = String(config.enableDebug);
            }
            // Minimal runtime configuration helper for frontend-only mode.
            // Keeps the public API (setConfig/getConfig/autoDetect/useExample)
            // but disables network fetches to avoid backend calls.
            (function () {
              "use strict";

              window.VulneraRuntimeConfig = {
                setConfig: function (config) {
                  if (config.apiBaseUrl) window.VULNERA_API_BASE_URL = config.apiBaseUrl;
                  if (config.apiVersion) window.VULNERA_API_VERSION = config.apiVersion;
                  if (config.appName) window.VULNERA_APP_NAME = config.appName;
                  if (config.appVersion) window.VULNERA_APP_VERSION = config.appVersion;
                  if (config.enableDebug !== undefined) window.VULNERA_ENABLE_DEBUG = String(config.enableDebug);
                  if (config.apiTimeout) window.VULNERA_API_TIMEOUT = String(config.apiTimeout);
                  if (config.environment) window.VULNERA_ENVIRONMENT = config.environment;
                  if (config.allowedOrigins !== undefined)
                    window.VULNERA_ALLOWED_ORIGINS = Array.isArray(config.allowedOrigins)
                      ? config.allowedOrigins.join(", ")
                      : String(config.allowedOrigins);
                  if (window.VULNERA_ENABLE_DEBUG === "true") {
                    console.log("✅ Vulnera runtime configuration updated:", this.getConfig());
                  }
                },

                getConfig: function () {
                  return {
                    apiBaseUrl: window.VULNERA_API_BASE_URL,
                    apiVersion: window.VULNERA_API_VERSION,
                    appName: window.VULNERA_APP_NAME,
                    appVersion: window.VULNERA_APP_VERSION,
                    enableDebug: window.VULNERA_ENABLE_DEBUG,
                    apiTimeout: window.VULNERA_API_TIMEOUT,
                    environment: window.VULNERA_ENVIRONMENT,
                    allowedOrigins: window.VULNERA_ALLOWED_ORIGINS,
                  };
                },

                // Disabled: avoid network fetches in frontend-only mode
                loadFromUrl: function (configUrl) {
                  console.warn('runtime-config.loadFromUrl is disabled in frontend-only mode:', configUrl);
                  return Promise.reject(new Error('loadFromUrl disabled in frontend-only mode'));
                },

                autoDetectConfig: function () {
                  const hostname = window.location.hostname;
                  const protocol = window.location.protocol;
                  let config = {};
                  if (hostname === 'localhost' || hostname === '127.0.0.1') {
                    config = { apiBaseUrl: 'http://localhost:3000', appName: 'Vulnera Dev', enableDebug: true, environment: 'development' };
                  } else if (hostname.includes('staging') || hostname.includes('dev')) {
                    config = { apiBaseUrl: protocol + '//' + hostname.replace(/^(staging|dev)\.?/, '') + ':3000', appName: 'Vulnera Staging', enableDebug: true, environment: 'staging' };
                  } else {
                    config = { apiBaseUrl: protocol + '//api.' + hostname, appName: 'Vulnera', enableDebug: false, environment: 'production' };
                  }
                  this.setConfig(config);
                  return config;
                },
              };

              window.VulneraRuntimeConfig.examples = {
                development: { apiBaseUrl: 'http://localhost:3000', apiVersion: 'v1', appName: 'Vulnera Dev', enableDebug: true, apiTimeout: 30000, environment: 'development' },
                staging: { apiBaseUrl: 'https://vulnera-back.politeisland-d68133bc.switzerlandnorth.azurecontainerapps.io', apiVersion: 'v1', appName: 'Vulnera Staging', enableDebug: true, apiTimeout: 60000, environment: 'staging' },
                production: { apiBaseUrl: 'https://api.vulnera.dev', apiVersion: 'v1', appName: 'Vulnera', enableDebug: false, apiTimeout: 60000, environment: 'production' },
                network: function (ip) { return { apiBaseUrl: 'http://' + ip + ':3000', apiVersion: 'v1', appName: 'Vulnera Network', enableDebug: true, apiTimeout: 30000, environment: 'development' }; },
              };

              window.VulneraRuntimeConfig.useExample = function (exampleName) {
                const example = this.examples[exampleName];
                if (example) { this.setConfig(example); return example; }
                console.error('❌ Unknown example configuration:', exampleName);
                return null;
              };

              if (window.VULNERA_ENABLE_DEBUG === 'true') {
                console.log('🔧 Vulnera Runtime Configuration Helper loaded');
              }
            })();
                    environment: "development",
