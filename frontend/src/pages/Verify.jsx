import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

function Verify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token');
      if (!token) {
        setStatus('error');
        setErrorMsg('No verification token provided in the URL.');
        return;
      }

      try {
        await api.get(`/auth/verify?token=${token}`);
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setErrorMsg(err.response?.data?.detail || 'Verification failed.');
      }
    };

    verifyToken();
  }, [searchParams]);

  return (
    <div className="auth-container">
      <div className="glass-card auth-card" style={{ textAlign: 'center' }}>
        {status === 'verifying' && (
          <>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Verifying Email...</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Please wait while we verify your email address.</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <h2 style={{ color: 'var(--color-success)', marginBottom: '1rem' }}>Email Verified!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Your account is now active. You can safely log in to Split It Up.
            </p>
            <button className="btn-primary" onClick={() => navigate('/login')}>
              Log In Now
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <h2 style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>Verification Failed</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{errorMsg}</p>
            <button className="btn-secondary" onClick={() => navigate('/login')}>
              Return to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Verify;
