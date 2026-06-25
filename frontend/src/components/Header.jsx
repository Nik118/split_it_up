import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Activity, Users, List, DollarSign, Settings as SettingsIcon, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import SettingsModal from './SettingsModal';

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  return (
    <>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <DollarSign size={28} color="var(--color-primary)" />
          Split It Up
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontWeight: 500 }}>Welcome, {user?.name}</span>
          <button 
            onClick={toggleTheme}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button 
            onClick={() => setShowSettingsModal(true)}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            title="Settings"
          >
            <SettingsIcon size={20} />
          </button>
          <button 
            onClick={logout}
            style={{ 
              background: 'rgba(248, 113, 113, 0.1)', 
              border: '1px solid rgba(248, 113, 113, 0.2)', 
              color: 'var(--color-danger)', 
              padding: '0.5rem 1rem', 
              borderRadius: 'var(--border-radius)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all var(--transition-fast)'
            }}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <button className={`nav-tab ${location.pathname === '/' ? 'active' : ''}`} onClick={() => navigate('/')}><Activity size={18}/> Dashboard</button>
        <button className={`nav-tab ${location.pathname.startsWith('/groups') ? 'active' : ''}`} onClick={() => navigate('/groups')}><Users size={18}/> Groups</button>
        <button className={`nav-tab ${location.pathname.startsWith('/expenses') ? 'active' : ''}`} onClick={() => navigate('/expenses')}><List size={18}/> Expenses</button>
      </div>

      {showSettingsModal && <SettingsModal onClose={() => setShowSettingsModal(false)} />}
    </>
  );
}

export default Header;
