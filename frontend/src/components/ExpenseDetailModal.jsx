import React, { useState, useEffect } from 'react';
import { X, Trash2, Send, MessageSquare, PieChart, Activity, Edit, Clock, FileText } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ExpenseModal from './ExpenseModal';

function ExpenseDetailModal({ expenseId, currencySymbol, onClose, onSuccess }) {
  const { user } = useAuth();
  const [expense, setExpense] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [activities, setActivities] = useState([]);
  const [activeTab, setActiveTab] = useState('comments');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [expRes, comRes, actRes, usersRes] = await Promise.all([
          api.get(`/expenses/${expenseId}`),
          api.get(`/expenses/${expenseId}/comments`),
          api.get(`/expenses/${expenseId}/activity`),
          api.get('/users/all')
        ]);
        setExpense(expRes.data);
        setComments(comRes.data);
        setActivities(actRes.data);
        
        const map = {};
        usersRes.data.forEach(u => map[u.id] = u);
        setUsersMap(map);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [expenseId]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this expense? This action cannot be undone.")) return;
    setDeleting(true);
    try {
      await api.delete(`/expenses/${expenseId}`);
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Failed to delete expense');
      setDeleting(false);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await api.post(`/expenses/${expenseId}/comments`, { content: newComment });
      setComments([...comments, res.data]);
      setNewComment('');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px', textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading expense details...</p>
      </div>
    </div>
  );

  if (!expense) return null;

  const isCreator = expense.created_by_id === user.id;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px', padding: 0, overflow: 'hidden' }}>
        
        <div style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))', padding: '2rem', position: 'relative' }}>
          <button className="close-btn" onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
            <X size={20} />
          </button>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', background: 'rgba(99, 102, 241, 0.15)', padding: '0.3rem 0.6rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                {expense.category}
              </span>
              <h2 style={{ fontSize: '2rem', marginTop: '1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{expense.description}</h2>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{currencySymbol}{expense.total_amount.toFixed(2)}</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Added by {usersMap[expense.created_by_id]?.name} on {new Date(expense.date).toLocaleDateString()}</p>
            </div>
            {isCreator && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => setIsEditing(true)}
                  style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', color: 'var(--color-primary)', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title="Edit Expense"
                >
                  <Edit size={20} />
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{ background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.2)', color: 'var(--color-danger)', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title="Delete Expense"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '2rem', maxHeight: '60vh', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PieChart size={18} /> Split Details <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({expense.split_method})</span>
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
            {expense.splits.map(split => {
              const u = usersMap[split.user_id];
              return (
                <div key={split.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u?.name || 'User')}&background=random&color=fff&size=32`} 
                      alt="Avatar" 
                      style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                    />
                    <span style={{ fontWeight: split.user_id === user.id ? 'bold' : 'normal' }}>{u?.name || 'Unknown'}</span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.9rem' }}>
                    {split.amount_paid > 0 && <div style={{ color: 'var(--color-success)' }}>Paid: {currencySymbol}{split.amount_paid.toFixed(2)}</div>}
                    {split.amount_owed > 0 && <div style={{ color: 'var(--text-secondary)' }}>Owes: {currencySymbol}{split.amount_owed.toFixed(2)}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '2rem 0' }} />

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <button 
              onClick={() => setActiveTab('comments')}
              style={{ background: 'none', border: 'none', color: activeTab === 'comments' ? 'var(--color-primary)' : 'var(--text-secondary)', paddingBottom: '0.5rem', borderBottom: activeTab === 'comments' ? '2px solid var(--color-primary)' : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 500 }}
            >
              <MessageSquare size={18} /> Comments
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              style={{ background: 'none', border: 'none', color: activeTab === 'history' ? 'var(--color-primary)' : 'var(--text-secondary)', paddingBottom: '0.5rem', borderBottom: activeTab === 'history' ? '2px solid var(--color-primary)' : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 500 }}
            >
              <Clock size={18} /> History
            </button>
            <button 
              onClick={() => setActiveTab('receipt')}
              style={{ background: 'none', border: 'none', color: activeTab === 'receipt' ? 'var(--color-primary)' : 'var(--text-secondary)', paddingBottom: '0.5rem', borderBottom: activeTab === 'receipt' ? '2px solid var(--color-primary)' : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 500 }}
            >
              <FileText size={18} /> Receipt
            </button>
          </div>
          
          {activeTab === 'comments' ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                {comments.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>No comments yet.</p>
                ) : (
                  comments.map(c => (
                    <div key={c.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <img 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(c.user?.name || 'User')}&background=random&color=fff&size=32`} 
                        alt="Avatar" 
                        style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }}
                      />
                      <div style={{ background: c.user_id === user.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.05)', padding: '0.75rem 1rem', borderRadius: '0 12px 12px 12px', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: c.user_id === user.id ? 'var(--color-primary)' : 'var(--text-primary)' }}>{c.user?.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.4 }}>{c.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handlePostComment} style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  value={newComment} 
                  onChange={e => setNewComment(e.target.value)} 
                  placeholder="Add a comment..." 
                  style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '24px', background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'white', outline: 'none' }}
                />
                <button type="submit" disabled={!newComment.trim()} style={{ background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: newComment.trim() ? 'pointer' : 'not-allowed', opacity: newComment.trim() ? 1 : 0.5 }}>
                  <Send size={18} style={{ marginLeft: '-2px' }} />
                </button>
              </form>
            </>
          ) : activeTab === 'history' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', paddingLeft: '1rem', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
              {activities.map(act => (
                <div key={act.id} style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-1.35rem', top: '0.2rem', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-primary)' }}></div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    {new Date(act.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                  <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    <span style={{ fontWeight: 'bold' }}>{act.user?.name}</span> {act.details.toLowerCase()}
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'receipt' ? (
            <div style={{ textAlign: 'center' }}>
              {expense.receipt_url ? (
                <div>
                  <img 
                    src={`http://localhost:8000${expense.receipt_url}`} 
                    alt="Receipt" 
                    style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  />
                  <div style={{ marginTop: '1rem' }}>
                    <a 
                      href={`http://localhost:8000${expense.receipt_url}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="btn-secondary"
                      style={{ textDecoration: 'none' }}
                    >
                      Open Full Image
                    </a>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '3rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                  <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                  <p>No receipt attached to this expense.</p>
                </div>
              )}
            </div>
          ) : null}

        </div>
      </div>
      
      {isEditing && (
        <ExpenseModal 
          initialExpense={expense}
          onClose={() => setIsEditing(false)}
          onSuccess={() => {
            setIsEditing(false);
            onSuccess(); // Close and refresh
          }}
        />
      )}
    </div>
  );
}

export default ExpenseDetailModal;
