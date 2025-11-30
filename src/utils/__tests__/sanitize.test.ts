/**
 * Sanitize Utilities Tests
 * Tests for XSS prevention and input sanitization functions
 */
import { describe, it, expect } from 'vitest';
import {
    escapeHtml,
    safeEmail,
    safePassword,
    safeSeverity,
    sanitizeMessage,
    safeString,
} from '../sanitize';

describe('sanitize utilities', () => {
    describe('escapeHtml', () => {
        it('should escape ampersand', () => {
            expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
        });

        it('should escape less than', () => {
            expect(escapeHtml('a < b')).toBe('a &lt; b');
        });

        it('should escape greater than', () => {
            expect(escapeHtml('a > b')).toBe('a &gt; b');
        });

        it('should escape double quotes', () => {
            expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
        });

        it('should escape single quotes', () => {
            expect(escapeHtml("it's")).toBe('it&#039;s');
        });

        it('should escape forward slashes', () => {
            expect(escapeHtml('path/to/file')).toBe('path&#x2F;to&#x2F;file');
        });

        it('should escape all special characters together', () => {
            const input = '<script>alert("XSS & \'injection\'")</script>';
            const expected = '&lt;script&gt;alert(&quot;XSS &amp; &#039;injection&#039;&quot;)&lt;&#x2F;script&gt;';
            expect(escapeHtml(input)).toBe(expected);
        });

        it('should handle empty string', () => {
            expect(escapeHtml('')).toBe('');
        });

        it('should convert non-string to string', () => {
            expect(escapeHtml(123 as unknown as string)).toBe('123');
        });

        it('should handle string with no special characters', () => {
            expect(escapeHtml('hello world')).toBe('hello world');
        });
    });

    describe('safeEmail', () => {
        it('should accept valid email', () => {
            expect(safeEmail('user@example.com')).toBe('user@example.com');
        });

        it('should trim whitespace', () => {
            expect(safeEmail('  user@example.com  ')).toBe('user@example.com');
        });

        it('should convert to lowercase', () => {
            expect(safeEmail('USER@EXAMPLE.COM')).toBe('user@example.com');
        });

        it('should truncate to 254 characters', () => {
            const longLocal = 'a'.repeat(250);
            const email = `${longLocal}@example.com`;
            const result = safeEmail(email);
            expect(result.length).toBeLessThanOrEqual(254);
        });

        it('should throw error for invalid email - no @', () => {
            expect(() => safeEmail('invalid')).toThrow('Invalid email');
        });

        it('should throw error for invalid email - no domain', () => {
            expect(() => safeEmail('user@')).toThrow('Invalid email');
        });

        it('should throw error for invalid email - no local part', () => {
            expect(() => safeEmail('@example.com')).toThrow('Invalid email');
        });

        it('should throw error for empty string', () => {
            expect(() => safeEmail('')).toThrow('Invalid email');
        });

        it('should throw error for whitespace only', () => {
            expect(() => safeEmail('   ')).toThrow('Invalid email');
        });

        it('should handle null/undefined input', () => {
            expect(() => safeEmail(null as unknown as string)).toThrow('Invalid email');
            expect(() => safeEmail(undefined as unknown as string)).toThrow('Invalid email');
        });
    });

    describe('safePassword', () => {
        it('should accept valid password (8+ characters)', () => {
            expect(safePassword('password123')).toBe('password123');
        });

        it('should throw error for password shorter than 8 characters', () => {
            expect(() => safePassword('short')).toThrow('Invalid password');
        });

        it('should throw error for exactly 7 characters', () => {
            expect(() => safePassword('1234567')).toThrow('Invalid password');
        });

        it('should accept exactly 8 characters', () => {
            expect(safePassword('12345678')).toBe('12345678');
        });

        it('should truncate to 1024 characters', () => {
            const longPassword = 'a'.repeat(2000);
            const result = safePassword(longPassword);
            expect(result.length).toBe(1024);
        });

        it('should handle null/undefined input', () => {
            expect(() => safePassword(null as unknown as string)).toThrow('Invalid password');
            expect(() => safePassword(undefined as unknown as string)).toThrow('Invalid password');
        });
    });

    describe('safeSeverity', () => {
        it('should accept critical', () => {
            expect(safeSeverity('critical')).toBe('critical');
        });

        it('should accept high', () => {
            expect(safeSeverity('high')).toBe('high');
        });

        it('should accept medium', () => {
            expect(safeSeverity('medium')).toBe('medium');
        });

        it('should accept low', () => {
            expect(safeSeverity('low')).toBe('low');
        });

        it('should convert to lowercase', () => {
            expect(safeSeverity('CRITICAL')).toBe('critical');
            expect(safeSeverity('HIGH')).toBe('high');
        });

        it('should return unknown for invalid severity', () => {
            expect(safeSeverity('invalid')).toBe('unknown');
            expect(safeSeverity('severe')).toBe('unknown');
        });

        it('should return unknown for null/undefined', () => {
            expect(safeSeverity(null)).toBe('unknown');
            expect(safeSeverity(undefined)).toBe('unknown');
        });

        it('should return unknown for empty string', () => {
            expect(safeSeverity('')).toBe('unknown');
        });

        it('should handle numeric input', () => {
            expect(safeSeverity(123)).toBe('unknown');
        });
    });

    describe('sanitizeMessage', () => {
        it('should escape HTML in message', () => {
            expect(sanitizeMessage('<script>alert("XSS")</script>')).toBe(
                '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;'
            );
        });

        it('should handle null/undefined', () => {
            expect(sanitizeMessage(null)).toBe('');
            expect(sanitizeMessage(undefined)).toBe('');
        });

        it('should convert objects to string', () => {
            expect(sanitizeMessage({ key: 'value' })).toBe('[object Object]');
        });

        it('should handle numbers', () => {
            expect(sanitizeMessage(123)).toBe('123');
        });

        it('should handle boolean', () => {
            expect(sanitizeMessage(true)).toBe('true');
            expect(sanitizeMessage(false)).toBe('false');
        });
    });

    describe('safeString', () => {
        it('should trim and escape string', () => {
            expect(safeString('  <hello>  ')).toBe('&lt;hello&gt;');
        });

        it('should truncate to default max (512)', () => {
            const longString = 'a'.repeat(1000);
            const result = safeString(longString);
            expect(result.length).toBe(512);
        });

        it('should truncate to custom max', () => {
            const longString = 'a'.repeat(100);
            const result = safeString(longString, 50);
            expect(result.length).toBe(50);
        });

        it('should handle null/undefined', () => {
            expect(safeString(null)).toBe('');
            expect(safeString(undefined)).toBe('');
        });

        it('should escape HTML after trimming', () => {
            expect(safeString('  <script>  ')).toBe('&lt;script&gt;');
        });

        it('should truncate after escaping', () => {
            // '<' becomes '&lt;' (4 chars), so escaping changes length
            const input = '<'.repeat(200);
            const result = safeString(input, 20);
            expect(result.length).toBe(20);
        });
    });
});
