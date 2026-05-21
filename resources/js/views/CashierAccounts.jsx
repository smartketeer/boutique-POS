import React from 'react';
import axios from 'axios';
import { Trash2, Edit2, UserRound, Clock } from 'lucide-react';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

const EM_DASH = '\u2014';

const CashierAccounts = () => {
    const [cashiers, setCashiers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [activities, setActivities] = React.useState([]);
    const [activityLoading, setActivityLoading] = React.useState(true);
    const [activityError, setActivityError] = React.useState('');
    const [activityCashierId, setActivityCashierId] = React.useState('all');
    const [activityScope, setActivityScope] = React.useState('cashier');
    const [branches, setBranches] = React.useState([]);
    const [branchesLoading, setBranchesLoading] = React.useState(true);
    const [branchesError, setBranchesError] = React.useState('');
    const [branchesFetchedAt, setBranchesFetchedAt] = React.useState(0);

    const [form, setForm] = React.useState({
        id: null,
        name: '',
        email: '',
        password: '',
        branch_ids: [],
    });

    const resetForm = React.useCallback(() => {
        setForm({ id: null, name: '', email: '', password: '', branch_ids: [] });
    }, []);

    const fetchBranches = React.useCallback(async () => {
        setBranchesLoading(true);
        setBranchesError('');
        try {
            const res = await axios.get('/api/branches');
            setBranches(res.data || []);
            setBranchesFetchedAt(Date.now());
        } catch (err) {
            setBranchesError(err.response?.data?.message || 'Failed to load branches');
            setBranches([]);
        } finally {
            setBranchesLoading(false);
        }
    }, []);

    const fetchCashiers = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await axios.get('/api/cashiers');
            setCashiers(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load cashiers');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchCashiers();
    }, [fetchCashiers]);

    React.useEffect(() => {
        fetchBranches();
    }, [fetchBranches]);

    const fetchActivities = React.useCallback(async () => {
        setActivityLoading(true);
        setActivityError('');
        try {
            const params = new URLSearchParams();
            params.set('scope', activityScope);
            params.set('limit', '20');
            if (activityCashierId !== 'all') {
                params.set('actor_user_id', String(activityCashierId));
            }

            const res = await axios.get(`/api/activity-logs?${params.toString()}`);
            setActivities(res.data || []);
        } catch (err) {
            setActivityError(err.response?.data?.message || 'Failed to load activity logs');
            setActivities([]);
        } finally {
            setActivityLoading(false);
        }
    }, [activityCashierId, activityScope]);

    React.useEffect(() => {
        fetchActivities();
    }, [fetchActivities]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (!form.id) {
                setError('Cashier creation is disabled. Please contact the developers to add a cashier.');
                return;
            }

            const branchIds = (form.branch_ids || []).map((id) => Number(id)).filter((n) => Number.isFinite(n));
            if (!branchIds.length) {
                setError('Please select at least one branch.');
                return;
            }

            const payload = {
                name: form.name,
                email: form.email,
                branch_ids: branchIds,
            };
            if (form.password) payload.password = form.password;
            await axios.put(`/api/cashiers/${form.id}`, payload);

            resetForm();
            fetchCashiers();
        } catch (err) {
            setError(err.response?.data?.message || 'Save failed');
        }
    };

    const startEdit = (cashier) => {
        const selected = Array.isArray(cashier?.branches) && cashier.branches.length
            ? cashier.branches.map((b) => Number(b.id)).filter((n) => Number.isFinite(n))
            : cashier.branch_id != null
                ? [Number(cashier.branch_id)]
                : [];
        setForm({
            id: cashier.id,
            name: cashier.name || '',
            email: cashier.email || '',
            password: '',
            branch_ids: selected,
        });
    };

    const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
    const [deleteTargetCashier, setDeleteTargetCashier] = React.useState(null);
    const [deleteConfirming, setDeleteConfirming] = React.useState(false);

    const handleDelete = (cashier) => {
        setDeleteTargetCashier(cashier);
        setDeleteModalOpen(true);
    };

    const executeDelete = async () => {
        if (!deleteTargetCashier) return;
        setDeleteConfirming(true);
        setError('');
        try {
            await axios.delete(`/api/cashiers/${deleteTargetCashier.id}`);
            setDeleteModalOpen(false);
            setDeleteTargetCashier(null);
            fetchCashiers();
        } catch (err) {
            setDeleteModalOpen(false);
            setDeleteTargetCashier(null);
            setError(err.response?.data?.message || 'Delete failed');
        } finally {
            setDeleteConfirming(false);
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <header className="flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-[#818181]">Cashiers</h1>
                    <p className="text-[#a6a6a6] mt-1">Manage cashier accounts and review their recent activity.</p>
                </div>
            </header>

            {error ? (
                <div className="p-3 bg-[#dddddd] text-[#818181] border border-red-100 rounded-lg text-sm">{error}</div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2 bg-gradient-to-b from-white to-[#fff7f9] border border-[#19140015] rounded-3xl shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <UserRound size={18} className="text-[#d94a79]" />
                        <h2 className="text-sm font-semibold text-[#818181]">Edit Cashier</h2>
                    </div>

                    {!form.id ? (
                        <div className="text-sm text-[#a6a6a6]">
                            Select a cashier from the list to edit. Creating a cashier is disabled; please contact the developers to add a cashier.
                        </div>
                    ) : null}

                    <form onSubmit={handleSubmit} className={`space-y-4 ${!form.id ? 'opacity-60 pointer-events-none' : ''}`}>
                        <div>
                            <label className="block text-xs font-semibold text-[#a6a6a6] mb-1">Name</label>
                            <input
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                className="w-full px-3 py-2 border border-[#19140035] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d94a79]/25 bg-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-[#a6a6a6] mb-1">Email</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                className="w-full px-3 py-2 border border-[#19140035] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d94a79]/25 bg-white"
                                required
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <label className="block text-xs font-semibold text-[#a6a6a6]">Branches</label>
                                <button
                                    type="button"
                                    onClick={fetchBranches}
                                    className="text-[11px] font-semibold text-[#4a2437] underline underline-offset-2"
                                >
                                    Refresh
                                </button>
                            </div>

                            {branchesLoading ? (
                                <div className="px-3 py-2 border border-[#19140035] rounded-xl bg-white text-xs text-[#a6a6a6] animate-pulse">
                                    Loading branches...
                                </div>
                            ) : branchesError ? (
                                <div className="px-3 py-2 border border-[#cbcbcb] rounded-xl bg-[#dddddd] text-xs text-[#818181]">
                                    {branchesError}
                                </div>
                            ) : branches.length === 0 ? (
                                <div className="px-3 py-2 border border-[#cbcbcb] rounded-xl bg-[#dddddd] text-xs text-red-600">
                                    No branches exist yet. Please add a branch first.
                                </div>
                            ) : (
                                <div className="border border-[#19140015] rounded-xl bg-white/70 p-3 space-y-2">
                                    {branches.map((b) => {
                                        const checked = (form.branch_ids || []).map(Number).includes(Number(b.id));
                                        return (
                                            <label key={b.id} className="flex items-center justify-between gap-3 text-xs">
                                                <span className={`font-semibold ${b.is_active ? 'text-[#818181]' : 'text-[#a6a6a6]'}`}>
                                                    {b.name}
                                                    {!b.is_active ? ' (Inactive)' : ''}
                                                </span>
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    disabled={!b.is_active}
                                                    onChange={(e) => {
                                                        const id = Number(b.id);
                                                        setForm((f) => {
                                                            const prev = Array.isArray(f.branch_ids) ? f.branch_ids.map(Number) : [];
                                                            const next = e.target.checked
                                                                ? Array.from(new Set([...prev, id]))
                                                                : prev.filter((x) => x !== id);
                                                            return { ...f, branch_ids: next };
                                                        });
                                                    }}
                                                    className="h-4 w-4"
                                                />
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-[#a6a6a6] mb-1">
                                Password (leave blank to keep current)
                            </label>
                            <input
                                type="password"
                                value={form.password}
                                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                                className="w-full px-3 py-2 border border-[#19140035] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d94a79]/25 bg-white"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={!form.id || branchesLoading || Boolean(branchesError) || branches.length === 0 || (form.branch_ids || []).length === 0}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4a2437] to-[#d94a79] text-white rounded-xl font-semibold hover:opacity-95 transition-opacity shadow-sm"
                            >
                                Save Changes
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 border border-[#19140035] rounded-xl font-semibold hover:bg-[#fff7f9]"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>

                <div className="lg:col-span-3 bg-white border border-[#19140015] rounded-3xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#19140015] bg-white/70 backdrop-blur flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-[#818181]">Cashier List</h2>
                        <button
                            onClick={fetchCashiers}
                            className="px-3 py-1.5 text-xs font-semibold border border-[#19140035] rounded-xl hover:bg-[#fff7f9]"
                        >
                            Refresh
                        </button>
                    </div>

                    {loading ? (
                        <div className="p-6 text-[#a6a6a6] animate-pulse">Loading cashiers...</div>
                    ) : cashiers.length === 0 ? (
                        <div className="p-6 text-[#a6a6a6]">No cashier accounts yet.</div>
                    ) : (
                        <div className="overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-[#dddddd] text-[#a6a6a6] border-b border-[#19140015]">
                                    <tr>
                                        <th className="text-left px-6 py-3 font-semibold">Name</th>
                                        <th className="text-left px-6 py-3 font-semibold">Email</th>
                                        <th className="text-right px-6 py-3 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cashiers.map((c) => (
                                        <tr key={c.id} className="border-b border-[#19140010] hover:bg-[#fff7f9]/70">
                                            <td className="px-6 py-3 text-[#818181] font-medium">{c.name}</td>
                                            <td className="px-6 py-3 text-[#a6a6a6]">{c.email}</td>
                                            <td className="px-6 py-3">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => startEdit(c)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#19140035] rounded-xl hover:bg-[#fff7f9] text-xs font-semibold"
                                                    >
                                                        <Edit2 size={14} />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(c)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#cbcbcb] text-[#818181] rounded-xl hover:bg-[#dddddd] text-xs font-semibold"
                                                    >
                                                        <Trash2 size={14} />
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <div id="activity" className="bg-white border border-[#19140015] rounded-3xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#19140015] bg-white/70 backdrop-blur flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Clock size={18} className="text-[#d94a79]" />
                        <h2 className="text-sm font-semibold text-[#818181]">Cashier Activity Log</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={activityScope}
                            onChange={(e) => setActivityScope(e.target.value)}
                            className="h-9 px-3 text-xs font-semibold border border-[#19140035] rounded-xl bg-white hover:bg-[#fff7f9] focus:outline-none focus:ring-2 focus:ring-[#d94a79]/25"
                        >
                            <option value="cashier">Cashier only</option>
                            <option value="all">All (incl. admin approvals)</option>
                        </select>
                        <select
                            value={activityCashierId}
                            onChange={(e) => setActivityCashierId(e.target.value)}
                            className="h-9 px-3 text-xs font-semibold border border-[#19140035] rounded-xl bg-white hover:bg-[#fff7f9] focus:outline-none focus:ring-2 focus:ring-[#d94a79]/25"
                        >
                            <option value="all">All cashiers</option>
                            {cashiers.map((c) => (
                                <option key={c.id} value={String(c.id)}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={fetchActivities}
                            className="h-9 px-3 text-xs font-semibold border border-[#19140035] rounded-xl hover:bg-[#fff7f9]"
                        >
                            Refresh
                        </button>
                    </div>
                </div>

                {activityError ? (
                    <div className="p-4 bg-[#dddddd] text-[#818181] border-b border-red-100 text-sm">{activityError}</div>
                ) : null}

                {activityLoading ? (
                    <div className="p-6 text-[#a6a6a6] animate-pulse">Loading activity...</div>
                ) : activities.length === 0 ? (
                    <div className="p-6 text-[#a6a6a6]">
                        No activity records yet. Cashier activity will appear here once they request admin access or perform tracked actions.
                    </div>
                ) : (
                    <div className="overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[#dddddd] text-[#a6a6a6] border-b border-[#19140015]">
                                <tr>
                                    <th className="text-left px-6 py-3 font-semibold">Time</th>
                                    <th className="text-left px-6 py-3 font-semibold">Cashier</th>
                                    <th className="text-left px-6 py-3 font-semibold">Activity</th>
                                    <th className="text-left px-6 py-3 font-semibold">IP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activities.map((a) => (
                                    <tr key={a.id} className="border-b border-[#19140010] hover:bg-[#fff7f9]/70">
                                        <td className="px-6 py-3 text-[#a6a6a6] whitespace-nowrap">
                                            {a.created_at ? new Date(a.created_at).toLocaleString() : '-'}
                                        </td>
                                        <td className="px-6 py-3 text-[#818181] font-medium">
                                            {a.actor?.name || a.actor_name || EM_DASH}
                                        </td>
                                        <td className="px-6 py-3 text-[#a6a6a6]">
                                            {a.description || a.event_type || EM_DASH}
                                        </td>
                                        <td className="px-6 py-3 text-[#a6a6a6]">{a.ip_address || EM_DASH}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ConfirmDeleteModal
                open={deleteModalOpen}
                onClose={() => { setDeleteModalOpen(false); setDeleteTargetCashier(null); }}
                onConfirm={executeDelete}
                confirming={deleteConfirming}
                title="Delete Cashier Account"
                itemName={deleteTargetCashier?.name || deleteTargetCashier?.email}
            />
        </div>
    );
};

export default CashierAccounts;
