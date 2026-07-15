const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

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

  return response.json();
}

export const api = {
  // Auth
  async signup(email: string, password: string) {
    const data = await fetchWithAuth("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data.access_token) {
      localStorage.setItem("token", data.access_token);
    }
    return data;
  },

  async login(email: string, password: string) {
    const data = await fetchWithAuth("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
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
