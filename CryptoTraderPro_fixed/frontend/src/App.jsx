import { useState, useEffect, useCallback, useRef } from "react";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const BACKEND_BASE = "http://localhost:5000";

const COINS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function useLocalStorage(key, init) {
  const [val, setVal] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : init;
    } catch {
      return init;
    }
  });
  const set = useCallback(
    (v) => {
      setVal(v);
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {}
    },
    [key]
  );
  return [val, set];
}

const fmt = (n) =>
  n === undefined || n === null
    ? "—"
    : "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPct = (n) =>
  n === undefined || n === null ? "—" : (n >= 0 ? "+" : "") + n.toFixed(2) + "%";

// ─── Sub-components ─────────────────────────────────────────────────────────

function Avatar({ name, size = 36 }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const colors = ["#00e09e", "#5b8def", "#d4537e", "#f5a623", "#7f77dd", "#e24b4a"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color + "22",
        border: `1.5px solid ${color}44`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: color,
        fontWeight: 600,
        fontSize: size * 0.36,
        fontFamily: "'Space Mono', monospace",
      }}
    >
      {initials}
    </div>
  );
}

function Sparkline({ data, positive }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data),
    max = Math.max(...data),
    range = max - min || 1;
  const w = 80,
    h = 32;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline
        points={pts}
        fill="none"
        stroke={positive ? "#00e09e" : "#ff4f4f"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}

function PriceChart({ prices }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!prices || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const w = canvas.width,
      h = canvas.height;
    const pts = prices;
    const min = Math.min(...pts),
      max = Math.max(...pts),
      range = max - min || 1;
    const pad = { t: 20, r: 10, b: 30, l: 70 };
    ctx.clearRect(0, 0, w, h);

    const textColor = "#7a8499";
    const gridColor = "rgba(255,255,255,0.04)";
    const isUp = pts[pts.length - 1] >= pts[0];
    const lineColor = isUp ? "#00e09e" : "#ff4f4f";
    const fillColor = isUp ? "rgba(0,224,158,0.06)" : "rgba(255,79,79,0.06)";

    const xScale = (i) => pad.l + (i / (pts.length - 1)) * (w - pad.l - pad.r);
    const yScale = (v) => pad.t + (1 - (v - min) / range) * (h - pad.t - pad.b);

    // Grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (i * (h - pad.t - pad.b)) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      const val = max - (i / 4) * range;
      ctx.fillStyle = textColor;
      ctx.font = "11px 'DM Sans', sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(
        "$" + (val >= 1000 ? (val / 1000).toFixed(1) + "k" : val.toFixed(2)),
        pad.l - 6,
        y + 4
      );
    }

    // Time labels
    const intervals = [0, Math.floor(pts.length / 4), Math.floor(pts.length / 2), Math.floor((3 * pts.length) / 4), pts.length - 1];
    const labels = ["7d ago", "5d ago", "4d ago", "2d ago", "Now"];
    ctx.fillStyle = textColor;
    ctx.font = "11px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    intervals.forEach((idx, li) => {
      ctx.fillText(labels[li], xScale(idx), h - 8);
    });

    // Fill area
    ctx.beginPath();
    ctx.moveTo(xScale(0), yScale(pts[0]));
    pts.forEach((v, i) => ctx.lineTo(xScale(i), yScale(v)));
    ctx.lineTo(xScale(pts.length - 1), h - pad.b);
    ctx.lineTo(xScale(0), h - pad.b);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    pts.forEach((v, i) =>
      i === 0 ? ctx.moveTo(xScale(i), yScale(v)) : ctx.lineTo(xScale(i), yScale(v))
    );
    ctx.stroke();
  }, [prices]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={200}
      style={{ width: "100%", height: 200, borderRadius: 8 }}
    />
  );
}

// ─── AI Prediction Badge ─────────────────────────────────────────────────────

