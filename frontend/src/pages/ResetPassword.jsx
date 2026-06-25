import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { KeyRound, CheckCircle } from 'lucide-react';
import api from '../services/api';
import './Auth.css';

function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }
    
    setLoading(true);

    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      setSuccess(true);
    } catch (err) {
      let errMsg = err.response?.data?.detail;
      if (Array.isArray(errMsg)) {
        errMsg = errMsg[0].msg;
      } else if (typeof errMsg === 'object') {
        errMsg = JSON.stringify(errMsg);
      }
      setError(errMsg || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="glass-card auth-card" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <CheckCircle color="var(--color-success)" size={48} />
          </div>
          <h2 style={{ color: 'var(--color-success)', marginBottom: '1rem' }}>Password Reset Successful!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Your password has been securely updated. You can now log in with your new credentials.
          </p>
          <button className="btn-primary" onClick={() => navigate('/login')}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="glass-card auth-card">
        <div className="auth-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <div style={{ background: 'var(--color-primary)', padding: '12px', borderRadius: '50%' }}>
              <KeyRound color="white" size={28} />
            </div>
          </div>
          <h1>Create New Password</h1>
          <p>Please enter your new password below</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>New Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required 
              disabled={!token}
            />
          </div>
          
          <div className="input-group">
            <label>Confirm New Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required 
              disabled={!token}
            />
          </div>
          
          <button type="submit" className="btn-primary" disabled={loading || !token}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="auth-footer">
          Changed your mind? <Link to="/login">Return to login</Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
