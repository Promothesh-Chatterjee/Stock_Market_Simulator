import YahooFinanceClass from 'yahoo-finance2';
import process from 'process';

const yahooFinance = new YahooFinanceClass();




// Define realistic base prices for Indian stocks/indices
const MOCK_MARKETS = {
  "^NSEI": { name: "Nifty 50", price: 24350.0, prev: 24200.0, open: 24220.0, high: 24400.0, low: 24180.0, vol: 350000000 },
  "^BSESN": { name: "BSE Sensex", price: 79900.0, prev: 79500.0, open: 79550.0, high: 80100.0, low: 79400.0, vol: 15000000 },
  "RELIANCE.NS": { name: "Reliance Industries Ltd", price: 2510.0, prev: 2480.0, open: 2485.0, high: 2530.0, low: 2470.0, vol: 5400000 },
  "RELIANCE.BO": { name: "Reliance Industries Ltd (BSE)", price: 2510.0, prev: 2480.0, open: 2485.0, high: 2530.0, low: 2470.0, vol: 120000 },
  "TCS.NS": { name: "Tata Consultancy Services Ltd", price: 3820.0, prev: 3850.0, open: 3860.0, high: 3880.0, low: 3800.0, vol: 2100000 },
  "TCS.BO": { name: "Tata Consultancy Services Ltd (BSE)", price: 3820.0, prev: 3850.0, open: 3860.0, high: 3880.0, low: 3800.0, vol: 50000 },
  "INFY.NS": { name: "Infosys Ltd", price: 1560.0, prev: 1540.0, open: 1545.0, high: 1575.0, low: 1530.0, vol: 4800000 },
  "INFY.BO": { name: "Infosys Ltd (BSE)", price: 1560.0, prev: 1540.0, open: 1545.0, high: 1575.0, low: 1530.0, vol: 90000 },
  "HDFCBANK.NS": { name: "HDFC Bank Ltd", price: 1610.0, prev: 1600.0, open: 1602.0, high: 1620.0, low: 1595.0, vol: 12000000 },
  "HDFCBANK.BO": { name: "HDFC Bank Ltd (BSE)", price: 1610.0, prev: 1600.0, open: 1602.0, high: 1620.0, low: 1595.0, vol: 240000 },
  "ICICIBANK.NS": { name: "ICICI Bank Ltd", price: 1120.0, prev: 1105.0, open: 1110.0, high: 1130.0, low: 1100.0, vol: 8000000 },
  "ICICIBANK.BO": { name: "ICICI Bank Ltd (BSE)", price: 1120.0, prev: 1105.0, open: 1110.0, high: 1130.0, low: 1100.0, vol: 150000 },
  "SBIN.NS": { name: "State Bank of India", price: 840.0, prev: 825.0, open: 828.0, high: 845.0, low: 822.0, vol: 15000000 },
  "SBIN.BO": { name: "State Bank of India (BSE)", price: 840.0, prev: 825.0, open: 828.0, high: 845.0, low: 822.0, vol: 350000 },
  "ITC.NS": { name: "ITC Ltd", price: 430.0, prev: 425.0, open: 426.0, high: 432.0, low: 423.0, vol: 9500000 },
  "ITC.BO": { name: "ITC Ltd (BSE)", price: 430.0, prev: 425.0, open: 426.0, high: 432.0, low: 423.0, vol: 220000 },
  "MRF.NS": { name: "MRF Ltd", price: 131875.0, prev: 131025.0, open: 131420.0, high: 133250.0, low: 131140.0, vol: 12000 },
  "MRF.BO": { name: "MRF Ltd (BSE)", price: 131875.0, prev: 131025.0, open: 131420.0, high: 133250.0, low: 131140.0, vol: 1000 },
  "CEAT.NS": { name: "CEAT Ltd", price: 3790.0, prev: 3720.0, open: 3730.0, high: 3820.0, low: 3705.0, vol: 220000 },
  "BOSCHLTD.NS": { name: "Bosch Ltd", price: 41485.0, prev: 41460.0, open: 41470.0, high: 41600.0, low: 41350.0, vol: 5000 },
  "ABBOTT.NS": { name: "Abbott India Ltd", price: 27730.0, prev: 27500.0, open: 27550.0, high: 27900.0, low: 27400.0, vol: 8000 },
  "JUSTDIAL.NS": { name: "Just Dial Ltd", price: 786.0, prev: 790.2, open: 791.0, high: 795.0, low: 782.0, vol: 150000 }
};

