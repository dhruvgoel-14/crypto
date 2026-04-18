const express = require("express");
const cors = require("cors");
const predictRoute = require("./routes/predict");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("CryptoTrader Backend running ✅");
});

app.use("/predict", predictRoute);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
