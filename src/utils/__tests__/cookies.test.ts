/**
 * Cookie Utilities Tests
 * Tests for browser cookie management functions
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setCookie, getCookie, removeCookie, hasCookie } from '../cookies';

describe('cookie utilities', () => {
    // Mock document.cookie
    let cookieJar: Record<string, string> = {};

    beforeEach(() => {
        cookieJar = {};

        // Mock document.cookie getter and setter
        Object.defineProperty(document, 'cookie', {
            configurable: true,
            get: () => {
                return Object.entries(cookieJar)
                    .map(([key, value]) => `${key}=${value}`)
                    .join('; ');
            },
            set: (value: string) => {
                const parts = value.split(';');
                const [nameValue] = parts;
                const [name, val] = nameValue.split('=');

                // Check for expires in the past (deletion)
                const expiresPart = parts.find(p => p.trim().startsWith('expires='));
                if (expiresPart) {
                    const expiresDate = new Date(expiresPart.split('=')[1]);
                    if (expiresDate < new Date()) {
                        delete cookieJar[name];
                        return;
                    }
                }

                if (val !== undefined) {
                    cookieJar[name] = val;
                }
            },
        });
    });

    afterEach(() => {
        cookieJar = {};
        vi.restoreAllMocks();
    });

    describe('setCookie', () => {
        it('should set a basic cookie', () => {
            setCookie('test', 'value');
            expect(cookieJar['test']).toBe('value');
        });

        it('should encode special characters in name', () => {
            setCookie('test=cookie', 'value');
            expect(cookieJar['test%3Dcookie']).toBe('value');
        });

        it('should encode special characters in value', () => {
            setCookie('test', 'value=with;special');
            expect(cookieJar['test']).toBe('value%3Dwith%3Bspecial');
        });

        it('should handle unicode characters', () => {
            setCookie('name', '日本語');
            expect(cookieJar['name']).toBe('%E6%97%A5%E6%9C%AC%E8%AA%9E');
        });

        it('should use default options', () => {
            // Just verify it doesn't throw and sets the cookie
            setCookie('default', 'test');
            expect(cookieJar['default']).toBe('test');
        });
    });

    describe('getCookie', () => {
        beforeEach(() => {
            cookieJar = {
                'simple': 'value',
                'encoded': 'hello%20world',
                'test%3Dcookie': 'special',
            };
        });

        it('should get a simple cookie value', () => {
            expect(getCookie('simple')).toBe('value');
        });

        it('should decode encoded values', () => {
            expect(getCookie('encoded')).toBe('hello world');
        });

        it('should return null for non-existent cookie', () => {
            expect(getCookie('nonexistent')).toBeNull();
        });

        it('should handle encoded cookie names', () => {
            expect(getCookie('test=cookie')).toBe('special');
        });

        it('should return null for empty cookie jar', () => {
            cookieJar = {};
            expect(getCookie('anything')).toBeNull();
        });
    });

    describe('removeCookie', () => {
        beforeEach(() => {
            cookieJar = {
                'toRemove': 'value',
                'toKeep': 'important',
            };
        });

        it('should remove a cookie by setting expired date', () => {
            removeCookie('toRemove');
            expect(cookieJar['toRemove']).toBeUndefined();
        });

        it('should not affect other cookies', () => {
            removeCookie('toRemove');
            expect(cookieJar['toKeep']).toBe('important');
        });

        it('should not throw for non-existent cookie', () => {
            expect(() => removeCookie('nonexistent')).not.toThrow();
        });
    });

    describe('hasCookie', () => {
        beforeEach(() => {
            cookieJar = {
                'exists': 'value',
            };
        });

        it('should return true for existing cookie', () => {
            expect(hasCookie('exists')).toBe(true);
        });

        it('should return false for non-existent cookie', () => {
            expect(hasCookie('nonexistent')).toBe(false);
        });

        it('should return false for empty string cookie name', () => {
            expect(hasCookie('')).toBe(false);
        });
    });

    describe('cookie options', () => {
        it('should set cookie with custom days', () => {
            setCookie('session', 'data', { days: 1 });
            expect(cookieJar['session']).toBe('data');
        });

        it('should set cookie with custom path', () => {
            setCookie('pathTest', 'value', { path: '/app' });
            expect(cookieJar['pathTest']).toBe('value');
        });

        it('should set cookie with secure flag', () => {
            setCookie('secureTest', 'value', { secure: true });
            expect(cookieJar['secureTest']).toBe('value');
        });

        it('should set cookie with SameSite Strict', () => {
            setCookie('strictTest', 'value', { sameSite: 'Strict' });
            expect(cookieJar['strictTest']).toBe('value');
        });

        it('should set cookie with SameSite Lax', () => {
            setCookie('laxTest', 'value', { sameSite: 'Lax' });
            expect(cookieJar['laxTest']).toBe('value');
        });

        it('should set cookie with SameSite None', () => {
            setCookie('noneTest', 'value', { sameSite: 'None' });
            expect(cookieJar['noneTest']).toBe('value');
        });

        it('should set cookie with domain', () => {
            setCookie('domainTest', 'value', { domain: 'example.com' });
            expect(cookieJar['domainTest']).toBe('value');
        });

        it('should combine multiple options', () => {
            setCookie('combined', 'value', {
                days: 30,
                path: '/api',
                secure: true,
                sameSite: 'Strict',
            });
            expect(cookieJar['combined']).toBe('value');
        });
    });

    describe('edge cases', () => {
        it('should handle cookies with empty values', () => {
            setCookie('empty', '');
            expect(cookieJar['empty']).toBe('');
            expect(getCookie('empty')).toBe('');
        });

        it('should handle cookies with special characters', () => {
            setCookie('special', '!@#$%^&*()');
            expect(getCookie('special')).toBe('!@#$%^&*()');
        });

        it('should handle very long cookie values', () => {
            const longValue = 'a'.repeat(4000);
            setCookie('long', longValue);
            expect(getCookie('long')).toBe(longValue);
        });

        it('should handle multiple get/set cycles', () => {
            setCookie('cycle', 'first');
            expect(getCookie('cycle')).toBe('first');

            setCookie('cycle', 'second');
            expect(getCookie('cycle')).toBe('second');

            removeCookie('cycle');
            expect(getCookie('cycle')).toBeNull();
        });
    });
});
