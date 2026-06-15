import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';

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

  // 3. On-demand Match Sync on Game End
  const syncMatches = async () => {
    localStorage.setItem('last_match_sync', String(Date.now()));

    try {
      // Using corsproxy.io to bypass browser CORS constraints
      const response = await fetch('https://corsproxy.io/?https://api.football-data.org/v4/competitions/WC/matches', {
        headers: { 'X-Auth-Token': import.meta.env.VITE_FOOTBALL_DATA_KEY }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.matches) return;

      const validMatches = data.matches.filter(m => m.homeTeam.name && m.awayTeam.name);

      for (const m of validMatches) {
        const docRef = doc(db, 'fixtures', String(m.id));
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

        await setDoc(docRef, matchData, { merge: true });
      }
      console.log("🎉 Matches synced successfully!");
    } catch (err) {
      console.error("🔥 Error syncing matches:", err);
    }
  };

  useEffect(() => {
    if (fixtures.length === 0) return;

    // Check if any match is expected to have ended (3 hours duration) but not marked FINISHED in Firestore
    const needsSync = fixtures.some(f => {
      if (f.status === 'FINISHED') return false;
      const matchTime = new Date(f.date).getTime();
      const expectedEnd = matchTime + (3 * 60 * 60 * 1000); // 3 hours
      return Date.now() > expectedEnd;
    });

    if (needsSync) {
      const lastSync = localStorage.getItem('last_match_sync');
      const now = Date.now();
      const cooldown = 5 * 60 * 1000; // 5 minutes

      if (!lastSync || (now - parseInt(lastSync, 10)) >= cooldown) {
        console.log("🔄 Triggering match sync because a game should have ended...");
        syncMatches();
      }
    }
  }, [fixtures]);

  // Helper: Find who owns a country
  const getOwner = (country) => {
    const owner = ladder.find(p => p.teams && p.teams.includes(country));
    return owner ? ` (${owner.name})` : '';
  };

  const calculatePoints = (playerTeams) => {
    let points = 0;
    fixtures.forEach(m => {
      if (m.status !== 'FINISHED') return;
      
      const ownsHome = playerTeams.includes(m.home);
      const ownsAway = playerTeams.includes(m.away);

      if (ownsHome) {
        if (m.homeScore > m.awayScore) {
          points += 3;
        } else if (m.homeScore === m.awayScore) {
          points += 1;
        }
      }
      if (ownsAway) {
        if (m.awayScore > m.homeScore) {
          points += 3;
        } else if (m.homeScore === m.awayScore) {
          points += 1;
        }
      }
    });
    return points;
  };

  // Find the live user document from the ladder subscription to ensure real-time updates of their drafted teams
  const liveUser = ladder.find(p => p.id === user.id) || user;
  const myTeams = liveUser.teams || [];
  const myFixtures = fixtures.filter(m => myTeams.some(t => m.home.includes(t) || m.away.includes(t)));

  const liveMatches = myFixtures.filter(f => f.status === 'LIVE');
  const nextMatch = myFixtures.filter(f => f.status === 'SCHEDULED').sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  const resultedMatches = myFixtures.filter(f => f.status === 'FINISHED').sort((a, b) => new Date(b.date) - new Date(a.date));

  // Determine if user's team is winning, draw, or losing
  const getLiveMatchOutcome = (m) => {
    const isHomeOwned = myTeams.some(t => m.home && m.home.includes(t));
    const isAwayOwned = myTeams.some(t => m.away && m.away.includes(t));

    if (m.homeScore === m.awayScore) {
      return 'draw';
    }

    if (m.homeScore > m.awayScore) {
      if (isHomeOwned) return 'winning';
      if (isAwayOwned) return 'losing';
    } else {
      if (isAwayOwned) return 'winning';
      if (isHomeOwned) return 'losing';
    }

    return 'draw';
  };

  const getLiveMatchTheme = (m) => {
    const outcome = getLiveMatchOutcome(m);
    if (outcome === 'winning') {
      return {
        cardStyle: {
          background: 'linear-gradient(135deg, rgba(30, 70, 32, 0.45) 0%, rgba(16, 40, 20, 0.6) 100%)',
          border: '1px solid rgba(40, 167, 69, 0.5)',
          boxShadow: '0 8px 24px 0 rgba(40, 167, 69, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          padding: '15px',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.3s ease'
        },
        scoreStyle: {
          fontWeight: 'bold',
          color: '#39ff14',
          textShadow: '0 0 8px rgba(57, 255, 20, 0.6)'
        },
        dotColor: '#28a745'
      };
    } else if (outcome === 'draw') {
      return {
        cardStyle: {
          background: 'linear-gradient(135deg, rgba(70, 60, 20, 0.45) 0%, rgba(40, 35, 10, 0.6) 100%)',
          border: '1px solid rgba(255, 193, 7, 0.5)',
          boxShadow: '0 8px 24px 0 rgba(255, 193, 7, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          padding: '15px',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.3s ease'
        },
        scoreStyle: {
          fontWeight: 'bold',
          color: '#ffda79',
          textShadow: '0 0 8px rgba(255, 218, 121, 0.6)'
        },
        dotColor: '#ffc107'
      };
    } else {
      return {
        cardStyle: {
          background: 'linear-gradient(135deg, rgba(70, 20, 20, 0.45) 0%, rgba(40, 10, 10, 0.6) 100%)',
          border: '1px solid rgba(220, 53, 69, 0.5)',
          boxShadow: '0 8px 24px 0 rgba(220, 53, 69, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          padding: '15px',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.3s ease'
        },
        scoreStyle: {
          fontWeight: 'bold',
          color: '#ff4d4d',
          textShadow: '0 0 8px rgba(255, 77, 77, 0.6)'
        },
        dotColor: '#dc3545'
      };
    }
  };

  return (
    <div style={{ background: '#121212', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: 'sans-serif' }}>
      <style>{`
        @keyframes pulse-dot {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
        .live-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 8px;
          animation: pulse-dot 2s infinite ease-in-out;
        }
      `}</style>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ margin: 0 }}>Welcome, {user.name}</h2>
        <button onClick={onLogout} style={{ background: '#333', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer' }}>Logout</button>
      </header>

      {/* Your Drafted Teams Section */}
      <div style={{ background: '#1a1a1a', padding: '15px 20px', borderRadius: '12px', marginBottom: '30px', border: '1px solid #333' }}>
        <div style={{ fontSize: '0.8rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>Your Drafted Teams</div>
        <strong style={{ fontSize: '1.2rem', color: '#00ccff' }}>
          {myTeams.length > 0 ? myTeams.join(', ') : 'No teams drafted yet'}
        </strong>
      </div>

      <h3 style={{ color: '#aaa', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '20px' }}>📅 Your Match Feed</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
        {/* Live Matches Sub-section */}
        {liveMatches.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#ff4d4d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', fontWeight: 'bold' }}>
              <span className="live-dot" style={{ backgroundColor: '#ff4d4d', marginRight: '0' }} />
              Live Matches
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {liveMatches.map(m => {
                const theme = getLiveMatchTheme(m);
                return (
                  <div key={m.id} style={theme.cardStyle}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="live-dot" style={{ backgroundColor: theme.dotColor }} />
                      <span>LIVE: {m.home} vs {m.away}</span>
                    </span>
                    <span style={theme.scoreStyle}>{m.homeScore} - {m.awayScore}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Next Match Sub-section */}
        {nextMatch && (
          <div>
            <div style={{ fontSize: '0.75rem', color: '#00ccff', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', fontWeight: 'bold' }}>
              Next Match
            </div>
            <div style={{ background: '#002244', border: '1px solid #00ccff', padding: '15px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.7rem', color: '#00ccff', marginBottom: '4px' }}>UPCOMING</div>
              <div style={{ fontWeight: 'bold' }}>{nextMatch.home}{getOwner(nextMatch.home)} vs {nextMatch.away}{getOwner(nextMatch.away)}</div>
            </div>
          </div>
        )}

        {/* Results Sub-section */}
        {resultedMatches.length > 0 && (
          <div>
            <div style={{ fontSize: '0.75rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', fontWeight: 'bold' }}>
              Results
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {resultedMatches.map(m => (
                <div key={m.id} style={{ background: '#1a1a1a', border: '1px solid #333', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{m.home} vs {m.away}</span>
                  <span>{m.homeScore} - {m.awayScore}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fallback state */}
        {liveMatches.length === 0 && !nextMatch && resultedMatches.length === 0 && (
          <div style={{ color: '#666', fontSize: '0.9rem', fontStyle: 'italic', padding: '10px 0' }}>
            No matches found in your feed.
          </div>
        )}
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