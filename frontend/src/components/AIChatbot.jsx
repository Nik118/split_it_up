import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, User } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function AIChatbot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your AI Financial Assistant. Ask me things like 'What is my total spending?' or 'How much do I owe?'" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.post('/ai/chat', { message: userMessage.content });
      const assistantMessage = { role: 'assistant', content: res.data.response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '6rem', // offset from the main FAB
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'var(--bg-glass)',
          border: '2px solid var(--color-secondary)',
          color: 'var(--color-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-md)',
          backdropFilter: 'blur(10px)',
          transition: 'all var(--transition-fast)',
          zIndex: 99
        }}
        title="AI Assistant"
        className="ai-fab"
      >
        <Bot size={28} />
      </button>
    );
  }

  return (
    <div 
      className="glass-card"
      style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        width: '350px',
        height: '500px',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        zIndex: 100,
        overflow: 'hidden',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        border: '1px solid var(--color-secondary)'
      }}
    >
      <div style={{ padding: '1rem', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bot size={20} />
          <h3 style={{ margin: 0, fontSize: '1rem' }}>AI Financial Assistant</h3>
        </div>
        <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-base)' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ 
            display: 'flex', 
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            alignItems: 'flex-start',
            gap: '0.5rem'
          }}>
            {msg.role === 'assistant' && (
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                <Bot size={16} />
              </div>
            )}
            <div style={{
              background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--bg-surface)',
              color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
              padding: '0.75rem 1rem',
              borderRadius: msg.role === 'user' ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0',
              maxWidth: '80%',
              fontSize: '0.9rem',
              lineHeight: 1.4,
              border: msg.role === 'assistant' ? '1px solid var(--border-color)' : 'none'
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '0.5rem' }}>
             <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                <Bot size={16} />
              </div>
            <div style={{ background: 'var(--bg-surface)', padding: '0.75rem 1rem', borderRadius: '1rem 1rem 1rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} style={{ padding: '1rem', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something..."
          style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: '2rem',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-base)',
            color: 'var(--text-primary)',
            outline: 'none'
          }}
          disabled={isLoading}
        />
        <button 
          type="submit" 
          disabled={!input.trim() || isLoading}
          style={{
            width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
            opacity: input.trim() && !isLoading ? 1 : 0.5
          }}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

export default AIChatbot;
