import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../api/auth';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { User } from '../api/auth';
import { PageShell } from '../components/PageShell';

export function HomePage() {
  return (
    <ProtectedRoute>
      {(user) => <HomeView user={user} />}
    </ProtectedRoute>
  );
}

function HomeView({ user }: { user: User }) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function onLogout() {
    setSubmitting(true);
    try {
      await logout();
    } finally {
      navigate('/?msg=' + encodeURIComponent('You logged out'));
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-md rounded-3xl bg-white/30 shadow-xl backdrop-blur-md ring-1 ring-white/50 overflow-hidden">

        {/* Header bar with logout top-right */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-white/20">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/70">Dashboard</span>
          <button
            type="button"
            onClick={() => setConfirm(true)}
            disabled={submitting}
            className="rounded-full border border-[#1a2e52]/40 px-4 py-1.5 text-xs font-semibold text-[#1a2e52] transition hover:bg-[#1a2e52] hover:text-white disabled:opacity-50"
          >
            Logout
          </button>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          <h1 className="text-2xl font-bold text-[#1a2e52]">Welcome home, {user.name}</h1>
          <p className="mt-1 text-sm text-white/80">{user.email}</p>

          <dl className="mt-6 space-y-2 rounded-2xl bg-white/40 px-4 py-4 text-sm">
            <div className="flex justify-between">
              <dt className="font-medium text-[#1a2e52]">Designation</dt>
              <dd className="text-[#1a2e52]">{user.designation}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-[#1a2e52]">Address</dt>
              <dd className="max-w-[60%] text-right text-[#1a2e52]">{user.address}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Logout confirmation modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-72 rounded-2xl bg-white p-6 shadow-2xl text-center">
            <p className="text-sm font-semibold text-slate-800">Are you sure you want to logout?</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirm(false)}
                className="flex-1 rounded-full border border-slate-300 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onLogout}
                disabled={submitting}
                className="flex-1 rounded-full bg-[#1a2e52] py-2 text-sm font-semibold text-white hover:bg-[#223568] disabled:opacity-60"
              >
                {submitting ? 'Logging out…' : 'Yes, Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
