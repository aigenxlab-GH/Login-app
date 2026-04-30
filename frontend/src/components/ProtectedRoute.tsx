import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { User, getMe } from '../api/auth';

interface Props {
  children: (user: User) => ReactNode;
}

export function ProtectedRoute({ children }: Props) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((u) => {
        if (!cancelled) {
          setUser(u);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          navigate('/', { replace: true });
        } else {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        <span className="text-sm">Loading…</span>
      </div>
    );
  }
  if (!user) return null;
  return <>{children(user)}</>;
}
