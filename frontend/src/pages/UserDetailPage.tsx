import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getUserById, deleteUser, setUserActiveStatus, logout, User } from '../api/auth';
import { ApiError } from '../api/client';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { PageShell } from '../components/PageShell';

export function UserDetailPage() {
  return (
    <ProtectedRoute>
      {(currentUser) => <UserDetailView currentUser={currentUser} />}
    </ProtectedRoute>
  );
}

function UserDetailView({ currentUser }: { currentUser: User }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    if (!id) return;
    getUserById(id)
      .then(setUser)
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.body?.message ?? 'Failed to load user.');
        } else {
          setError('Failed to load user.');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleToggleStatus() {
    if (!user || !id) return;
    setTogglingStatus(true);
    try {
      const updated = await setUserActiveStatus(id, !user.active);
      setUser(updated);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.body?.message ?? 'Failed to update status.');
      } else {
        setError('Failed to update status.');
      }
    } finally {
      setTogglingStatus(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteUser(id);
      navigate('/home');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.body?.message ?? 'Failed to delete user.');
      } else {
        setError('Failed to delete user.');
      }
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      navigate('/?msg=' + encodeURIComponent('You logged out'));
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-md space-y-4">

        {/* ── Admin header card (same style as HomePage) ── */}
        <div className="rounded-3xl bg-white/30 shadow-xl backdrop-blur-md ring-1 ring-white/50 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/20">
            <span className="text-xs font-semibold uppercase tracking-widest text-white/70">Dashboard</span>
            <button
              type="button"
              onClick={() => setConfirmLogout(true)}
              disabled={loggingOut}
              className="rounded-full border border-[#1a2e52]/40 px-4 py-1.5 text-xs font-semibold text-[#1a2e52] transition hover:bg-[#1a2e52] hover:text-white disabled:opacity-50"
            >
              Logout
            </button>
          </div>
          <div className="px-6 py-4">
            <p className="text-base font-bold text-[#1a2e52]">{currentUser.name}</p>
            <p className="text-xs text-white/70">{currentUser.email}</p>
            <div className="mt-2 flex gap-4 text-xs text-[#1a2e52]">
              <span><span className="font-medium">Designation:</span> {currentUser.designation}</span>
              <span><span className="font-medium">Role:</span> Admin</span>
            </div>
          </div>
        </div>

        {/* ── User detail card ── */}
        <div className="rounded-3xl bg-white/30 shadow-xl backdrop-blur-md ring-1 ring-white/50 overflow-hidden">

          {/* Card header with back button */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/20">
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="flex items-center gap-1 rounded-full bg-white/40 px-3 py-1.5 text-xs font-semibold text-[#1a2e52] hover:bg-white/60 transition"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <span className="text-xs font-semibold uppercase tracking-widest text-white/70">User Details</span>
          </div>

          {loading && (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-white/70">Loading…</p>
            </div>
          )}

          {error && (
            <div className="px-6 py-4">
              <p className="rounded-xl bg-red-100/80 px-4 py-2 text-center text-xs text-red-700">{error}</p>
            </div>
          )}

          {user && !loading && (
            <div className="px-6 py-5">

              {/* User summary row */}
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1a2e52] shadow">
                  <svg viewBox="0 0 24 24" fill="white" className="h-7 w-7">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                  </svg>
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="font-bold text-[#1a2e52]">{user.name}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      user.role === 'ADMIN' ? 'bg-[#1a2e52]/20 text-[#1a2e52]' : 'bg-white/40 text-[#1a2e52]'
                    }`}>
                      {user.role === 'ADMIN' ? 'Admin' : 'General'}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      user.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      type="button"
                      disabled={togglingStatus}
                      onClick={handleToggleStatus}
                      className={`rounded-full px-3 py-0.5 text-xs font-semibold transition disabled:opacity-50 ${
                        user.active
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {togglingStatus ? '…' : user.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Detail rows */}
              <dl className="space-y-2">
                {user.employeeId && (
                  <DetailRow label="Employee ID" value={user.employeeId} highlight />
                )}
                <DetailRow label="Email" value={user.email} />
                <DetailRow label="Designation" value={user.designation} />
                <DetailRow label="Address" value={user.address} />
              </dl>

              {/* Action buttons */}
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/home')}
                  className="flex-1 rounded-full border border-[#1a2e52]/30 py-2.5 text-sm font-semibold text-[#1a2e52] hover:bg-white/40 transition"
                >
                  Back to List
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex-1 rounded-full bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition"
                >
                  Remove User
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-80 rounded-2xl bg-white p-6 shadow-2xl text-center">
            <p className="text-sm font-semibold text-slate-800">Are you sure you want to delete</p>
            <p className="mt-1 text-sm font-bold text-red-600">{user.name}?</p>
            <p className="mt-1 text-xs text-slate-500">This action cannot be undone.</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="flex-1 rounded-full border border-slate-300 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-full bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout confirmation modal */}
      {confirmLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-72 rounded-2xl bg-white p-6 shadow-2xl text-center">
            <p className="text-sm font-semibold text-slate-800">Are you sure you want to logout?</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmLogout(false)}
                className="flex-1 rounded-full border border-slate-300 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex-1 rounded-full bg-[#1a2e52] py-2 text-sm font-semibold text-white hover:bg-[#223568] disabled:opacity-60"
              >
                {loggingOut ? 'Logging out…' : 'Yes, Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function DetailRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex flex-col gap-0.5 rounded-xl px-4 py-2.5 ${highlight ? 'bg-[#1a2e52]/10 ring-1 ring-[#1a2e52]/20' : 'bg-white/40'}`}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-[#1a2e52]/60">{label}</dt>
      <dd className={`text-sm font-medium ${highlight ? 'font-bold text-[#1a2e52]' : 'text-[#1a2e52]'}`}>{value}</dd>
    </div>
  );
}
