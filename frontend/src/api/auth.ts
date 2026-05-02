import { request } from './client';

export interface User {
  id: string;
  employeeId: string | null;
  name: string;
  email: string;
  address: string;
  designation: string;
  role: 'ADMIN' | 'GENERAL';
  active: boolean;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  address: string;
  designation: string;
  role: 'ADMIN' | 'GENERAL';
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

export function getAllUsers(): Promise<User[]> {
  return request<User[]>('/admin/users');
}

export function getUserById(id: string): Promise<User> {
  return request<User>(`/admin/users/${id}`);
}

export function setUserActiveStatus(id: string, active: boolean): Promise<User> {
  return request<User>(`/admin/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
}

export function deleteUser(id: string): Promise<void> {
  return request<void>(`/admin/users/${id}`, { method: 'DELETE' });
}
