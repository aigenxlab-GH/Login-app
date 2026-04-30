// Centralized API client. ALWAYS uses relative `/api/...` paths so the same
// code works in dev (Vite proxies /api -> :8080) and in prod-mode single-jar
// (Spring Boot serves both UI and API on the same origin).

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  address: string;
  designation: string;
}

export interface ApiErrorBody {
  error: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody | null;

  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.message || body?.error || `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = await res.json();
    } catch {
      // empty/non-JSON error body -- keep null
    }
    throw new ApiError(res.status, body);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export const authApi = {
  login(email: string, password: string) {
    return request<ApiUser>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  signup(payload: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    address: string;
    designation: string;
  }) {
    return request<ApiUser>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  me() {
    return request<ApiUser>('/auth/me', { method: 'GET' });
  },

  logout() {
    return request<void>('/auth/logout', { method: 'POST' });
  },

  changePassword(payload: {
    email: string;
    oldPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }) {
    return request<void>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
