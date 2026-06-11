// scripts/seedTeams.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFile } from 'fs/promises';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables (if needed for other configs)
dotenv.config();

async function seedDatabase() {
  try {
    // Read the secure service account key
    const serviceAccount = JSON.parse(
      await readFile(new URL('../service-account.json', import.meta.url))
    );

    // Initialize the Admin SDK
    initializeApp({
      credential: cert(serviceAccount)
    });

    const db = getFirestore();
    const teamsCollection = db.collection('teams');

    // The 48-Team 2026 World Cup Roster
    const teams = [
      // Group A
      { name: "Mexico", group: "A" }, { name: "South Korea", group: "A" }, { name: "South Africa", group: "A" }, { name: "Czechia", group: "A" },
      // Group B
      { name: "Canada", group: "B" }, { name: "Bosnia and Herzegovina", group: "B" }, { name: "Qatar", group: "B" }, { name: "Switzerland", group: "B" },
      // Group C
      { name: "Brazil", group: "C" }, { name: "Morocco", group: "C" }, { name: "Haiti", group: "C" }, { name: "Scotland", group: "C" },
      // Group D
      { name: "United States", group: "D" }, { name: "Paraguay", group: "D" }, { name: "Australia", group: "D" }, { name: "Türkiye", group: "D" },
      // Group E
      { name: "Germany", group: "E" }, { name: "Côte d'Ivoire", group: "E" }, { name: "Ecuador", group: "E" }, { name: "Curaçao", group: "E" },
      // Group F
      { name: "Netherlands", group: "F" }, { name: "Japan", group: "F" }, { name: "Sweden", group: "F" }, { name: "Tunisia", group: "F" },
      // Group G
      { name: "Belgium", group: "G" }, { name: "Egypt", group: "G" }, { name: "Iran", group: "G" }, { name: "New Zealand", group: "G" },
      // Group H
      { name: "Spain", group: "H" }, { name: "Uruguay", group: "H" }, { name: "Saudi Arabia", group: "H" }, { name: "Cabo Verde", group: "H" },
      // Group I
      { name: "France", group: "I" }, { name: "Senegal", group: "I" }, { name: "Norway", group: "I" }, { name: "Iraq", group: "I" },
      // Group J
      { name: "Argentina", group: "J" }, { name: "Algeria", group: "J" }, { name: "Austria", group: "J" }, { name: "Jordan", group: "J" },
      // Group K
      { name: "Portugal", group: "K" }, { name: "Colombia", group: "K" }, { name: "Uzbekistan", group: "K" }, { name: "Congo DR", group: "K" },
      // Group L
      { name: "England", group: "L" }, { name: "Croatia", group: "L" }, { name: "Ghana", group: "L" }, { name: "Panama", group: "L" }
    ];

    console.log(`Starting database seed for ${teams.length} teams...`);

    const batch = db.batch();

    teams.forEach((team, index) => {
      // Use the team name as the document ID for easier querying later
      const teamRef = teamsCollection.doc(team.name.replace(/\s+/g, '-').toLowerCase());

      batch.set(teamRef, {
        id: index + 1,
        name: team.name,
        group: team.group,
        owner: null, // Null means unassigned in the void
        status: "active",
        createdAt: new Date().toISOString()
      });
    });

    // Commit the batch write to Firestore
    await batch.commit();

    console.log('✅ Successfully seeded all 48 teams into Firestore!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();