import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.close();
        setSocket(null);
      }
      return;
    }

    const ws = new WebSocket(`ws://localhost:8000/ws/${user.id}`);
    
    ws.onopen = () => {
      console.log('WebSocket Connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WebSocket Message:', data);
      
      // Show toast notification
      setToast(data.message);
      setTimeout(() => setToast(null), 5000);
    };

    ws.onclose = () => {
      console.log('WebSocket Disconnected');
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [user]);

  return (
    <WebSocketContext.Provider value={{ socket }}>
      {children}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'var(--color-primary)',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          zIndex: 9999,
          animation: 'slideIn 0.3s ease-out'
        }}>
          <strong>New Update!</strong><br />
          {toast}
        </div>
      )}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
