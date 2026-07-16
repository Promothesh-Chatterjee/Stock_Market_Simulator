const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// In-Memory & LocalStorage Client-Side Fallback DB
const getLocalStorage = (key: string, defaultVal: any) => {
  if (typeof window === "undefined") return defaultVal;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultVal;
};

const setLocalStorage = (key: string, val: any) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(val));
  }
};

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
      throw new Error("Unauthorized");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Something went wrong");
    }

    return await response.json();
  } catch (error: any) {
    // If it's a TypeError (e.g. Failed to fetch because server is offline), execute client-side fallback
    if (error instanceof TypeError || error.message.includes("Failed to fetch") || error.message.includes("fetch")) {
      console.warn("FastAPI backend offline. Engaging client-side mock fallback engine...", endpoint);
      return handleClientFallback(endpoint, options);
    }
    throw error;
  }
}

// Client-Side Mock Database Handler
function handleClientFallback(endpoint: string, options: RequestInit): any {
  const method = options.method || "GET";
  const body = options.body ? JSON.parse(options.body as string) : null;

  // Helper mock prices
  const MOCK_STOCK_PRICES: Record<string, number> = {
    "MRF.NS": 131875.0, "RELIANCE.NS": 2510.0, "TCS.NS": 3820.0, 
    "INFY.NS": 1560.0, "HDFCBANK.NS": 1610.0, "ICICIBANK.NS": 1120.0, 
    "SBIN.NS": 840.0, "ITC.NS": 430.0, "CEAT.NS": 3790.0
  };

  // Auth endpoints
  if (endpoint.startsWith("/auth/signup")) {
    const { email: username } = body;
    setLocalStorage("mock_user", { username });
    localStorage.setItem("token", "mock-token-xyz");
    return { access_token: "mock-token-xyz", token_type: "bearer" };
  }
  
  if (endpoint.startsWith("/auth/login")) {
    const { email: username } = body;
    setLocalStorage("mock_user", { username });
    localStorage.setItem("token", "mock-token-xyz");
    return { access_token: "mock-token-xyz", token_type: "bearer" };
  }

  // Profile endpoints
  if (endpoint.startsWith("/profile/me")) {
    const profile = getLocalStorage("mock_profile", null);
    if (!profile) {
      // Simulate profile if onboarding is complete
      const user = getLocalStorage("mock_user", { username: "Guest" });
      return {
        user_id: 1,
        full_name: user.username,
        employment_status: "Salaried",
        annual_salary: 800000,
        financial_objectives: ["Wealth Creation"],
        risk_appetite: "Moderate",
        learning_score: getLocalStorage("mock_score", 0)
      };
    }
    profile.learning_score = getLocalStorage("mock_score", 0);
    return profile;
  }

  if (endpoint.startsWith("/profile/onboarding")) {
    setLocalStorage("mock_profile", {
      user_id: 1,
      full_name: body.full_name,
      employment_status: body.employment_status,
      annual_salary: body.annual_salary,
      financial_objectives: body.financial_objectives,
      risk_appetite: body.risk_appetite,
      learning_score: 0
    });
    setLocalStorage("mock_wallet", { cash_balance: body.starting_capital });
    setLocalStorage("mock_score", 0);
    setLocalStorage("mock_holdings", []);
    setLocalStorage("mock_txs", []);
    setLocalStorage("mock_bank", []);
    return getLocalStorage("mock_profile", {});
  }

  // Market status
  if (endpoint.startsWith("/market/status")) {
    return {
      status: "OPEN",
      status_message: "Market Open (Mock Sandbox Mode)",
      ist_time: new Date().toISOString()
    };
  }

  if (endpoint.startsWith("/market/quotes")) {
    const params = new URLSearchParams(endpoint.split("?")[1] || "");
    const tickers = (params.get("tickers") || "MRF.NS").split(",");
    return tickers.map(ticker => {
      const price = MOCK_STOCK_PRICES[ticker] || 150.0;
      return {
        ticker,
        price,
        change: price * 0.005,
        change_percent: 0.5,
        open: price * 0.995,
        high: price * 1.01,
        low: price * 0.99,
        previous_close: price * 0.995,
        sparkline: [price * 0.99, price * 0.995, price * 1.002, price]
      };
    });
  }

  if (endpoint.startsWith("/market/news")) {
    return [
      { headline: "Market Sandbox Mode active: Backend is offline, running on client-side simulation store.", source: "System", url: "#", published_at: new Date() },
      { headline: "Sensex crosses 80,000 milestone as FII buying surges in banking shares", source: "Moneycontrol", url: "#", published_at: new Date() },
      { headline: "Nifty reaches record highs after TCS & Infosys report stronger earnings", source: "Economic Times", url: "#", published_at: new Date() }
    ];
  }

  if (endpoint.startsWith("/market/calendar")) {
    const params = new URLSearchParams(endpoint.split("?")[1] || "");
    const dateStr = params.get("date") || "";
    const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6;
    
    if (isWeekend) {
      return { date: dateStr, is_trading_day: false, status_message: "Market Closed - Weekend" };
    }
    
    return {
      date: dateStr,
      is_trading_day: true,
      status_message: "Market Open",
      nifty: { open: 24220, high: 24400, low: 24180, close: 24350 },
      sensex: { open: 79550, high: 80100, low: 79400, close: 79900 },
      gainers: [
        { ticker: "MRF.NS", name: "MRF Ltd", price: 131875, change_percent: 2.45 },
        { ticker: "RELIANCE.NS", name: "Reliance", price: 2510, change_percent: 1.85 }
      ],
      losers: [
        { ticker: "TCS.NS", name: "TCS", price: 3820, change_percent: -1.25 }
      ],
      user_trades: getLocalStorage("mock_txs", []).filter((t: any) => t.created_at.startsWith(dateStr)),
      user_pnl_summary: { total_invested: 0, pnl: 0, pnl_percent: 0 }
    };
  }

  // Trading endpoints
  if (endpoint.startsWith("/trading/portfolio-summary")) {
    const wallet = getLocalStorage("mock_wallet", { cash_balance: 5000000 });
    const holdings = getLocalStorage("mock_holdings", []);
    let holdingsVal = 0;
    holdings.forEach((h: any) => {
      const price = MOCK_STOCK_PRICES[h.ticker] || h.average_buy_price;
      holdingsVal += h.quantity * price;
    });
    return {
      cash_balance: wallet.cash_balance,
      total_holdings_value: holdingsVal,
      net_worth: wallet.cash_balance + holdingsVal,
      today_pnl: holdingsVal * 0.005,
      today_pnl_percent: 0.5,
      holdings: holdings
    };
  }

  if (endpoint.startsWith("/trading/trade")) {
    const wallet = getLocalStorage("mock_wallet", { cash_balance: 5000000 });
    const holdings = getLocalStorage("mock_holdings", []);
    const txs = getLocalStorage("mock_txs", []);
    
    const { ticker, transaction_type, quantity, objective_tag } = body;
    const price = MOCK_STOCK_PRICES[ticker] || 150.0;
    const total_amount = price * quantity;
    const brokerage = Math.min(20, 0.0005 * total_amount);
    const stt = 0.001 * total_amount;
    const grand_total = transaction_type === "BUY" ? total_amount + brokerage + stt : total_amount - brokerage - stt;
    
    if (transaction_type === "BUY") {
      if (wallet.cash_balance < grand_total) {
        throw new Error("Insufficient virtual funds in wallet.");
      }
      wallet.cash_balance -= grand_total;
      
      const exist = holdings.find((h: any) => h.ticker === ticker);
      if (exist) {
        exist.quantity += quantity;
      } else {
        holdings.push({
          id: holdings.length + 1,
          ticker,
          quantity,
          average_buy_price: price,
          current_price: price,
          updated_at: new Date()
        });
      }
    } else {
      const exist = holdings.find((h: any) => h.ticker === ticker);
      if (!exist || exist.quantity < quantity) {
        throw new Error("Insufficient holdings quantity to execute sell trade.");
      }
      exist.quantity -= quantity;
      wallet.cash_balance += grand_total;
    }
    
    // Scoring logic
    let score = 1;
    let reason = "Trade executed with standard parameters.";
    if (grand_total < wallet.cash_balance * 0.1) {
      score = 2;
      reason = "Prudent position sizing: trade kept below 10% of portfolio cash (+2 pts).";
    }
    
    const currScore = getLocalStorage("mock_score", 0);
    setLocalStorage("mock_score", currScore + score);

    txs.push({
      id: txs.length + 1,
      ticker,
      transaction_type,
      quantity,
      price,
      brokerage,
      stt,
      total_amount: grand_total,
      objective_tag,
      score,
      created_at: new Date().toISOString()
    });
    
    setLocalStorage("mock_wallet", wallet);
    setLocalStorage("mock_holdings", holdings.filter((h: any) => h.quantity > 0));
    setLocalStorage("mock_txs", txs);

    return {
      transaction_id: txs.length,
      ticker,
      transaction_type,
      quantity,
      price,
      brokerage,
      stt,
      total_amount: grand_total,
      score,
      reason,
      cash_balance: wallet.cash_balance
    };
  }

  if (endpoint.startsWith("/trading/transactions")) {
    return getLocalStorage("mock_txs", []);
  }

  if (endpoint.startsWith("/trading/analytics")) {
    const wallet = getLocalStorage("mock_wallet", { cash_balance: 5000000 });
    return {
      net_worth_over_time: [
        { date: "2026-07-10", net_worth: wallet.cash_balance * 0.98 },
        { date: "2026-07-15", net_worth: wallet.cash_balance }
      ],
      score_over_time: [
        { date: "2026-07-10", score: 0 },
        { date: "2026-07-15", score: getLocalStorage("mock_score", 0) }
      ],
      win_loss_ratio: [
        { name: "Wins", value: 3 },
        { name: "Losses", value: 1 }
      ],
      cumulative_pnl: [
        { date: "2026-07-10", pnl: -10000 },
        { date: "2026-07-15", pnl: 25000 }
      ]
    };
  }

  // Banking endpoints
  if (endpoint.startsWith("/bank/accounts")) {
    return getLocalStorage("mock_bank", []);
  }

  if (endpoint.startsWith("/bank/create-account")) {
    const wallet = getLocalStorage("mock_wallet", { cash_balance: 5000000 });
    const bank = getLocalStorage("mock_bank", []);
    
    const { account_type, amount, tenure_months } = body;
    if (wallet.cash_balance < amount) {
      throw new Error("Insufficient cash in wallet to open deposit.");
    }
    
    wallet.cash_balance -= amount;
    const rate = account_type === "SAVINGS" ? 0.04 : 0.075;
    
    const newAcc = {
      id: bank.length + 1,
      user_id: 1,
      account_type,
      balance: amount,
      interest_rate: rate,
      tenure_months,
      maturity_date: account_type === "FD" ? new Date(Date.now() + (tenure_months || 12) * 30 * 24 * 60 * 60 * 1000) : null,
      status: "ACTIVE",
      created_at: new Date()
    };
    
    bank.push(newAcc);
    setLocalStorage("mock_wallet", wallet);
    setLocalStorage("mock_bank", bank);
    return newAcc;
  }

  if (endpoint.startsWith("/bank/simulate-fd")) {
    const params = new URLSearchParams(endpoint.split("?")[1] || "");
    const amount = Number(params.get("amount") || 100000);
    const tenure = Number(params.get("tenure_months") || 12);
    const rate = 0.075;
    const years = tenure / 12;
    const maturity = amount * ((1 + rate/4) ** (4 * years));
    return {
      amount,
      tenure_months: tenure,
      interest_rate: rate,
      maturity_value: Math.round(maturity),
      interest_earned: Math.round(maturity - amount)
    };
  }

  // Stock performance page
  if (endpoint.startsWith("/market/stock-performance")) {
    const params = new URLSearchParams(endpoint.split("?")[1] || "");
    const ticker = params.get("ticker") || "MRF.NS";
    const timeframe = params.get("timeframe") || "1D";
    
    const price = MOCK_STOCK_PRICES[ticker] || 150.0;
    
    // Generate mock graph
    const quotes = [];
    const dateRange = timeframe === "1D" ? 6 : (timeframe === "5D" ? 5 : 15);
    for (let i = dateRange; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      quotes.push({
        date: d.toISOString(),
        close: price * (1 + (Math.sin(i) * 0.015)),
        open: price * (1 + (Math.sin(i + 0.5) * 0.015)),
        high: price * (1.02),
        low: price * (0.98)
      });
    }

    return {
      quote: {
        regularMarketPrice: price,
        regularMarketChange: price * 0.006,
        regularMarketChangePercent: 0.6,
        regularMarketOpen: price * 0.994,
        regularMarketDayHigh: price * 1.012,
        regularMarketDayLow: price * 0.988,
        regularMarketPreviousClose: price * 0.994,
        regularMarketTime: new Date().toISOString(),
        displayName: ticker.replace(".NS", "") + " Ltd",
        shortName: ticker.replace(".NS", "") + " Ltd"
      },
      quotes: quotes,
      ai_summary: `${ticker.split(".")[0]} exhibits standard growth alignment in this sandbox simulation. Standard metrics display low-to-medium volatility.`
    };
  }

  // AI Chat helpdesk
  if (endpoint.startsWith("/ai/chat")) {
    const { message } = body;
    const msg = message.toLowerCase();
    let response = "Welcome to FinLit Helpdesk! If you have any questions on Nifty, BSE, or tax brackets, feel free to ask.";
    if (msg.includes("tax") || msg.includes("ltcg")) {
      response = "Indian equity capital gains details: Long-Term Capital Gains (LTCG) over ₹1.25L are taxed at 12.5%. Short-Term (STCG) holds a 20% tax rate.";
    } else if (msg.includes("trade") || msg.includes("score")) {
      response = "You are currently running in Client-Side Sandbox mode. Standard trades evaluate position sizes locally to award +1 or +2 learning points.";
    }
    return { response, sources: ["Local Sandbox Glossary"] };
  }

  return {};
}

