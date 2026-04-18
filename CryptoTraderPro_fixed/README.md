# CryptoTrader Pro

A full-stack crypto paper trading app with real-time CoinGecko prices and AI price predictions.

## 🗂 Project Structure

```
CryptoTraderPro/
├── backend/               ← Node.js + Python ML backend (from ProjectX)
│   ├── server.js          ← Express server on port 5000
│   ├── routes/
│   │   └── predict.js     ← GET /predict/:coin → calls Python ML model
│   ├── python/
│   │   ├── predict.py     ← Fetches CoinGecko data, runs ML prediction
│   │   └── model.pkl      ← Pre-trained RandomForest model
│   └── package.json
│
└── frontend/              ← React + Vite frontend
    ├── src/
    │   ├── App.jsx        ← Main app (auth + market + trade + portfolio + history)
    │   ├── index.css      ← Global dark theme styles
    │   └── main.jsx       ← React entry point
    ├── index.html
    ├── vite.config.js     ← Dev proxy: /predict → localhost:5000
    └── package.json
```

## ✅ Features

- **Auth**: Register / Login with localStorage persistence
- **Market**: Live prices, 24h change, sparklines, market cap (CoinGecko API, auto-refresh every 30s)
- **Trade**: Real-time 7-day chart, buy/sell with virtual $10,000 balance
- **AI Prediction**: ML model predicts UP/DOWN for each coin with confidence score
- **Portfolio**: Holdings breakdown with allocation bars
- **History**: Full transaction log

## 🚀 Setup & Run

### Step 1 — Backend (Python + Node)

Install Python dependencies:
```bash
pip install requests pandas scikit-learn
```

Install Node dependencies:
```bash
cd backend
npm install
```

Start backend:
```bash
node server.js
# → Server running on port 5000
```

Test it:
```
http://localhost:5000/predict/bitcoin
```

### Step 2 — Frontend

```bash
cd frontend
npm install
npm run dev
# → App at http://localhost:3000
```

> The Vite dev server proxies `/predict/*` to `http://localhost:5000` automatically.

## 🔌 How Backend + Frontend Connect

The frontend's `PredictionBadge` component calls:
```
GET http://localhost:5000/predict/{coinId}
```

Response:
```json
{
  "coin": "bitcoin",
  "direction": "UP",
  "confidence": 0.72,
  "raw": "bitcoin prediction: UP (confidence: 0.72)"
}
```

The backend spawns `python/predict.py` which:
1. Fetches 30 days of OHLCV data from CoinGecko
2. Engineers features: returns, MA5, MA10, volatility, momentum
3. Runs inference on `model.pkl` (pre-trained RandomForest)
4. Returns UP/DOWN + confidence

## ⚠️ Notes

- If backend is offline, the AI Prediction panel shows a graceful warning — the rest of the app still works
- Prices are fetched directly from CoinGecko's free API (no key needed)
- All user data is stored in browser localStorage
