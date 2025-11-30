/**
 * Severity Utilities Tests
 * Tests for severity level handling, validation, and styling
 */
import { describe, it, expect } from 'vitest';
import {
    normalizeSeverity,
    getSeverityClasses,
    getSeverityTextColor,
    compareSeverity,
    isValidSeverity,
    SEVERITY_ORDER,
    SEVERITY_COLORS,
    SEVERITY_LEVELS,
    type SeverityLevel,
} from '../severity';

describe('severity utilities', () => {
    describe('normalizeSeverity', () => {
        it('should normalize lowercase to uppercase', () => {
            expect(normalizeSeverity('critical')).toBe('CRITICAL');
            expect(normalizeSeverity('high')).toBe('HIGH');
            expect(normalizeSeverity('medium')).toBe('MEDIUM');
            expect(normalizeSeverity('low')).toBe('LOW');
            expect(normalizeSeverity('info')).toBe('INFO');
        });

        it('should keep uppercase as-is', () => {
            expect(normalizeSeverity('CRITICAL')).toBe('CRITICAL');
            expect(normalizeSeverity('HIGH')).toBe('HIGH');
            expect(normalizeSeverity('MEDIUM')).toBe('MEDIUM');
            expect(normalizeSeverity('LOW')).toBe('LOW');
            expect(normalizeSeverity('INFO')).toBe('INFO');
        });

        it('should handle mixed case', () => {
            expect(normalizeSeverity('Critical')).toBe('CRITICAL');
            expect(normalizeSeverity('HiGh')).toBe('HIGH');
            expect(normalizeSeverity('MeDiUm')).toBe('MEDIUM');
        });

        it('should return INFO for null', () => {
            expect(normalizeSeverity(null)).toBe('INFO');
        });

        it('should return INFO for undefined', () => {
            expect(normalizeSeverity(undefined)).toBe('INFO');
        });

        it('should return INFO for empty string', () => {
            expect(normalizeSeverity('')).toBe('INFO');
        });

        it('should return INFO for unknown severity', () => {
            expect(normalizeSeverity('unknown')).toBe('INFO');
            expect(normalizeSeverity('severe')).toBe('INFO');
            expect(normalizeSeverity('warning')).toBe('INFO');
            expect(normalizeSeverity('error')).toBe('INFO');
        });
    });

    describe('getSeverityClasses', () => {
        it('should return correct classes for CRITICAL', () => {
            expect(getSeverityClasses('CRITICAL')).toBe(SEVERITY_COLORS.CRITICAL);
            expect(getSeverityClasses('CRITICAL')).toContain('red-600');
        });

        it('should return correct classes for HIGH', () => {
            expect(getSeverityClasses('HIGH')).toBe(SEVERITY_COLORS.HIGH);
            expect(getSeverityClasses('HIGH')).toContain('red-500');
        });

        it('should return correct classes for MEDIUM', () => {
            expect(getSeverityClasses('MEDIUM')).toBe(SEVERITY_COLORS.MEDIUM);
            expect(getSeverityClasses('MEDIUM')).toContain('yellow-500');
        });

        it('should return correct classes for LOW', () => {
            expect(getSeverityClasses('LOW')).toBe(SEVERITY_COLORS.LOW);
            expect(getSeverityClasses('LOW')).toContain('cyan-500');
        });

        it('should return correct classes for INFO', () => {
            expect(getSeverityClasses('INFO')).toBe(SEVERITY_COLORS.INFO);
            expect(getSeverityClasses('INFO')).toContain('matrix-500');
        });

        it('should return INFO classes for unknown severity', () => {
            expect(getSeverityClasses('UNKNOWN' as SeverityLevel)).toBe(SEVERITY_COLORS.INFO);
        });
    });

    describe('getSeverityTextColor', () => {
        it('should return text color for uppercase severity', () => {
            expect(getSeverityTextColor('CRITICAL')).toBe('text-red-400');
            expect(getSeverityTextColor('HIGH')).toBe('text-red-300');
            expect(getSeverityTextColor('MEDIUM')).toBe('text-yellow-300');
            expect(getSeverityTextColor('LOW')).toBe('text-matrix-300');
            expect(getSeverityTextColor('INFO')).toBe('text-gray-400');
        });

        it('should return text color for lowercase severity', () => {
            expect(getSeverityTextColor('critical')).toBe('text-red-400');
            expect(getSeverityTextColor('high')).toBe('text-red-300');
            expect(getSeverityTextColor('medium')).toBe('text-yellow-300');
            expect(getSeverityTextColor('low')).toBe('text-matrix-300');
            expect(getSeverityTextColor('info')).toBe('text-gray-400');
        });

        it('should return default gray for unknown severity', () => {
            expect(getSeverityTextColor('unknown')).toBe('text-gray-400');
            expect(getSeverityTextColor('UNKNOWN')).toBe('text-gray-400');
        });
    });

    describe('compareSeverity', () => {
        it('should return negative when first is more severe', () => {
            expect(compareSeverity('CRITICAL', 'HIGH')).toBeLessThan(0);
            expect(compareSeverity('HIGH', 'MEDIUM')).toBeLessThan(0);
            expect(compareSeverity('MEDIUM', 'LOW')).toBeLessThan(0);
            expect(compareSeverity('LOW', 'INFO')).toBeLessThan(0);
        });

        it('should return positive when second is more severe', () => {
            expect(compareSeverity('HIGH', 'CRITICAL')).toBeGreaterThan(0);
            expect(compareSeverity('MEDIUM', 'HIGH')).toBeGreaterThan(0);
            expect(compareSeverity('LOW', 'MEDIUM')).toBeGreaterThan(0);
            expect(compareSeverity('INFO', 'LOW')).toBeGreaterThan(0);
        });

        it('should return zero for equal severities', () => {
            expect(compareSeverity('CRITICAL', 'CRITICAL')).toBe(0);
            expect(compareSeverity('HIGH', 'HIGH')).toBe(0);
            expect(compareSeverity('MEDIUM', 'MEDIUM')).toBe(0);
            expect(compareSeverity('LOW', 'LOW')).toBe(0);
            expect(compareSeverity('INFO', 'INFO')).toBe(0);
        });

        it('should work correctly for sorting arrays', () => {
            const severities: SeverityLevel[] = ['LOW', 'CRITICAL', 'MEDIUM', 'INFO', 'HIGH'];
            const sorted = [...severities].sort(compareSeverity);
            expect(sorted).toEqual(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']);
        });

        it('should correctly compare non-adjacent severities', () => {
            expect(compareSeverity('CRITICAL', 'INFO')).toBeLessThan(0);
            expect(compareSeverity('INFO', 'CRITICAL')).toBeGreaterThan(0);
            expect(compareSeverity('CRITICAL', 'LOW')).toBeLessThan(0);
        });
    });

    describe('isValidSeverity', () => {
        it('should return true for valid uppercase severities', () => {
            expect(isValidSeverity('CRITICAL')).toBe(true);
            expect(isValidSeverity('HIGH')).toBe(true);
            expect(isValidSeverity('MEDIUM')).toBe(true);
            expect(isValidSeverity('LOW')).toBe(true);
            expect(isValidSeverity('INFO')).toBe(true);
        });

        it('should return true for valid lowercase severities', () => {
            expect(isValidSeverity('critical')).toBe(true);
            expect(isValidSeverity('high')).toBe(true);
            expect(isValidSeverity('medium')).toBe(true);
            expect(isValidSeverity('low')).toBe(true);
            expect(isValidSeverity('info')).toBe(true);
        });

        it('should return true for mixed case severities', () => {
            expect(isValidSeverity('Critical')).toBe(true);
            expect(isValidSeverity('HiGh')).toBe(true);
        });

        it('should return false for invalid severities', () => {
            expect(isValidSeverity('unknown')).toBe(false);
            expect(isValidSeverity('warning')).toBe(false);
            expect(isValidSeverity('error')).toBe(false);
            expect(isValidSeverity('severe')).toBe(false);
            expect(isValidSeverity('')).toBe(false);
        });
    });

    describe('SEVERITY_ORDER constant', () => {
        it('should have correct ordering values', () => {
            expect(SEVERITY_ORDER.CRITICAL).toBe(0);
            expect(SEVERITY_ORDER.HIGH).toBe(1);
            expect(SEVERITY_ORDER.MEDIUM).toBe(2);
            expect(SEVERITY_ORDER.LOW).toBe(3);
            expect(SEVERITY_ORDER.INFO).toBe(4);
        });

        it('should have CRITICAL as most severe (lowest number)', () => {
            const minValue = Math.min(...Object.values(SEVERITY_ORDER));
            expect(SEVERITY_ORDER.CRITICAL).toBe(minValue);
        });

        it('should have INFO as least severe (highest number)', () => {
            const maxValue = Math.max(...Object.values(SEVERITY_ORDER));
            expect(SEVERITY_ORDER.INFO).toBe(maxValue);
        });
    });

    describe('SEVERITY_LEVELS constant', () => {
        it('should contain all severity levels in order', () => {
            expect(SEVERITY_LEVELS).toEqual(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']);
        });

        it('should be typed as readonly array', () => {
            // readonly in TypeScript is compile-time only, not runtime
            // The 'as const' assertion makes it readonly at type level
            expect(Array.isArray(SEVERITY_LEVELS)).toBe(true);
        });

        it('should have 5 levels', () => {
            expect(SEVERITY_LEVELS.length).toBe(5);
        });
    });

    describe('SEVERITY_COLORS constant', () => {
        it('should have classes for all severity levels', () => {
            expect(SEVERITY_COLORS.CRITICAL).toBeDefined();
            expect(SEVERITY_COLORS.HIGH).toBeDefined();
            expect(SEVERITY_COLORS.MEDIUM).toBeDefined();
            expect(SEVERITY_COLORS.LOW).toBeDefined();
            expect(SEVERITY_COLORS.INFO).toBeDefined();
        });

        it('should contain TailwindCSS classes', () => {
            // All should contain bg-, text-, and border- classes
            Object.values(SEVERITY_COLORS).forEach(classes => {
                expect(classes).toContain('bg-');
                expect(classes).toContain('text-');
                expect(classes).toContain('border-');
            });
        });
    });
});
