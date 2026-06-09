// scripts/importMatches.js
import fetch from 'node-fetch';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import 'dotenv/config';

// 1. Firebase Setup
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  // ... add other config fields here
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function importMatches() {
  console.log("🚀 Fetching live match data...");
  
  const response = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
    headers: { 'X-Auth-Token': process.env.VITE_FOOTBALL_DATA_KEY }
  });
  
  const data = await response.json();
  const colRef = collection(db, 'fixtures');

  // Filter out the null matches we saw earlier
  const validMatches = data.matches.filter(m => m.homeTeam.name && m.awayTeam.name);

  console.log(`✅ Found ${validMatches.length} valid matches. Uploading...`);

  for (const m of validMatches) {
    await addDoc(colRef, {
      home: m.homeTeam.name,
      away: m.awayTeam.name,
      status: m.status,
      date: m.utcDate,
      homeScore: m.score?.fullTime?.home ?? 0,
      awayScore: m.score?.fullTime?.away ?? 0
    });
    console.log(`📤 Uploaded: ${m.homeTeam.name} vs ${m.awayTeam.name}`);
  }
  
  console.log("🎉 All matches uploaded successfully!");
}

importMatches();