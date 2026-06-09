// src/views/PlayerLogin.jsx
import React, { useState } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function PlayerLogin({ onLogin }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setError('');
    setIsLoading(true);

    try {
      // Look up the user by exact name match (case-sensitive based on how you typed it)
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('name', '==', name.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("Couldn't find that name. Make sure it matches the draft board exactly!");
      } else {
        // Found them! Extract data and pass it up
        const userDoc = querySnapshot.docs[0];
        const userData = { id: userDoc.id, ...userDoc.data() };
        
        // Save to browser memory so they stay logged in
        localStorage.setItem('fantasyUser', JSON.stringify(userData));
        onLogin(userData);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Failed to connect to the database.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', background: '#121212', color: '#fff' }}>
      <div style={{ width: '100%', maxWidth: '350px', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🏆</div>
        <h1 style={{ marginBottom: '10px' }}>World Cup Fantasy</h1>
        <p style={{ color: '#aaa', marginBottom: '30px' }}>Enter your name to view your squad and track live scores.</p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="text"
            placeholder="e.g. Sharkie"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: '15px', fontSize: '1.2rem', borderRadius: '8px', border: 'none', textAlign: 'center', background: '#333', color: '#fff' }}
          />
          
          {error && <div style={{ color: '#ff4444', fontSize: '0.9rem' }}>{error}</div>}

          <button 
            type="submit" 
            disabled={isLoading}
            style={{ padding: '15px', fontSize: '1.2rem', borderRadius: '8px', border: 'none', background: '#007bff', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isLoading ? 'Checking...' : 'Enter Clubhouse'}
          </button>
        </form>
      </div>
    </div>
  );
}