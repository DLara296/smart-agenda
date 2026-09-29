import React, { useEffect, useState } from 'react';
import Dashboard from './features/dashboard/Dashboard';
import FamilyForm from './features/family/FamilyForm';
import FamilyDirectory from './features/family/FamilyDirectory';
import MyFamily from './features/family/MyFamily';
import NotificationsScreen from './features/notification/NotificationsScreen';
import NotificationSettings from './features/notification/NotificationSettings';
import WorkspaceView from './features/workspace/WorkspaceView';
import RecordDirectory from './features/workspace/RecordDirectory';
import SessionForm from './features/session/SessionForm';
import SessionDirectory from './features/session/SessionDirectory';
import ProfileEditor from './features/profile/ProfileEditor';
import SchoolProfileEditor from './features/profile/SchoolProfileEditor';
import ActionForm from './features/workflow/ActionForm';
import AuthScreen from './features/auth/AuthScreen';
import SettingsView from './features/settings/SettingsView';
import HistoryView from './features/history/HistoryView';
import GuestDashboard from './features/dashboard/GuestDashboard';
import CalendarView from './features/calendar/CalendarView';
import SchoolManagement from './features/school/SchoolManagement';
import { PreferencesProvider, usePreferences } from './features/settings/PreferencesContext';
import ApplicationBackground, { resolveBackground } from './features/settings/ApplicationBackground';
import { I18nProvider, useI18n } from './i18n/I18nContext';
import './App.css';

