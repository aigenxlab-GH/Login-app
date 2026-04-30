import { request } from './client';

export interface User {
  id: string;
  name: string;
  email: string;
  address: string;
  designation: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  address: string;
  designation: string;
}

export interface ChangePasswordPayload {
  email: string;
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export function login(email: string, password: string): Promise<User> {
  return request<User>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function signup(payload: SignupPayload): Promise<User> {
  return request<User>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getMe(): Promise<User> {
  return request<User>('/auth/me');
}

export function logout(): Promise<void> {
  return request<void>('/auth/logout', { method: 'POST' });
}

export function changePassword(payload: ChangePasswordPayload): Promise<void> {
  return request<void>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
