const express = require("express");
const cors = require("cors");

const predictRoute = require("./routes/predict");

const app = express();

app.use(cors());
app.use(express.json());

// test route
app.get("/", (req, res) => {
  res.send("Backend running ");
});

// main route
app.use("/predict", predictRoute);

app.listen(5000, () => {
  console.log("Server running on port 5000");
});