import sys
import os
import requests
import pandas as pd
import pickle
import warnings

warnings.filterwarnings("ignore")

# Get coin name from args
coin = sys.argv[1]

# Load model - path relative to this file's location
model_path = os.path.join(os.path.dirname(__file__), "model.pkl")
with open(model_path, "rb") as f:
    model = pickle.load(f)

# Fetch data from CoinGecko
url = f"https://api.coingecko.com/api/v3/coins/{coin}/market_chart"
params = {
    "vs_currency": "usd",
    "days": "30"
}

response = requests.get(url, params=params)
data = response.json()
prices = data["prices"]

df = pd.DataFrame(prices, columns=["timestamp", "price"])

# Feature engineering
df["returns"] = df["price"].pct_change()
df["ma_5"] = df["price"].rolling(5).mean()
df["ma_10"] = df["price"].rolling(10).mean()
df["volatility"] = df["returns"].rolling(5).std()
df["momentum"] = df["price"] - df["price"].shift(5)

df = df.dropna()

latest = df.iloc[-1][["returns", "ma_5", "ma_10", "volatility", "momentum"]]
X = pd.DataFrame([latest])

prediction = model.predict(X)[0]
proba = model.predict_proba(X)[0]

result = "UP" if prediction == 1 else "DOWN"
confidence = max(proba)

print(f"{coin} prediction: {result} (confidence: {round(confidence, 2)})", flush=True)
