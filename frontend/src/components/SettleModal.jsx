import React, { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import api from '../services/api';

function SettleModal({ onClose, onSuccess, payee, amount, currencySymbol }) {
  const [loading, setLoading] = useState(false);
  const [settleAmount, setSettleAmount] = useState(amount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/balances/settle', {
        payee_id: payee.id,
        amount: parseFloat(settleAmount),
        currency: 'INR' // The backend accepts this but currently ignores it in simplify
      });
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Failed to settle up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2>Settle Up</h2>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <img 
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(payee.name)}&background=random&color=fff&size=64`} 
              alt={payee.name} 
              style={{ width: '64px', height: '64px', borderRadius: '50%', marginBottom: '1rem' }}
            />
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Paying {payee.name}</h3>
          </div>

          <div className="input-group">
            <label>Amount ({currencySymbol})</label>
            <input 
              type="number" 
              step="0.01" 
              value={settleAmount} 
              onChange={(e) => setSettleAmount(e.target.value)} 
              required 
              max={amount}
              style={{ fontSize: '1.5rem', textAlign: 'center', padding: '1rem' }}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
            <CheckCircle size={20} />
            {loading ? 'Processing...' : 'Record Cash Payment'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SettleModal;
