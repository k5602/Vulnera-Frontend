/**
 * Validation Utilities Tests
 * Tests for input validation functions
 */
import { describe, it, expect } from 'vitest';
import {
    validateEmail,
    validatePassword,
    validateLoginCredentials,
    validateFileUpload,
    validateUrl,
    validateRequired,
} from '../validation';

describe('validation utilities', () => {
    describe('validateEmail', () => {
        it('should accept valid email', () => {
            expect(validateEmail('user@example.com')).toBe(true);
        });

        it('should accept email with subdomain', () => {
            expect(validateEmail('user@mail.example.com')).toBe(true);
        });

        it('should accept email with plus sign', () => {
            expect(validateEmail('user+tag@example.com')).toBe(true);
        });

        it('should accept email with dots in local part', () => {
            expect(validateEmail('first.last@example.com')).toBe(true);
        });

        it('should reject email without @', () => {
            expect(validateEmail('invalid')).toBe(false);
        });

        it('should reject email without domain', () => {
            expect(validateEmail('user@')).toBe(false);
        });

        it('should reject email without local part', () => {
            expect(validateEmail('@example.com')).toBe(false);
        });

        it('should reject email with spaces', () => {
            expect(validateEmail('user @example.com')).toBe(false);
        });

        it('should reject empty string', () => {
            expect(validateEmail('')).toBe(false);
        });

        it('should reject email without TLD', () => {
            expect(validateEmail('user@localhost')).toBe(false);
        });
    });

    describe('validatePassword', () => {
        it('should accept strong password', () => {
            const result = validatePassword('Password123');
            expect(result.isStrong).toBe(true);
            expect(result.feedback).toHaveLength(0);
        });

        it('should reject short password', () => {
            const result = validatePassword('Pass1');
            expect(result.isStrong).toBe(false);
            expect(result.feedback).toContain('Password must be at least 8 characters');
        });

        it('should reject password without uppercase', () => {
            const result = validatePassword('password123');
            expect(result.isStrong).toBe(false);
            expect(result.feedback).toContain('Password must contain at least one uppercase letter');
        });

        it('should reject password without lowercase', () => {
            const result = validatePassword('PASSWORD123');
            expect(result.isStrong).toBe(false);
            expect(result.feedback).toContain('Password must contain at least one lowercase letter');
        });

        it('should reject password without number', () => {
            const result = validatePassword('PasswordABC');
            expect(result.isStrong).toBe(false);
            expect(result.feedback).toContain('Password must contain at least one number');
        });

        it('should return multiple feedback items for weak password', () => {
            const result = validatePassword('weak');
            expect(result.isStrong).toBe(false);
            expect(result.feedback.length).toBeGreaterThan(1);
        });

        it('should accept password with special characters', () => {
            const result = validatePassword('Password1!@#');
            expect(result.isStrong).toBe(true);
        });

        it('should accept exactly 8 character password with all requirements', () => {
            const result = validatePassword('Pass123a');
            expect(result.isStrong).toBe(true);
        });
    });

    describe('validateLoginCredentials', () => {
        it('should accept valid credentials', () => {
            const result = validateLoginCredentials('user@example.com', 'password123');
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject empty email', () => {
            const result = validateLoginCredentials('', 'password123');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual({
                field: 'email',
                message: 'Email is required',
            });
        });

        it('should reject whitespace-only email', () => {
            const result = validateLoginCredentials('   ', 'password123');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual({
                field: 'email',
                message: 'Email is required',
            });
        });

        it('should reject invalid email format', () => {
            const result = validateLoginCredentials('invalid', 'password123');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual({
                field: 'email',
                message: 'Invalid email format',
            });
        });

        it('should reject empty password', () => {
            const result = validateLoginCredentials('user@example.com', '');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual({
                field: 'password',
                message: 'Password is required',
            });
        });

        it('should reject short password (less than 6 chars)', () => {
            const result = validateLoginCredentials('user@example.com', 'short');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual({
                field: 'password',
                message: 'Password must be at least 6 characters',
            });
        });

        it('should accept password of exactly 6 characters', () => {
            const result = validateLoginCredentials('user@example.com', '123456');
            expect(result.isValid).toBe(true);
        });

        it('should return multiple errors for multiple invalid fields', () => {
            const result = validateLoginCredentials('invalid', 'short');
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBe(2);
        });
    });

    describe('validateFileUpload', () => {
        const createMockFile = (name: string, type: string, sizeBytes: number): File => {
            const content = new Uint8Array(sizeBytes);
            const blob = new Blob([content], { type });
            return new File([blob], name, { type });
        };

        it('should accept valid JSON file', () => {
            const file = createMockFile('package.json', 'application/json', 1000);
            const result = validateFileUpload(file, ['json']);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should accept valid TXT file', () => {
            const file = createMockFile('readme.txt', 'text/plain', 1000);
            const result = validateFileUpload(file, ['txt']);
            expect(result.isValid).toBe(true);
        });

        it('should reject invalid extension', () => {
            const file = createMockFile('script.exe', 'application/x-msdownload', 1000);
            const result = validateFileUpload(file, ['json', 'txt']);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.message.includes('Invalid file extension'))).toBe(true);
        });

        it('should reject invalid MIME type for known extension', () => {
            // JSON file with wrong MIME type
            const file = createMockFile('data.json', 'text/plain', 1000);
            const result = validateFileUpload(file, ['json']);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.message.includes('Invalid file type'))).toBe(true);
        });

        it('should reject file exceeding size limit', () => {
            const file = createMockFile('large.json', 'application/json', 100 * 1024 * 1024); // 100MB
            const result = validateFileUpload(file, ['json'], 50);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.message.includes('exceeds'))).toBe(true);
        });

        it('should accept file at exactly the size limit', () => {
            const file = createMockFile('exact.json', 'application/json', 50 * 1024 * 1024); // 50MB
            const result = validateFileUpload(file, ['json'], 50);
            expect(result.isValid).toBe(true);
        });

        it('should reject null/undefined file', () => {
            const result = validateFileUpload(null as unknown as File, ['json']);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual({
                field: 'file',
                message: 'File is required',
            });
        });

        it('should handle multiple allowed extensions', () => {
            const jsonFile = createMockFile('data.json', 'application/json', 1000);
            const xmlFile = createMockFile('data.xml', 'application/xml', 1000);

            expect(validateFileUpload(jsonFile, ['json', 'xml', 'txt']).isValid).toBe(true);
            expect(validateFileUpload(xmlFile, ['json', 'xml', 'txt']).isValid).toBe(true);
        });

        it('should use default max size of 50MB', () => {
            const file = createMockFile('large.json', 'application/json', 60 * 1024 * 1024); // 60MB
            const result = validateFileUpload(file, ['json']);
            expect(result.isValid).toBe(false);
        });

        it('should accept lock files', () => {
            const file = createMockFile('package-lock.lock', 'text/plain', 1000);
            const result = validateFileUpload(file, ['lock']);
            expect(result.isValid).toBe(true);
        });

        it('should accept yaml files', () => {
            const file = createMockFile('config.yaml', 'application/x-yaml', 1000);
            const result = validateFileUpload(file, ['yaml']);
            expect(result.isValid).toBe(true);
        });
    });

    describe('validateUrl', () => {
        it('should accept valid HTTP URL', () => {
            expect(validateUrl('http://example.com')).toBe(true);
        });

        it('should accept valid HTTPS URL', () => {
            expect(validateUrl('https://example.com')).toBe(true);
        });

        it('should accept URL with path', () => {
            expect(validateUrl('https://example.com/path/to/resource')).toBe(true);
        });

        it('should accept URL with query string', () => {
            expect(validateUrl('https://example.com?query=value')).toBe(true);
        });

        it('should accept URL with port', () => {
            expect(validateUrl('https://example.com:8080')).toBe(true);
        });

        it('should accept URL with hash', () => {
            expect(validateUrl('https://example.com#section')).toBe(true);
        });

        it('should accept localhost URL', () => {
            expect(validateUrl('http://localhost:3000')).toBe(true);
        });

        it('should reject invalid URL - no protocol', () => {
            expect(validateUrl('example.com')).toBe(false);
        });

        it('should reject invalid URL - invalid characters', () => {
            expect(validateUrl('https://exam ple.com')).toBe(false);
        });

        it('should reject empty string', () => {
            expect(validateUrl('')).toBe(false);
        });

        it('should reject plain text', () => {
            expect(validateUrl('not a url')).toBe(false);
        });

        it('should accept file protocol', () => {
            expect(validateUrl('file:///path/to/file')).toBe(true);
        });
    });

    describe('validateRequired', () => {
        it('should return null for valid string value', () => {
            expect(validateRequired('username', 'john')).toBeNull();
        });

        it('should return null for valid number value', () => {
            expect(validateRequired('age', 25)).toBeNull();
        });

        it('should return null for valid object value', () => {
            expect(validateRequired('data', { key: 'value' })).toBeNull();
        });

        it('should return error for zero (falsy value)', () => {
            // validateRequired treats 0 as a falsy value that needs validation
            const result = validateRequired('count', 0);
            expect(result).toEqual({
                field: 'count',
                message: 'count is required',
            });
        });

        it('should return error for false (falsy value)', () => {
            // validateRequired treats false as a falsy value that needs validation
            const result = validateRequired('active', false);
            expect(result).toEqual({
                field: 'active',
                message: 'active is required',
            });
        }); it('should return error for empty string', () => {
            const result = validateRequired('username', '');
            expect(result).toEqual({
                field: 'username',
                message: 'username is required',
            });
        });

        it('should return error for whitespace-only string', () => {
            const result = validateRequired('username', '   ');
            expect(result).toEqual({
                field: 'username',
                message: 'username is required',
            });
        });

        it('should return error for null', () => {
            const result = validateRequired('email', null);
            expect(result).toEqual({
                field: 'email',
                message: 'email is required',
            });
        });

        it('should return error for undefined', () => {
            const result = validateRequired('password', undefined);
            expect(result).toEqual({
                field: 'password',
                message: 'password is required',
            });
        });
    });
});
