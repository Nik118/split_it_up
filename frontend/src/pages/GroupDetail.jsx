import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Users, Plus, List, UserPlus, X, Download } from 'lucide-react';
import api from '../services/api';
import ExpenseModal from '../components/ExpenseModal';
import ExpenseDetailModal from '../components/ExpenseDetailModal';
import Header from '../components/Header';
import { getCurrencySymbol } from '../utils/currency';

function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState(null);

  const currencySymbol = getCurrencySymbol(user?.default_currency);

  const fetchData = async () => {
    try {
      const [groupRes, expensesRes, usersRes] = await Promise.all([
        api.get(`/groups/${id}`),
        api.get(`/expenses?group_id=${id}`),
        api.get('/users/all')
      ]);
      setGroup(groupRes.data);
      setExpenses(expensesRes.data || []);
      setAllUsers(usersRes.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load group details.");
      navigate('/groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    setAddingMember(true);
    try {
      await api.post(`/groups/${id}/members/${selectedUserId}`);
      setShowAddMemberModal(false);
      setSelectedUserId('');
      fetchData();
    } catch (err) {
      alert("Failed to add member: " + (err.response?.data?.detail || "Unknown error"));
    } finally {
      setAddingMember(false);
    }
  };

  const availableUsersToAdd = group ? allUsers.filter(u => !group.members.some(m => m.id === u.id)) : [];

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading group details...</div>;
  if (!group) return null;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <Header />
      
      <button 
        onClick={() => navigate('/groups')} 
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '1.5rem' }}
      >
        <ArrowLeft size={20} /> Back to Groups
      </button>

      <header className="glass-card" style={{ padding: '2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={28} color="var(--color-primary)" />
            {group.name}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Created on {new Date(group.created_at).toLocaleDateString()}</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '-10px', marginRight: '0.5rem' }}>
            {group.members.map((member, idx) => (
              <img 
                key={member.id}
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random&color=fff&size=40`} 
                alt={member.name} 
                title={member.name}
                style={{ 
                  width: '40px', height: '40px', borderRadius: '50%', 
                  border: '2px solid var(--bg-surface)',
                  marginLeft: idx > 0 ? '-10px' : '0',
                  zIndex: group.members.length - idx 
                }}
              />
            ))}
          </div>
          <button 
            onClick={() => setShowAddMemberModal(true)}
            style={{ 
              width: '40px', height: '40px', borderRadius: '50%', 
              background: 'rgba(99, 102, 241, 0.1)', border: '1px dashed var(--color-primary)', 
              color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 0
            }}
            title="Add Member"
          >
            <UserPlus size={18} />
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>Group Expenses</h2>
        <a 
          href={`http://localhost:8000/groups/${id}/export/csv`}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
        >
          <Download size={18} /> Export CSV
        </a>
      </div>

      {expenses.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <List size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No expenses yet</h3>
          <p style={{ color: 'var(--text-muted)' }}>Click the + button to add the first expense to this group.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {expenses.map((expense) => {
            const mySplit = expense.splits.find(s => s.user_id === user.id);
            return (
              <div 
                key={expense.id} 
                className="glass-card" 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}
                onClick={() => setSelectedExpenseId(expense.id)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>{expense.description}</h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', width: 'fit-content' }}>
                    {expense.category}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Total: {currencySymbol}{expense.total_amount.toFixed(2)} • {new Date(expense.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  {mySplit ? (
                    <>
                      {mySplit.amount_paid > 0 && <div style={{ color: 'var(--color-success)', fontWeight: 500 }}>You paid: {currencySymbol}{mySplit.amount_paid.toFixed(2)}</div>}
                      {mySplit.amount_owed > 0 && <div style={{ color: 'var(--color-danger)', fontWeight: 500 }}>Your share: {currencySymbol}{mySplit.amount_owed.toFixed(2)}</div>}
                    </>
                  ) : (
                    <div style={{ color: 'var(--text-muted)' }}>Not involved</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button */}
      <button 
        className="fab"
        title="Add Group Expense"
        onClick={() => setShowModal(true)}
      >
        <Plus size={24} />
      </button>

      {showModal && (
        <ExpenseModal 
          onClose={() => setShowModal(false)} 
          onSuccess={() => {
            setShowModal(false);
            setLoading(true);
            fetchData();
          }} 
          initialGroupId={group.id}
        />
      )}

      {selectedExpenseId && (
        <ExpenseDetailModal 
          expenseId={selectedExpenseId}
          currencySymbol={currencySymbol}
          onClose={() => setSelectedExpenseId(null)}
          onSuccess={() => {
            setSelectedExpenseId(null);
            setLoading(true);
            fetchData();
          }}
        />
      )}

      {showAddMemberModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={24} color="var(--color-primary)" />
                Add Member
              </h2>
              <button className="close-btn" onClick={() => setShowAddMemberModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-body">
              {availableUsersToAdd.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>All users are already in this group.</p>
              ) : (
                <div className="input-group">
                  <label>Select User</label>
                  <select 
                    value={selectedUserId} 
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="glass-select"
                    style={{ appearance: 'auto' }}
                  >
                    <option value="">-- Choose a user --</option>
                    {availableUsersToAdd.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddMemberModal(false)}>Cancel</button>
              <button 
                className="btn-primary" 
                onClick={handleAddMember} 
                disabled={!selectedUserId || addingMember}
              >
                {addingMember ? 'Adding...' : 'Add to Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupDetail;
