import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, addDoc, onSnapshot, doc, deleteDoc } from 'firebase/firestore';

export default function AdminDashboard() {
  const [players, setPlayers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');

  // Listen to the players collection in real time
  useEffect(() => {
    const playersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(playersRef, (snapshot) => {
      const playerList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPlayers(playerList);
    });

    return () => unsubscribe();
  }, []);

  // Add a new player to the pool
  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    try {
      await addDoc(collection(db, 'users'), {
        name: newPlayerName.trim(),
        teams: [], // Starts with no teams assigned
        totalPoints: 0,
        createdAt: new Date().toISOString()
      });
      setNewPlayerName('');
    } catch (error) {
      console.error("Error adding player: ", error);
    }
  };

  // Remove a player
  const handleDeletePlayer = async (playerId) => {
    try {
      await deleteDoc(doc(db, 'users', playerId));
    } catch (error) {
      console.error("Error deleting player: ", error);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>🏆 World Cup Fantasy Admin Panel</h2>
      <p>Manage your players here before triggering the live draft allocation.</p>
      
      {/* Add Player Form */}
      <form onSubmit={handleAddPlayer} style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          placeholder="Enter player name..."
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          style={{ padding: '10px', flex: 1, borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px' }}>
          Add Player
        </button>
      </form>

      {/* Player List */}
      <h3>Registered Players ({players.length})</h3>
      {players.length === 0 ? (
        <p style={{ color: '#666' }}>No players added yet. Add some names above!</p>
      ) : (
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {players.map((player) => (
            <li key={player.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #eee' }}>
              <span><strong>{player.name}</strong></span>
              <button 
                onClick={() => handleDeletePlayer(player.id)}
                style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}