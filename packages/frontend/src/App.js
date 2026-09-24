import React, { useState } from 'react';
import Dashboard from './features/dashboard/Dashboard';
import FamilyForm from './features/family/FamilyForm';
import FamilyDirectory from './features/family/FamilyDirectory';
import NotificationsScreen from './features/notification/NotificationsScreen';
import './App.css';

function App() {
  const [view, setView] = useState('dashboard');
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const navigation = [
    ['▦', 'Dashboard'],
    ['◷', 'Calendar'],
    ['▤', 'Reading Sessions'],
    ['⌂', 'Families'],
    ['♧', 'Teachers'],
    ['◉', 'Students'],
    ['✉', 'Notifications'],
    ['↺', 'History'],
  ];

  return (
    <div className="app smart-agenda-app">
      <aside className="sidebar">
        <div className="brand-mark"><span>SA</span><div><strong>SmartAgenda</strong><small>Westfield Elementary</small></div></div>
        <nav aria-label="Primary navigation">
          <p className="nav-label">Workspace</p>
          {navigation.map(([icon, label]) => (
            <button key={label} className={`nav-item ${activeNav === label ? 'active' : ''}`} onClick={() => { setActiveNav(label); if (label === 'Families') setView('families'); else if (label === 'Dashboard') setView('dashboard'); }}>
              <span aria-hidden="true">{icon}</span>{label}
            </button>
          ))}
          <p className="nav-label settings-label">Manage</p>
          <button className="nav-item" onClick={() => setActiveNav('Settings')}><span aria-hidden="true">⚙</span>Settings</button>
        </nav>
        <div className="sidebar-footer"><span className="avatar avatar-small">DL</span><div><strong>David Lara</strong><small>Coordinator</small></div><span className="more">•••</span></div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="school-context"><span className="school-icon">W</span><div><small>Current school</small><strong>Westfield Elementary⌄</strong></div></div>
          <div className="topbar-actions">
            <div className="topbar-search">
              {searchOpen && <input autoFocus aria-label="Search SmartAgenda" placeholder="Search sessions, families..." value={searchTerm} onChange={event => setSearchTerm(event.target.value)} />}
              <button className="icon-button" aria-label={searchOpen ? 'Close search' : 'Search'} onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearchTerm(''); }}>⌕</button>
              {searchOpen && searchTerm && <div className="search-popover" role="status">Search is ready for live session and family data.</div>}
            </div>
            <div className="notification-menu">
              <button className="icon-button notification-dot" aria-label="Open notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(!notificationsOpen)}>♢</button>
              {notificationsOpen && <div className="notification-popover"><strong>Notifications</strong><p>Teacher confirmation is pending.</p><p>WhatsApp volunteer request failed.</p><button className="text-action" onClick={() => { setNotificationsOpen(false); setActiveNav('Notifications'); }}>View all notifications</button></div>}
            </div>
            <span className="avatar">DL</span>
          </div>
        </header>
        <main className="app-main">
          {view === 'dashboard' ? (
            <div className="app-container">
              <div className="welcome-row"><div><p className="app-eyebrow">Thursday, October 1, 2026</p><h1>Good morning, David <span aria-hidden="true">✦</span></h1><p className="welcome-copy">Let's get the next reading session ready.</p></div><button className="primary-action" onClick={() => setActiveNav('Reading Sessions')}>＋ New Reading Session</button></div>
              <Dashboard sessions={[{ id: 'session-demo', missingGroups: ['Group B'] }]} onRegisterFamily={() => setView('family')} />
              <NotificationsScreen notifications={[]} />
            </div>
          ) : view === 'families' ? (
            <div className="app-container single-column"><FamilyDirectory families={[]} onRegister={() => setView('family')} /></div>
          ) : (
            <FamilyForm onCancel={() => setView('dashboard')} onSuccess={() => setView('dashboard')} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
