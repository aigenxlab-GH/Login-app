import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/client';
import { ProtectedRoute } from '../components/ProtectedRoute';

export function HomePage() {
  return (
    <ProtectedRoute>
      {(user) => <HomeView name={user.name} />}
    </ProtectedRoute>
  );
}

function HomeView({ name }: { name: string }) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  async function onLogout() {
    setSubmitting(true);
    try {
      await authApi.logout();
    } finally {
      navigate('/?msg=' + encodeURIComponent('You logged out'));
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-md px-6">
      <div className="rounded-lg bg-white p-8 shadow">
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome home, {name}
        </h1>
        <button
          type="button"
          onClick={onLogout}
          disabled={submitting}
          className="mt-6 rounded bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? 'Logging out…' : 'Logout'}
        </button>
      </div>
    </div>
  );
}
