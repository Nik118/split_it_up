import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import api from '../services/api';
import './Auth.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err) {
      let errMsg = err.response?.data?.detail;
      if (Array.isArray(errMsg)) {
        errMsg = errMsg[0].msg;
      } else if (typeof errMsg === 'object') {
        errMsg = JSON.stringify(errMsg);
      }
      setError(errMsg || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="glass-card auth-card" style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--color-success)', marginBottom: '1rem' }}>Reset Link Sent</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            If the email address <strong>{email}</strong> is registered, we have sent a password reset link. 
            Please check your inbox (or terminal logs) and click the link to reset your password.
          </p>
          <Link to="/login" className="btn-secondary" style={{ display: 'inline-block', textDecoration: 'none' }}>
            Return to Login
          </Link>
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
          <h1>Forgot Password</h1>
          <p>Enter your email to receive a reset link</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email Address</label>
            <input 
              type="email" 
              placeholder="you@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Sending link...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="auth-footer">
          Remember your password? <Link to="/login">Login here</Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