function AppContent({ authenticatedUser, onLogout }) {
  const { language, languages, setLanguage, t } = useI18n();
  const { formatDate, applicationBackground, backgroundOverlay, interfaceEffect, resolvedTheme, appearanceLoaded, loadAccountAppearance } = usePreferences();
  const hasBackground = Boolean(resolveBackground(applicationBackground));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAccountAppearance(); }, [authenticatedUser?.id]);
  const [view, setView] = useState('dashboard');
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [schoolMenuOpen, setSchoolMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [school, setSchool] = useState({ id: 'school-1', name: 'Westfield Elementary', timezone: 'UTC', locale: 'en-US', avatar: { value: 'W', tone: 'default' } });
  const [profile, setProfile] = useState(() => {
    try {
      return (
        authenticatedUser || JSON.parse(localStorage.getItem('smartAgendaProfile')) || {
          name: 'David Lara',
          avatar: { value: 'DL', tone: 'default' },
        }
      );
    } catch {
      return { name: 'David Lara', avatar: { value: 'DL', tone: 'default' } };
    }
  });
  const [schools, setSchools] = useState([
    { id: 'school-1', name: 'Westfield Elementary', timezone: 'UTC', locale: 'en-US', avatar: { value: 'W', tone: 'default' } },
    { id: 'school-2', name: 'Northview Primary', timezone: 'UTC', locale: 'en-US', avatar: { value: 'N', tone: 'default' } },
    { id: 'school-3', name: 'Lakeside Academy', timezone: 'UTC', locale: 'en-US', avatar: { value: 'L', tone: 'default' } },
  ]);
  const isGuest = authenticatedUser?.role === 'guest';
  const isAdmin = authenticatedUser?.role === 'admin';
  const navigation = [
    ['▦', 'Dashboard', 'dashboard'],
    ['◷', 'Calendar', 'calendar'],
    ['▤', 'Reading Sessions', 'sessions'],
    ...(isAdmin ? [['⌂', 'Schools', 'schools']] : []),
    isAdmin ? ['⌂', 'Families', 'families'] : ['⌂', 'My Family', 'myFamily'],
    ['♧', 'Teachers', 'teachers'],
    ['◉', 'Students', 'students'],
    ['✉', 'Notifications', 'notifications'],
    ['↺', 'History', 'history'],
  ].filter(([, label]) => !(isGuest && ['Teachers', 'Students'].includes(label)));
  const navigate = (label) => {
    setActiveNav(label);
    if (label === 'History') setHistoryView('all');
    setView(
      label === 'Families' || label === 'My Family'
        ? 'families'
        : label === 'Dashboard'
          ? 'dashboard'
          : label.toLowerCase().replaceAll(' ', '-')
    );
  };
  const languageOption = languages.find((item) => item.code === language);
  const [registeredSessions, setRegisteredSessions] = useState([]);
  const [historyView, setHistoryView] = useState('all');
  const openHistory = (initialView = 'all') => {
    setHistoryView(initialView);
    setActiveNav('History');
    setView('history');
  };
  const [editingSession, setEditingSession] = useState(null);
  const [editingFamily, setEditingFamily] = useState(null);
  const editSession = session => {
    setEditingSession(session);
    setView('edit-session');
  };

  const loadSessions = () => {
    if (typeof fetch !== 'function') return;
    fetch('/v1/sessions', { headers: { 'x-user-role': 'coordinator' } })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Sessions unavailable')))
      .then(data => setRegisteredSessions(Array.isArray(data) ? data : []))
      .catch(() => setRegisteredSessions([]));
  };

  useEffect(loadSessions, [authenticatedUser]);

  useEffect(() => {
    if (typeof fetch !== 'function') return;
    fetch('/v1/profile', { headers: { 'x-user-role': 'coordinator', 'x-user-id': 'user-coordinator' } })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Profile unavailable')))
      .then(payload => setProfile(payload.data))
      .catch(() => {});
    fetch('/v1/schools', { headers: { 'x-user-role': 'coordinator' } })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Schools unavailable')))
      .then(payload => {
        if (payload.data?.length) {
          setSchools(payload.data);
          setSchool(current => payload.data.find(option => option.id === current.id) || payload.data[0]);
        }
      })
      .catch(() => {});
  }, [authenticatedUser]);

  const saveProfile = async nextProfile => {
    const response = await fetch('/v1/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-user-role': 'coordinator', 'x-user-id': 'user-coordinator' }, body: JSON.stringify(nextProfile) });
    if (!response.ok) throw new Error('Profile save failed');
    const payload = await response.json();
    setProfile(payload.data);
    localStorage.setItem('smartAgendaProfile', JSON.stringify(payload.data));
  };

  const saveSchool = async changes => {
    const response = await fetch(`/v1/schools/${school.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-user-role': 'coordinator' }, body: JSON.stringify(changes) });
    if (!response.ok) throw new Error('School save failed');
    const payload = await response.json();
    setSchool(payload.data);
    setSchools(current => current.map(option => option.id === payload.data.id ? payload.data : option));
  };

  if (!appearanceLoaded) return <div className="auth-loading" role="status">Loading SmartAgenda...</div>;

  return (
    <div className={`app smart-agenda-app ${hasBackground ? `has-app-background effect-${interfaceEffect}` : ''}`} data-testid="app-shell">
      <ApplicationBackground image={applicationBackground} overlay={backgroundOverlay} resolvedTheme={resolvedTheme} />
      <aside className="sidebar">
        <div className="brand-mark">
          <img src="/assets/smart-agenda-icon.png" alt="" />
          <div>
            <strong>{t('brand')}</strong>
            <small>{school.name}</small>
          </div>
        </div>
        <nav aria-label={t('workspace')}>
          <p className="nav-label">{t('workspace')}</p>
          {navigation.map(([icon, label, key]) => (
            <button
              key={label}
              className={`nav-item ${activeNav === label ? 'active' : ''}`}
              onClick={() => navigate(label)}
            >
              <span aria-hidden="true">{icon}</span>
              {t(key)}
            </button>
          ))}
          <p className="nav-label settings-label">{t('manage')}</p>
          <button
            className={`nav-item ${activeNav === 'Settings' ? 'active' : ''}`}
            onClick={() => navigate('Settings')}
          >
            <span aria-hidden="true">⚙</span>
            {t('settings')}
          </button>
        </nav>
        <div className="sidebar-footer profile-anchor">
          <button className="profile-trigger" aria-label={t('openProfile')} onClick={() => setView('profile')}>
            <ProfileAvatar avatar={profile.avatar} small />
            <span>
              <strong>{profile.name}</strong>
              <small>{profile.familyName || t('coordinator')}</small>
            </span>
          </button>
          <button className="more-button" aria-label={t('profileMenu')} aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen(open => !open)}>•••</button>
          {profileMenuOpen && (
            <div className="profile-menu">
              <strong>{profile.name}</strong>
              <button
                onClick={() => {
                  setProfileMenuOpen(false);
                  setView('profile');
                }}
              >
                {t('editProfile')}
              </button>
              <button onClick={onLogout}>{t('signOut')}</button>
            </div>
          )}
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="school-context school-selector">
            <button
              className="school-icon school-profile-trigger"
              aria-label={t('editSchoolProfile')}
              onClick={() => setView('school-profile')}
            >
              W
            </button>
            <button
              className="school-trigger"
              aria-label={t('selectSchool')}
              aria-expanded={schoolMenuOpen}
              onClick={() => setSchoolMenuOpen(!schoolMenuOpen)}
            >
              <span>
                <small>{t('currentSchool')}</small>
                <strong>{school.name}⌄</strong>
              </span>
            </button>
            {schoolMenuOpen && (
              <div className="school-menu">
                {schools.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setSchool(option);
                      setSchoolMenuOpen(false);
                    }}
                  >
                    {option.name}
                  </button>
                ))}
                <button
                  className="add-school"
                  onClick={() => {
                    setSchoolMenuOpen(false);
                    navigate('Settings');
                  }}
                >
                  ＋ {t('addNewSchool')}
                </button>
              </div>
            )}
          </div>
          <div className="topbar-actions">
            <div className="language-selector">
              <button
                className="language-trigger"
                aria-label={t('language')}
                aria-expanded={languageMenuOpen}
                onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
              >
                {languageOption.flag} <span>{languageOption.name}</span>
              </button>
              {languageMenuOpen && (
                <div className="language-menu">
                  {languages.map((item) => (
                    <button
                      key={item.code}
                      className={item.code === language ? 'active' : ''}
                      onClick={() => {
                        setLanguage(item.code);
                        setLanguageMenuOpen(false);
                      }}
                    >
                      {item.flag} {item.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="topbar-search">
              {searchOpen && (
                <input
                  autoFocus
                  aria-label={t('search')}
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              )}
              <button
                className="icon-button"
                aria-label={searchOpen ? t('closeSearch') : t('search')}
                onClick={() => setSearchOpen(!searchOpen)}
              >
                ⌕
              </button>
            </div>
            <div className="notification-menu">
              <button
                className="icon-button notification-dot"
                aria-label={t('openNotifications')}
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                ♢
              </button>
              {notificationsOpen && (
                <div className="notification-popover">
                  <strong>{t('notifications')}</strong>
                  <p>{t('notificationPending')}</p>
                  <p>{t('notificationFailed')}</p>
                  <button className="text-action" onClick={() => navigate('Notifications')}>
                    {t('viewAllNotifications')}
                  </button>
                </div>
              )}
            </div>
            <button
              className="avatar avatar-button"
              aria-label={t('editProfile')}
              onClick={() => setView('profile')}
            >
              <ProfileAvatar avatar={profile.avatar} />
            </button>
          </div>
        </header>
        <main className="app-main">
          {view === 'dashboard' && isGuest && (
            <div className="app-container single-column">
              <GuestDashboard
                user={profile.id ? profile : authenticatedUser}
                onOpenHistory={openHistory}
                onRegisterFamily={() => { setActiveNav('My Family'); setView('families'); }}
                onNewSession={() => setView('new-session')}
              />
            </div>
          )}
          {view === 'dashboard' && !isGuest && (
            <div className="app-container">
              <div className="welcome-row">
                <div>
                  <p className="app-eyebrow">{formatDate(new Date())}</p>
                  <h1>{t('goodMorning', { name: profile.name })} ✦</h1>
                  <p className="welcome-copy">{t('welcome')}</p>
                </div>
                <button className="primary-action" onClick={() => setView('new-session')}>
                  ＋ {t('newSession')}
                </button>
              </div>
              <Dashboard
                sessions={[{ id: 'session-demo', missingGroups: ['Group B'] }]}
                registeredSessions={registeredSessions}
                onEditSession={editSession}
                onNewSession={() => setView('new-session')}
                onRegisterFamily={() => setView('family')}
                onManageSession={() => setView('manage-session')}
                onAssignVolunteer={() => setView('assign-volunteer')}
                onSendNotification={() => setView('send-notification')}
              />
              <NotificationsScreen notifications={[]} />
            </div>
          )}
          {view === 'families' && (
            <div className="app-container single-column">
              {isAdmin
                ? <FamilyDirectory families={[]} onRegister={() => setView('family')} />
                : <MyFamily onRegister={() => setView('family')} onEdit={family => { setEditingFamily(family); setView('edit-family'); }} />}
            </div>
          )}
          {view === 'schools' && isAdmin && (
            <div className="app-container single-column">
              <SchoolManagement />
            </div>
          )}
          {view === 'family' && (
            <FamilyForm
              allowStructureChanges={isAdmin}
              onCancel={() => setView('families')}
              onSuccess={() => setView('families')}
            />
          )}
          {view === 'edit-family' && editingFamily && (
            <FamilyForm
              key={editingFamily.id}
              family={editingFamily}
              allowStructureChanges={isAdmin}
              onCancel={() => setView('families')}
              onSuccess={() => { setEditingFamily(null); setView('families'); }}
            />
          )}
          {view === 'reading-sessions' && (
            <div className="app-container single-column">
              <SessionDirectory onNew={() => setView('new-session')} onEdit={editSession} />
            </div>
          )}
          {view === 'teachers' && !isGuest && (
            <div className="app-container single-column">
              <RecordDirectory type="Teachers" />
            </div>
          )}
          {view === 'students' && !isGuest && (
            <div className="app-container single-column">
              <RecordDirectory type="Students" canCreateGrades={isAdmin} />
            </div>
          )}
          {view === 'new-session' && (
            <SessionForm
              familyOnly={isGuest}
              onCancel={() => setView('reading-sessions')}
              onSuccess={() => {
                loadSessions();
                setActiveNav('Dashboard');
                setView('dashboard');
              }}
            />
          )}
          {view === 'edit-session' && editingSession && (
            <SessionForm
              key={editingSession.id}
              session={editingSession}
              familyOnly={isGuest}
              onCancel={() => setView('dashboard')}
              onSuccess={() => {
                loadSessions();
                setEditingSession(null);
                setActiveNav('Dashboard');
                setView('dashboard');
              }}
            />
          )}
          {view === 'notifications' && (
            <div className="app-container single-column">
              <NotificationSettings />
            </div>
          )}
          {view === 'settings' && (
            <div className="app-container single-column">
              <SettingsView />
            </div>
          )}
          {view === 'history' && (
            <div className="app-container single-column">
              <HistoryView key={historyView} initialView={historyView} />
            </div>
          )}
          {view === 'calendar' && (
            <div className="app-container single-column">
              <CalendarView />
            </div>
          )}
          {view === 'manage-session' && (
            <ActionForm type="session" onCancel={() => setView('dashboard')} />
          )}
          {view === 'assign-volunteer' && (
            <ActionForm type="volunteer" onCancel={() => setView('dashboard')} />
          )}
          {view === 'send-notification' && (
            <ActionForm type="notification" onCancel={() => setView('dashboard')} />
          )}
          {view === 'profile' && (
            <div className="app-container single-column">
              <ProfileEditor
                initialProfile={profile}
                onCancel={() => setView('dashboard')}
                onSave={saveProfile}
              />
            </div>
          )}
          {view === 'school-profile' && (
            <div className="app-container single-column">
              <SchoolProfileEditor school={school} onCancel={() => setView('dashboard')} onSave={saveSchool} />
            </div>
          )}
          {![
            'dashboard',
            'families',
            'schools',
            'family',
            'edit-family',
            'reading-sessions',
            'teachers',
            'students',
            'new-session',
            'edit-session',
            'notifications',
            'settings',
            'history',
            'calendar',
            'manage-session',
            'assign-volunteer',
            'send-notification',
            'profile',
            'school-profile',
          ].includes(view) && (
            <div className="app-container single-column">
              <WorkspaceView
                name={activeNav}
                onPrimaryAction={
                  activeNav === 'Reading Sessions' ? () => setView('new-session') : null
                }
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function ProfileAvatar({ avatar, small = false }) {
  if (avatar?.tone === 'photo')
    return <img className={`avatar ${small ? 'avatar-small' : ''}`} src={avatar.value} alt="" />;
  return <span className={`avatar ${small ? 'avatar-small' : ''}`}>{avatar?.value || 'DL'}</span>;
}
function AuthGate() {
  const [user, setUser] = useState(process.env.NODE_ENV === 'test' ? { id: 'user-test', name: 'David Lara', email: 'test@example.com', role: 'admin', avatar: { value: 'DL', tone: 'default' } } : null);
  const [loading, setLoading] = useState(process.env.NODE_ENV !== 'test');

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') return undefined;
    fetch('/v1/auth/me', { credentials: 'include' }).then(response => response.ok ? response.json() : Promise.reject(new Error('Unauthenticated'))).then(payload => setUser(payload.data)).catch(() => setUser(null)).finally(() => setLoading(false));
    return undefined;
  }, []);

  if (loading) return <div className="auth-loading">Loading SmartAgenda...</div>;
  if (!user) return <AuthScreen onAuthenticated={setUser} />;
  return <AppContent authenticatedUser={user} onLogout={async () => { await fetch('/v1/auth/logout', { method: 'POST', credentials: 'include' }); setUser(null); }} />;
}

function App() { return <I18nProvider><PreferencesProvider><AuthGate /></PreferencesProvider></I18nProvider>; }
export default App;