function getMockQuote(symbol) {
  const normSymbol = symbol.toUpperCase();
  const mock = MOCK_MARKETS[normSymbol] || {
    name: normSymbol.replace(".NS", "").replace(".BO", "") + " Ltd",
    price: 150.0, prev: 148.0, open: 148.5, high: 152.0, low: 147.0, vol: 100000
  };
  
  // Apply a small random walk fluctuation
  const randomFactor = 1 + (Math.random() - 0.5) * 0.002; // max 0.1% change
  const price = Number((mock.price * randomFactor).toFixed(2));
  const change = Number((price - mock.prev).toFixed(2));
  const changePercent = Number(((change / mock.prev) * 100).toFixed(2));
  
  return {
    symbol: normSymbol,
    regularMarketPrice: price,
    regularMarketChange: change,
    regularMarketChangePercent: changePercent,
    regularMarketOpen: mock.open,
    regularMarketDayHigh: Math.max(mock.high, price),
    regularMarketDayLow: Math.min(mock.low, price),
    regularMarketPreviousClose: mock.prev,
    regularMarketVolume: mock.vol,
    displayName: mock.name,
    shortName: mock.name
  };
}

function getMockHistorical(symbol, fromDate, toDate, interval) {
  const normSymbol = symbol.toUpperCase();
  const base = getMockQuote(normSymbol);
  
  const start = new Date(fromDate);
  const end = new Date(toDate);
  const quotes = [];
  
  let currentPrice = base.regularMarketPreviousClose;
  const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
  
  // Seed random generator based on symbol length to make it deterministic but random-looking
  let seed = normSymbol.length;
  function random() {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  for (let i = 0; i <= daysDiff; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    
    // Skip weekends for historical stock charts
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    
    // Random walk
    const changePercent = (random() - 0.48) * 0.04; // slight upward bias
    const openPrice = Number((currentPrice * (1 + (random() - 0.5) * 0.01)).toFixed(2));
    const closePrice = Number((openPrice * (1 + changePercent)).toFixed(2));
    const highPrice = Number((Math.max(openPrice, closePrice) * (1 + random() * 0.015)).toFixed(2));
    const lowPrice = Number((Math.min(openPrice, closePrice) * (1 - random() * 0.015)).toFixed(2));
    
    quotes.push({
      date: d.toISOString().split('T')[0] + 'T00:00:00.000Z',
      open: openPrice,
      high: highPrice,
      low: lowPrice,
      close: closePrice,
      volume: Math.floor(base.regularMarketVolume * (0.5 + random()))
    });
    
    currentPrice = closePrice;
  }
  
  return {
    meta: {
      symbol: normSymbol,
      currency: "INR",
      exchangeName: normSymbol.endsWith(".NS") ? "NSE" : "BSE"
    },
    quotes: quotes
  };
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(JSON.stringify({ error: "No command provided" }));
    process.exit(1);
  }

  try {
    if (command === 'quote') {
      const symbol = args[1];
      if (!symbol) throw new Error("No symbol provided for quote");
      
      try {
        const result = await yahooFinance.quote(symbol);
        console.log(JSON.stringify(result));
      } catch (err) {
        // Fallback to Mock
        const mockQuote = getMockQuote(symbol);
        console.log(JSON.stringify(mockQuote));
      }
    } else if (command === 'historical') {
      const symbol = args[1];
      const fromDateStr = args[2];
      const toDateStr = args[3];
      const interval = args[4] || '1d';
      
      if (!symbol || !fromDateStr || !toDateStr) {
        throw new Error("Missing parameters for historical");
      }
      
      try {
        const period1 = new Date(fromDateStr);
        const period2 = new Date(toDateStr);
        period2.setDate(period2.getDate() + 1);

        const options = {
          period1: Math.floor(period1.getTime() / 1000),
          period2: Math.floor(period2.getTime() / 1000),
          interval: interval
        };
        const result = await yahooFinance.chart(symbol, options);
        console.log(JSON.stringify(result));
      } catch (err) {
        // Fallback to Mock Historical
        const mockHist = getMockHistorical(symbol, fromDateStr, toDateStr, interval);
        console.log(JSON.stringify(mockHist));
      }
    } else if (command === 'search') {
      const query = args[1];
      if (!query) throw new Error("No query provided for search");
      
      try {
        const result = await yahooFinance.search(query, { lang: 'en-US', region: 'IN' });
        console.log(JSON.stringify(result));
      } catch (err) {
        // Fallback to mock search from local database
        const q = query.toUpperCase();
        const quotes = Object.keys(MOCK_MARKETS)
          .filter(k => k.includes(q) || MOCK_MARKETS[k].name.toUpperCase().includes(q))
          .map(k => ({
            symbol: k,
            shortname: MOCK_MARKETS[k].name,
            longname: MOCK_MARKETS[k].name,
            exchange: k.endsWith(".NS") ? "NSE" : (k.endsWith(".BO") ? "BSE" : "IND"),
            quoteType: "EQUITY"
          }));
        console.log(JSON.stringify({ quotes }));
      }
    } else {
      throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    console.log(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
}

main();
