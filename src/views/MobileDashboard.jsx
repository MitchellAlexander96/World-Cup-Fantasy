import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

export default function MobileDashboard({ user, onLogout }) {
  const [ladder, setLadder] = useState([]);
  const [fixtures, setFixtures] = useState([]);

  // 1. Load Ladder (Real-time Firebase)
  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("totalPoints", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLadder(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // 2. Load Fixtures (Real-time Firebase)
  useEffect(() => {
    const q = collection(db, "fixtures");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const STATUS_MAP = { 'TIMED': 'SCHEDULED', 'SCHEDULED': 'SCHEDULED', 'FINISHED': 'FINISHED', 'AWARDED': 'FINISHED', 'IN_PLAY': 'LIVE', 'PAUSED': 'LIVE' };

      const dbFixtures = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          home: data.home,
          away: data.away,
          homeScore: data.homeScore ?? 0,
          awayScore: data.awayScore ?? 0,
          status: STATUS_MAP[data.status] || 'SCHEDULED',
          date: data.date
        };
      });
      setFixtures(dbFixtures);
    });
    return () => unsubscribe();
  }, []);

  // Helper: Find who owns a country
  const getOwner = (country) => {
    const owner = ladder.find(p => p.teams && p.teams.includes(country));
    return owner ? ` (${owner.name})` : '';
  };

  const calculatePoints = (playerTeams) => {
    let points = 0;
    fixtures.forEach(m => {
      if (m.status !== 'FINISHED') return;
      const owns = playerTeams.includes(m.home) || playerTeams.includes(m.away);
      if (owns) {
        if (m.homeScore === m.awayScore) points += 1;
        else points += 3;
      }
    });
    return points;
  };

  const myTeams = user.teams || [];
  const myFixtures = fixtures.filter(m => myTeams.some(t => m.home.includes(t) || m.away.includes(t)));

  const liveMatches = myFixtures.filter(f => f.status === 'LIVE');
  const nextMatch = myFixtures.filter(f => f.status === 'SCHEDULED').sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  const resultedMatches = myFixtures.filter(f => f.status === 'FINISHED').sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div style={{ background: '#121212', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ margin: 0 }}>Welcome, {user.name}</h2>
        <button onClick={onLogout} style={{ background: '#333', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>Logout</button>
      </header>

      <h3 style={{ color: '#aaa', fontSize: '0.9rem', textTransform: 'uppercase' }}>📅 Your Match Feed</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' }}>
        {liveMatches.map(m => (
          <div key={m.id} style={{ background: '#440000', border: '1px solid #ff4444', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <span>LIVE: {m.home} vs {m.away}</span>
            <span style={{ fontWeight: 'bold', color: '#ff4444' }}>{m.homeScore} - {m.awayScore}</span>
          </div>
        ))}
        {nextMatch && (
          <div style={{ background: '#002244', border: '1px solid #00ccff', padding: '15px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.7rem', color: '#00ccff' }}>NEXT UP</div>
            <div style={{ fontWeight: 'bold' }}>{nextMatch.home}{getOwner(nextMatch.home)} vs {nextMatch.away}{getOwner(nextMatch.away)}</div>
          </div>
        )}
        {resultedMatches.map(m => (
          <div key={m.id} style={{ background: '#1a1a1a', border: '1px solid #333', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <span>{m.home} vs {m.away}</span>
            <span>{m.homeScore} - {m.awayScore}</span>
          </div>
        ))}
      </div>

      <h3 style={{ color: '#aaa', fontSize: '0.9rem', textTransform: 'uppercase' }}>🏆 Tournament Ladder</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {ladder.sort((a, b) => calculatePoints(b.teams) - calculatePoints(a.teams)).map((p, i) => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: p.id === user.id ? '#003366' : '#1a1a1a', borderRadius: '10px', border: p.id === user.id ? '1px solid #00ccff' : '1px solid #333' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <span style={{ color: '#666', width: '20px' }}>{i + 1}</span>
              <div>
                <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#888' }}>{p.teams?.join(' & ')}</div>
              </div>
            </div>
            <span style={{ color: '#28a745', fontWeight: 'bold' }}>{calculatePoints(p.teams || [])} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}