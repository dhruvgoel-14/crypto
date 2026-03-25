import sys
import requests
import pandas as pd

coin = sys.argv[1]

# Fetch real data
url = f"https://api.coingecko.com/api/v3/coins/{coin}/market_chart"
params = {
    "vs_currency": "usd",
    "days": "1",
    "interval": "hourly"
}

data = requests.get(url, params=params).json()

prices = data["prices"]

df = pd.DataFrame(prices, columns=["timestamp", "price"])

# Simple logic: compare last 2 prices
if df["price"].iloc[-1] > df["price"].iloc[-2]:
    prediction = "UP"
else:
    prediction = "DOWN"

print(f"{coin} prediction: {prediction}", flush=True)