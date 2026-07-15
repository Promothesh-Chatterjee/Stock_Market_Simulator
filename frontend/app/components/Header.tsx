"use client";

import { useState, useEffect } from "react";
import { MessageSquareCode, User, RefreshCw } from "lucide-react";
import { api } from "../utils/api";

interface HeaderProps {
  onChatToggle: () => void;
  showChat: boolean;
}

export default function Header({ onChatToggle, showChat }: HeaderProps) {
  const [profile, setProfile] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [marketStatus, setMarketStatus] = useState<any>({ is_trading_day: true, status_message: "Loading..." });
  const [istTime, setIstTime] = useState("");
  const [useShortFormat, setUseShortFormat] = useState(false); // Lakh/Crore toggle
  
  // Fetch header data
  const fetchData = async () => {
    try {
      const profData = await api.getProfile();
      setProfile(profData);
      
      const portData = await api.getPortfolioSummary();
      setPortfolio(portData);
      
      const statusData = await api.getMarketStatus();
      setMarketStatus(statusData);
    } catch (err) {
      console.error("Error loading header data:", err);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Refresh portfolio/profile every 8 seconds
    const interval = setInterval(fetchData, 8000);
    
    // Listen to manual triggers (e.g. after a trade)
    const handleUpdate = () => fetchData();
    window.addEventListener("portfolio-updated", handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("portfolio-updated", handleUpdate);
    };
  }, []);

  // IST Clock (runs locally, synced to local clock formatted in Asia/Kolkata timezone)
  useEffect(() => {
    const updateClock = () => {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      };
      const formatter = new Intl.DateTimeFormat("en-US", options);
      setIstTime(formatter.format(new Date()));
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount: number) => {
    if (useShortFormat) {
      if (amount >= 10000000) {
        return `₹${(amount / 10000000).toFixed(2)} Cr`;
      } else if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(2)} L`;
      }
    }
    return amount.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });
  };

  const getStatusBadgeColor = (status: string) => {
    if (status.includes("Open")) return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25";
    if (status.includes("Pre-Open")) return "bg-blue-500/10 text-blue-400 border border-blue-500/25";
    return "bg-rose-500/10 text-rose-400 border border-rose-500/25";
  };

  const netWorth = portfolio ? portfolio.net_worth : 0;
  const todayPnl = portfolio ? portfolio.today_pnl : 0;
  const todayPnlPercent = portfolio ? portfolio.today_pnl_percent : 0;
  const isProfit = todayPnl >= 0;

  return (
    <header className="h-20 bg-[#0d1324] border-b border-slate-800/80 fixed top-0 right-0 left-64 flex items-center justify-between px-8 z-15">
      {/* Welcome Greeting */}
      <div>
        <h2 className="text-white font-semibold text-sm">
          Namaste, {profile?.full_name || "Investor"}
        </h2>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">IST Clock</span>
          <span className="text-xs text-slate-300 font-mono">{istTime}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getStatusBadgeColor(marketStatus.status_message)}`}>
            {marketStatus.status_message}
          </span>
        </div>
      </div>

      {/* Portfolio Info & Actions */}
      <div className="flex items-center gap-8">
        
        {/* Net Worth Stat */}
        <div className="text-right">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">Net Worth</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white font-mono">{formatCurrency(netWorth)}</span>
            <button 
              onClick={() => setUseShortFormat(!useShortFormat)}
              className="text-[9px] px-1.5 py-0.5 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white rounded border border-slate-700 font-medium tracking-tight transition"
            >
              {useShortFormat ? "RAW" : "SHORT"}
            </button>
          </div>
        </div>

        {/* Daily P&L Stat */}
        <div className="text-right">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">Today&apos;s P&L</span>
          <span className={`text-sm font-bold font-mono block ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
            {isProfit ? "+" : ""}{formatCurrency(todayPnl)} ({isProfit ? "+" : ""}{todayPnlPercent.toFixed(2)}%)
          </span>
        </div>

        {/* AI Helpdesk Chat Trigger */}
        <button
          onClick={onChatToggle}
          className={`p-2.5 rounded-xl border transition ${
            showChat 
              ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20" 
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-750"
          }`}
          title="Toggle AI Helpdesk"
        >
          <MessageSquareCode className="h-5 w-5" />
        </button>

        {/* Profile Details Badge */}
        <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800/80 px-4 py-2 rounded-xl">
          <div className="bg-blue-600/10 p-1.5 rounded-lg border border-blue-500/15">
            <User className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <span className="text-xs text-white font-medium block truncate max-w-[100px]">{profile?.full_name || "User"}</span>
            <span className="text-[9px] text-slate-500 font-semibold block uppercase tracking-wider">
              {profile?.risk_appetite || "Moderate"}
            </span>
          </div>
        </div>

      </div>
    </header>
  );
}
