// src/views/DraftBoard.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, onSnapshot, writeBatch, doc } from 'firebase/firestore';

export default function DraftBoard() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  
  // Animation states
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [flashingTeams, setFlashingTeams] = useState(['???', '???']);

  // Subscribe to real-time data
useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      // FIX: Spread doc.data() FIRST, then overwrite with the Firestore ID
      setUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });

    const unsubTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
      // FIX: Spread doc.data() FIRST, then overwrite with the Firestore ID
      setTeams(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });

    return () => { unsubUsers(); unsubTeams(); };
  }, []);

  const handleRevealNext = async () => {
    // 1. Find the next player who doesn't have 2 teams yet
    const nextPlayer = users.find(u => !u.teams || u.teams.length < 2);
    if (!nextPlayer) {
      alert("Draft Complete! All players have their teams.");
      return;
    }

    // 2. Find all unassigned teams
    const availableTeams = teams.filter(t => t.owner === null);
    if (availableTeams.length < 2) {
      alert("Not enough teams left in the pool!");
      return;
    }

    // 3. Pick 2 actual winners
    const shuffled = [...availableTeams].sort(() => 0.5 - Math.random());
    const winningTeam1 = shuffled[0];
    const winningTeam2 = shuffled[1];

    // 4. Start the suspense animation
    setCurrentPlayer(nextPlayer);
    setIsSpinning(true);

    let spins = 0;
    const spinInterval = setInterval(() => {
      // Flash random team names for the slot machine effect
      const random1 = availableTeams[Math.floor(Math.random() * availableTeams.length)].name;
      const random2 = availableTeams[Math.floor(Math.random() * availableTeams.length)].name;
      setFlashingTeams([random1, random2]);
      spins++;

      // Stop after ~3 seconds (30 interval ticks)
      if (spins > 30) {
        clearInterval(spinInterval);
        setFlashingTeams([winningTeam1.name, winningTeam2.name]);
        lockInDraft(nextPlayer, winningTeam1, winningTeam2);
      }
    }, 100);
  };

  const lockInDraft = async (player, team1, team2) => {
    const batch = writeBatch(db);

    // Update the player doc
    const playerRef = doc(db, 'users', player.id);
    batch.update(playerRef, { 
      teams: [team1.name, team2.name] 
    });

    // Update the two team docs to assign the owner
    const team1Ref = doc(db, 'teams', team1.id);
    const team2Ref = doc(db, 'teams', team2.id);
    batch.update(team1Ref, { owner: player.id });
    batch.update(team2Ref, { owner: player.id });

    await batch.commit();
    setIsSpinning(false);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      <h1>🎰 Live Draft Engine</h1>
      
      {/* --- DEBUG COUNTER --- */}
      <p style={{ color: '#aaa', fontSize: '0.9rem' }}>
        Database Status: {teams.length} total teams loaded | {teams.filter(t => t.owner === null).length} unassigned teams available
      </p>
      
      {/* The Stage */}
      <div style={{ background: '#1a1a1a', padding: '40px', borderRadius: '12px', color: 'white', minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: '30px' }}>
        {currentPlayer ? (
          <>
            <h2 style={{ color: '#00ccff', fontSize: '2rem', margin: '0 0 20px 0' }}>{currentPlayer.name} is on the clock...</h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
              <div style={{ fontSize: '2rem', padding: '20px', background: '#333', borderRadius: '8px', minWidth: '200px' }}>
                {flashingTeams[0]}
              </div>
              <div style={{ fontSize: '2rem', padding: '20px', background: '#333', borderRadius: '8px', minWidth: '200px' }}>
                {flashingTeams[1]}
              </div>
            </div>
          </>
        ) : (
          <h2 style={{ color: '#666' }}>Waiting for draft to begin...</h2>
        )}
      </div>

      <button 
        onClick={handleRevealNext} 
        disabled={isSpinning || teams.filter(t => t.owner === null).length < 2}
        style={{ padding: '15px 40px', fontSize: '1.5rem', cursor: (isSpinning || teams.filter(t => t.owner === null).length < 2) ? 'not-allowed' : 'pointer', background: (isSpinning || teams.filter(t => t.owner === null).length < 2) ? '#666' : '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}
      >
        {isSpinning ? 'Drafting...' : 'Reveal Next Player 🎲'}
      </button>

      {/* Completed Drafts Roster */}
      <div style={{ marginTop: '50px', textAlign: 'left' }}>
        <h3>Drafted Roster</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          {users.filter(u => u.teams && u.teams.length > 0).map(u => (
            <div key={u.id} style={{ padding: '15px', background: '#f8f9fa', borderLeft: '5px solid #007bff', borderRadius: '4px' }}>
              <strong>{u.name}</strong>
              <div style={{ color: '#555', marginTop: '5px' }}>⚽ {u.teams[0]} & {u.teams[1]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
