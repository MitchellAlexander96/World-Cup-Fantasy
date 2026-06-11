// scripts/importMatches.js
import fetch from 'node-fetch';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import 'dotenv/config';

// 1. Firebase Setup
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
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

  // 2. Clear existing fixtures
  console.log("🧹 Clearing existing fixtures from database...");
  try {
    const snapshot = await getDocs(colRef);
    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref);
    }
    console.log(`✅ Cleared ${snapshot.docs.length} old fixtures.`);
  } catch (err) {
    console.error("⚠️ Error clearing old fixtures:", err);
  }

  // Filter out the null matches we saw earlier
  const validMatches = data.matches.filter(m => m.homeTeam.name && m.awayTeam.name);

  console.log(`✅ Found ${validMatches.length} valid matches. Uploading...`);

  for (const m of validMatches) {
    const matchData = {
      home: m.homeTeam.name,
      away: m.awayTeam.name,
      status: m.status,
      date: m.utcDate
    };

    if (m.score?.fullTime?.home !== null && m.score?.fullTime?.home !== undefined) {
      matchData.homeScore = m.score.fullTime.home;
    }
    if (m.score?.fullTime?.away !== null && m.score?.fullTime?.away !== undefined) {
      matchData.awayScore = m.score.fullTime.away;
    }

    await setDoc(doc(db, 'fixtures', String(m.id)), matchData, { merge: true });
    console.log(`📤 Uploaded: ${m.homeTeam.name} vs ${m.awayTeam.name} (ID: ${m.id})`);
  }
  
  console.log("🎉 All matches uploaded successfully!");
}

importMatches();