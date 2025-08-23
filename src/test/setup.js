// Test setup file for Vitest
import { vi } from 'vitest';

// Mock global objects that might be used in the application
global.window = {
  location: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000'
  },
  VulneraRuntimeConfig: {
    setConfig: vi.fn(),
    useExample: vi.fn()
  }
};

global.document = {
  getElementById: vi.fn(),
  createElement: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

// Mock fetch globally
global.fetch = vi.fn();

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};
