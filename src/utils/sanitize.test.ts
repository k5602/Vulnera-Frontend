import { describe, it, expect, beforeEach } from 'vitest';
import { 
  escapeHtml, 
  safeEmail, 
  safePassword, 
  safeSeverity, 
  sanitizeMessage, 
  safeString 
} from './sanitize';

describe('Sanitize Utilities', () => {
  beforeEach(() => {
    // Setup for each test
  });

  describe('escapeHtml function', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("xss")</script>';
      const result = escapeHtml(input);
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    it('should escape ampersands', () => {
      const input = 'Tom & Jerry';
      const result = escapeHtml(input);
      expect(result).toBe('Tom &amp; Jerry');
    });

    it('should escape quotes', () => {
      const input = 'Say "hello" and \'goodbye\'';
      const result = escapeHtml(input);
      expect(result).toBe('Say &quot;hello&quot; and &#039;goodbye&#039;');
    });

    it('should handle empty strings', () => {
      const result = escapeHtml('');
      expect(result).toBe('');
    });

    it('should handle plain text', () => {
      const input = 'This is just plain text';
      const result = escapeHtml(input);
      expect(result).toBe(input);
    });
  });

  describe('safeEmail function', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org'
      ];
      
      validEmails.forEach(email => {
        expect(() => safeEmail(email)).not.toThrow();
        expect(safeEmail(email)).toBe(email.toLowerCase());
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user@.com',
        'user space@example.com'
      ];
      
      invalidEmails.forEach(email => {
        expect(() => safeEmail(email)).toThrow('Invalid email');
      });
    });

    it('should trim and lowercase emails', () => {
      const result = safeEmail('  TEST@EXAMPLE.COM  ');
      expect(result).toBe('test@example.com');
    });

    it('should limit email length to 254 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = safeEmail(longEmail);
      expect(result.length).toBe(254);
    });

    it('should handle null and undefined', () => {
      expect(() => safeEmail(null as any)).toThrow('Invalid email');
      expect(() => safeEmail(undefined as any)).toThrow('Invalid email');
    });
  });

  describe('safePassword function', () => {
    it('should accept valid passwords', () => {
      const validPasswords = [
        'password123',
        'verylongpasswordwithmanycharacters',
        'P@ssw0rd!'
      ];
      
      validPasswords.forEach(password => {
        expect(() => safePassword(password)).not.toThrow();
        expect(safePassword(password)).toBe(password);
      });
    });

    it('should reject short passwords', () => {
      const shortPasswords = [
        '',
        '123',
        'short'
      ];
      
      shortPasswords.forEach(password => {
        expect(() => safePassword(password)).toThrow('Invalid password');
      });
    });

    it('should limit password length to 1024 characters', () => {
      const longPassword = 'a'.repeat(2000);
      const result = safePassword(longPassword);
      expect(result.length).toBe(1024);
    });

    it('should handle null and undefined', () => {
      expect(() => safePassword(null as any)).toThrow('Invalid password');
      expect(() => safePassword(undefined as any)).toThrow('Invalid password');
    });
  });

  describe('safeSeverity function', () => {
    it('should accept valid severity levels', () => {
      const validSeverities = ['critical', 'high', 'medium', 'low'];
      
      validSeverities.forEach(severity => {
        expect(safeSeverity(severity)).toBe(severity);
      });
    });

    it('should handle case insensitive input', () => {
      expect(safeSeverity('CRITICAL')).toBe('critical');
      expect(safeSeverity('High')).toBe('high');
      expect(safeSeverity('MEDIUM')).toBe('medium');
    });

    it('should return "unknown" for invalid severities', () => {
      const invalidSeverities = ['invalid', 'extreme', '', 123, null, undefined];
      
      invalidSeverities.forEach(severity => {
        expect(safeSeverity(severity)).toBe('unknown');
      });
    });
  });

  describe('sanitizeMessage function', () => {
    it('should escape HTML in messages', () => {
      const input = '<script>alert("xss")</script>Message';
      const result = sanitizeMessage(input);
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;Message');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeMessage(null)).toBe('null');
      expect(sanitizeMessage(undefined)).toBe('undefined');
    });

    it('should handle numbers and objects', () => {
      expect(sanitizeMessage(123)).toBe('123');
      expect(sanitizeMessage({ test: 'value' })).toBe('[object Object]');
    });
  });

  describe('safeString function', () => {
    it('should escape HTML and limit length', () => {
      const input = '<script>alert("xss")</script>';
      const result = safeString(input);
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    it('should trim whitespace', () => {
      const input = '  test string  ';
      const result = safeString(input);
      expect(result).toBe('test string');
    });

    it('should respect custom max length', () => {
      const input = 'a'.repeat(100);
      const result = safeString(input, 10);
      expect(result.length).toBe(10);
      expect(result).toBe('aaaaaaaaaa');
    });

    it('should use default max length of 512', () => {
      const input = 'a'.repeat(1000);
      const result = safeString(input);
      expect(result.length).toBe(512);
    });

    it('should handle null and undefined', () => {
      expect(safeString(null)).toBe('');
      expect(safeString(undefined)).toBe('');
    });

    it('should handle numbers and objects', () => {
      expect(safeString(123)).toBe('123');
      expect(safeString({ test: 'value' })).toBe('[object Object]');
    });

    it('should escape and limit combined', () => {
      const input = '<script>' + 'a'.repeat(600) + '</script>';
      const result = safeString(input, 20);
      expect(result.length).toBe(20);
      expect(result).toContain('&lt;script&gt;');
    });
  });
});