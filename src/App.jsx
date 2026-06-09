// src/App.jsx
import React, { useState, useEffect } from 'react';
import AdminDashboard from './views/AdminDashboard';
import DraftBoard from './views/DraftBoard';
import PlayerLogin from './views/PlayerLogin';
import MobileDashboard from './views/MobileDashboard';

function App() {
  const [currentStage, setCurrentStage] = useState('player-app'); // Default to the mobile app
  const [currentUser, setCurrentUser] = useState(null);

  // Check if they are already logged in on this phone
  useEffect(() => {
    const savedUser = localStorage.getItem('fantasyUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('fantasyUser');
    setCurrentUser(null);
  };

  // 1. If we are in Admin Mode
  if (currentStage === 'admin-startup') {
    return (
      <div style={{ padding: '20px' }}>
        <button onClick={() => setCurrentStage('player-app')} style={{ marginBottom: '20px' }}>Exit Admin Mode</button>
        <button onClick={() => setCurrentStage('admin-draft')} style={{ marginBottom: '20px', marginLeft: '10px' }}>Go to Live Draft 🚀</button>
        <AdminDashboard />
      </div>
    );
  }

  if (currentStage === 'admin-draft') {
    return (
      <div style={{ padding: '20px' }}>
         <button onClick={() => setCurrentStage('admin-startup')} style={{ marginBottom: '20px' }}>Back to Admin ⚙️</button>
         <DraftBoard />
      </div>
    );
  }

  // 2. The Player Mobile App Experience
  return (
    <>
      {/* Secret Admin trigger at the very bottom of the screen */}
      <div 
        onClick={() => setCurrentStage('admin-startup')} 
        style={{ position: 'fixed', bottom: 0, right: 0, width: '50px', height: '50px', cursor: 'pointer', zIndex: 9999 }} 
      />

      {!currentUser ? (
        <PlayerLogin onLogin={setCurrentUser} />
      ) : (
        <MobileDashboard user={currentUser} onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;