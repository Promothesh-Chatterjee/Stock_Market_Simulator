"use client";

import { useState, useEffect } from "react";
import { 
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, 
  Calendar as CalendarIcon, Search, Landmark, Award, BookOpen, AlertCircle
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { api } from "../utils/api";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import NewsTicker from "../components/NewsTicker";
import AIHelpdesk from "../components/AIHelpdesk";

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  
  // Indices state
  const [nifty, setNifty] = useState<any>({ price: 24350.0, change: 150.0, change_percent: 0.62 });
  const [sensex, setSensex] = useState<any>({ price: 79900.0, change: 400.0, change_percent: 0.50 });
  const [sparklineNifty, setSparklineNifty] = useState<number[]>([24200, 24220, 24180, 24300, 24280, 24350]);
  const [sparklineSensex, setSparklineSensex] = useState<number[]>([79500, 79550, 79400, 79800, 79700, 79900]);

  // Calendar state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [calendarDetails, setCalendarDetails] = useState<any>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [searchStockTicker, setSearchStockTicker] = useState("");
  const [searchStockChart, setSearchStockChart] = useState<any[]>([]);
  const [searchStockError, setSearchStockError] = useState("");

  const [showChat, setShowChat] = useState(false);
  const [showCalendarPopup, setShowCalendarPopup] = useState(false);

  // WebSocket / Polling for Live index prices
  useEffect(() => {
    let ws: WebSocket | null = null;
    let pollInterval: any = null;

    const setupLiveStream = () => {
      // Clean up existing
      if (ws) ws.close();
      if (pollInterval) clearInterval(pollInterval);

      // Attempt WebSocket connection
      const wsUrl = "ws://localhost:8000/api/v1/market/ws/live-indices";
      try {
        ws = new WebSocket(wsUrl);
        
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.nifty) {
            setNifty(data.nifty);
            setSparklineNifty(prev => [...prev.slice(1), data.nifty.price]);
          }
          if (data.sensex) {
            setSensex(data.sensex);
            setSparklineSensex(prev => [...prev.slice(1), data.sensex.price]);
          }
        };

        ws.onerror = () => {
          // If WS fails, fall back to API polling
          startPolling();
        };
      } catch (err) {
        startPolling();
      }
    };

    const startPolling = () => {
      pollInterval = setInterval(async () => {
        try {
          const quotes = await api.getQuotes(["^NSEI", "^BSESN"]);
          const nQuote = quotes.find((q: any) => q.ticker === "^NSEI");
          const sQuote = quotes.find((q: any) => q.ticker === "^BSESN");
          if (nQuote) {
            setNifty({ price: nQuote.price, change: nQuote.change, change_percent: nQuote.change_percent });
            setSparklineNifty(nQuote.sparkline || []);
          }
          if (sQuote) {
            setSensex({ price: sQuote.price, change: sQuote.change, change_percent: sQuote.change_percent });
            setSparklineSensex(sQuote.sparkline || []);
          }
        } catch (err) {
          console.error("Index polling error:", err);
        }
      }, 5000);
    };

    setupLiveStream();

    return () => {
      if (ws) ws.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  // Fetch initial profile & portfolio details
  const loadDashboardData = async () => {
    try {
      const prof = await api.getProfile();
      setProfile(prof);
      
      const port = await api.getPortfolioSummary();
      setPortfolio(port);
    } catch (err) {
      console.error("Dashboard fetching error:", err);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Fetch calendar details when date changes
  const loadCalendarDetails = async () => {
    if (!selectedDate || selectedDate === "undefined" || selectedDate === "") return;
    setCalendarLoading(true);
    setSearchStockChart([]);
    setSearchStockTicker("");
    setSearchStockError("");
    try {
      const details = await api.getCalendarDetails(selectedDate);

      setCalendarDetails(details);
    } catch (err) {
      console.error("Error loading calendar details:", err);
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarDetails();
  }, [selectedDate]);

  // Search stock chart inside calendar
  const handleCalendarStockSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchStockError("");
    setSearchStockChart([]);
    if (!searchStockTicker.trim()) return;
    
    try {
      const tickerSymbol = searchStockTicker.toUpperCase().endsWith(".NS") 
        ? searchStockTicker.toUpperCase() 
        : `${searchStockTicker.toUpperCase()}.NS`;
      const res = await api.getCalendarStockChart(tickerSymbol, selectedDate);
      
      if (res.quotes && res.quotes.length > 0) {
        const formatted = res.quotes.map((q: any) => ({
          date: new Date(q.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          price: q.close
        }));
        setSearchStockChart(formatted);
      } else {
        setSearchStockError("No stock history found for this date range.");
      }
    } catch (err) {
      setSearchStockError("Stock not found. Try e.g. INFY or TCS.");
    }
  };

  const getScoreLevel = (score: number) => {
    if (score >= 80) return { name: "Market Ready", color: "text-emerald-400 bg-emerald-600/10 border border-emerald-500/20" };
    if (score >= 45) return { name: "Strategic Trader", color: "text-blue-400 bg-blue-600/10 border border-blue-500/20" };
    if (score >= 20) return { name: "Informed Investor", color: "text-amber-400 bg-amber-600/10 border border-amber-500/20" };
    return { name: "Novice", color: "text-slate-400 bg-slate-800 border border-slate-700" };
  };

  const scoreLevel = getScoreLevel(profile?.learning_score || 0);

  // Objective nudges
  const getNudgeMessage = (objectives: string[] = []) => {
    if (objectives.includes("Short-Term Trading")) {
      return "Focus: Short-Term Trading. Volatility is high today. Use the Market Analyzer to analyze intraday indices movement.";
    }
    if (objectives.includes("Wealth Creation")) {
      return "Focus: Long-Term Growth. Diversification reduces risk. Consider holding at least 4 blue-chip stocks.";
    }
    return "Goal: Learning Basics. Safe start: open a Fixed Deposit in the Bank Simulator to understand compounding interest.";
  };

  // Format currency
  const formatCurrency = (val: number) => {
    return val.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  };

  return (
    <div className="min-h-screen bg-[#050814] flex text-slate-100">
      <Sidebar />

      <div className="flex-1 ml-64 min-w-0 min-h-screen flex flex-col">
        <Header onChatToggle={() => setShowChat(!showChat)} showChat={showChat} />

        <main className="mt-20 flex-1 p-8 space-y-6">
          <NewsTicker />

          {/* Top Row: Live Indexes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Nifty 55 Card */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 flex justify-between items-center shadow-lg relative overflow-hidden">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Nifty 50 Index</span>
                <h3 className="text-2xl font-black text-white font-mono mt-1">
                  ₹{nifty.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </h3>
                <div className={`flex items-center gap-1 text-xs font-bold mt-2 ${nifty.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  <span>{nifty.change >= 0 ? "↑" : "↓"}</span>
                  <span>{nifty.change >= 0 ? "+" : ""}{nifty.change.toFixed(2)}</span>
                  <span>({nifty.change_percent >= 0 ? "+" : ""}{nifty.change_percent.toFixed(2)}%)</span>
                </div>
              </div>
              
              {/* Index line trend */}
              <div className="h-12 w-28">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineNifty.map((val, idx) => ({ val, idx }))}>
                    <Line type="monotone" dataKey="val" stroke={nifty.change >= 0 ? "#10b981" : "#ef4444"} strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sensex Index Card */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 flex justify-between items-center shadow-lg relative overflow-hidden">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">BSE Sensex Index</span>
                <h3 className="text-2xl font-black text-white font-mono mt-1">
                  ₹{sensex.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </h3>
                <div className={`flex items-center gap-1 text-xs font-bold mt-2 ${sensex.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  <span>{sensex.change >= 0 ? "↑" : "↓"}</span>
                  <span>{sensex.change >= 0 ? "+" : ""}{sensex.change.toFixed(2)}</span>
                  <span>({sensex.change_percent >= 0 ? "+" : ""}{sensex.change_percent.toFixed(2)}%)</span>
                </div>
              </div>

              <div className="h-12 w-28">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineSensex.map((val, idx) => ({ val, idx }))}>
                    <Line type="monotone" dataKey="val" stroke={sensex.change >= 0 ? "#10b981" : "#ef4444"} strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Grid Layout: Stats Summary & Learn Nudge */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Learning Score Progression */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Learning Score</span>
                    <h3 className="text-2xl font-black text-white mt-1">{profile?.learning_score || 0} pts</h3>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${scoreLevel.color}`}>
                    {scoreLevel.name}
                  </span>
                </div>

                <div className="w-full bg-slate-900 h-2.5 rounded-full mt-6 overflow-hidden border border-slate-800">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all duration-500 shadow-md shadow-blue-500/25"
                    style={{ width: `${Math.min(100, ((profile?.learning_score || 0) / 100) * 100)}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-4">Gain learning score points on every trade evaluation. Next level: 100 points.</p>
            </div>

            {/* Stated Objective Learning Nudge */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 col-span-2 flex items-center gap-5 relative overflow-hidden">
              <div className="bg-blue-600/10 p-4 rounded-xl border border-blue-500/20 text-blue-500 shrink-0">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                  Investment Goal Nudge
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {getNudgeMessage(profile?.financial_objectives)}
                </p>
              </div>
            </div>

          </div>

          {/* Interactive Historical Calendar (Core Feature) */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-blue-500" /> Interactive Market Datepicker
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Pick a date to analyze historical BSE/NSE index movements and your trades.</p>
              </div>
              
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCalendarPopup(!showCalendarPopup)}
                  className="bg-[#0a0f1d] border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 flex items-center gap-2"
                >
                  <CalendarIcon className="w-4 h-4 text-blue-500" />
                  {selectedDate ? new Date(selectedDate).toLocaleDateString('en-GB') : "Select Date"}
                </button>
                {showCalendarPopup && (
                  <div className="absolute top-full mt-2 right-0 z-50 bg-white text-black p-2 rounded-xl shadow-2xl">
                    <Calendar 
                      onChange={(val: any) => {
                        let d = new Date(val);
                        const offset = d.getTimezoneOffset();
                        d = new Date(d.getTime() - (offset*60*1000));
                        setSelectedDate(d.toISOString().split('T')[0]);
                        setShowCalendarPopup(false);
                      }} 
                      value={new Date(selectedDate)}
                    />
                  </div>
                )}
              </div>
            </div>

            {calendarLoading ? (
              <div className="text-center py-8 text-xs text-slate-400">Loading historical data snapshot...</div>
            ) : calendarDetails ? (
              <div className="space-y-6">
                
                {/* Close Overlay Check */}
                {!calendarDetails.is_trading_day ? (
                  <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-xl flex items-start">
                    <AlertCircle className="h-5 w-5 text-rose-500 mr-3 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm text-white">{calendarDetails.status_message}</h4>
                      <p className="text-xs text-slate-400 mt-1">Trading simulator is disabled for this date. Pick a standard business day to continue.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Index quotes & trades summary */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-850">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">Nifty 50 Close</span>
                          <span className="text-sm font-bold text-white font-mono mt-1 block">
                            ₹{calendarDetails.nifty?.close.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-1">Open: ₹{calendarDetails.nifty?.open.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-850">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">Sensex Close</span>
                          <span className="text-sm font-bold text-white font-mono mt-1 block">
                            ₹{calendarDetails.sensex?.close.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-1">Open: ₹{calendarDetails.sensex?.open.toLocaleString("en-IN")}</span>
                        </div>
                      </div>

                      {/* Top Gainers & Losers */}
                      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-850 space-y-4">
                        <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Top Performers of the Day</h4>
                        
                        <div className="grid grid-cols-2 gap-4 text-[10px]">
                          <div>
                            <span className="text-emerald-400 font-semibold block uppercase mb-2">Top Gainers</span>
                            <div className="space-y-2">
                              {calendarDetails.gainers?.map((g: any) => (
                                <div key={g.ticker} className="flex justify-between font-mono bg-slate-950 p-1.5 rounded">
                                  <span className="text-slate-300 font-bold">{g.ticker.split(".")[0]}</span>
                                  <span className="text-emerald-400">+{g.change_percent.toFixed(2)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-rose-400 font-semibold block uppercase mb-2">Top Losers</span>
                            <div className="space-y-2">
                              {calendarDetails.losers?.map((l: any) => (
                                <div key={l.ticker} className="flex justify-between font-mono bg-slate-950 p-1.5 rounded">
                                  <span className="text-slate-300 font-bold">{l.ticker.split(".")[0]}</span>
                                  <span className="text-rose-400">{l.change_percent.toFixed(2)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Historical Stock Search in detail calendar */}
                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-850 flex flex-col justify-between">
                      <form onSubmit={handleCalendarStockSearch} className="space-y-3">
                        <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Analyze Stock Behavior on this Date</h4>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={searchStockTicker}
                            onChange={(e) => setSearchStockTicker(e.target.value)}
                            placeholder="Enter ticker (e.g. INFY, TCS)"
                            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none flex-1"
                          />
                          <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold">
                            Plot Range
                          </button>
                        </div>
                      </form>

                      {searchStockError && <div className="text-red-400 text-[10px] mt-2 font-semibold">{searchStockError}</div>}

                      <div className="h-32 w-full mt-4 bg-slate-950/65 rounded-lg border border-slate-850 p-2">
                        {searchStockChart.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={searchStockChart}>
                              <XAxis dataKey="date" stroke="#475569" fontSize={8} tickLine={false} />
                              <YAxis domain={["auto", "auto"]} stroke="#475569" fontSize={8} orientation="right" tickLine={false} />
                              <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1f2937" }} />
                              <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={1.5} dot={true} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-[10px] text-slate-500 font-semibold">
                            Search ticker to plot surrounding +/- 5 days context chart.
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                )}

                {/* User trades on this date card */}
                {calendarDetails.is_trading_day && calendarDetails.user_trades && calendarDetails.user_trades.length > 0 && (
                  <div className="bg-slate-900/60 p-4 border border-slate-850 rounded-xl space-y-3 text-xs">
                    <h4 className="font-bold text-white uppercase tracking-wider text-[10px] text-slate-400">Your trades on this date</h4>
                    <div className="divide-y divide-slate-800">
                      {calendarDetails.user_trades.map((t: any, idx: number) => (
                        <div key={idx} className="flex justify-between py-2 items-center font-mono">
                          <div>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold mr-2 ${t.type === "BUY" ? "bg-emerald-600/10 text-emerald-400" : "bg-rose-600/10 text-rose-400"}`}>
                              {t.type}
                            </span>
                            <span className="text-white font-bold">{t.ticker.split(".")[0]}</span>
                            <span className="text-slate-500 ml-2">x{t.quantity}</span>
                          </div>
                          <div>
                            <span className="text-slate-300">Price: ₹{t.price.toLocaleString("en-IN")}</span>
                            <span className="text-slate-500 ml-4">Total: ₹{t.amount.toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            ) : null}
          </div>

        </main>
      </div>

      <AIHelpdesk isOpen={showChat} onClose={() => setShowChat(false)} />
    </div>
  );
}
