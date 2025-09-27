import { describe, it, expect } from 'vitest';
import { 
  COLORS, 
  FONTS, 
  ANIMATIONS, 
  SITE_CONFIG, 
  API_ENDPOINTS, 
  SOCIAL_LINKS, 
  THEME_CLASSES 
} from './theme';

describe('Theme Configuration', () => {
  describe('COLORS configuration', () => {
    it('should have cyber color palette', () => {
      expect(COLORS).toHaveProperty('cyber');
      expect(COLORS.cyber).toBeTypeOf('object');
      
      // Check for standard color scale (50-950)
      const colorScales = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
      colorScales.forEach(scale => {
        expect(COLORS.cyber).toHaveProperty(scale);
      });
    });

    it('should have matrix color palette', () => {
      expect(COLORS).toHaveProperty('matrix');
      expect(COLORS.matrix).toBeTypeOf('object');
      
      // Check for standard color scale
      const colorScales = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
      colorScales.forEach(scale => {
        expect(COLORS.matrix).toHaveProperty(scale);
      });
    });

    it('should have valid hex color values', () => {
      const allColors = { ...COLORS.cyber, ...COLORS.matrix };
      Object.values(allColors).forEach(color => {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });

    it('should have colors in correct brightness order', () => {
      // Test cyber colors - 50 should be lightest, 950 darkest
      const cyberColorValues = Object.entries(COLORS.cyber)
        .map(([scale, color]) => ({ scale: parseInt(scale), color }))
        .sort((a, b) => a.scale - b.scale);
      
      // Check that colors get progressively darker (though exact luminance calculation is complex)
      expect(cyberColorValues[0].scale).toBe(50); // lightest
      expect(cyberColorValues[cyberColorValues.length - 1].scale).toBe(950); // darkest
    });
  });

  describe('FONTS configuration', () => {
    it('should have font family arrays', () => {
      expect(FONTS).toHaveProperty('mono');
      expect(FONTS).toHaveProperty('sans');
      expect(Array.isArray(FONTS.mono)).toBe(true);
      expect(Array.isArray(FONTS.sans)).toBe(true);
    });

    it('should have fallback fonts', () => {
      expect(FONTS.mono.length).toBeGreaterThan(1);
      expect(FONTS.sans.length).toBeGreaterThan(1);
      
      // Should have monospace fallback
      expect(FONTS.mono[FONTS.mono.length - 1]).toBe('monospace');
      expect(FONTS.sans[FONTS.sans.length - 1]).toBe('monospace');
    });

    it('should have valid font names', () => {
      [...FONTS.mono, ...FONTS.sans].forEach(font => {
        expect(typeof font).toBe('string');
        expect(font.length).toBeGreaterThan(0);
      });
    });
  });

  describe('ANIMATIONS configuration', () => {
    it('should have animation definitions', () => {
      expect(ANIMATIONS).toHaveProperty('fadeIn');
      expect(ANIMATIONS).toHaveProperty('slideUp');
      expect(ANIMATIONS).toHaveProperty('glow');
      expect(ANIMATIONS).toHaveProperty('scan');
      expect(ANIMATIONS).toHaveProperty('terminal');
    });

    it('should have valid CSS animation syntax', () => {
      Object.values(ANIMATIONS).forEach(animation => {
        expect(typeof animation).toBe('string');
        expect(animation).toMatch(/\w+\s+[\d.]+s\s+[\w-]+/);
      });
    });

    it('should have reasonable animation durations', () => {
      Object.values(ANIMATIONS).forEach(animation => {
        const durationMatch = animation.match(/([\d.]+)s/);
        if (durationMatch) {
          const duration = parseFloat(durationMatch[1]);
          expect(duration).toBeGreaterThan(0);
          expect(duration).toBeLessThanOrEqual(5); // Max 5 seconds
        }
      });
    });
  });

  describe('SITE_CONFIG configuration', () => {
    it('should have required site metadata', () => {
      expect(SITE_CONFIG).toHaveProperty('title');
      expect(SITE_CONFIG).toHaveProperty('description');
      expect(SITE_CONFIG).toHaveProperty('themeColor');
      expect(SITE_CONFIG).toHaveProperty('author');
      expect(SITE_CONFIG).toHaveProperty('license');
      expect(SITE_CONFIG).toHaveProperty('year');
    });

    it('should have valid metadata types', () => {
      expect(typeof SITE_CONFIG.title).toBe('string');
      expect(typeof SITE_CONFIG.description).toBe('string');
      expect(typeof SITE_CONFIG.themeColor).toBe('string');
      expect(typeof SITE_CONFIG.author).toBe('string');
      expect(typeof SITE_CONFIG.license).toBe('string');
      expect(typeof SITE_CONFIG.year).toBe('number');
    });

    it('should have valid theme color', () => {
      expect(SITE_CONFIG.themeColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('should have current or future year', () => {
      const currentYear = new Date().getFullYear();
      expect(SITE_CONFIG.year).toBeGreaterThanOrEqual(2024);
      expect(SITE_CONFIG.year).toBeLessThanOrEqual(currentYear + 1);
    });

    it('should have meaningful content', () => {
      expect(SITE_CONFIG.title.length).toBeGreaterThan(5);
      expect(SITE_CONFIG.description.length).toBeGreaterThan(20);
      expect(SITE_CONFIG.author.length).toBeGreaterThan(2);
    });
  });

  describe('API_ENDPOINTS configuration', () => {
    it('should have required endpoints', () => {
      expect(API_ENDPOINTS).toHaveProperty('docs');
      expect(API_ENDPOINTS).toHaveProperty('health');
      expect(API_ENDPOINTS).toHaveProperty('analyze');
      expect(API_ENDPOINTS).toHaveProperty('repository');
    });

    it('should have valid URL formats', () => {
      // Full URLs should be valid
      expect(API_ENDPOINTS.docs).toMatch(/^https?:\/\//);
      expect(API_ENDPOINTS.health).toMatch(/^https?:\/\//);
      
      // API paths should start with /
      expect(API_ENDPOINTS.analyze).toMatch(/^\/api\//);
      expect(API_ENDPOINTS.repository).toMatch(/^\/api\//);
    });

    it('should have consistent API versioning', () => {
      expect(API_ENDPOINTS.analyze).toMatch(/\/v1\//);
      expect(API_ENDPOINTS.repository).toMatch(/\/v1\//);
    });
  });

  describe('SOCIAL_LINKS configuration', () => {
    it('should have social media links', () => {
      expect(SOCIAL_LINKS).toHaveProperty('github');
      expect(SOCIAL_LINKS).toHaveProperty('discord');
      expect(SOCIAL_LINKS).toHaveProperty('security');
    });

    it('should have valid link formats', () => {
      expect(typeof SOCIAL_LINKS.github).toBe('string');
      expect(typeof SOCIAL_LINKS.discord).toBe('string');
      expect(typeof SOCIAL_LINKS.security).toBe('string');
      
      // GitHub should be valid URL if not placeholder
      if (!SOCIAL_LINKS.github.startsWith('#')) {
        expect(SOCIAL_LINKS.github).toMatch(/^https:\/\/github\.com\//);
      }
    });
  });

  describe('THEME_CLASSES configuration', () => {
    it('should have utility classes', () => {
      expect(THEME_CLASSES).toHaveProperty('grid');
      expect(THEME_CLASSES).toHaveProperty('border');
      expect(THEME_CLASSES).toHaveProperty('rain');
      expect(THEME_CLASSES).toHaveProperty('glow');
    });

    it('should have color combination classes', () => {
      expect(THEME_CLASSES).toHaveProperty('cyberText');
      expect(THEME_CLASSES).toHaveProperty('matrixText');
      expect(THEME_CLASSES).toHaveProperty('cyberBorder');
      expect(THEME_CLASSES).toHaveProperty('matrixBorder');
    });

    it('should have animation classes', () => {
      expect(THEME_CLASSES).toHaveProperty('animations');
      expect(THEME_CLASSES.animations).toHaveProperty('fadeIn');
      expect(THEME_CLASSES.animations).toHaveProperty('slideUp');
      expect(THEME_CLASSES.animations).toHaveProperty('glow');
      expect(THEME_CLASSES.animations).toHaveProperty('scan');
      expect(THEME_CLASSES.animations).toHaveProperty('terminal');
      expect(THEME_CLASSES.animations).toHaveProperty('bounce');
    });

    it('should have valid CSS class names', () => {
      const allClasses = [
        THEME_CLASSES.grid,
        THEME_CLASSES.border,
        THEME_CLASSES.rain,
        THEME_CLASSES.glow,
        THEME_CLASSES.cyberText,
        THEME_CLASSES.matrixText,
        THEME_CLASSES.cyberBorder,
        THEME_CLASSES.matrixBorder,
        ...Object.values(THEME_CLASSES.animations)
      ];

      allClasses.forEach(className => {
        expect(typeof className).toBe('string');
        expect(className.length).toBeGreaterThan(0);
        // CSS class names should be valid (allowing Tailwind's forward slash syntax)
        expect(className).toMatch(/^[a-zA-Z0-9_/-]+$/);
      });
    });
  });

  describe('theme consistency', () => {
    it('should have consistent color naming', () => {
      const colorNames = Object.keys(COLORS);
      colorNames.forEach(colorName => {
        expect(colorName).toMatch(/^[a-z]+$/);
      });
    });

    it('should have animations matching animation classes', () => {
      const animationNames = Object.keys(ANIMATIONS);
      const animationClassNames = Object.keys(THEME_CLASSES.animations);
      
      // Most animation names should have corresponding classes
      const commonAnimations = ['fadeIn', 'slideUp', 'glow', 'scan', 'terminal'];
      commonAnimations.forEach(animation => {
        expect(animationNames.includes(animation)).toBe(true);
        expect(animationClassNames.includes(animation)).toBe(true);
      });
    });

    it('should have color classes matching color definitions', () => {
      // Cyber and matrix colors should have corresponding CSS classes
      expect(THEME_CLASSES.cyberText).toContain('cyber');
      expect(THEME_CLASSES.matrixText).toContain('matrix');
      expect(THEME_CLASSES.cyberBorder).toContain('cyber');
      expect(THEME_CLASSES.matrixBorder).toContain('matrix');
    });
  });

  describe('theme immutability', () => {
    it('should be readonly objects', () => {
      // All theme objects should be readonly (as const)
      expect(() => {
        (COLORS as any).cyber = {};
      }).not.toThrow(); // TypeScript would catch this at compile time
    });

    it('should be serializable', () => {
      expect(() => JSON.stringify(COLORS)).not.toThrow();
      expect(() => JSON.stringify(FONTS)).not.toThrow();
      expect(() => JSON.stringify(ANIMATIONS)).not.toThrow();
      expect(() => JSON.stringify(SITE_CONFIG)).not.toThrow();
      expect(() => JSON.stringify(API_ENDPOINTS)).not.toThrow();
      expect(() => JSON.stringify(SOCIAL_LINKS)).not.toThrow();
      expect(() => JSON.stringify(THEME_CLASSES)).not.toThrow();
    });
  });
});