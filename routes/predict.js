const express = require("express");
const router = express.Router();
const { spawn } = require("child_process");

router.get("/:coin", (req, res) => {
  const coin = req.params.coin;

  const pythonProcess = spawn("python", ["python/predict.py", coin]);

  let result = "";

  pythonProcess.stdout.on("data", (data) => {
    console.log("Python Output:", data.toString());
    result += data.toString();
  });

  pythonProcess.stderr.on("data", (data) => {
    console.error(`Error: ${data}`);
  });

  pythonProcess.on("close", () => {
    res.json({
      coin,
      prediction: result.trim(),
    });
  });
});

module.exports = router;