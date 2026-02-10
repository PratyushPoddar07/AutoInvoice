"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import Icon from "@/components/Icon";
import Link from "next/link";

export default function AuditLogPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterAction, setFilterAction] = useState("ALL");

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const res = await axios.get("/api/audit?limit=200");
            setLogs(res.data);
        } catch (error) {
            toast.error("Failed to fetch audit logs");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.invoice_id?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter = filterAction === "ALL" || log.action === filterAction;

        return matchesSearch && matchesFilter;
    });

    const actionColors = {
        UPDATE: "bg-blue-50 text-blue-700 border-blue-100",
        CREATE: "bg-green-50 text-green-700 border-green-100",
        DELETE: "bg-red-50 text-red-700 border-red-100",
        APPROVE: "bg-emerald-50 text-emerald-700 border-emerald-100",
        REJECT: "bg-orange-50 text-orange-700 border-orange-100",
        LOGIN: "bg-purple-50 text-purple-700 border-purple-100"
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 px-1">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight uppercase">
                        Audit Logs
                    </h1>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Complete system activity history</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={fetchLogs}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 px-4 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all active:scale-95"
                    >
                        <Icon name="RefreshCw" size={14} className={loading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                    <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 px-4 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                        <Icon name="Download" size={14} />
                        Export
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-3 sm:p-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1 relative">
                        <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search user, action, or ID..."
                            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white/50"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                        className="px-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white/50 font-medium shrink-0"
                    >
                        <option value="ALL">All Actions</option>
                        <option value="UPDATE">Updates</option>
                        <option value="CREATE">Creates</option>
                        <option value="APPROVE">Approvals</option>
                        <option value="REJECT">Rejections</option>
                    </select>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading audit logs...</p>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="p-12 text-center">
                        <Icon name="FileText" size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">No audit logs found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Timestamp</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">User & Action</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400 hidden lg:table-cell">Action Category</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400 hidden sm:table-cell">Details</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Target</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLogs.map((log, idx) => (
                                    <tr key={log._id || idx} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-[10px] sm:text-xs text-slate-500 font-mono">
                                            {formatDate(log.timestamp)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 text-[10px] font-bold shrink-0">
                                                    {log.username?.charAt(0) || "S"}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] sm:text-xs font-bold text-gray-900 truncate">{log.username || "System"}</p>
                                                    <p className="lg:hidden text-[9px] font-black uppercase tracking-tighter text-indigo-600">{log.action}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${actionColors[log.action] || "bg-gray-50 text-gray-600 border-gray-100"}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-[11px] text-gray-600 max-w-xs truncate hidden sm:table-cell">
                                            {log.details}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {log.invoice_id ? (
                                                <Link
                                                    href={`/digitization/${log.invoice_id}`}
                                                    className="flex items-center gap-1.5 text-indigo-600 text-[10px] font-bold hover:underline"
                                                >
                                                    <Icon name="ExternalLink" size={10} />
                                                    {log.invoice_id.substring(0, 8)}
                                                </Link>
                                            ) : (
                                                <span className="text-slate-300 text-[10px] font-black tracking-widest">GLOBAL</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Stats Footer */}
            <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
                <span>Showing {filteredLogs.length} of {logs.length} entries</span>
                <span>Retention Policy: 7 Years (SOX/IFRS Compliance)</span>
            </div>
        </div>
    );
}
