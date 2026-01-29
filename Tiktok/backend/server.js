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
app.use(express.urlencoded({ extended: true }));
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
    let recipeName;
    let recipeDescription;
    let recipeContents;
    try {

      // OpenAI Creates a recipe in HTML based off of video transcript
      const responseContents = await AI.responses.create({
        model: "gpt-5.2",
        input: `Intake this transcript and create a recipe with cooking instructions based off of it. 
        This recipe will be written in HTML format. Do not include any wrappers of any kind, as this is meant to plug directly into an HTML object.
        It should be structured as follows: Bulleted list of ingredients, followed by a numbered, step by step list of instructions. 
        The bulleted list of ingredients will be encased with <h5>.
        Each step will be a part of an ordered list, with a short name of the step and the number encased in <h3>. 
        Give the ordered list the styling "list-style: none;"
        The contents of each step will be encased in <p class="ps-3">
        Here is the transcript: ` + transcript,
      });
      recipeContents = responseContents.output_text;

      // OpenAI creates a name for the recipe based off of the recipe it generated.
      const responseName = await AI.responses.create({
        model: "gpt-5.2",
        input: `Given the recipe that you generated, create a name for the recipe in a few words. Do not wrap it in anything, only generate text.
        Here is the recipe: ` + recipeContents
      });
      recipeName = responseName.output_text;

      // OpenAI creates a description for the recipe based off the recipe.
      const responseDescription = await AI.responses.create({
        model: "gpt-5.2",
        input: `Given the recipe that you generated, create a description for the recipe in one or two sentences maximum.
        Here is the recipe:  ` + recipeContents
      });
      recipeDescription = responseDescription.output_text;


    } catch (err) {
      consoler.error(err);
      recipeContents = "Error";
    }
    
    // END
    return res.json({ 
      ok: true, 
      data: {transcript, recipeContents, recipeName, recipeDescription}
    });

  } catch (error) {
    const message = error?.response?.data || error?.message || "Unexpected error";
    console.error("/transcript error:", message);
    return sendError(res, 500, String(message));
  }
});

//Endpoint to get recipies from database
app.get("/recipes", async (__req, res) => {
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

app.post('/submitCustomRecipe', async (req,res) => {
  const data = req.body;

  /*
  //Console logs to verify backend reception
  console.log(data.customLink)
  console.log(data.customName);
  console.log(data.customDesc);
  console.log(data.ingredients);
  console.log(data.stepNames);
  console.log(data.stepDescs);
  */

  try {
    const PGresult = await client.query(`INSERT INTO recipes (url,recipeName,recipeDescription,ingredients,stepNames,stepDescs) 
      VALUES ($1,$2,$3,$4,$5,$6)`,[data.customLink,data.customName,data.customDesc,data.ingredients,data.stepNames,data.stepDescs]);
    console.log('Insert in RECIPIES successful');

    } catch (err) {
      console.log('There was an error inserting your data into RECIPIES')
      console.error(err);
    }







});



// SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});















