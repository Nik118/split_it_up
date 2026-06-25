import React, { useState } from 'react';
import { X } from 'lucide-react';
import api from '../services/api';

function GroupModal({ onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a group name.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/groups', { name });
      onSuccess();
    } catch (err) {
      let errMsg = err.response?.data?.detail;
      if (Array.isArray(errMsg)) errMsg = errMsg[0].msg;
      else if (typeof errMsg === 'object') errMsg = JSON.stringify(errMsg);
      setError(errMsg || 'Failed to create group.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="glass-card modal-content" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2>Create Group</h2>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="input-group">
            <label>Group Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Trip to Goa" 
              required 
            />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default GroupModal;
