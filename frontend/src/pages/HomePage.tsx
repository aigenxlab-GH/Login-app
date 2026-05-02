import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { logout, getAllUsers, deleteUser, setUserActiveStatus, User } from '../api/auth';
import { ApiError } from '../api/client';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { PageShell } from '../components/PageShell';

export function HomePage() {
  return (
    <ProtectedRoute>
      {(user) => <HomeView user={user} />}
    </ProtectedRoute>
  );
}

function HomeView({ user }: { user: User }) {
  const isAdmin = user.role === 'ADMIN';
  return isAdmin ? <AdminDashboard user={user} /> : <GeneralDashboard user={user} />;
}

// ─── Shared header card ────────────────────────────────────────────────────────

function HeaderCard({ user, onLogoutClick }: { user: User; onLogoutClick: () => void }) {
  const isAdmin = user.role === 'ADMIN';
  return (
    <div className="rounded-3xl bg-white/30 shadow-xl backdrop-blur-md ring-1 ring-white/50 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/20">
        <span className="text-xs font-semibold uppercase tracking-widest text-white/70">
          Dashboard {isAdmin ? '' : '(General)'}
        </span>
        <button
          type="button"
          onClick={onLogoutClick}
          className="rounded-full border border-[#1a2e52]/40 px-4 py-1.5 text-xs font-semibold text-[#1a2e52] transition hover:bg-[#1a2e52] hover:text-white"
        >
          Logout
        </button>
      </div>
      <div className="px-6 py-4">
        <p className="text-base font-bold text-[#1a2e52]">{user.name}</p>
        <p className="text-xs text-white/70">{user.email}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#1a2e52]">
          <span><span className="font-medium">Designation:</span> {user.designation}</span>
          <span><span className="font-medium">Role:</span> {isAdmin ? 'Admin' : 'General'}</span>
          {user.employeeId && (
            <span><span className="font-medium">Employee ID:</span> {user.employeeId}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Logout modal ──────────────────────────────────────────────────────────────

function LogoutModal({ onCancel, onConfirm, busy }: { onCancel: () => void; onConfirm: () => void; busy: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-72 rounded-2xl bg-white p-6 shadow-2xl text-center">
        <p className="text-sm font-semibold text-slate-800">Are you sure you want to logout?</p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-slate-300 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >Cancel</button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 rounded-full bg-[#1a2e52] py-2 text-sm font-semibold text-white hover:bg-[#223568] disabled:opacity-60"
          >{busy ? 'Logging out…' : 'Yes, Logout'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── General user dashboard ────────────────────────────────────────────────────

function GeneralDashboard({ user }: { user: User }) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function onLogout() {
    setSubmitting(true);
    try { await logout(); } finally { navigate('/?msg=' + encodeURIComponent('You logged out')); }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-2xl rounded-3xl bg-white/30 shadow-xl backdrop-blur-md ring-1 ring-white/50 overflow-hidden">
        <div className="flex items-center justify-between px-8 py-4 border-b border-white/20">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/70">Dashboard (General)</span>
          <button
            type="button"
            onClick={() => setConfirm(true)}
            disabled={submitting}
            className="rounded-full border border-[#1a2e52]/40 px-4 py-1.5 text-xs font-semibold text-[#1a2e52] transition hover:bg-[#1a2e52] hover:text-white disabled:opacity-50"
          >Logout</button>
        </div>
        <div className="px-8 py-6">
          <h1 className="text-2xl font-bold text-[#1a2e52]">Welcome home, {user.name}</h1>
          <p className="mt-1 text-sm text-white/80">{user.email}</p>
          <dl className="mt-4 space-y-2 rounded-2xl bg-white/40 px-4 py-4 text-sm">
            {user.employeeId && (
              <div className="flex justify-between">
                <dt className="font-medium text-[#1a2e52]">Employee ID</dt>
                <dd className="font-bold text-[#1a2e52]">{user.employeeId}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="font-medium text-[#1a2e52]">Designation</dt>
              <dd className="text-[#1a2e52]">{user.designation}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-[#1a2e52]">Address</dt>
              <dd className="max-w-[60%] text-right text-[#1a2e52]">{user.address}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-[#1a2e52]">Role</dt>
              <dd className="text-[#1a2e52]">General</dd>
            </div>
          </dl>
        </div>
      </div>
      {confirm && <LogoutModal onCancel={() => setConfirm(false)} onConfirm={onLogout} busy={submitting} />}
    </PageShell>
  );
}

// ─── Admin dashboard (filter ribbon + paginated table) ─────────────────────────

type FilterCriteria = 'name' | 'employeeId' | 'status';
type StatusValue = 'active' | 'inactive';
type AppliedFilter = { criteria: FilterCriteria; value: string };

function AdminDashboard({ user }: { user: User }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // ── Filter state (draft = pending; applied = active) ──
  const [criteria, setCriteria] = useState<FilterCriteria>('name');
  const [textDraft, setTextDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState<StatusValue>('active');
  const [applied, setApplied] = useState<AppliedFilter | null>(null);

  // ── Pagination state ──
  const [pageSize, setPageSize] = useState<number>(5);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    getAllUsers()
      .then((all) => setUsers(all.filter((u) => u.id !== user.id)))
      .catch((err) => {
        if (err instanceof ApiError) setError(err.body?.message ?? 'Failed to load users.');
        else setError('Failed to load users.');
      })
      .finally(() => setLoading(false));
  }, [user.id]);

  // ── Apply filter only when button is pressed ──
  function handleApplyFilter() {
    const value = criteria === 'status' ? statusDraft : textDraft.trim();
    if (criteria !== 'status' && value === '') {
      setApplied(null);
    } else {
      setApplied({ criteria, value });
    }
    setCurrentPage(1);
  }

  function handleResetFilter() {
    setApplied(null);
    setTextDraft('');
    setStatusDraft('active');
    setCriteria('name');
    setCurrentPage(1);
  }

  // ── Derive filtered + paginated rows ──
  const filteredUsers = useMemo(() => {
    if (!applied) return users;
    const v = applied.value.toLowerCase();
    return users.filter((u) => {
      switch (applied.criteria) {
        case 'name': return u.name.toLowerCase().includes(v);
        case 'employeeId': return (u.employeeId ?? '').toLowerCase().includes(v);
        case 'status': return applied.value === 'active' ? u.active : !u.active;
      }
    });
  }, [users, applied]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = filteredUsers.slice(pageStart, pageStart + pageSize);

  // Show up to 5 page buttons centered around the current page.
  const pageWindow = useMemo(() => {
    const max = 5;
    if (totalPages <= max) return Array.from({ length: totalPages }, (_, i) => i + 1);
    let start = Math.max(1, safePage - Math.floor(max / 2));
    let end = start + max - 1;
    if (end > totalPages) { end = totalPages; start = end - max + 1; }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [totalPages, safePage]);

  async function handleToggleStatus(u: User) {
    setTogglingId(u.id);
    try {
      const updated = await setUserActiveStatus(u.id, !u.active);
      setUsers((prev) => prev.map((x) => x.id === updated.id ? updated : x));
    } catch (err) {
      if (err instanceof ApiError) setError(err.body?.message ?? 'Failed to update status.');
      else setError('Failed to update status.');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteUser(confirmDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (err) {
      if (err instanceof ApiError) setError(err.body?.message ?? 'Failed to delete user.');
      else setError('Failed to delete user.');
    } finally {
      setDeleting(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try { await logout(); } finally { navigate('/?msg=' + encodeURIComponent('You logged out')); }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl space-y-4">

        {/* Admin header card */}
        <HeaderCard user={user} onLogoutClick={() => setConfirmLogout(true)} />

        {/* User management card */}
        <div className="rounded-3xl bg-white/30 shadow-xl backdrop-blur-md ring-1 ring-white/50 overflow-hidden">

          {/* Card title */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/20">
            <span className="text-xs font-semibold uppercase tracking-widest text-white/70">User Management</span>
            <span className="text-xs text-[#1a2e52]/70">
              {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
              {applied && ` (filtered)`}
            </span>
          </div>

          {/* ── Filter ribbon ── */}
          <div className="border-b border-white/20 bg-white/20 px-6 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#1a2e52]/70">
                Filter by
              </label>

              <select
                value={criteria}
                onChange={(e) => {
                  setCriteria(e.target.value as FilterCriteria);
                  setTextDraft('');
                }}
                className="rounded-full border border-white/60 bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#1a2e52] focus:outline-none focus:ring-2 focus:ring-[#1a2e52]/40"
              >
                <option value="name">By Name</option>
                <option value="employeeId">By ID</option>
                <option value="status">By Status</option>
              </select>

              {criteria === 'status' ? (
                <select
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value as StatusValue)}
                  className="rounded-full border border-white/60 bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#1a2e52] focus:outline-none focus:ring-2 focus:ring-[#1a2e52]/40"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={textDraft}
                  onChange={(e) => setTextDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyFilter(); } }}
                  placeholder={criteria === 'name' ? 'Enter name…' : 'Enter employee ID…'}
                  className="min-w-[200px] flex-1 rounded-full border border-white/60 bg-white/70 px-4 py-1.5 text-xs text-[#1a2e52] placeholder:text-[#1a2e52]/40 focus:outline-none focus:ring-2 focus:ring-[#1a2e52]/40"
                />
              )}

              <button
                type="button"
                onClick={handleApplyFilter}
                className="rounded-full bg-[#1a2e52] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#223568] transition"
              >
                Apply Filter
              </button>

              {applied && (
                <button
                  type="button"
                  onClick={handleResetFilter}
                  className="rounded-full border border-[#1a2e52]/40 px-3 py-1.5 text-xs font-semibold text-[#1a2e52] hover:bg-white/40 transition"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* ── Status / errors ── */}
          {loading && <p className="px-6 py-6 text-sm text-white/70">Loading users…</p>}
          {error && (
            <p className="mx-6 mt-3 rounded-xl bg-red-100/80 px-4 py-2 text-xs text-red-700">{error}</p>
          )}

          {/* ── Table ── */}
          {!loading && !error && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-[#1a2e52]">
                  <thead className="bg-white/30">
                    <tr className="border-b border-white/40 text-left">
                      <th className="px-4 py-3 font-semibold w-12">#</th>
                      <th className="px-4 py-3 font-semibold">Employee ID</th>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Designation</th>
                      <th className="px-4 py-3 font-semibold text-center">Status</th>
                      <th className="px-4 py-3 font-semibold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((u, idx) => (
                      <tr
                        key={u.id}
                        className="border-b border-white/20 last:border-0 hover:bg-white/30 transition"
                      >
                        <td className="px-4 py-3 text-[#1a2e52]/60">{pageStart + idx + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {u.employeeId ? (
                            <span className="rounded bg-[#1a2e52]/10 px-2 py-0.5 font-semibold text-[#1a2e52]">
                              {u.employeeId}
                            </span>
                          ) : (
                            <span className="text-[#1a2e52]/40">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/user/${u.id}`}
                            className="font-medium text-[#1a2e52] underline underline-offset-2 hover:text-[#223568]"
                          >
                            {u.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{u.email}</td>
                        <td className="px-4 py-3">{u.designation}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                            }`}>
                              {u.active ? 'Active' : 'Inactive'}
                            </span>
                            <button
                              type="button"
                              disabled={togglingId === u.id}
                              onClick={() => handleToggleStatus(u)}
                              className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                                u.active
                                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              {togglingId === u.id ? '…' : u.active ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(u)}
                            className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600 transition"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pageRows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-[#1a2e52]/60">
                          {applied ? 'No users match the current filter.' : 'No users found.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination footer ── */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/20 bg-white/20 px-6 py-3 text-xs text-[#1a2e52]">
                <div className="flex items-center gap-2">
                  <label className="font-semibold uppercase tracking-wide text-[#1a2e52]/70">Rows per page</label>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-semibold text-[#1a2e52] focus:outline-none focus:ring-2 focus:ring-[#1a2e52]/40"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                  </select>
                  <span className="text-[#1a2e52]/70">
                    {filteredUsers.length === 0
                      ? '0 of 0'
                      : `${pageStart + 1}–${Math.min(pageStart + pageSize, filteredUsers.length)} of ${filteredUsers.length}`}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <PagerButton
                    label="‹ Prev"
                    disabled={safePage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  />
                  {pageWindow.map((p) => (
                    <PagerButton
                      key={p}
                      label={String(p)}
                      active={p === safePage}
                      onClick={() => setCurrentPage(p)}
                    />
                  ))}
                  <PagerButton
                    label="Next ›"
                    disabled={safePage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-80 rounded-2xl bg-white p-6 shadow-2xl text-center">
            <p className="text-sm font-semibold text-slate-800">Are you sure you want to delete</p>
            <p className="mt-1 text-sm font-bold text-red-600">{confirmDelete.name}?</p>
            <p className="mt-1 text-xs text-slate-500">This action cannot be undone.</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex-1 rounded-full border border-slate-300 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >Cancel</button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-full bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
              >{deleting ? 'Deleting…' : 'Yes, Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Logout confirmation modal */}
      {confirmLogout && (
        <LogoutModal
          onCancel={() => setConfirmLogout(false)}
          onConfirm={handleLogout}
          busy={loggingOut}
        />
      )}
    </PageShell>
  );
}

// ─── Pager button ──────────────────────────────────────────────────────────────

function PagerButton({
  label, onClick, active = false, disabled = false,
}: { label: string; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-w-[32px] rounded-md px-2 py-1 text-xs font-semibold transition ${
        active
          ? 'bg-[#1a2e52] text-white shadow'
          : disabled
            ? 'bg-white/30 text-[#1a2e52]/40 cursor-not-allowed'
            : 'bg-white/60 text-[#1a2e52] hover:bg-white/80'
      }`}
    >
      {label}
    </button>
  );
}
