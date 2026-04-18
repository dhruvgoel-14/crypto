const express = require("express");
const router = express.Router();
const { spawn } = require("child_process");
const path = require("path");

router.get("/:coin", (req, res) => {
  const coin = req.params.coin;
  const scriptPath = path.join(__dirname, "../python/predict.py");

  const pythonProcess = spawn("python3", [scriptPath, coin]);

  let result = "";
  let errorOutput = "";

  pythonProcess.stdout.on("data", (data) => {
    result += data.toString();
  });

  pythonProcess.stderr.on("data", (data) => {
    errorOutput += data.toString();
  });

  pythonProcess.on("close", (code) => {
    if (code !== 0) {
      return res.status(500).json({ error: "Prediction failed", details: errorOutput });
    }
    const trimmed = result.trim();
    // Parse: "bitcoin prediction: UP (confidence: 0.72)"
    const match = trimmed.match(/prediction:\s*(UP|DOWN)\s*\(confidence:\s*([\d.]+)\)/i);
    if (match) {
      res.json({
        coin,
        direction: match[1].toUpperCase(),
        confidence: parseFloat(match[2]),
        raw: trimmed,
      });
    } else {
      res.json({ coin, direction: "UNKNOWN", confidence: 0, raw: trimmed });
    }
  });
});

module.exports = router;
