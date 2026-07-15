"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, ArrowRight, ShieldCheck, BarChart3, Landmark, Cpu } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  return (
    <main className="min-h-screen bg-[#050814] relative overflow-hidden flex flex-col justify-between">
      {/* Background gradients */}
      <div className="absolute top-[-30%] left-[-20%] w-[70%] h-[70%] rounded-full bg-blue-900/10 blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-[-30%] right-[-20%] w-[70%] h-[70%] rounded-full bg-emerald-950/10 blur-[130px] pointer-events-none"></div>

      {/* Navigation */}
      <nav className="max-w-7xl mx-auto w-full px-6 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <span className="font-extrabold text-lg text-white tracking-tight">FinLit Sim</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-slate-400 hover:text-white text-sm font-semibold transition">
            Log In
          </Link>
          <Link href="/signup" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shadow-lg shadow-blue-500/10">
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto w-full px-6 text-center py-20 relative z-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-600/10 border border-blue-500/20 text-blue-400 mb-6">
          <ShieldCheck className="h-4 w-4" /> 100% Risk-Free Virtual Market Simulation
        </span>
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1] max-w-4xl mx-auto">
          Master Stock Investing <br />
          <span className="bg-gradient-to-r from-blue-500 to-emerald-400 bg-clip-text text-transparent">Using Real NSE/BSE Market Data</span>
        </h1>
        <p className="text-slate-400 text-base max-w-2xl mx-auto mt-6 leading-relaxed">
          FinLit Sim teaches young Indian professionals how to trade and grow wealth responsibly. Simulate investments, leverage virtual savings deposits, and get real-time AI feedback on your decisions.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4 items-center">
          <Link href="/signup" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3.5 rounded-xl transition shadow-xl shadow-blue-600/15 active:scale-[0.98]">
            <span>Start Learning Now</span> <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/login" className="w-full sm:w-auto bg-[#111827] hover:bg-slate-800 border border-slate-800 text-slate-350 hover:text-white font-semibold px-8 py-3.5 rounded-xl transition">
            Access Simulator
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto w-full px-6 grid grid-cols-1 md:grid-cols-3 gap-8 py-12 relative z-10 border-t border-slate-850">
        <div className="bg-[#111827]/40 border border-slate-800/80 p-6 rounded-2xl space-y-3">
          <div className="bg-blue-600/10 p-3 rounded-xl text-blue-500 w-fit border border-blue-500/10">
            <BarChart3 className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-white text-sm">Real-time Quotes & Tickers</h3>
          <p className="text-slate-450 text-xs leading-relaxed">
            Monitor real-time prices for Sensex, Nifty 50, and leading Indian equities synced with live Yahoo Finance feeds.
          </p>
        </div>

        <div className="bg-[#111827]/40 border border-slate-800/80 p-6 rounded-2xl space-y-3">
          <div className="bg-emerald-600/10 p-3 rounded-xl text-emerald-500 w-fit border border-emerald-500/10">
            <Landmark className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-white text-sm">Virtual Bank Deposits</h3>
          <p className="text-slate-450 text-xs leading-relaxed">
            Diversify portfolios by creating simulated savings and fixed deposit accounts with quarterly interest compounding.
          </p>
        </div>

        <div className="bg-[#111827]/40 border border-slate-800/80 p-6 rounded-2xl space-y-3">
          <div className="bg-purple-600/10 p-3 rounded-xl text-purple-500 w-fit border border-purple-500/10">
            <Cpu className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-white text-sm">Decision Scoring Engine</h3>
          <p className="text-slate-450 text-xs leading-relaxed">
            Get instant feedback on your trading patterns. The scoring engine evaluates risk metrics to grow your Learning Score.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-[10px] text-slate-650 border-t border-slate-900 bg-slate-950/20 relative z-10">
        © 2026 FinLit Sim. Created for learning purposes only. No real currency is ever transacted or held.
      </footer>
    </main>
  );
}
