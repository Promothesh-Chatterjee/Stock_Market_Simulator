"use client";

import { useState, useEffect } from "react";
import { History, Search, ArrowUpRight, ArrowDownRight, Tag } from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar 
} from "recharts";
import { api } from "../utils/api";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import AIHelpdesk from "../components/AIHelpdesk";

const COLORS = ["#10b981", "#ef4444"];

export default function HistoryPage() {
  const [txs, setTxs] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tickerFilter, setTickerFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  const [showChat, setShowChat] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getTransactions({
        ticker: tickerFilter || undefined,
        objective_tag: tagFilter || undefined
      });
      setTxs(data);
      
      const analData = await api.getAnalytics();
      setAnalytics(analData);
    } catch (err) {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [tickerFilter, tagFilter]);

  return (
    <div className="min-h-screen bg-[#050814] flex text-slate-100">
      <Sidebar />

      <div className="flex-1 pl-64 min-h-screen flex flex-col">
        <Header onChatToggle={() => setShowChat(!showChat)} showChat={showChat} />

        <main className="mt-20 flex-1 p-8 space-y-6">
          
          {/* Header */}
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <History className="h-6 w-6 text-blue-500" /> Transaction Ledger & Analytics
            </h2>
            <p className="text-xs text-slate-400 mt-1">Review all your historical trades, filter results, and track portfolio growth analytics.</p>
          </div>

          {/* Top Row: Analytics charts */}
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Net Worth Chart */}
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-3">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Net Worth Timeline</span>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.net_worth_over_time}>
                      <XAxis dataKey="date" stroke="#475569" fontSize={8} tickLine={false} />
                      <YAxis stroke="#475569" fontSize={8} orientation="right" tickLine={false} tickFormatter={(val) => `₹${(val/100000).toFixed(0)}L`} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1f2937" }} />
                      <Area type="monotone" dataKey="net_worth" stroke="#3b82f6" fillOpacity={0.1} fill="#3b82f6" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Learning Score Progress */}
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-3">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Learning Score Growth</span>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.score_over_time}>
                      <XAxis dataKey="date" stroke="#475569" fontSize={8} tickLine={false} />
                      <YAxis stroke="#475569" fontSize={8} orientation="right" tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1f2937" }} />
                      <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Win/Loss Pie Chart */}
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Win/Loss Trade Ratio</span>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.win_loss_ratio}
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {analytics.win_loss_ratio.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => [`${val} Trades`, "Value"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 text-[10px]">
                  <span className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded bg-emerald-500"></div> Wins</span>
                  <span className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded bg-rose-500"></div> Losses</span>
                </div>
              </div>

            </div>
          )}

          {/* Filter Toolbar */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={tickerFilter}
                onChange={(e) => setTickerFilter(e.target.value)}
                placeholder="Filter by Stock Ticker (e.g. MRF.NS)..."
                className="w-full bg-[#050814] border border-slate-800 rounded-lg pl-10 pr-3 py-2 text-xs focus:outline-none focus:border-blue-500 transition text-white"
              />
            </div>
            <div>
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="bg-[#050814] border border-slate-800 rounded-lg px-4 py-2 text-xs focus:outline-none text-white w-full"
              >
                <option value="">All Learning Goals</option>
                <option value="Learning Basics">Learning Basics</option>
                <option value="Wealth Creation">Wealth Creation</option>
                <option value="Short-Term Trading">Short-Term Trading</option>
              </select>
            </div>
          </div>

          {/* Transactions Ledger Table */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-800">
                <thead className="bg-slate-900/40 text-slate-400 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="px-6 py-4">Date / Time</th>
                    <th className="px-6 py-4">Ticker</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4 text-right">Quantity</th>
                    <th className="px-6 py-4 text-right">Price</th>
                    <th className="px-6 py-4 text-right">Brokerage + Taxes</th>
                    <th className="px-6 py-4 text-right">Total Amount</th>
                    <th className="px-6 py-4 text-center">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {loading && txs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-500">Syncing database log...</td>
                    </tr>
                  ) : txs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-500">No transactions match your search filter.</td>
                    </tr>
                  ) : (
                    txs.map((t) => {
                      const isBuy = t.transaction_type === "BUY";
                      return (
                        <tr key={t.id} className="hover:bg-slate-800/10 font-mono">
                          <td className="px-6 py-4 text-slate-400">{new Date(t.created_at).toLocaleString()}</td>
                          <td className="px-6 py-4 font-bold text-white">{t.ticker.split(".")[0]}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                              isBuy ? "bg-emerald-600/15 text-emerald-400" : "bg-rose-600/15 text-rose-400"
                            }`}>
                              {t.transaction_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">{t.quantity}</td>
                          <td className="px-6 py-4 text-right">₹{Number(t.price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 text-right text-slate-500">₹{(Number(t.brokerage) + Number(t.stt)).toFixed(2)}</td>
                          <td className="px-6 py-4 text-right font-bold">₹{Number(t.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold ${
                              (t.score || 0) >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                            }`}>
                              {t.score !== null ? (t.score >= 0 ? "+" : "") + t.score : "0"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>

      <AIHelpdesk isOpen={showChat} onClose={() => setShowChat(false)} />
    </div>
  );
}
