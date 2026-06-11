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
    <div style={{ padding: '30px 20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'inherit' }}>
      
      <div style={{ background: 'rgba(26, 36, 54, 0.45)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '30px', borderRadius: '20px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)' }}>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '1.8rem', color: '#00ccff' }}>🏆 World Cup Fantasy Admin</h2>
        <p style={{ color: '#aaa', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '30px' }}>Manage your players here before triggering the live draft allocation.</p>
        
        {/* Add Player Form */}
        <form onSubmit={handleAddPlayer} style={{ marginBottom: '35px', display: 'flex', gap: '12px' }}>
          <input
            type="text"
            placeholder="Enter player name..."
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            style={{ 
              padding: '14px 18px', 
              flex: 1, 
              borderRadius: '10px', 
              border: '1px solid rgba(255,255,255,0.1)', 
              background: 'rgba(13, 18, 29, 0.7)',
              color: '#fff',
              outline: 'none',
              fontSize: '1rem',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#007bff';
              e.target.style.boxShadow = '0 0 0 3px rgba(0, 123, 255, 0.25)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button 
            type="submit" 
            style={{ 
              padding: '14px 24px', 
              cursor: 'pointer', 
              background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '10px',
              fontWeight: 'bold',
              fontSize: '1rem',
              boxShadow: '0 4px 15px rgba(0, 123, 255, 0.3)',
              transition: 'transform 0.1s ease'
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            Add Player
          </button>
        </form>

        {/* Player List */}
        <h3 style={{ fontSize: '1.25rem', marginBottom: '15px', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
          Registered Players ({players.length})
        </h3>
        
        {players.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '20px 0', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '10px' }}>
            No players added yet. Add some names above!
          </p>
        ) : (
          <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {players.map((player) => (
              <li 
                key={player.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '12px 18px', 
                  background: 'rgba(255, 255, 255, 0.03)', 
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <div>
                  <span style={{ fontSize: '1.05rem', fontWeight: '500', display: 'block' }}>{player.name}</span>
                  {player.teams && player.teams.length > 0 && (
                    <span style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginTop: '4px' }}>
                      ⚽ {player.teams.join(', ')}
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => handleDeletePlayer(player.id)}
                  style={{ 
                    background: 'rgba(220, 53, 69, 0.1)', 
                    color: '#ff4d4d', 
                    border: '1px solid rgba(220, 53, 69, 0.2)', 
                    padding: '6px 14px', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#dc3545';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(220, 53, 69, 0.1)';
                    e.currentTarget.style.color = '#ff4d4d';
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}