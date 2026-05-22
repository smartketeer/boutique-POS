import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, TrendingUp, Users, Package, ArrowUpRight, ArrowDownRight, Printer, Download, Filter } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const PESO = '\u20B1';
const EM_DASH = '\u2014';

const Reports = () => {
    const { user } = useAuthStore();
    const [dailySummary, setDailySummary] = useState(null);
    const [staffPerformance, setStaffPerformance] = useState([]);
    const [staffRange, setStaffRange] = useState('month');
    const [inventoryValuation, setInventoryValuation] = useState(null);
    const [revenueRange, setRevenueRange] = useState('week');
    const [revenueTrend, setRevenueTrend] = useState(null);
    const [hoveredRevenueIndex, setHoveredRevenueIndex] = useState(null);
    const [hoveredRevenuePos, setHoveredRevenuePos] = useState({ x: 0, y: 0 });
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [staffLoading, setStaffLoading] = useState(true);
    const [valuationLoading, setValuationLoading] = useState(true);
    const [revenueLoading, setRevenueLoading] = useState(true);
    const [error, setError] = useState('');

    const isAdmin = user?.role === 'admin';

    const toNumber = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    };

    const formatPeso = (value) =>
        toNumber(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const staffRangeLabel =
        staffRange === 'today' ? 'Today' : staffRange === 'week' ? 'Weekly' : 'Monthly';
    const revenueRangeLabel = revenueRange === 'month' ? 'Monthly' : 'Weekly';

    useEffect(() => {
        if (!isAdmin) return;
        let cancelled = false;
        const fetchSummary = async () => {
            setSummaryLoading(true);
            setValuationLoading(true);
            setError('');
            try {
                const [dailyRes, invRes] = await Promise.all([axios.get('/api/reports/daily-summary'), axios.get('/api/reports/inventory-valuation')]);
                if (!cancelled) {
                    setDailySummary(dailyRes.data);
                    setInventoryValuation(invRes.data);
                }
            } catch (err) {
                if (!cancelled) setError(err.response?.data?.message || 'Failed to fetch reports');
            } finally {
                if (!cancelled) {
                    setSummaryLoading(false);
                    setValuationLoading(false);
                }
            }
        };
        fetchSummary();
        return () => {
            cancelled = true;
        };
    }, [isAdmin]);

    useEffect(() => {
        if (!isAdmin) return;
        let cancelled = false;
        const fetchRevenue = async () => {
            setRevenueLoading(true);
            setError('');
            try {
                const revenueUrl = revenueRange === 'month' ? '/api/reports/monthly-revenue' : '/api/reports/weekly-revenue';
                const res = await axios.get(revenueUrl);
                if (!cancelled) setRevenueTrend(res.data);
            } catch (err) {
                if (!cancelled) setError(err.response?.data?.message || 'Failed to fetch reports');
            } finally {
                if (!cancelled) setRevenueLoading(false);
            }
        };
        fetchRevenue();
        return () => {
            cancelled = true;
        };
    }, [isAdmin, revenueRange]);

    useEffect(() => {
        if (!isAdmin) return;
        let cancelled = false;
        const fetchStaff = async () => {
            setStaffLoading(true);
            setError('');
            try {
                const res = await axios.get(`/api/reports/staff-performance?range=${encodeURIComponent(staffRange)}`);
                if (!cancelled) setStaffPerformance(res.data);
            } catch (err) {
                if (!cancelled) setError(err.response?.data?.message || 'Failed to fetch reports');
            } finally {
                if (!cancelled) setStaffLoading(false);
            }
        };
        fetchStaff();
        return () => {
            cancelled = true;
        };
    }, [isAdmin, staffRange]);

    const handlePrint = () => window.print();

    const handleExportCsv = () => {
        const escape = (v) => {
            const s = String(v ?? '');
            if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
            return s;
        };

        const rows = [];
        rows.push(['Report Generated At', new Date().toISOString()]);
        rows.push([]);
        rows.push(['Daily Summary']);
        rows.push(['Date', dailySummary?.date || '']);
        rows.push(['Total Revenue', formatPeso(dailySummary?.total_revenue)]);
        rows.push(['Total Transactions', toNumber(dailySummary?.total_transactions)]);
        rows.push(['Total Discount', formatPeso(dailySummary?.total_discount)]);
        rows.push([]);
        rows.push([`${revenueRangeLabel} Revenue Trend`]);
        rows.push(['Start Date', revenueTrend?.start_date || '']);
        rows.push(['End Date', revenueTrend?.end_date || '']);
        rows.push(['Date', 'Total Revenue', 'Total Transactions']);
        (revenueTrend?.days || []).forEach((d) => {
            rows.push([d.date, formatPeso(d.total_revenue), toNumber(d.total_transactions)]);
        });
        rows.push([]);
        rows.push([`Staff Performance (${staffRangeLabel})`]);
        rows.push(['Staff Name', 'Sales Count', 'Total Revenue']);
        staffPerformance.forEach((s) => {
            rows.push([s.name || '', toNumber(s.sales_count), formatPeso(s.sales_sum_total_amount)]);
        });
        rows.push([]);
        rows.push(['Inventory Valuation']);
        rows.push(['Total Valuation', formatPeso(inventoryValuation?.total_valuation)]);

        const csv = rows.map((r) => r.map(escape).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reports_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const toggleStaffRange = () => {
        setStaffRange((prev) => (prev === 'month' ? 'week' : prev === 'week' ? 'today' : 'month'));
    };

    if (!isAdmin) {
        return <div className="text-red-500 font-medium p-8 bg-[#dddddd] rounded-xl border border-red-100">Access Denied: Admin privileges required.</div>;
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-semibold text-[#818181] tracking-tight">Admin Management Suite</h1>
                    <p className="text-[#a6a6a6] font-medium">Comprehensive business analytics and staff performance metrics.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#cbcbcb] text-[#818181] rounded-xl hover:bg-[#dddddd] transition-all font-medium text-sm shadow-sm"
                    >
                        <Printer size={18} /> Print Report
                    </button>
                    <button
                        onClick={handleExportCsv}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#818181] text-white rounded-xl hover:bg-[#3f3f46] transition-colors font-medium text-sm shadow-sm"
                    >
                        <Download size={18} /> Export CSV
                    </button>
                </div>
            </header>

            {error ? (
                <div className="p-3 bg-[#dddddd] text-[#818181] border border-red-100 rounded-lg text-sm">{error}</div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-[#cbcbcb] p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="p-2 bg-[#dddddd] text-green-600 rounded-lg"><TrendingUp size={20} /></span>
                        <span className="flex items-center gap-1 text-green-600 text-xs font-semibold uppercase tracking-tighter"><ArrowUpRight size={14} /> +12.5%</span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#a6a6a6] uppercase tracking-widest">Today's Revenue</h3>
                    <p className={`text-3xl font-semibold mt-1 tracking-tighter ${summaryLoading && !dailySummary ? 'text-[#a6a6a6] animate-pulse' : 'text-[#818181]'}`}>
                        {PESO}{summaryLoading && !dailySummary ? EM_DASH : formatPeso(dailySummary?.total_revenue)}
                    </p>
                </div>

                <div className="bg-white border border-[#cbcbcb] p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="p-2 bg-[#dddddd] text-blue-600 rounded-lg"><Users size={20} /></span>
                        <span className="flex items-center gap-1 text-red-400 text-xs font-semibold uppercase tracking-tighter"><ArrowDownRight size={14} /> -2.4%</span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#a6a6a6] uppercase tracking-widest">Total Transactions</h3>
                    <p className={`text-3xl font-semibold mt-1 tracking-tighter ${summaryLoading && !dailySummary ? 'text-[#a6a6a6] animate-pulse' : 'text-[#818181]'}`}>
                        {summaryLoading && !dailySummary ? EM_DASH : toNumber(dailySummary?.total_transactions).toLocaleString()}
                    </p>
                </div>

                <div className="bg-white border border-[#cbcbcb] p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="p-2 bg-[#dddddd] text-purple-600 rounded-lg"><Package size={20} /></span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#a6a6a6] uppercase tracking-widest">Inventory Valuation</h3>
                    <p className={`text-3xl font-semibold mt-1 tracking-tighter ${valuationLoading && !inventoryValuation ? 'text-[#a6a6a6] animate-pulse' : 'text-[#818181]'}`}>
                        {PESO}{valuationLoading && !inventoryValuation ? EM_DASH : formatPeso(inventoryValuation?.total_valuation)}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Staff Performance */}
                <div className="bg-white border border-[#cbcbcb] rounded-2xl shadow-sm overflow-hidden">
                    <header className="p-6 border-b border-[#19140015] flex items-center justify-between bg-white/70 backdrop-blur">
                        <div className="flex items-center gap-2">
                            <Users size={18} className="text-[#818181]" />
                            <h2 className="text-sm font-semibold text-[#818181] uppercase tracking-widest">Top Performing Staff</h2>
                        </div>
                        <button
                            type="button"
                            onClick={toggleStaffRange}
                            className="text-xs font-semibold text-[#a6a6a6] hover:text-[#818181] transition-all uppercase tracking-widest flex items-center gap-1 underline underline-offset-4 decoration-[#19140015]"
                        >
                            {staffRangeLabel} <Filter size={12} />
                        </button>
                    </header>
                    <div className="p-6">
                        {staffLoading ? (
                            <div className="text-[#a6a6a6] animate-pulse font-medium">Loading staff performance...</div>
                        ) : staffPerformance.length === 0 ? (
                            <div className="text-[#a6a6a6] font-medium">No staff data for this period.</div>
                        ) : (
                            <div className="space-y-6">
                                {staffPerformance.map((staff, i) => (
                                    <div key={staff.id} className="flex items-center gap-4 group">
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#4a2437] font-semibold text-xs border border-[#19140015] group-hover:bg-gradient-to-r group-hover:from-[#4a2437] group-hover:to-[#d94a79] group-hover:text-white transition-all shadow-sm">#{i + 1}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-[#818181] truncate">{staff.name}</p>
                                            <p className="text-xs text-[#a6a6a6] font-medium italic">{staff.sales_count} sales processed</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-[#818181]">{PESO}{formatPeso(staff.sales_sum_total_amount)}</p>
                                            <div className="w-24 h-1.5 bg-[#dddddd] rounded-full mt-2 overflow-hidden border border-[#1914000d]">
                                                <div
                                                    className="h-full bg-gradient-to-r from-[#4a2437] to-[#d94a79] rounded-full transition-all duration-1000"
                                                    style={{ width: `${(toNumber(staff.sales_sum_total_amount) / (toNumber(staffPerformance[0]?.sales_sum_total_amount) || 1)) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Revenue Trend */}
                <div className="bg-white border border-[#cbcbcb] rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <header className="p-6 border-b border-[#19140015] flex items-center justify-between bg-white/70 backdrop-blur">
                        <div className="flex items-center gap-2">
                            <BarChart size={18} className="text-[#818181]" />
                            <h2 className="text-sm font-semibold text-[#818181] uppercase tracking-widest">{revenueRangeLabel} Revenue Trend</h2>
                        </div>
                        <div className="flex items-center gap-1 p-1 bg-white border border-[#19140015] rounded-2xl shadow-sm">
                            <button
                                type="button"
                                onClick={() => setRevenueRange('week')}
                                className={`h-8 px-3 rounded-xl text-[11px] font-semibold uppercase tracking-widest transition-all ${
                                    revenueRange === 'week' ? 'bg-[#818181] text-white' : 'text-[#a6a6a6] hover:text-[#818181] hover:bg-[#fff7f9]'
                                }`}
                            >
                                Weekly
                            </button>
                            <button
                                type="button"
                                onClick={() => setRevenueRange('month')}
                                className={`h-8 px-3 rounded-xl text-[11px] font-semibold uppercase tracking-widest transition-all ${
                                    revenueRange === 'month' ? 'bg-[#818181] text-white' : 'text-[#a6a6a6] hover:text-[#818181] hover:bg-[#fff7f9]'
                                }`}
                            >
                                Monthly
                            </button>
                        </div>
                    </header>
                    <div className="flex-1 p-8 overflow-x-auto">
                        {revenueLoading ? (
                            <div className="text-[#a6a6a6] animate-pulse font-medium min-h-[300px] flex items-center">
                                Loading revenue trend...
                            </div>
                        ) : (revenueTrend?.days || []).length === 0 ? (
                            <div className="text-[#a6a6a6] font-medium min-h-[300px] flex items-center">
                                No revenue data for this period.
                            </div>
                        ) : (
                            (() => {
                                const days = revenueTrend?.days || [];
                                const max = Math.max(...days.map((x) => toNumber(x.total_revenue)), 1);
                                const width = Math.max(7, days.length) * 44;
                                const height = 300;
                                const pad = { left: 52, right: 16, top: 18, bottom: 38 };
                                const chartW = Math.max(1, width - pad.left - pad.right);
                                const chartH = Math.max(1, height - pad.top - pad.bottom);
                                const points = days.map((d, idx) => {
                                    const val = toNumber(d.total_revenue);
                                    const t = days.length <= 1 ? 0 : idx / (days.length - 1);
                                    const x = pad.left + t * chartW;
                                    const y = pad.top + (1 - val / max) * chartH;
                                    return { x, y, val, date: d.date };
                                });
                                const dAttr = points
                                    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
                                    .join(' ');

                                const ticks = 4;
                                const yTicks = Array.from({ length: ticks + 1 }).map((_, i) => {
                                    const t = i / ticks;
                                    const value = (1 - t) * max;
                                    const y = pad.top + t * chartH;
                                    return { t, y, value };
                                });

                                const hovered = hoveredRevenueIndex != null ? points[hoveredRevenueIndex] : null;
                                const hoveredDateObj = hovered ? new Date(`${hovered.date}T00:00:00`) : null;
                                const hoveredLabel = hoveredDateObj
                                    ? revenueRange === 'month'
                                        ? hoveredDateObj.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                                        : hoveredDateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
                                    : '';

                                return (
                                    <div
                                        className="relative"
                                        style={{ minWidth: `${width}px`, height: `${height}px` }}
                                        onMouseLeave={() => setHoveredRevenueIndex(null)}
                                    >
                                        {hovered ? (
                                            <div
                                                className="absolute z-10 pointer-events-none"
                                                style={{
                                                    left: hoveredRevenuePos.x,
                                                    top: hoveredRevenuePos.y,
                                                    transform: 'translate(-50%, -110%)',
                                                }}
                                            >
                                                <div className="rounded-2xl border border-[#19140015] bg-white shadow-xl px-3 py-2">
                                                    <div className="text-[10px] font-semibold text-[#a6a6a6] uppercase tracking-widest">{hoveredLabel}</div>
                                                    <div className="text-[13px] font-semibold text-[#818181]">{PESO}{formatPeso(hovered.val)}</div>
                                                </div>
                                            </div>
                                        ) : null}

                                        <svg width={width} height={height} role="img" aria-label={`${revenueRangeLabel} revenue line chart`}>
                                            <defs>
                                                <linearGradient id="revenueLine" x1="0" x2="1" y1="0" y2="0">
                                                    <stop offset="0%" stopColor="#818181" />
                                                    <stop offset="100%" stopColor="#a6a6a6" />
                                                </linearGradient>
                                            </defs>

                                            {yTicks.map((t, i) => (
                                                <g key={`y-${i}`}>
                                                    <line
                                                        x1={pad.left}
                                                        x2={width - pad.right}
                                                        y1={t.y}
                                                        y2={t.y}
                                                        stroke="rgba(25,20,0,0.08)"
                                                    />
                                                    <text
                                                        x={pad.left - 10}
                                                        y={t.y + 4}
                                                        textAnchor="end"
                                                        fontSize="10"
                                                        fontWeight="800"
                                                        fill="#000000"
                                                    >
                                                        {PESO}{formatPeso(t.value)}
                                                    </text>
                                                </g>
                                            ))}

                                            <path d={dAttr} fill="none" stroke="url(#revenueLine)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                                            {points.map((p, idx) => {
                                                const dateObj = new Date(`${p.date}T00:00:00`);
                                                const xLabel =
                                                    revenueRange === 'month'
                                                        ? dateObj.toLocaleDateString(undefined, { month: 'short' })
                                                        : dateObj.toLocaleDateString(undefined, { weekday: 'short' });
                                                const active = hoveredRevenueIndex === idx;
                                                return (
                                                    <g key={`p-${idx}`}>
                                                        <circle
                                                            cx={p.x}
                                                            cy={p.y}
                                                            r={active ? 6 : 4}
                                                            fill={active ? '#818181' : '#ffffff'}
                                                            stroke="#818181"
                                                            strokeWidth={active ? 3 : 2}
                                                            onMouseEnter={(e) => {
                                                                setHoveredRevenueIndex(idx);
                                                                const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                                                                if (!rect) return;
                                                                setHoveredRevenuePos({
                                                                    x: e.clientX - rect.left,
                                                                    y: e.clientY - rect.top,
                                                                });
                                                            }}
                                                            onMouseMove={(e) => {
                                                                const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                                                                if (!rect) return;
                                                                setHoveredRevenuePos({
                                                                    x: e.clientX - rect.left,
                                                                    y: e.clientY - rect.top,
                                                                });
                                                            }}
                                                            onClick={(e) => {
                                                                setHoveredRevenueIndex((prev) => (prev === idx ? null : idx));
                                                                const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                                                                if (!rect) return;
                                                                setHoveredRevenuePos({
                                                                    x: e.clientX - rect.left,
                                                                    y: e.clientY - rect.top,
                                                                });
                                                            }}
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                        <text
                                                            x={p.x}
                                                            y={height - 14}
                                                            textAnchor="middle"
                                                            fontSize="10"
                                                            fontWeight="900"
                                                            fill="#000000"
                                                        >
                                                            {xLabel.toUpperCase()}
                                                        </text>
                                                    </g>
                                                );
                                            })}

                                            <text
                                                x={pad.left}
                                                y={pad.top - 6}
                                                textAnchor="start"
                                                fontSize="10"
                                                fontWeight="900"
                                                fill="#000000"
                                            >
                                                REVENUE
                                            </text>
                                        </svg>
                                    </div>
                                );
                            })()
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
