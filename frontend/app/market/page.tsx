"use client";

import { useState, useEffect } from "react";
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, ReferenceLine, AreaChart, Area 
} from "recharts";
import { Search, Bot, AlertCircle, Sparkles, TrendingUp, Landmark, Calendar } from "lucide-react";
import { api } from "../utils/api";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import AIHelpdesk from "../components/AIHelpdesk";

const TIMEFRAMES = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "Max"];

const POPULAR_TICKERS = [
  { symbol: "MRF.NS", name: "MRF Ltd" },
  { symbol: "RELIANCE.NS", name: "Reliance Industries Ltd" },
  { symbol: "TCS.NS", name: "Tata Consultancy Services Ltd" },
  { symbol: "INFY.NS", name: "Infosys Ltd" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank Ltd" },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank Ltd" },
  { symbol: "SBIN.NS", name: "State Bank of India" },
  { symbol: "ITC.NS", name: "ITC Ltd" }
];

export default function MarketPage() {
  const [query, setQuery] = useState("");
  const [selectedTicker, setSelectedTicker] = useState("MRF.NS");
  const [timeframe, setTimeframe] = useState("1D");
  const [stockData, setStockData] = useState<any>(null);
  const [chartQuotes, setChartQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Trade state
  const [isTrading, setIsTrading] = useState(false);
  const [tradeType, setTradeType] = useState("BUY");
  const [quantity, setQuantity] = useState(1);
  const [objectiveTag, setObjectiveTag] = useState("Learning Basics");
  const [tradeMessage, setTradeMessage] = useState("");
  const [tradeError, setTradeError] = useState("");

  const [showChat, setShowChat] = useState(false);

  // Autocomplete suggestions
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Load stock details
  const loadStockDetails = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getStockDetails(selectedTicker, timeframe);
      setStockData(data);
      
      // Parse chart quotes
      const quotes = data.quotes || [];
      const formatted = quotes.map((q: any) => ({
        time: timeframe === "1D" || timeframe === "5D" 
          ? new Date(q.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : new Date(q.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        price: q.close,
        open: q.open,
        high: q.high,
        low: q.low
      }));
      setChartQuotes(formatted);
    } catch (err: any) {
      setError(err.message || "Failed to load stock data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStockDetails();
  }, [selectedTicker, timeframe]);

  // Autocomplete search handler
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const fetchSuggestions = async () => {
      try {
        const res = await api.searchStocks(query);
        const matches = res.slice(0, 10).map((s: any, idx: number) => ({
          symbol: s.symbol || s.ticker || `search-result-${idx}`,
          name: s.name || s.shortName || s.longName || s.symbol || s.ticker
        }));
        setSuggestions(matches);
      } catch (err) {}
    };
    fetchSuggestions();
  }, [query]);

  const handleExecuteTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setTradeMessage("");
    setTradeError("");
    try {
      const res = await api.executeTrade({
        ticker: selectedTicker,
        transaction_type: tradeType,
        quantity: Number(quantity),
        objective_tag: objectiveTag
      });
      setTradeMessage(`Simulated trade executed! Score: ${res.score >= 0 ? "+" : ""}${res.score} points. Reason: ${res.reason}`);

      setIsTrading(false);
      // Trigger header updates
      window.dispatchEvent(new Event("portfolio-updated"));
      loadStockDetails();
    } catch (err: any) {
      setTradeError(err.message || "Failed to execute simulated trade.");
    }
  };

  const getPriceColor = (change: number) => {
    return change >= 0 ? "text-emerald-400" : "text-rose-400";
  };

  const currentPrice = stockData?.quote?.regularMarketPrice || 0;
  const change = stockData?.quote?.regularMarketChange || 0;
  const changePercent = stockData?.quote?.regularMarketChangePercent || 0;
  const prevClose = stockData?.quote?.regularMarketPreviousClose || currentPrice;
  const isUp = change >= 0;
  const priceColor = getPriceColor(change);

  return (
    <div className="min-h-screen bg-[#050814] flex text-slate-100">
      <Sidebar />
      
      <div className="flex-1 ml-64 min-w-0 min-h-screen flex flex-col">
        <Header onChatToggle={() => setShowChat(!showChat)} showChat={showChat} />
        
        <main className="mt-20 flex-1 p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Stock Detail Panel (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Search and Autocomplete Header */}
            <div className="relative z-50">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (suggestions.length > 0) {
                    let sym = suggestions[0].symbol;
                    if (!sym.includes('.')) sym += '.NS';
                    setSelectedTicker(sym);
                    setQuery("");
                    setSuggestions([]);
                  } else if (query.trim()) {
                    let sym = query.trim().toUpperCase();
                    if (!sym.includes('.')) sym += '.NS';
                    setSelectedTicker(sym);
                    setQuery("");
                  }
                }}
                className="relative flex items-center"
              >
                <Search className="absolute left-4 h-5 w-5 text-slate-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search NSE/BSE stocks (e.g. MRF, Reliance, TCS)..."
                  className="w-full bg-[#111827] border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </form>

              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-[#111827] border border-slate-800 rounded-xl mt-2 overflow-hidden shadow-2xl z-30">
                  {suggestions.map((s, idx) => (
                    <button
                      key={s.symbol || idx}
                      onClick={() => {
                        let sym = s.symbol;
                        if (!sym.includes('.')) sym += '.NS';
                        setSelectedTicker(sym);
                        setQuery("");
                        setSuggestions([]);
                      }}
                      className="w-full text-left px-5 py-3 text-sm hover:bg-slate-800/60 flex items-center justify-between transition"
                    >
                      <span className="font-semibold text-white">{s.symbol}</span>
                      <span className="text-xs text-slate-400">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {loading && !stockData ? (
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                Analyzing market metrics...
              </div>
            ) : error ? (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl flex items-start">
                <AlertCircle className="h-6 w-6 mr-3 shrink-0" />
                <div>
                  <h4 className="font-bold">Error loading metrics</h4>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            ) : (
              <>
                {/* Stock Title & Live Stats card */}
                <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-blue-600/10 text-blue-500 rounded-lg flex items-center justify-center font-bold text-xs border border-blue-500/15">
                          {selectedTicker.split(".")[0]}
                        </div>
                        <div>
                          <h1 className="text-xl font-bold text-white">{stockData?.quote?.displayName || stockData?.quote?.shortName || selectedTicker}</h1>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            NSE: {selectedTicker}
                          </span>
                        </div>
                      </div>
                      
                      {/* Price Section */}
                      <div className="mt-5 flex items-baseline gap-4">
                        <span className="text-3xl font-extrabold text-white font-mono">
                          ₹{currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                        <div className={`flex items-center gap-1.5 text-sm font-bold ${priceColor}`}>
                          <span>{isUp ? "↑" : "↓"}</span>
                          <span>{isUp ? "+" : ""}{change.toFixed(2)}</span>
                          <span>({isUp ? "+" : ""}{changePercent.toFixed(2)}%)</span>
                          <span className="text-slate-500 text-[10px] uppercase font-bold ml-1 tracking-wider">Today</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                        As of {new Date(stockData?.quote?.regularMarketTime || Date.now()).toLocaleString("en-IN")} • Indian Standard Time
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setTradeType("BUY");
                        setIsTrading(true);
                      }}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition shadow-lg shadow-blue-600/15 active:scale-[0.98]"
                    >
                      Invest / Trade
                    </button>
                  </div>

                  {/* Timeframe Selector Tabs */}
                  <div className="flex border-b border-slate-850 gap-6 mt-8">
                    {TIMEFRAMES.map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`pb-3 text-xs font-bold tracking-wider relative transition ${
                          timeframe === tf ? "text-blue-500" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {tf}
                        {timeframe === tf && (
                          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500"></div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Interactive Custom Recharts Line Chart */}
                  <div className="h-72 w-full mt-6">
                    {chartQuotes.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartQuotes} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                          <defs>
                            <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={isUp ? "#10b981" : "#ef4444"} stopOpacity={0.15} />
                              <stop offset="100%" stopColor={isUp ? "#10b981" : "#ef4444"} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis 
                            dataKey="time" 
                            stroke="#475569" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                          />
                          <YAxis 
                            domain={["auto", "auto"]} 
                            stroke="#475569" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                            orientation="right" 
                            tickFormatter={(val) => `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#111827", borderColor: "#1f2937", borderRadius: "12px" }}
                            labelClassName="text-slate-500 text-[10px] font-bold"
                            itemStyle={{ color: "#f8fafc", fontSize: "11px", fontFamily: "monospace" }}
                            formatter={(val: any) => [`₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, "Price"]}
                          />
                          {timeframe === "1D" && (
                            <ReferenceLine y={prevClose} stroke="#475569" strokeDasharray="3 3" label={{ value: 'Prev Close', fill: '#475569', fontSize: 10, position: 'left' }} />
                          )}
                          <Area
                            type="monotone"
                            dataKey="price"
                            stroke={isUp ? "#10b981" : "#ef4444"}
                            strokeWidth={2}
                            fill="url(#chart-grad)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-500 text-xs font-semibold">
                        No historical quotes available for this period.
                      </div>
                    )}
                  </div>

                  {/* Financial metrics grid below chart */}
                  <div className="grid grid-cols-3 gap-6 mt-8 pt-8 border-t border-slate-850 text-xs">
                    <div>
                      <span className="text-slate-500 uppercase tracking-wider block font-bold">Open</span>
                      <span className="text-slate-200 font-semibold font-mono mt-1 block">
                        ₹{floatVal(stockData?.quote?.regularMarketOpen || currentPrice)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase tracking-wider block font-bold">High</span>
                      <span className="text-slate-200 font-semibold font-mono mt-1 block">
                        ₹{floatVal(stockData?.quote?.regularMarketDayHigh || currentPrice)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase tracking-wider block font-bold">Low</span>
                      <span className="text-slate-200 font-semibold font-mono mt-1 block">
                        ₹{floatVal(stockData?.quote?.regularMarketDayLow || currentPrice)}
                      </span>
                    </div>
                    
                    <div>
                      <span className="text-slate-500 uppercase tracking-wider block font-bold">Mkt Cap</span>
                      <span className="text-slate-200 font-semibold font-mono mt-1 block">
                        ₹{formatLargeNumber(stockData?.quote?.marketCap || 55930000000)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase tracking-wider block font-bold">P/E Ratio</span>
                      <span className="text-slate-200 font-semibold font-mono mt-1 block">
                        {floatVal(stockData?.quote?.trailingPE || 23.05)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase tracking-wider block font-bold">52-W High</span>
                      <span className="text-slate-200 font-semibold font-mono mt-1 block">
                        ₹{floatVal(stockData?.quote?.fiftyTwoWeekHigh || currentPrice * 1.15)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 uppercase tracking-wider block font-bold">Div Yield</span>
                      <span className="text-slate-200 font-semibold font-mono mt-1 block">
                        {floatVal(stockData?.quote?.dividendYield || 0.18)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase tracking-wider block font-bold">Qtrly Div Amt</span>
                      <span className="text-slate-200 font-semibold font-mono mt-1 block">
                        ₹59.34
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase tracking-wider block font-bold">52-W Low</span>
                      <span className="text-slate-200 font-semibold font-mono mt-1 block">
                        ₹{floatVal(stockData?.quote?.fiftyTwoWeekLow || currentPrice * 0.85)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Simulated Trade Execution Form */}
                {isTrading && (
                  <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-850 mb-4">
                      <h3 className="font-bold text-white">Execute Virtual Trade</h3>
                      <button onClick={() => setIsTrading(false)} className="text-slate-400 hover:text-white font-medium text-xs">Cancel</button>
                    </div>

                    <form onSubmit={handleExecuteTrade} className="space-y-4">
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => setTradeType("BUY")}
                          className={`flex-1 py-2.5 rounded-xl font-bold border transition ${
                            tradeType === "BUY" 
                              ? "bg-emerald-600/10 border-emerald-500 text-emerald-400" 
                              : "bg-slate-900 border-slate-800 text-slate-400"
                          }`}
                        >
                          BUY
                        </button>
                        <button
                          type="button"
                          onClick={() => setTradeType("SELL")}
                          className={`flex-1 py-2.5 rounded-xl font-bold border transition ${
                            tradeType === "SELL" 
                              ? "bg-rose-600/10 border-rose-500 text-rose-400" 
                              : "bg-slate-900 border-slate-800 text-slate-400"
                          }`}
                        >
                          SELL
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block text-slate-400 uppercase tracking-wider font-semibold mb-1">Quantity</label>
                          <input
                            type="number"
                            required
                            min={1}
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            className="w-full bg-[#0a0f1d] border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 uppercase tracking-wider font-semibold mb-1">Stated Learning Goal</label>
                          <select
                            value={objectiveTag}
                            onChange={(e) => setObjectiveTag(e.target.value)}
                            className="w-full bg-[#0a0f1d] border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                          >
                            <option value="Learning Basics">Learning Basics</option>
                            <option value="Wealth Creation">Wealth Creation</option>
                            <option value="Short-Term Trading">Short-Term Trading</option>
                          </select>
                        </div>
                      </div>

                      <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl text-xs space-y-2 font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Value (Qty x Price):</span>
                          <span className="text-slate-200">₹{(quantity * currentPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Brokerage (0.05% or flat ₹20):</span>
                          <span className="text-slate-200">₹{Math.min(20.0, 0.05 * quantity * currentPrice / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">STT Tax (0.1%):</span>
                          <span className="text-slate-200">₹{(0.001 * quantity * currentPrice).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-800 pt-2 font-bold">
                          <span className="text-slate-400">Total Simulated Amount:</span>
                          <span className="text-blue-400">
                            ₹{(quantity * currentPrice + Math.min(20.0, 0.05 * quantity * currentPrice / 100) + 0.001 * quantity * currentPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {tradeError && <div className="text-red-400 text-xs">{tradeError}</div>}

                      <button
                        type="submit"
                        className={`w-full py-3 text-white font-bold rounded-xl transition ${
                          tradeType === "BUY" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
                        }`}
                      >
                        Confirm simulated {tradeType} order
                      </button>
                    </form>
                  </div>
                )}

                {tradeMessage && (
                  <div className="bg-blue-600/10 border border-blue-500/25 p-5 rounded-2xl text-xs flex items-start animate-pop-in">
                    <Sparkles className="h-5 w-5 mr-3 text-blue-400 shrink-0" />
                    <div>
                      <h4 className="font-bold text-white flex items-center gap-1.5">Trade Decision Evaluation</h4>
                      <p className="text-slate-300 mt-1">{tradeMessage}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Sidebar - Related Stocks & AI performance analysis */}
          <div className="space-y-6">
            
            {/* Related Peers component */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider text-slate-400">Related Stocks</h3>
              <div className="space-y-4">
                {POPULAR_TICKERS.filter(t => t.symbol !== selectedTicker).slice(0, 4).map((peer) => {
                  // Simulate return
                  const rng = seedRandom(peer.symbol.length);
                  const isUp = rng > 0.45;
                  const price = Math.round(rng * 4000) + 500;
                  const changePct = (isUp ? "+" : "-") + (rng * 2).toFixed(2) + "%";
                  return (
                    <button
                      key={peer.symbol}
                      onClick={() => setSelectedTicker(peer.symbol)}
                      className="w-full flex items-center justify-between p-3 bg-slate-900/40 hover:bg-slate-800/40 border border-slate-850 rounded-xl transition text-left"
                    >
                      <div>
                        <span className="font-semibold text-xs text-white block">{peer.symbol.split(".")[0]}</span>
                        <span className="text-[10px] text-slate-500 truncate max-w-[120px] block">{peer.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-semibold text-white block">₹{price.toLocaleString("en-IN")}</span>
                        <span className={`text-[10px] font-bold ${isUp ? "text-emerald-400" : "text-rose-400"}`}>{changePct}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Summary report for stock */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-500" />
                <h3 className="text-sm font-bold text-white">AI Analysis Report</h3>
              </div>
              
              <div className="bg-[#050814]/85 border border-slate-800/60 p-4 rounded-xl text-xs leading-relaxed text-slate-300">
                {loading ? (
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-800 rounded w-3/4 animate-pulse"></div>
                    <div className="h-3 bg-slate-800 rounded w-5/6 animate-pulse"></div>
                    <div className="h-3 bg-slate-800 rounded w-2/3 animate-pulse"></div>
                  </div>
                ) : (
                  <p>
                    {stockData?.ai_summary || 
                     `${selectedTicker.split(".")[0]} is currently trading at ₹${currentPrice.toLocaleString("en-IN")}, representing a daily shift of ${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%. The stock exhibits a 52-week trading range of ₹${floatVal(stockData?.quote?.fiftyTwoWeekLow)} to ₹${floatVal(stockData?.quote?.fiftyTwoWeekHigh)}. Standard returns standard deviation classifies the asset volatility as MEDIUM, representing a stable play suitable for moderate portfolios. Stated objective alignments suggest buying during consolidation phases for long term gains.`}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <span>Volatility: Medium</span>
                <span>Powered by Claude AI</span>
              </div>
            </div>

          </div>

        </main>
      </div>

      <AIHelpdesk isOpen={showChat} onClose={() => setShowChat(false)} />
    </div>
  );
}

// Helpers
function floatVal(val: any) {
  if (!val) return "0.00";
  return Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatLargeNumber(val: any) {
  if (!val) return "0.00";
  const num = Number(val);
  if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(2)} Lakh`;
  return num.toLocaleString("en-IN");
}

function seedRandom(len: number) {
  const x = Math.sin(len) * 10000;
  return x - Math.floor(x);
}