export const api = {
  // Auth
  async signup(username: string, password: string) {
    const data = await fetchWithAuth("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email: username, password }),
    });
    if (data.access_token) {
      localStorage.setItem("token", data.access_token);
    }
    return data;
  },

  async login(username: string, password: string) {
    const data = await fetchWithAuth("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: username, password }),
    });
    if (data.access_token) {
      localStorage.setItem("token", data.access_token);
    }
    return data;
  },

  logout() {
    localStorage.removeItem("token");
    window.location.href = "/login";
  },

  // Profile / Onboarding
  async getProfile() {
    return fetchWithAuth("/profile/me");
  },

  async submitOnboarding(profileData: {
    full_name: string;
    employment_status: string;
    annual_salary: number;
    financial_objectives: string[];
    risk_appetite: string;
    starting_capital: number;
  }) {
    return fetchWithAuth("/profile/onboarding", {
      method: "POST",
      body: JSON.stringify(profileData),
    });
  },

  // Market
  async getMarketStatus() {
    return fetchWithAuth("/market/status");
  },

  async getQuotes(tickers: string[]) {
    return fetchWithAuth(`/market/quotes?tickers=${tickers.join(",")}`);
  },

  async getNews() {
    return fetchWithAuth("/market/news");
  },

  // Calendar
  async getCalendarDetails(dateStr: string) {
    return fetchWithAuth(`/market/calendar?date=${dateStr}`);
  },

  async getCalendarStockChart(ticker: string, dateStr: string) {
    return fetchWithAuth(`/market/calendar/chart?ticker=${ticker}&date=${dateStr}`);
  },

  // Trading
  async getHoldings() {
    return fetchWithAuth("/trading/holdings");
  },

  async getPortfolioSummary() {
    return fetchWithAuth("/trading/portfolio-summary");
  },

  async executeTrade(tradeData: {
    ticker: string;
    transaction_type: string;
    quantity: number;
    objective_tag?: string;
  }) {
    return fetchWithAuth("/trading/trade", {
      method: "POST",
      body: JSON.stringify(tradeData),
    });
  },

  // Bank
  async getBankAccounts() {
    return fetchWithAuth("/bank/accounts");
  },

  async createBankAccount(data: {
    account_type: string;
    amount: number;
    tenure_months?: number;
  }) {
    return fetchWithAuth("/bank/create-account", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getFDSimulation(amount: number, tenureMonths: number) {
    return fetchWithAuth(`/bank/simulate-fd?amount=${amount}&tenure_months=${tenureMonths}`);
  },

  // Stock details
  async getStockDetails(ticker: string, timeframe: string) {
    return fetchWithAuth(`/market/stock-performance?ticker=${ticker}&timeframe=${timeframe}`);
  },

  // History & Analytics
  async getTransactions(filters: { ticker?: string; objective_tag?: string } = {}) {
    let query = "";
    if (filters.ticker) query += `ticker=${filters.ticker}&`;
    if (filters.objective_tag) query += `objective_tag=${filters.objective_tag}&`;
    return fetchWithAuth(`/trading/transactions?${query}`);
  },

  async getAnalytics() {
    return fetchWithAuth("/trading/analytics");
  },

  // AI Helpdesk
  async chatWithAI(message: string) {
    return fetchWithAuth("/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  }
};
