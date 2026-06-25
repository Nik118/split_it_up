import React, { useState } from 'react';
import { X } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CURRENCY_SYMBOLS } from '../utils/currency';

function SettingsModal({ onClose }) {
  const { user, setUser } = useAuth();
  const [currency, setCurrency] = useState(user?.default_currency || 'INR');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async (newCurrency) => {
    setLoading(true);
    setMessage('');
    try {
      const res = await api.put('/users/me/currency', { currency: newCurrency || currency });
      setUser(res.data);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setMessage('Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="glass-card modal-content" style={{ maxWidth: '500px', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: 0 }}>Account Settings</h2>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="input-group" style={{ position: 'relative' }}>
            <label>Default Currency</label>
            <select 
              value={currency} 
              onChange={(e) => {
                setCurrency(e.target.value);
                handleSave(e.target.value);
              }} 
              className="glass-select"
              style={{ appearance: 'auto', paddingRight: '2.5rem' }}
              disabled={loading}
            >
              {Object.entries(CURRENCY_SYMBOLS).map(([code, symbol]) => (
                <option key={code} value={code}>{code} ({symbol})</option>
              ))}
            </select>
            {loading && <div style={{ position: 'absolute', right: '1rem', top: '2.2rem', color: 'var(--color-primary)' }}>...</div>}
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              This is the default currency used for displaying your balances and adding new expenses. Changes save automatically.
            </p>
          </div>

          {message && (
            <div style={{ 
              marginTop: '0.5rem', 
              padding: '0.75rem', 
              borderRadius: '8px', 
              textAlign: 'center',
              background: message.includes('Failed') ? 'rgba(248, 113, 113, 0.1)' : 'rgba(74, 222, 128, 0.1)',
              color: message.includes('Failed') ? 'var(--color-danger)' : 'var(--color-success)',
              fontSize: '0.9rem'
            }}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
