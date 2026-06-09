// scripts/fetchWC.js
// Run this with: node scripts/fetchWC.js
import fetch from 'node-fetch';
import 'dotenv/config'; // Loads your .env variables

const API_KEY = process.env.VITE_RAPIDAPI_KEY || process.env.VITE_FOOTBALL_DATA_KEY;
const URL = 'https://api.football-data.org/v4/competitions/2003/matches';

async function fetchMatches() {
  console.log("🚀 Fetching data from:", URL);
  
  try {
    const response = await fetch(URL, {
      headers: { 'X-Auth-Token': API_KEY }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error (${response.status}):`, errorText);
      return;
    }

    const data = await response.json();
    
    console.log("✅ Successfully fetched", data.matches.length, "matches.");
    
    // Print the first match to prove it works
    if (data.matches.length > 0) {
        for(var i = 0; i < data.matches.length; i++ ){
            console.log("Sample Match:", {
              home: data.matches[i].homeTeam.name,
              away: data.matches[i].awayTeam.name,
              status: data.matches[i].status
            });
        }
    } else {
      console.log("⚠️ API returned 0 matches. (This happens if the 2026 schedule isn't populated yet!)");
    }

  } catch (err) {
    console.error("🔥 Script Error:", err);
  }
}

fetchMatches();