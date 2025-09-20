import http from '../http';
import { safeEmail, safePassword } from '../sanitize';

export type LoginPayload = {
  email: string;
  password: string;
  remember?: boolean;
};

export async function login(payload: LoginPayload) {
  const body = {
    email: safeEmail(payload.email),
    password: safePassword(payload.password),
    remember: Boolean(payload.remember),
  };
  const { data } = await http.post('/auth/login', body);
  const token = (data as any)?.token;
  if (token && typeof window !== 'undefined') {
    try { window.localStorage.setItem('token', token); } catch { /* no-op */ }
  }
  return data;
}

export async function logout() {
  try { await http.post('/auth/logout'); } finally {
    if (typeof window !== 'undefined') {
      try { window.localStorage.removeItem('token'); } catch { /* no-op */ }
    }
  }
  return true;
}

export async function me() {
  const { data } = await http.get('/auth/me');
  return data;
}

export type SignupPayload = {
  email: string;
  password: string;
  // add other fields as needed
};

export async function signup(payload: SignupPayload) {
  const body = {
    email: safeEmail(payload.email),
    password: safePassword(payload.password),
  };
  const { data } = await http.post('/auth/signup', body);
  return data;
}

export async function requestPasswordReset(email: string) {
  const body = { email: safeEmail(email) };
  const { data } = await http.post('/auth/forgot-password', body);
  return data;
}
