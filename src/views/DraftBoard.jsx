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
  const [flashingTeams, setFlashingTeams] = useState(['???']);

  // Subscribe to real-time data
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      // FIX: Spread doc.data() FIRST, then overwrite with the Firestore ID
      const userList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      // Sort by draftOrder if available, otherwise by createdAt ascending to keep draft order stable and fair
      userList.sort((a, b) => {
        if (a.draftOrder !== undefined && b.draftOrder !== undefined) {
          return a.draftOrder - b.draftOrder;
        }
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      });
      setUsers(userList);
    });

    const unsubTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
      // FIX: Spread doc.data() FIRST, then overwrite with the Firestore ID
      setTeams(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });

    return () => { unsubUsers(); unsubTeams(); };
  }, []);

  // Compute next player reactively for rendering/status checks
  const availableTeams = teams.filter(t => t.owner === null);
  const minTeams = users.length > 0 ? Math.min(...users.map(u => (u.teams || []).length)) : 0;
  const nextPlayer = users.find(u => (u.teams || []).length === minTeams);

  const handleRevealNext = async () => {
    if (users.length === 0) {
      alert("No players registered yet!");
      return;
    }

    if (availableTeams.length === 0) {
      alert("Draft Complete! All teams have been assigned.");
      return;
    }

    if (!nextPlayer) return;

    // Pick 1 actual winner
    const winningTeam = availableTeams[Math.floor(Math.random() * availableTeams.length)];

    // Start the suspense animation
    setCurrentPlayer(nextPlayer);
    setIsSpinning(true);

    let spins = 0;
    const spinInterval = setInterval(() => {
      // Flash a random team name for the slot machine effect
      const randomTeam = availableTeams[Math.floor(Math.random() * availableTeams.length)].name;
      setFlashingTeams([randomTeam]);
      spins++;

      // Stop after ~3 seconds (30 interval ticks)
      if (spins > 30) {
        clearInterval(spinInterval);
        setFlashingTeams([winningTeam.name]);
        lockInDraft(nextPlayer, winningTeam);
      }
    }, 100);
  };

  const lockInDraft = async (player, team) => {
    const batch = writeBatch(db);

    // Update the player doc by appending the new team
    const playerRef = doc(db, 'users', player.id);
    const currentTeams = player.teams || [];
    batch.update(playerRef, {
      teams: [...currentTeams, team.name]
    });

    // Update the team doc to assign the owner
    const teamRef = doc(db, 'teams', team.id);
    batch.update(teamRef, { owner: player.id });

    await batch.commit();
    setIsSpinning(false);
  };

  // Determine if draft has started (any player has teams assigned)
  const draftStarted = users.some(u => u.teams && u.teams.length > 0);

  // Randomize/Shuffle the draft order persistently in Firestore
  const handleRandomizeOrder = async () => {
    if (users.length < 2) return;

    setIsSpinning(true);
    try {
      const shuffled = [...users].sort(() => 0.5 - Math.random());
      const batch = writeBatch(db);

      shuffled.forEach((user, index) => {
        const userRef = doc(db, 'users', user.id);
        batch.update(userRef, { draftOrder: index });
      });

      await batch.commit();
    } catch (err) {
      console.error("Failed to randomize draft order:", err);
      alert("Failed to randomize draft order.");
    } finally {
      setIsSpinning(false);
    }
  };

  // Reset the entire draft state locally and persistently in Firestore
  const handleResetDraft = async () => {
    if (!window.confirm("Are you sure you want to reset the draft? This will clear all assigned teams!")) {
      return;
    }

    setIsSpinning(true);
    try {
      const batch = writeBatch(db);

      // Reset each player's teams array and points
      users.forEach(user => {
        const userRef = doc(db, 'users', user.id);
        batch.update(userRef, { teams: [], totalPoints: 0 });
      });

      // Reset each team's owner field
      teams.forEach(team => {
        const teamRef = doc(db, 'teams', team.id);
        batch.update(teamRef, { owner: null });
      });

      await batch.commit();
      setCurrentPlayer(null);
      setFlashingTeams(['???']);
      alert("Draft reset successfully!");
    } catch (err) {
      console.error("Failed to reset draft:", err);
      alert("Failed to reset draft.");
    } finally {
      setIsSpinning(false);
    }
  };

  return (
    <div style={{ background: '#121212', color: '#fff', minHeight: '100vh', width: '100%' }}>
      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '10px' }}>🎰 World Cup Live Draft </h1>

      {/* --- DEBUG COUNTER --- */}
      <p style={{ color: '#aaa', fontSize: '0.9rem', textAlign: 'center', marginBottom: '30px' }}>
        Database Status: {teams.length} total teams loaded | {availableTeams.length} unassigned teams available
      </p>

      {/* Two Column Layout */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '30px', flexWrap: 'wrap' }}>

        {/* Left Column: Draft Order */}
        <div style={{ flex: '1 1 300px', background: '#1a1a1a', padding: '25px', borderRadius: '12px', color: 'white', border: '1px solid #333', alignSelf: 'flex-start' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#00ccff' }}>🎯 Draft Order</h3>
            {!draftStarted && (
              <button
                onClick={handleRandomizeOrder}
                disabled={isSpinning || users.length < 2}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.85rem',
                  background: 'transparent',
                  color: '#00ccff',
                  border: '1px solid #00ccff',
                  borderRadius: '6px',
                  cursor: (isSpinning || users.length < 2) ? 'not-allowed' : 'pointer',
                  opacity: (isSpinning || users.length < 2) ? 0.5 : 1,
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease',
                }}
              >
                🔀 Shuffle
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {users.map((u, index) => {
              const isCurrent = currentPlayer && currentPlayer.id === u.id && isSpinning;
              const isNextUp = !isSpinning && nextPlayer && nextPlayer.id === u.id;

              let cardBg = '#262626';
              let cardBorder = '1px solid #3a3a3a';
              if (isCurrent) {
                cardBg = 'linear-gradient(135deg, #004d80 0%, #002244 100%)';
                cardBorder = '1px solid #00ccff';
              } else if (isNextUp) {
                cardBg = 'linear-gradient(135deg, #1e3a1e 0%, #0d1f0d 100%)';
                cardBorder = '1px solid #28a745';
              }

              return (
                <div
                  key={u.id}
                  style={{
                    padding: '15px',
                    borderRadius: '8px',
                    background: cardBg,
                    border: cardBorder,
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: (isCurrent || isNextUp) ? '0 4px 15px rgba(0,0,0,0.5)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: isCurrent ? '#00ccff' : isNextUp ? '#28a745' : '#888', fontWeight: 'bold' }}>
                      #{index + 1}
                    </span>
                    <div>
                      <strong style={{ fontSize: '1.1rem', display: 'block' }}>{u.name}</strong>
                      {isCurrent && <span style={{ fontSize: '0.75rem', color: '#00ccff', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Drafting...</span>}
                      {isNextUp && <span style={{ fontSize: '0.75rem', color: '#28a745', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Next Up</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.85rem', padding: '4px 10px', borderRadius: '12px', background: '#121212', color: '#aaa', fontWeight: 'bold' }}>
                    {u.teams?.length || 0} {(u.teams?.length === 1) ? 'team' : 'teams'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Live Stage & Roster */}
        <div style={{ flex: '2 1 600px', display: 'flex', flexDirection: 'column', gap: '30px' }}>

          {/* The Stage */}
          <div style={{ background: '#1a1a1a', padding: '45px 30px', borderRadius: '12px', color: 'white', minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '1px solid #333' }}>
            {currentPlayer ? (
              <>
                <h2 style={{ color: '#00ccff', fontSize: '2rem', margin: '0 0 25px 0', textShadow: '0 0 10px rgba(0, 204, 255, 0.3)' }}>
                  {currentPlayer.name} is on the clock...
                </h2>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{ fontSize: '2.8rem', padding: '30px 50px', background: '#262626', borderRadius: '12px', minWidth: '300px', fontWeight: 'bold', border: '2px solid #444', color: '#fff', textTransform: 'uppercase', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.8)' }}>
                    {flashingTeams[0]}
                  </div>
                </div>
              </>
            ) : (
              <h2 style={{ color: '#666', fontSize: '1.75rem' }}>Waiting for draft to begin...</h2>
            )}
          </div>

          <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <button
              onClick={handleRevealNext}
              disabled={isSpinning || availableTeams.length < 1}
              style={{
                padding: '18px 40px',
                fontSize: '1.5rem',
                cursor: (isSpinning || availableTeams.length < 1) ? 'not-allowed' : 'pointer',
                background: (isSpinning || availableTeams.length < 1) ? '#666' : 'linear-gradient(135deg, #28a745 0%, #218838 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 'bold',
                boxShadow: (isSpinning || availableTeams.length < 1) ? 'none' : '0 4px 15px rgba(40, 167, 69, 0.4)',
                transition: 'transform 0.1s ease, filter 0.2s ease'
              }}
              onMouseDown={(e) => { if (!isSpinning && availableTeams.length >= 1) e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={(e) => { if (!isSpinning && availableTeams.length >= 1) e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {isSpinning ? 'Drafting...' : 'Reveal Next Player 🎲'}
            </button>

            {draftStarted && (
              <button
                onClick={handleResetDraft}
                disabled={isSpinning}
                style={{
                  padding: '18px 30px',
                  fontSize: '1.2rem',
                  cursor: isSpinning ? 'not-allowed' : 'pointer',
                  background: isSpinning ? '#666' : 'linear-gradient(135deg, #dc3545 0%, #bd2130 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  boxShadow: isSpinning ? 'none' : '0 4px 15px rgba(220, 53, 69, 0.4)',
                  transition: 'transform 0.1s ease, filter 0.2s ease'
                }}
              >
                Reset Draft 🔄
              </button>
            )}
          </div>

          {/* Completed Drafts Roster */}
          <div style={{ marginTop: '20px', textAlign: 'left' }}>
            <h3 style={{ fontSize: '1.4rem', borderBottom: '1px solid #333', paddingBottom: '10px', color: '#fff', textAlign: 'center' }}>Assigned Teams</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
              {users.filter(u => u.teams && u.teams.length > 0).map(u => (
                <div key={u.id} style={{ padding: '15px', background: '#1a1a1a', borderLeft: '5px solid #007bff', borderRadius: '6px', border: '1px solid #333', borderLeftWidth: '5px' }}>
                  <strong style={{ fontSize: '1.1rem', color: '#fff' }}>{u.name}</strong>
                  <div style={{ color: '#aaa', marginTop: '8px', fontSize: '0.95rem' }}>⚽ {u.teams.join(', ')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
