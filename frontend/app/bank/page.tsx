"use client";

import { useState, useEffect } from "react";
import { Landmark, ArrowUpRight, ShieldCheck, HelpCircle } from "lucide-react";
import { api } from "../utils/api";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import AIHelpdesk from "../components/AIHelpdesk";

export default function BankPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // FD simulator inputs
  const [fdAmount, setFdAmount] = useState(100000);
  const [fdTenure, setFdTenure] = useState(12);
  const [fdMaturity, setFdMaturity] = useState<any>(null);

  // New account inputs
  const [newType, setNewType] = useState("SAVINGS");
  const [newAmount, setNewAmount] = useState(50000);
  const [newTenure, setNewTenure] = useState(12);

  const [showChat, setShowChat] = useState(false);

  const loadBankDetails = async () => {
    setLoading(true);
    try {
      const data = await api.getBankAccounts();
      setAccounts(data);
    } catch (err: any) {
      setError(err.message || "Failed to load accounts.");
    } finally {
      setLoading(false);
    }
  };

  const runSimulation = async () => {
    try {
      const sim = await api.getFDSimulation(fdAmount, fdTenure);
      setFdMaturity(sim);
    } catch (err) {}
  };

  useEffect(() => {
    loadBankDetails();
    runSimulation();
  }, []);

  useEffect(() => {
    runSimulation();
  }, [fdAmount, fdTenure]);

  const handleOpenAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    try {
      await api.createBankAccount({
        account_type: newType,
        amount: Number(newAmount),
        tenure_months: newType === "FD" ? Number(newTenure) : undefined
      });
      setSuccessMsg(`Virtual ${newType} Account opened successfully!`);
      loadBankDetails();
      // Notify header
      window.dispatchEvent(new Event("portfolio-updated"));
    } catch (err: any) {
      setError(err.message || "Failed to open account.");
    }
  };

  return (
    <div className="min-h-screen bg-[#050814] flex text-slate-100">
      <Sidebar />

      <div className="flex-1 pl-64 min-h-screen flex flex-col">
        <Header onChatToggle={() => setShowChat(!showChat)} showChat={showChat} />

        <main className="mt-20 flex-1 p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Active Bank Accounts List (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Landmark className="h-6 w-6 text-blue-500" /> Virtual Bank Simulator
              </h2>
              <p className="text-xs text-slate-400 mt-1">Divert virtual cash from your wallet to secure interest-bearing bank instruments.</p>
            </div>

            {successMsg && (
              <div className="bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs flex items-center">
                <ShieldCheck className="h-5 w-5 mr-2 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {error && (
              <div className="bg-rose-600/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs">
                {error}
              </div>
            )}

            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white">Your Bank Deposits</h3>
              
              {loading && accounts.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">Syncing ledger...</div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-850 rounded-xl">
                  No active deposits found. Fill the form to open your first virtual account.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {accounts.map((acc) => (
                    <div key={acc.id} className="bg-slate-900/60 border border-slate-850 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold tracking-wider ${
                            acc.account_type === "SAVINGS" ? "bg-blue-600/15 text-blue-400" : "bg-purple-600/15 text-purple-400"
                          }`}>
                            {acc.account_type}
                          </span>
                          <h4 className="text-lg font-bold text-white mt-2 font-mono">
                            ₹{acc.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </h4>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/15 px-1.5 py-0.5 rounded">
                          {acc.interest_rate * 100}% p.a.
                        </span>
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-slate-850 text-[10px] text-slate-500 flex justify-between">
                        <span>Opened: {new Date(acc.created_at).toLocaleDateString()}</span>
                        {acc.account_type === "FD" && (
                          <span className="text-slate-400 font-bold">Matures: {new Date(acc.maturity_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create Account Form */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white">Open New Virtual Deposit</h3>
              <form onSubmit={handleOpenAccount} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">Deposit Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-white text-xs px-4 py-2.5 rounded-xl focus:outline-none"
                  >
                    <option value="SAVINGS">Savings Account (4.0% p.a.)</option>
                    <option value="FD">Fixed Deposit (7.5% p.a.)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">Deposit Amount (INR)</label>
                  <input
                    type="number"
                    min={1000}
                    value={newAmount}
                    onChange={(e) => setNewAmount(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 text-white font-mono text-xs px-4 py-2.5 rounded-xl focus:outline-none"
                  />
                </div>
                {newType === "FD" ? (
                  <div>
                    <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">Tenure (Months)</label>
                    <select
                      value={newTenure}
                      onChange={(e) => setNewTenure(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 text-white text-xs px-4 py-2.5 rounded-xl focus:outline-none"
                    >
                      <option value={3}>3 Months</option>
                      <option value={6}>6 Months</option>
                      <option value={12}>12 Months (1 Year)</option>
                      <option value={36}>36 Months (3 Years)</option>
                      <option value={60}>60 Months (5 Years)</option>
                    </select>
                  </div>
                ) : (
                  <div></div>
                )}
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition md:col-start-3"
                >
                  Create Deposit
                </button>
              </form>
            </div>
          </div>

          {/* FD Compound Interest Calculator (Right Sidebar) */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-500" /> FD Compound Calculator
            </h3>
            
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 uppercase tracking-wider font-bold mb-1.5">Invested Amount (P)</label>
                <input
                  type="range"
                  min={10000}
                  max={5000000}
                  step={10000}
                  value={fdAmount}
                  onChange={(e) => setFdAmount(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <span className="text-white font-mono font-bold block mt-1">₹{fdAmount.toLocaleString("en-IN")}</span>
              </div>

              <div>
                <label className="block text-slate-500 uppercase tracking-wider font-bold mb-1.5">Tenure (N)</label>
                <select
                  value={fdTenure}
                  onChange={(e) => setFdTenure(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 text-white px-3 py-2 rounded-lg"
                >
                  <option value={3}>3 Months</option>
                  <option value={6}>6 Months</option>
                  <option value={12}>12 Months (1 Year)</option>
                  <option value={36}>36 Months (3 Years)</option>
                  <option value={60}>60 Months (5 Years)</option>
                </select>
              </div>

              {fdMaturity && (
                <div className="bg-[#050814] p-4 rounded-xl border border-slate-850 space-y-2.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Maturity Value:</span>
                    <span className="text-emerald-400 font-bold">₹{fdMaturity.maturity_value.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Interest Earned:</span>
                    <span className="text-slate-300">₹{fdMaturity.interest_earned.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Rate of Interest:</span>
                    <span className="text-slate-300">{fdMaturity.interest_rate * 100}% p.a. (compounded quarterly)</span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </main>
      </div>

      <AIHelpdesk isOpen={showChat} onClose={() => setShowChat(false)} />
    </div>
  );
}
