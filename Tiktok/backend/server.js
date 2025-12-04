"use strict";

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Supadata } = require("@supadata/js");
const path = require("path");
const mysql = require('mysql2');

dotenv.config();

const PORT = process.env.PORT || 3001;
const FRONTEND_DIR = path.join(__dirname, "../frontend");

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(FRONTEND_DIR));

// Database connection
let con = mysql.createConnection({
  host: "localhost",
  port: 3307,
  user: "root",
  password: "rootpassword",
  database: "IS436"
});

con.connect(function(err) {
  if (err) throw err;
  console.log("MySQL Database connected!");

  const sql = "SELECT recipeID, url, content FROM RECIPE";
    con.query(sql, function (err, results) {
      if (err) {
        console.error("DB query error:", err);
        return sendError(res, 500, "Failed to fetch recipes");
      }

      console.log(results);
    });
  
});

// Helpers
const sendError = (res, status, message, extra = {}) =>
  res.status(status).json({ ok: false, error: { message, ...extra } });

const isValidTikTokUrl = (value) => {
  try {
    const u = new URL(value);
    return u.hostname.includes("tiktok.com");
  } catch {
    return false;
  }
};

// External client
const apiKey = process.env.SUPADATA_API_KEY;
if (!apiKey) {
  console.warn("SUPADATA_API_KEY is not set. /transcript will fail until configured.");
}
const supadata = apiKey ? new Supadata({ apiKey }) : null;

// Routes
app.get("/health", (_req, res) => {
  res.json({ ok: true, status: "ok" });
});

// Backend endpoint to get and store transcript from Supadata API
app.post("/transcript", async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) return sendError(res, 400, "TikTok URL is required");
    if (!isValidTikTokUrl(url)) return sendError(res, 422, "Invalid TikTok URL");
    if (!supadata) return sendError(res, 500, "Server is not configured with SUPADATA_API_KEY");

    const result = await supadata.transcript({ url, text: true, mode: "native" });

    // Get content and url for insertion into database
    const jsonObj = JSON.parse(JSON.stringify(result));
    //console.log(jsonObj.content);
    //console.log(url);

    const sql = "INSERT INTO RECIPE (url, content) VALUES (?, ?)";
    con.query(sql, [url, jsonObj.content], function (err, result) {
      if (err) throw err;
      console.log("Insert successful");
    });

    return res.json({ ok: true, data: result });
  } catch (error) {
    const message = error?.response?.data || error?.message || "Unexpected error";
    console.error("/transcript error:", message);
    return sendError(res, 500, String(message));
  }
});

app.get("/recipes", async (req, res) => {
  const sql = "SELECT recipeID, url, content FROM RECIPE";
  con.query(sql, function (err, results) {
    if (err) {
      console.error("DB query error:", err);
      return sendError(res, 500, "Failed to fetch recipes");
    }
    res.json({ ok: true, data: results });
  });
});


// SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});















