"use strict";

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Supadata } = require("@supadata/js");
const path = require("path");
//const mysql = require('mysql2');
const {Pool} = require("pg");
const OpenAI = require("openai");

dotenv.config({ path: path.join(__dirname, ".env") });

const PORT = process.env.PORT || 3001;
const FRONTEND_DIR = path.join(__dirname, "../frontend");

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(FRONTEND_DIR));

//Initalize OpenAI client
const AI = new OpenAI(process.env.OPENAI_API_KEY);

// Containerized MySQL Database connection
/*
let con = mysql.createConnection({
  host: "db",
  port: 3306,
  user: "root",
  password: "rootpassword",
  database: "IS436"
});

con.connect(function(err) {
  if (err) throw err;
  console.log("MySQL Database connected!");
});
*/

//Establish Postgres Connection

const client = new Pool({
  user: 'chefsdb_user',
  password: process.env.POSTGRES_PASSWORD,  
  host: 'dpg-d4oerl2dbo4c73f1otc0-a.oregon-postgres.render.com',
  port: 5432,
  database: 'chefsdb',
  ssl: { rejectUnauthorized: false }  // REQUIRED on Render
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

    const result = await supadata.transcript({ url, text: true, mode: "native", lang: "en" });
    const transcript = result.content;

    // POSTGRES INSERT
    try {
    const PGresult = await client.query('INSERT INTO recipe (url,content) VALUES ($1,$2)',[url,transcript]);
    console.log('Insert successful');

    } catch (err) {
      console.error(err);
    }

    // OPENAI REQUEST
    let recipe;
    try {

      const response = await AI.responses.create({
        model: "gpt-5.2",
        input: `Intake this transcript and create a recipe with cooking instructions based off of it. 
        It should be structured as follows: Bulleted list of ingredients, followed by a numbered, step by step list of instructions. 
        Here is the transcript: ` + transcript,
      });
      recipe = response.output_text;

    } catch (err) {
      consoler.error(err);
      recipe = "Error";
    }
    
    // END
    return res.json({ 
      ok: true, 
      data: {transcript, recipe}
    });

  } catch (error) {
    const message = error?.response?.data || error?.message || "Unexpected error";
    console.error("/transcript error:", message);
    return sendError(res, 500, String(message));
  }
});

app.get("/recipes", async (req, res) => {
  // SQL GET
  /*
  const sql = "SELECT recipeID, url, content FROM RECIPE";
  con.query(sql, function (err, results) {
    if (err) {
      console.error("DB query error:", err);
      return sendError(res, 500, "Failed to fetch recipes");
    }
    res.json({ ok: true, data: results });
  });
  */

  // POSGRES GET
  let result;
  try {
    //await client.connect();

    result = await client.query('SELECT recipeID, url, content FROM recipe');
    console.log('Get successful');

    } catch (err) {
      console.error(err);
    }

    res.json({ ok: true, data: result.rows });

});


// SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});















