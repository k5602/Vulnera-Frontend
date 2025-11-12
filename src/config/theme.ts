// Vulnera Theme Configuration
// This file contains all the theme constants and configurations used across the project

export const COLORS = {
  cyber: {
    50: '#f0ffff',
    100: '#ccfffe', 
    200: '#99fffc',
    300: '#5cfffa',
    400: '#1affef',
    500: '#00e5d1',
    600: '#00b8a6',
    700: '#009688',
    800: '#00766a',
    900: '#004d40',
    950: '#002e26',
  },
  matrix: {
    50: '#f0fff4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  }
} as const;

export const FONTS = {
  mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
  sans: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
} as const;

export const ANIMATIONS = {
  fadeIn: 'fadeIn 0.8s ease-in-out',
  slideUp: 'slideUp 0.6s ease-out', 
  glow: 'glow 2s ease-in-out infinite alternate',
  scan: 'scan 3s linear infinite',
  terminal: 'terminal 1s ease-in-out infinite',
} as const;

export const SITE_CONFIG = {
  title: 'Vulnera — High‑Performance Vulnerability Analysis API',
  description: 'Vulnera is a fast, scalable vulnerability analysis API in Rust. Multi‑ecosystem support, aggregated OSV/NVD/GHSA advisories, async concurrency, OpenAPI docs, and smart caching.',
  themeColor: '#0a0a0a',
  author: 'Vulnera Project',
  license: 'AGPL-3.0',
  year: 2025,
} as const;


export const SOCIAL_LINKS = {
  github: 'https://github.com/k5602/Vulnera',
  discord: '#',
  security: '#',
} as const;

// CSS utility class names for consistent theming
export const THEME_CLASSES = {
  grid: 'cyber-grid',
  border: 'terminal-border', 
  rain: 'matrix-rain',
  glow: 'glow',
  
  // Common color combinations
  cyberText: 'text-cyber-400',
  matrixText: 'text-matrix-400', 
  cyberBorder: 'border-cyber-500/30',
  matrixBorder: 'border-matrix-500/30',
  
  // Animation classes
  animations: {
    fadeIn: 'animate-fade-in',
    slideUp: 'animate-slide-up',
    glow: 'animate-glow',
    scan: 'animate-scan',
    terminal: 'animate-terminal',
    bounce: 'animate-bounce',
  }
} as const;
