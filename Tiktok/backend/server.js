"use strict";

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Supadata } = require("@supadata/js");
const path = require("path");
//const mysql = require('mysql2');
const {Pool} = require("pg");
const OpenAI = require("openai");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

dotenv.config({ path: path.join(__dirname, ".env") });

const PORT = process.env.PORT || 3001;
const FRONTEND_DIR = path.join(__dirname, "../frontend");

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'https://tiktok-7.onrender.com'], 
  credentials: true, 
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(FRONTEND_DIR));

// Initialize rate limiter
// Can submit 100 requests in a 15 minute window
app.use(rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 100,
	standardHeaders: 'draft-8', 
	legacyHeaders: false, 
	ipv6Subnet: 56,
}));

//Needed for rate limiting to work on Render (if not set, rate would count for all users on Render)
app.set('trust proxy', 1);

// This limiter is attached to the login route, allows for 5 login attempts per 15 minutes 
// Dampens speed of bruteforce attacks
const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 5,
	standardHeaders: 'draft-8', 
	legacyHeaders: false, 
	ipv6Subnet: 56,
});

//Initalize OpenAI client
const AI = new OpenAI(process.env.OPENAI_API_KEY);

//Establish Postgres Connection
const client = new Pool({
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,  
  host: process.env.POSTGRES_HOST,
  port: 5432,
  database: process.env.DATABASE,
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

// Authentication Middleware
// Used in routes that require user authentication (saving, posting, editing recipies, etc...)
const auth = async (req, res, next) => {
  const sid = req.cookies.sid;

  if (!sid) {
    return res.status(401).json({ ok: false, error:"Session Expired"})
  }

  try {
    const sidQuery = await client.query(`SELECT user_id FROM sessions WHERE sid = $1 AND expires_at > now()`,[sid]);

    if (sidQuery.rows.length === 0) {
      return res.status(401).json({ ok: false, error:"Session Expired"})
    }
    else {
      req.user = { id: sidQuery.rows[0].user_id}
      return next();
    }
  } catch {
    return res.status(500).json({ ok: false, error:"Authentication Failed"})
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
app.get("/api/feed", async (_req, res) => {
  
  // POSGRES GET
  let result;
  try {
    //await client.connect();

    result = await client.query('SELECT recipename, recipedescription, url FROM recipes ORDER BY recipesid DESC');
    console.log('Get successful');
    } catch (err) {
      console.error(err);
    }

    return res.json({ ok: true, data: result.rows });
});

app.post('/submitCustomRecipe', async (req,res) => {
  const data = req.body;

  //Link Cleaning
  const url = new URL(data.customLink);
  url.search = "";
  const cleanLink = url.toString();

  try {
    const PGresult = await client.query(`INSERT INTO recipes (url,recipeName,recipeDescription,ingredients,stepNames,stepDescs) 
      VALUES ($1,$2,$3,$4,$5,$6)`,[cleanLink,data.customName,data.customDesc,data.ingredients,data.stepNames,data.stepDescs]);
    console.log('Insert in RECIPIES successful');

    } catch (err) {
      console.log('There was an error inserting your data into RECIPIES')
      console.error(err);
      return res.json({ ok: false }); 
    }
    return res.json({ ok: true }); 
});

//Details GET query to retrieve relevent recipies from database
app.get('/api/details', async (req,res) => {
  let result;
    try {
      result = await client.query(`SELECT recipesid, url, recipename, recipedescription, ingredients, stepnames, stepdescs 
        FROM recipes WHERE url LIKE $1;`,[`%${req.query.url}%`]);
      console.log('Get successful');

      } catch (err) {
        console.error(err);
        console.log('Recipies GET failed');
      }

      res.json({ ok: true, data: result.rows });
});

app.post('/api/v1/login', loginLimiter, async (req,res) => {
  const data = req.body;

  let result;
  try {

      //Check to see if username exists
      result = await client.query(`select userid from users where username = $1;`,[data.username]);
      } catch (err) {
        console.error(err);
        console.log('USERS GET failed');
      }

      try {
        if (result.rows.length != 0) {
        console.log('Username ' + data.username + ' found');
        const userID = result.rows[0].userid
        const resultPass = await client.query(`select password from users where userid = $1;`,[userID]);

        //Check hashed password with bcrypt
        const valid = await bcrypt.compare(data.password,resultPass.rows[0].password);
        if (valid) {
          // User has input the correct login information
          // Creates / updates cookie, valid for 2 days
          const sessionID = crypto.randomUUID();
          res.cookie('sid', sessionID, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 1000 * 60 * 60 * 24 * 2,
            path: '/'
          });

          //Inserts session ID into SESSIONS table
          const sessionQuery = await client.query(
            `INSERT INTO sessions (sid, user_id, expires_at, ip, user_agent)
            VALUES ($1, $2, now() + interval '2 days', $3, $4)`,
            [sessionID, userID, req.ip, req.get('user-agent') || null]
          );

          console.log("Login Success! User logged in as " + data.username);
          return res.json({ ok: true });
        } else {
          console.log("Login Failed, passwords do not match");
          return res.status(401).json({ ok: false, error: "Invalid credentials" });
          }
        } 
        else {
          console.log('Username ' + data.username + ' does not exist');
          return res.status(401).json({ ok: false, error: "Invalid credentials" });
        }

      } catch (err) {
        console.log(err);
        console.log("PASSWORD CHECK FAILED")
        return res.status(500).json({ ok: false, error: "Login failed" });
      }
      
});

app.post('/api/v1/register', async (req,res) => {
  const data = req.body;

  //Hash the password using bcrypt
  const plaintextPassword = data.password;
  const hash = await bcrypt.hash(plaintextPassword, 12);
  

  //Insert registration data into database
  let result;
  try {
      result = await client.query(`insert into users (username, password, email, name) 
        values ($1,$2,$3,$4);`,[data.username,hash,data.email,data.name]);
      console.log('Registration Success')
      return res.json({ ok:true })
      } catch (err) {
        console.error(err);
        console.log('Registration Failed');
        return res.status(500).json({ ok: false, error: "Login failed" });
      }


  
});

app.post('/api/v1/logout', async (req,res) => {
    // Delete session from database
    const result = await client.query('DELETE FROM sessions WHERE sid = $1',[req.cookies.sid]);

    // Delete cookie
    res.clearCookie('sid', { path: '/' });
    return res.json({ ok: true })
});

// Light Authentication, only checks the existence of SID cookie. Used for navbar only.
app.get('/api/v1/auth/light', (req,res) => {
    if (!req.cookies.sid) {
      return res.status(401).json({ ok: false, error:"Session Expired"})
    }
    else {return res.json({ ok: true})}
    
});

// Heavy Authentication, checks SID against sessions table 
app.get('/api/v1/auth/heavy', async (req,res) => {
    const sid = req.cookies.sid;

    try {
      const sidQuery = await client.query(`SELECT EXISTS (SELECT sid FROM sessions WHERE sid = $1 AND expires_at > now()) 
      AS is_valid`,[sid]);
      const valid = sidQuery.rows[0].is_valid;

      if (!valid) {
        return res.status(401).json({ ok: false, error:"Session Expired"})
      }
      else {return res.json({ ok: true})}
    } catch {
      return res.status(500).json({ ok: false, error:"Authentication Failed"})
    }
    
    
});

/*
  Check for username and email availibility
  This route returns a list of issues to reflect in frontend 
  If the list is empty, the account may register

  ISSUES
  username: This username is already taken
  email: This email is already taken
  password: These passwords do not match
  fields: Not all fields were filled

*/
app.post('/api/v1/register/validate', async (req,res) => {
  const data = req.body;

    const issueList = [];
    //Check for username and email availibility
    let userResult;
    let emailResult;
    try {
      userResult = await client.query(`select username from users 
          where username = $1;`,[data.username]);
      emailResult = await client.query(`select email from users 
          where email = $1;`,[data.email]);
    } catch (err) {
      console.log(err);
    }

    if (userResult.rows.length > 0){issueList.push('username');}
    if (emailResult.rows.length > 0){issueList.push('email');}

    //Check to make sure passwords match
    if (data.passwordCheck != data.password) {
      issueList.push('password');
    }

    //Check to make sure all fields are input
    if (!data.email || !data.username || !data.password || !data.passwordCheck || !data.name) {
      issueList.push('fields');
    }

    return res.json({ok:true,data:issueList});
});

app.get('/api/v1/savedRecipies', auth, async (req,res) => {
  const userID = req.user.id;

  //Get saved recipies
  try {
    const resultForSavedRecipies = await client.query('SELECT recipe_id FROM user_saved_recipes WHERE user_id = $1',[userID]);
    return res.json({ ok: true, data: resultForSavedRecipies});
  } catch {
    return res.status(500).json({ ok: false, error: "Could not retrieve userID from session" });
  }
  
});










//Page routes for clean urls
app.get('/feed',(req,res) =>{
  res.sendFile(path.join(FRONTEND_DIR,"feed.html"))
});

app.get('/details',(req,res) => {
  const url = req.query.url;
  res.sendFile(path.join(FRONTEND_DIR,"details.html"))
});

app.get('/login',(req,res) =>{
  res.sendFile(path.join(FRONTEND_DIR,"login.html"))
});

app.get('/register',(req,res) =>{
  res.sendFile(path.join(FRONTEND_DIR,"register.html"))
});

app.get('/profile',(req,res) =>{
  res.sendFile(path.join(FRONTEND_DIR,"profile.html"))
});

app.get('/logout',(req,res) =>{
  res.sendFile(path.join(FRONTEND_DIR,"logout.html"))
});

// SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});












