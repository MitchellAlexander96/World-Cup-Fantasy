# 🏆 World Cup Fantasy League

A real-time, interactive World Cup Fantasy Draft application built with **React**, **Vite**, and **Firebase (Firestore)**. The app coordinates a live draft where participants are assigned World Cup teams, tracks live scores, and ranks players on a tournament leaderboard.

---

## 🚀 Key Features

*   🎰 **Interactive Live Draft Engine**: 
    *   **Round-Robin Allocation**: Automatically distributes all 48 World Cup teams evenly among registered players (one team per spin).
    *   **Draft Order Sidebar**: Displays the sequential list of players, dynamically highlighting who is currently "on the clock" and who is "next up".
    *   **Persisted Shuffling**: Shuffle the draft order with a single click before the draft begins—synced instantly in Firestore for all connected clients.
    *   **Suspenseful Slot-Machine Ticker**: Features a live animation that flashes team names during draft rolls before locking in selections.
    *   **Reset Draft Option**: Conveniently restart the draft at any time (requires confirmation) which clears all assigned teams and resets scores.

*   ⚙️ **Admin Dashboard**: 
    *   Register new players or delete participants.
    *   Initialize the live draft workspace.

*   📱 **Player Mobile Experience**:
    *   **Your Match Feed**: Tracks live scores, ended results, and upcoming matches specifically for the teams you were drafted.
    *   **Tournament Leaderboard**: A real-time ladder ranking all players based on their teams' performances (3 points for a win, 1 point for a draw). Top three spots are highlighted with gold, silver, and bronze trophies!

---

## 🛠️ Setup & Installation

### 1. Install Dependencies
Run the package installation:
```bash
npm install
```

### 2. Configure Firebase Environment
Make sure you have a `.env` file in the root directory with your Firestore keys and endpoints:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```
Also, ensure your Firebase Admin JSON credential is saved as `service-account.json` in the root folder for database seeding scripts.

### 3. Seed World Cup Teams
Seed the 48-team roster to your Firestore database:
```bash
node scripts/seedTeams.js
```

### 4. Start the Application
Start the development server:
```bash
npm run dev
```

---

## 💻 Tech Stack
*   **Frontend**: React (Vite environment), modern dark-theme styling.
*   **Database**: Firebase Firestore (for real-time synchronization between the Admin/Draft views and player phones).
*   **Seeding Scripts**: Node.js scripts using the Firebase Admin SDK.