function PredictionBadge({ coinId }) {
  const [pred, setPred] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);

  const fetchPrediction = useCallback(async () => {
    setLoading(true);
    setErr(false);
    setPred(null);
    try {
      const r = await fetch(`${BACKEND_BASE}/predict/${coinId}`);
      if (!r.ok) throw new Error("Backend error");
      const data = await r.json();
      setPred(data);
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  }, [coinId]);

  useEffect(() => {
    fetchPrediction();
  }, [fetchPrediction]);

  const isUp = pred?.direction === "UP";
  const confPct = pred ? Math.round(pred.confidence * 100) : 0;

  return (
    <div
      style={{
        background: "var(--color-background-secondary)",
        border: "1px solid var(--color-border-primary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "16px 18px",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🤖</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-text-primary)",
              fontFamily: "'Space Mono', monospace",
              letterSpacing: "0.03em",
            }}
          >
            AI Prediction
          </span>
        </div>
        <button
          onClick={fetchPrediction}
          style={{
            fontSize: 11,
            padding: "4px 10px",
            background: "transparent",
            border: "1px solid var(--color-border-primary)",
            borderRadius: 6,
            color: "var(--color-text-secondary)",
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--color-text-secondary)",
            fontSize: 13,
          }}
        >
          <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
          Running ML model…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {err && (
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
          ⚠️ Backend offline. Start the backend server to see predictions.
          <br />
          <span style={{ opacity: 0.6 }}>
            Run: <code style={{ fontFamily: "monospace" }}>cd backend && npm start</code>
          </span>
        </div>
      )}

      {pred && !loading && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: isUp ? "#00e09e" : "#ff4f4f",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              {isUp ? "↑ UP" : "↓ DOWN"}
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 3 }}>
                Confidence
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  fontFamily: "'Space Mono', monospace",
                }}
              >
                {confPct}%
              </div>
            </div>
          </div>
          {/* Confidence bar */}
          <div
            style={{
              height: 4,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: confPct + "%",
                height: "100%",
                background: isUp ? "#00e09e" : "#ff4f4f",
                borderRadius: 2,
                transition: "width 0.6s ease",
              }}
            />
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: "var(--color-text-secondary)",
              opacity: 0.7,
            }}
          >
            Based on 30-day momentum, moving averages & volatility signals
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState("login");
  const [users, setUsers] = useLocalStorage("ct_users", {});
  const [currentUser, setCurrentUser] = useLocalStorage("ct_session", null);
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [formErr, setFormErr] = useState("");

  const [prices, setPrices] = useState({});
  const [sparklines, setSparklines] = useState({});
  const [chartData, setChartData] = useState(null);
  const [selectedCoin, setSelectedCoin] = useState(COINS[0]);
  const [tab, setTab] = useState("market");
  const [tradeTab, setTradeTab] = useState("buy");
  const [tradeAmount, setTradeAmount] = useState("");
  const [tradeMsg, setTradeMsg] = useState("");
  const [chartLoading, setChartLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // ── Fetchers ──────────────────────────────────────────────────────────────

  const fetchPrices = useCallback(async () => {
    try {
      const ids = COINS.map((c) => c.id).join(",");
      const r = await fetch(
        `${COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`
      );
      if (!r.ok) return;
      const data = await r.json();
      setPrices(data);
      setLastUpdated(new Date());
    } catch {}
  }, []);

  const fetchSparklines = useCallback(async () => {
    try {
      const ids = COINS.map((c) => c.id).join(",");
      const r = await fetch(
        `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${ids}&sparkline=true&price_change_percentage=7d`
      );
      if (!r.ok) return;
      const data = await r.json();
      const sp = {};
      data.forEach((c) => {
        sp[c.id] = c.sparkline_in_7d?.price || [];
      });
      setSparklines(sp);
    } catch {}
  }, []);

  const fetchChart = useCallback(async (coinId) => {
    setChartLoading(true);
    try {
      const r = await fetch(`${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=7`);
      if (!r.ok) return;
      const data = await r.json();
      setChartData(data.prices.map((p) => p[1]));
    } catch {} finally {
      setChartLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    fetchSparklines();
    const iv = setInterval(fetchPrices, 30000);
    return () => clearInterval(iv);
  }, [fetchPrices, fetchSparklines]);

  useEffect(() => {
    if (tab === "trade" || tab === "market") {
      setChartData(null);
      fetchChart(selectedCoin.id);
    }
  }, [selectedCoin, tab, fetchChart]);

  useEffect(() => {
    if (currentUser) setScreen("app");
  }, [currentUser]);

  // ── Auth ──────────────────────────────────────────────────────────────────

  const getUser = () => (currentUser ? users[currentUser] : null);
  const saveUser = (u) => {
    const updated = { ...users, [u.username]: u };
    setUsers(updated);
  };

  const handleRegister = () => {
    setFormErr("");
    if (!form.username.trim() || !form.email.trim() || !form.password)
      return setFormErr("All fields required.");
    if (form.password.length < 6) return setFormErr("Password must be 6+ characters.");
    if (form.password !== form.confirm) return setFormErr("Passwords do not match.");
    if (users[form.username]) return setFormErr("Username already taken.");
    const newUser = {
      username: form.username,
      email: form.email,
      password: form.password,
      balance: 10000,
      portfolio: {},
      transactions: [],
    };
    saveUser(newUser);
    setCurrentUser(form.username);
    setForm({ username: "", email: "", password: "", confirm: "" });
  };

  const handleLogin = () => {
    setFormErr("");
    const u = users[form.username];
    if (!u || u.password !== form.password) return setFormErr("Invalid username or password.");
    setCurrentUser(form.username);
    setForm({ username: "", email: "", password: "", confirm: "" });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setScreen("login");
    setTab("market");
  };

  // ── Trade ─────────────────────────────────────────────────────────────────

  const handleTrade = () => {
    const user = getUser();
    if (!user) return;
    const qty = parseFloat(tradeAmount);
    if (!qty || qty <= 0) return setTradeMsg("Enter a valid amount.");
    const p = prices[selectedCoin.id]?.usd;
    if (!p) return setTradeMsg("Price not available.");
    const cost = qty * p;
    let updated = {
      ...user,
      portfolio: { ...user.portfolio },
      transactions: [...user.transactions],
    };
    if (tradeTab === "buy") {
      if (cost > user.balance) return setTradeMsg("Insufficient balance.");
      updated.balance -= cost;
      updated.portfolio[selectedCoin.id] = (updated.portfolio[selectedCoin.id] || 0) + qty;
    } else {
      const held = updated.portfolio[selectedCoin.id] || 0;
      if (qty > held) return setTradeMsg(`You only hold ${held.toFixed(6)} ${selectedCoin.symbol}.`);
      updated.balance += cost;
      updated.portfolio[selectedCoin.id] = held - qty;
      if (updated.portfolio[selectedCoin.id] < 0.000001) delete updated.portfolio[selectedCoin.id];
    }
    updated.transactions.unshift({
      type: tradeTab,
      coin: selectedCoin.id,
      symbol: selectedCoin.symbol,
      qty,
      price: p,
      total: cost,
      date: new Date().toISOString(),
    });
    saveUser(updated);
    setUsers((prev) => ({ ...prev, [updated.username]: updated }));
    setTradeMsg(
      `${tradeTab === "buy" ? "Bought" : "Sold"} ${qty} ${selectedCoin.symbol} at $${p.toLocaleString()}`
    );
    setTradeAmount("");
  };

  const portfolioValue = () => {
    const user = getUser();
    if (!user) return 0;
    return Object.entries(user.portfolio).reduce(
      (sum, [id, qty]) => sum + qty * (prices[id]?.usd || 0),
      0
    );
  };

  // ── Auth Screen ───────────────────────────────────────────────────────────

  if (screen !== "app") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "var(--color-background-tertiary)",
        }}
      >
        {/* Background grid */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(91,141,239,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(91,141,239,0.03) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            pointerEvents: "none",
          }}
        />
        <div style={{ width: "100%", maxWidth: 400, position: "relative" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "linear-gradient(135deg, #00e09e22, #5b8def22)",
                border: "1.5px solid #00e09e44",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem",
                fontSize: 26,
              }}
            >
              ₿
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                fontFamily: "'Space Mono', monospace",
                letterSpacing: "-0.02em",
              }}
            >
              CryptoTrader
            </h1>
            <p style={{ margin: "6px 0 0", color: "var(--color-text-secondary)", fontSize: 13 }}>
              Paper trading · CoinGecko API · AI signals
            </p>
          </div>

          <div
            style={{
              background: "var(--color-background-secondary)",
              border: "1px solid var(--color-border-primary)",
              borderRadius: "var(--border-radius-lg)",
              padding: "1.75rem",
            }}
          >
            {/* Tab switcher */}
            <div
              style={{
                display: "flex",
                gap: 4,
                marginBottom: "1.5rem",
                background: "var(--color-background-tertiary)",
                borderRadius: 10,
                padding: 4,
              }}
            >
              {["login", "register"].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setScreen(s);
                    setFormErr("");
                  }}
                  style={{
                    flex: 1,
                    padding: "9px",
                    border: "none",
                    borderRadius: 7,
                    background:
                      screen === s ? "var(--color-background-secondary)" : "transparent",
                    color:
                      screen === s ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    fontWeight: screen === s ? 600 : 400,
                    fontSize: 14,
                    boxShadow: screen === s ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
                    letterSpacing: "0.01em",
                  }}
                >
                  {s === "login" ? "Sign In" : "Register"}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {screen === "register" && (
                <>
                  <div>
                    <label
                      style={{
                        fontSize: 11,
                        color: "var(--color-text-secondary)",
                        display: "block",
                        marginBottom: 5,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Username
                    </label>
                    <input
                      placeholder="satoshi"
                      value={form.username}
                      onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: 11,
                        color: "var(--color-text-secondary)",
                        display: "block",
                        marginBottom: 5,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      style={{ width: "100%" }}
                    />
                  </div>
                </>
              )}
              {screen === "login" && (
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      color: "var(--color-text-secondary)",
                      display: "block",
                      marginBottom: 5,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Username
                  </label>
                  <input
                    placeholder="satoshi"
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    style={{ width: "100%" }}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                </div>
              )}
              <div>
                <label
                  style={{
                    fontSize: 11,
                    color: "var(--color-text-secondary)",
                    display: "block",
                    marginBottom: 5,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  style={{ width: "100%" }}
                  onKeyDown={(e) => e.key === "Enter" && (screen === "login" ? handleLogin() : handleRegister())}
                />
              </div>
              {screen === "register" && (
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      color: "var(--color-text-secondary)",
                      display: "block",
                      marginBottom: 5,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Confirm password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={form.confirm}
                    onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                    style={{ width: "100%" }}
                  />
                </div>
              )}
              {formErr && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "#ff4f4f",
                    background: "rgba(255,79,79,0.08)",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,79,79,0.15)",
                  }}
                >
                  {formErr}
                </p>
              )}
              <button
                onClick={screen === "login" ? handleLogin : handleRegister}
                style={{
                  marginTop: 4,
                  background: "linear-gradient(135deg, #00e09e, #00c48a)",
                  color: "#0a0d14",
                  border: "none",
                  padding: "12px",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 15,
                  letterSpacing: "0.01em",
                }}
              >
                {screen === "login" ? "Sign In →" : "Create Account →"}
              </button>
              {screen === "register" && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: "var(--color-text-secondary)",
                    textAlign: "center",
                  }}
                >
                  You start with <strong style={{ color: "#00e09e" }}>$10,000</strong> virtual USD
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main App ──────────────────────────────────────────────────────────────

  const user = getUser();
  if (!user) {
    setCurrentUser(null);
    setScreen("login");
    return null;
  }
  const portVal = portfolioValue();
  const totalAssets = user.balance + portVal;

  const navItems = [
    { key: "market", label: "Market" },
    { key: "trade", label: "Trade" },
    { key: "portfolio", label: "Portfolio" },
    { key: "history", label: "History" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)" }}>
      {/* Background grid */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(91,141,239,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(91,141,239,0.02) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div
        style={{
          background: "rgba(15,17,23,0.92)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--color-border-tertiary)",
          padding: "0 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 58,
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: "linear-gradient(135deg, #00e09e22, #5b8def22)",
              border: "1px solid #00e09e33",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 17,
            }}
          >
            ₿
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "var(--color-text-primary)",
              fontFamily: "'Space Mono', monospace",
              letterSpacing: "-0.01em",
            }}
          >
            CryptoTrader
          </span>
        </div>

        <div style={{ display: "flex", gap: 2 }}>
          {navItems.map((n) => (
            <button
              key={n.key}
              onClick={() => setTab(n.key)}
              style={{
                padding: "7px 16px",
                border: "none",
                borderRadius: 8,
                background:
                  tab === n.key ? "rgba(91,141,239,0.12)" : "transparent",
                color:
                  tab === n.key ? "#5b8def" : "var(--color-text-secondary)",
                fontWeight: tab === n.key ? 600 : 400,
                fontSize: 13,
                borderBottom: tab === n.key ? "2px solid #5b8def" : "2px solid transparent",
              }}
            >
              {n.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right" }}>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              {fmt(totalAssets)}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-secondary)" }}>
              {user.username}
            </p>
          </div>
          <Avatar name={user.username} />
          <button
            onClick={handleLogout}
            style={{
              fontSize: 12,
              color: "var(--color-text-secondary)",
              background: "none",
              border: "1px solid var(--color-border-primary)",
              padding: "5px 12px",
              borderRadius: 7,
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ padding: "1.5rem", maxWidth: 1000, margin: "0 auto", position: "relative" }}>

        {/* ── MARKET TAB ── */}
        {tab === "market" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                  fontFamily: "'Space Mono', monospace",
                }}
              >
                Live Market
              </h2>
              {lastUpdated && (
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                  🟢 Live · Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {COINS.map((coin) => {
                const p = prices[coin.id];
                const sp = sparklines[coin.id] || [];
                const change = p?.usd_24h_change;
                const pos = change >= 0;
                return (
                  <div
                    key={coin.id}
                    onClick={() => {
                      setChartData(null);
                      setSelectedCoin(coin);
                      setTab("trade");
                      fetchChart(coin.id);
                    }}
                    style={{
                      background: "var(--color-background-secondary)",
                      border: "1px solid var(--color-border-tertiary)",
                      borderRadius: "var(--border-radius-lg)",
                      padding: "14px 18px",
                      display: "flex",
                      alignItems: "center",
                      cursor: "pointer",
                      gap: 14,
                      transition: "border-color 0.15s, background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-border-primary)";
                      e.currentTarget.style.background = "#1a2030";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-border-tertiary)";
                      e.currentTarget.style.background = "var(--color-background-secondary)";
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: "50%",
                        background: "rgba(91,141,239,0.08)",
                        border: "1px solid rgba(91,141,239,0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 12,
                        color: "#5b8def",
                        flexShrink: 0,
                        fontFamily: "'Space Mono', monospace",
                      }}
                    >
                      {coin.symbol.slice(0, 3)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 15,
                          color: "var(--color-text-primary)",
                        }}
                      >
                        {coin.name}
                      </div>
                      <div
                        style={{ fontSize: 12, color: "var(--color-text-secondary)" }}
                      >
                        {coin.symbol}
                      </div>
                    </div>
                    <div style={{ flex: "0 0 80px" }}>
                      <Sparkline data={sp} positive={pos} />
                    </div>
                    <div style={{ textAlign: "right", minWidth: 110 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 15,
                          color: "var(--color-text-primary)",
                          fontFamily: "'Space Mono', monospace",
                        }}
                      >
                        {p ? fmt(p.usd) : "Loading…"}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: pos ? "#00e09e" : "#ff4f4f",
                        }}
                      >
                        {p ? fmtPct(change) : "—"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: 100 }}>
                      <div
                        style={{ fontSize: 11, color: "var(--color-text-secondary)" }}
                      >
                        Mkt Cap
                      </div>
                      <div
                        style={{ fontSize: 13, color: "var(--color-text-primary)" }}
                      >
                        {p?.usd_market_cap
                          ? "$" + (p.usd_market_cap / 1e9).toFixed(1) + "B"
                          : "—"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TRADE TAB ── */}
        {tab === "trade" && (
          <div>
            <h2
              style={{
                margin: "0 0 1rem",
                fontSize: 22,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              Trade
            </h2>
            {/* Coin selector */}
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                marginBottom: "1.25rem",
              }}
            >
              {COINS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCoin(c);
                    setTradeMsg("");
                  }}
                  style={{
                    padding: "7px 16px",
                    border:
                      selectedCoin.id === c.id
                        ? "1.5px solid #5b8def"
                        : "1px solid var(--color-border-primary)",
                    borderRadius: 20,
                    background:
                      selectedCoin.id === c.id
                        ? "rgba(91,141,239,0.12)"
                        : "var(--color-background-secondary)",
                    color:
                      selectedCoin.id === c.id
                        ? "#5b8def"
                        : "var(--color-text-secondary)",
                    fontSize: 13,
                    fontWeight: selectedCoin.id === c.id ? 600 : 400,
                    fontFamily: selectedCoin.id === c.id ? "'Space Mono', monospace" : "inherit",
                  }}
                >
                  {c.symbol}
                </button>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr minmax(0,310px)",
                gap: 16,
              }}
            >
              {/* Left: Chart */}
              <div>
                <div
                  style={{
                    background: "var(--color-background-secondary)",
                    border: "1px solid var(--color-border-primary)",
                    borderRadius: "var(--border-radius-lg)",
                    padding: "1.25rem",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 14,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 26,
                          fontWeight: 700,
                          color: "var(--color-text-primary)",
                          fontFamily: "'Space Mono', monospace",
                        }}
                      >
                        {prices[selectedCoin.id] ? fmt(prices[selectedCoin.id].usd) : "Loading…"}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color:
                            prices[selectedCoin.id]?.usd_24h_change >= 0
                              ? "#00e09e"
                              : "#ff4f4f",
                          marginTop: 3,
                          fontWeight: 600,
                        }}
                      >
                        {prices[selectedCoin.id]
                          ? fmtPct(prices[selectedCoin.id].usd_24h_change) + " (24h)"
                          : ""}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-secondary)",
                        textAlign: "right",
                      }}
                    >
                      <div style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>
                        {selectedCoin.name} · {selectedCoin.symbol}
                      </div>
                      <div style={{ marginTop: 4 }}>
                        Vol 24h:{" "}
                        {prices[selectedCoin.id]?.usd_24h_vol
                          ? "$" +
                            (prices[selectedCoin.id].usd_24h_vol / 1e6).toFixed(1) +
                            "M"
                          : "—"}
                      </div>
                    </div>
                  </div>
                  {chartLoading ? (
                    <div
                      style={{
                        height: 200,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--color-text-secondary)",
                        fontSize: 13,
                      }}
                    >
                      Loading chart…
                    </div>
                  ) : (
                    <PriceChart prices={chartData} />
                  )}
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: 11,
                      color: "var(--color-text-secondary)",
                      textAlign: "right",
                      opacity: 0.6,
                    }}
                  >
                    7-day price chart · CoinGecko API · refreshes every 30s
                  </p>
                </div>

                {/* AI Prediction - integrated from ProjectX backend */}
                <PredictionBadge coinId={selectedCoin.id} key={selectedCoin.id} />
              </div>

              {/* Right: Order panel */}
              <div
                style={{
                  background: "var(--color-background-secondary)",
                  border: "1px solid var(--color-border-primary)",
                  borderRadius: "var(--border-radius-lg)",
                  padding: "1.25rem",
                  alignSelf: "start",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    marginBottom: "1.25rem",
                    background: "var(--color-background-tertiary)",
                    borderRadius: 10,
                    padding: 4,
                  }}
                >
                  {["buy", "sell"].map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setTradeTab(t);
                        setTradeMsg("");
                      }}
                      style={{
                        flex: 1,
                        padding: "9px",
                        border: "none",
                        borderRadius: 7,
                        background:
                          tradeTab === t
                            ? t === "buy"
                              ? "linear-gradient(135deg, #00e09e, #00c48a)"
                              : "linear-gradient(135deg, #ff4f4f, #e03030)"
                            : "transparent",
                        color: tradeTab === t ? (t === "buy" ? "#0a0d14" : "#fff") : "var(--color-text-secondary)",
                        fontWeight: tradeTab === t ? 700 : 400,
                        fontSize: 14,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {t === "buy" ? "Buy" : "Sell"}
                    </button>
                  ))}
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label
                    style={{
                      fontSize: 11,
                      color: "var(--color-text-secondary)",
                      display: "block",
                      marginBottom: 5,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Amount ({selectedCoin.symbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={tradeAmount}
                    onChange={(e) => {
                      setTradeAmount(e.target.value);
                      setTradeMsg("");
                    }}
                    style={{ width: "100%" }}
                  />
                </div>

                {tradeAmount && prices[selectedCoin.id] && (
                  <div
                    style={{
                      background: "var(--color-background-tertiary)",
                      borderRadius: 10,
                      padding: "12px 14px",
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ color: "var(--color-text-secondary)" }}>Total cost</span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: "var(--color-text-primary)",
                          fontFamily: "'Space Mono', monospace",
                        }}
                      >
                        {fmt(parseFloat(tradeAmount) * prices[selectedCoin.id].usd)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: "var(--color-text-secondary)" }}>Available</span>
                      <span style={{ color: "var(--color-text-primary)" }}>
                        {tradeTab === "buy"
                          ? fmt(user.balance)
                          : (user.portfolio[selectedCoin.id] || 0).toFixed(6) +
                            " " +
                            selectedCoin.symbol}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleTrade}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "none",
                    borderRadius: 10,
                    background:
                      tradeTab === "buy"
                        ? "linear-gradient(135deg, #00e09e, #00c48a)"
                        : "linear-gradient(135deg, #ff4f4f, #e03030)",
                    color: tradeTab === "buy" ? "#0a0d14" : "#fff",
                    fontWeight: 700,
                    fontSize: 15,
                    letterSpacing: "0.01em",
                  }}
                >
                  {tradeTab === "buy" ? "Buy" : "Sell"} {selectedCoin.symbol}
                </button>

                {tradeMsg && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "10px 14px",
                      borderRadius: 9,
                      background:
                        tradeMsg.startsWith("Bought") || tradeMsg.startsWith("Sold")
                          ? "rgba(0,224,158,0.08)"
                          : "rgba(255,79,79,0.08)",
                      color:
                        tradeMsg.startsWith("Bought") || tradeMsg.startsWith("Sold")
                          ? "#00e09e"
                          : "#ff4f4f",
                      fontSize: 13,
                      fontWeight: 500,
                      border:
                        tradeMsg.startsWith("Bought") || tradeMsg.startsWith("Sold")
                          ? "1px solid rgba(0,224,158,0.15)"
                          : "1px solid rgba(255,79,79,0.15)",
                    }}
                  >
                    {tradeMsg}
                  </div>
                )}

                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: "1px solid var(--color-border-tertiary)",
                    fontSize: 12,
                    color: "var(--color-text-secondary)",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Cash balance</span>
                  <strong
                    style={{
                      color: "var(--color-text-primary)",
                      fontFamily: "'Space Mono', monospace",
                    }}
                  >
                    {fmt(user.balance)}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PORTFOLIO TAB ── */}
        {tab === "portfolio" && (
          <div>
            <h2
              style={{
                margin: "0 0 1.25rem",
                fontSize: 22,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              Portfolio
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 10,
                marginBottom: "1.5rem",
              }}
            >
              {[
                { label: "Total assets", value: fmt(totalAssets), accent: "#5b8def" },
                { label: "Cash balance", value: fmt(user.balance), accent: "#00e09e" },
                { label: "Investments", value: fmt(portVal), accent: "#f5a623" },
                { label: "Coins held", value: Object.keys(user.portfolio).length, accent: "#d4537e" },
              ].map((m) => (
                <div
                  key={m.label}
                  style={{
                    background: "var(--color-background-secondary)",
                    border: "1px solid var(--color-border-tertiary)",
                    borderRadius: 12,
                    padding: "1.1rem",
                    borderTop: `2px solid ${m.accent}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--color-text-secondary)",
                      marginBottom: 8,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {m.label}
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: m.accent,
                      fontFamily: "'Space Mono', monospace",
                    }}
                  >
                    {m.value}
                  </div>
                </div>
              ))}
            </div>

            {Object.keys(user.portfolio).length === 0 ? (
              <div
                style={{
                  background: "var(--color-background-secondary)",
                  border: "1px solid var(--color-border-primary)",
                  borderRadius: "var(--border-radius-lg)",
                  padding: "3rem",
                  textAlign: "center",
                }}
              >
                <p style={{ color: "var(--color-text-secondary)", margin: "0 0 16px" }}>
                  No holdings yet. Go to Trade to buy your first coin.
                </p>
                <button
                  onClick={() => setTab("trade")}
                  style={{
                    padding: "9px 22px",
                    background: "linear-gradient(135deg, #00e09e, #00c48a)",
                    color: "#0a0d14",
                    border: "none",
                    borderRadius: 9,
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  Start Trading →
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {Object.entries(user.portfolio).map(([id, qty]) => {
                  const coin = COINS.find((c) => c.id === id);
                  const p = prices[id]?.usd || 0;
                  const val = qty * p;
                  const pct = totalAssets > 0 ? (val / totalAssets) * 100 : 0;
                  return (
                    <div
                      key={id}
                      style={{
                        background: "var(--color-background-secondary)",
                        border: "1px solid var(--color-border-tertiary)",
                        borderRadius: "var(--border-radius-lg)",
                        padding: "14px 18px",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                      }}
                    >
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: "50%",
                          background: "rgba(91,141,239,0.08)",
                          border: "1px solid rgba(91,141,239,0.15)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: 11,
                          color: "#5b8def",
                          flexShrink: 0,
                          fontFamily: "'Space Mono', monospace",
                        }}
                      >
                        {coin?.symbol.slice(0, 3) || "?"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 15,
                            color: "var(--color-text-primary)",
                            marginBottom: 3,
                          }}
                        >
                          {coin?.name || id}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--color-text-secondary)",
                            marginBottom: 8,
                            fontFamily: "'Space Mono', monospace",
                          }}
                        >
                          {qty.toFixed(6)} {coin?.symbol}
                        </div>
                        <div
                          style={{
                            height: 3,
                            background: "rgba(255,255,255,0.05)",
                            borderRadius: 2,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: pct + "%",
                              height: "100%",
                              background: "linear-gradient(90deg, #5b8def, #00e09e)",
                              borderRadius: 2,
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 16,
                            color: "var(--color-text-primary)",
                            fontFamily: "'Space Mono', monospace",
                          }}
                        >
                          {fmt(val)}
                        </div>
                        <div
                          style={{ fontSize: 12, color: "var(--color-text-secondary)" }}
                        >
                          {pct.toFixed(1)}% of assets
                        </div>
                        <div
                          style={{ fontSize: 12, color: "var(--color-text-secondary)" }}
                        >
                          @ {fmt(p)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === "history" && (
          <div>
            <h2
              style={{
                margin: "0 0 1.25rem",
                fontSize: 22,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              Transaction History
            </h2>
            {user.transactions.length === 0 ? (
              <div
                style={{
                  background: "var(--color-background-secondary)",
                  border: "1px solid var(--color-border-primary)",
                  borderRadius: "var(--border-radius-lg)",
                  padding: "3rem",
                  textAlign: "center",
                }}
              >
                <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>
                  No transactions yet.
                </p>
              </div>
            ) : (
              <div
                style={{
                  background: "var(--color-background-secondary)",
                  border: "1px solid var(--color-border-primary)",
                  borderRadius: "var(--border-radius-lg)",
                  overflow: "hidden",
                }}
              >
                {user.transactions.map((tx, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "14px 18px",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      borderBottom:
                        i < user.transactions.length - 1
                          ? "1px solid var(--color-border-tertiary)"
                          : "none",
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        background:
                          tx.type === "buy"
                            ? "rgba(0,224,158,0.1)"
                            : "rgba(255,79,79,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        flexShrink: 0,
                        border:
                          tx.type === "buy"
                            ? "1px solid rgba(0,224,158,0.2)"
                            : "1px solid rgba(255,79,79,0.2)",
                      }}
                    >
                      {tx.type === "buy" ? "↓" : "↑"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          color: "var(--color-text-primary)",
                          textTransform: "capitalize",
                        }}
                      >
                        {tx.type} {tx.symbol}
                      </div>
                      <div
                        style={{ fontSize: 12, color: "var(--color-text-secondary)" }}
                      >
                        {new Date(tx.date).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: tx.type === "buy" ? "#ff4f4f" : "#00e09e",
                          fontFamily: "'Space Mono', monospace",
                        }}
                      >
                        {tx.type === "buy" ? "-" : "+"}
                        {fmt(tx.total)}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--color-text-secondary)",
                          fontFamily: "'Space Mono', monospace",
                        }}
                      >
                        {tx.qty.toFixed(6)} @ {fmt(tx.price)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
