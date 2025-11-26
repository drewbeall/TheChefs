// scrape.js

import { Supadata } from "@supadata/js";
import dotenv from "dotenv";

// Load .env file
dotenv.config();

console.log("Starting TikTok scraper...");

// Initialize Supadata client
const supadata = new Supadata({
  apiKey: process.env.SUPADATA_API_KEY,
});

// Main function
async function run() {
  try {
    console.log("Requesting transcript...");

    const transcriptResult = await supadata.transcript({
      url: "https://www.tiktok.com/@cookingwithlynja/video/7322531619825257771",
      text: true,
      mode: "native", // native, auto, generate
    });

    console.log("\n==== TRANSCRIPT RESULT ====");
    console.log(transcriptResult);
    console.log("============================\n");
  } 
  catch (err) {
    console.error("❌ Error:", err);
  }
}

run();
