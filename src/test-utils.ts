import { vi } from 'vitest';

// Mock API response builder
export function createMockAuthResponse(overrides?: Partial<any>) {
  return {
    csrf: 'mock-csrf-token-12345',
    user: {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      roles: ['user'],
    },
    ...overrides,
  };
}

export function createMockErrorResponse(message = 'Request failed', overrides?: Partial<any>) {
  return {
    message,
    error: true,
    ...overrides,
  };
}

// Mock fetch helper
export function mockFetch(responseData: any, options: { status?: number; headers?: Record<string, string> } = {}) {
  const { status = 200, headers = {} } = options;

  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      headers: new Map(Object.entries(headers)),
      text: () => Promise.resolve(JSON.stringify(responseData)),
      json: () => Promise.resolve(responseData),
    } as any)
  );
}

export function mockFetchError(error: string) {
  global.fetch = vi.fn(() => Promise.reject(new Error(error)));
}

// Get last fetch call arguments
export function getLastFetchCall() {
  if (!global.fetch) return null;
  const calls = (global.fetch as any).mock?.calls;
  if (!calls || calls.length === 0) return null;
  return calls[calls.length - 1];
}

// Get fetch call count
export function getFetchCallCount() {
  if (!global.fetch) return 0;
  return (global.fetch as any).mock?.calls?.length || 0;
}

// Mock localStorage helper
export function setMockStorageItem(key: string, value: any) {
  localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
}

export function getMockStorageItem(key: string) {
  const item = localStorage.getItem(key);
  if (!item) return null;
  try {
    return JSON.parse(item);
  } catch {
    return item;
  }
}

// Create mock HTML elements for testing
export function createMockLoginForm() {
  const form = document.createElement('form');
  form.id = 'login-form';

  const emailInput = document.createElement('input');
  emailInput.id = 'email';
  emailInput.type = 'email';
  emailInput.value = 'test@example.com';

  const passwordInput = document.createElement('input');
  passwordInput.id = 'password';
  passwordInput.type = 'password';
  passwordInput.value = 'password123';

  const submitBtn = document.createElement('button');
  submitBtn.id = 'submit-btn';
  submitBtn.type = 'submit';
  submitBtn.textContent = 'LOGIN';

  const errorDiv = document.createElement('div');
  errorDiv.id = 'error-message';
  errorDiv.classList.add('hidden');

  const successDiv = document.createElement('div');
  successDiv.id = 'success-message';
  successDiv.classList.add('hidden');

  form.appendChild(emailInput);
  form.appendChild(passwordInput);
  form.appendChild(submitBtn);
  form.appendChild(errorDiv);
  form.appendChild(successDiv);

  document.body.appendChild(form);

  return { form, emailInput, passwordInput, submitBtn, errorDiv, successDiv };
}

export function createMockSignupForm() {
  const form = document.createElement('form');
  form.id = 'signup-form';

  const firstNameInput = document.createElement('input');
  firstNameInput.id = 'firstName';
  firstNameInput.type = 'text';
  firstNameInput.value = 'John';

  const lastNameInput = document.createElement('input');
  lastNameInput.id = 'lastName';
  lastNameInput.type = 'text';
  lastNameInput.value = 'Doe';

  const emailInput = document.createElement('input');
  emailInput.id = 'email';
  emailInput.type = 'email';
  emailInput.value = 'john@example.com';

  const passwordInput = document.createElement('input');
  passwordInput.id = 'password';
  passwordInput.type = 'password';
  passwordInput.value = 'password123';

  const confirmInput = document.createElement('input');
  confirmInput.id = 'confirm';
  confirmInput.type = 'password';
  confirmInput.value = 'password123';

  const termsCheckbox = document.createElement('input');
  termsCheckbox.id = 'terms';
  termsCheckbox.type = 'checkbox';
  termsCheckbox.checked = true;

  const submitBtn = document.createElement('button');
  submitBtn.id = 'submit-btn';
  submitBtn.type = 'submit';
  submitBtn.textContent = 'SIGN UP';

  const errorDiv = document.createElement('div');
  errorDiv.id = 'error-message';
  errorDiv.classList.add('hidden');

  const successDiv = document.createElement('div');
  successDiv.id = 'success-message';
  successDiv.classList.add('hidden');

  form.appendChild(firstNameInput);
  form.appendChild(lastNameInput);
  form.appendChild(emailInput);
  form.appendChild(passwordInput);
  form.appendChild(confirmInput);
  form.appendChild(termsCheckbox);
  form.appendChild(submitBtn);
  form.appendChild(errorDiv);
  form.appendChild(successDiv);

  document.body.appendChild(form);

  return {
    form,
    firstNameInput,
    lastNameInput,
    emailInput,
    passwordInput,
    confirmInput,
    termsCheckbox,
    submitBtn,
    errorDiv,
    successDiv,
  };
}

// Cleanup helper
export function cleanupDOM() {
  document.body.innerHTML = '';
}

// Wait for async operations
export function waitFor(condition: () => boolean, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      if (condition()) {
        clearInterval(interval);
        resolve(true);
      }
      if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        reject(new Error('Timeout waiting for condition'));
      }
    }, 50);
  });
}

// Simulate user events
export async function fillInput(selector: string, value: string) {
  const input = document.querySelector(selector) as HTMLInputElement;
  if (!input) throw new Error(`Input not found: ${selector}`);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

export async function submitForm(formId: string) {
  const form = document.getElementById(formId) as HTMLFormElement;
  if (!form) throw new Error(`Form not found: ${formId}`);

  const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
  form.dispatchEvent(submitEvent);
}

export async function clickButton(selector: string) {
  const button = document.querySelector(selector) as HTMLButtonElement;
  if (!button) throw new Error(`Button not found: ${selector}`);
  button.click();
}

// Get element text content
export function getElementText(selector: string): string | null {
  const element = document.querySelector(selector);
  return element?.textContent || null;
}

// Check if element has class
export function hasClass(selector: string, className: string): boolean {
  const element = document.querySelector(selector);
  return element?.classList.contains(className) ?? false;
}

// Check if element is visible (not hidden)
export function isVisible(selector: string): boolean {
  return !hasClass(selector, 'hidden');
}
