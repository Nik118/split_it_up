import React, { useState, useEffect } from 'react';
import { Plus, List, Filter, X } from 'lucide-react';
import api from '../services/api';
import ExpenseModal from '../components/ExpenseModal';
import ExpenseDetailModal from '../components/ExpenseDetailModal';
import Header from '../components/Header';
import { getCurrencySymbol } from '../utils/currency';
import { useAuth } from '../context/AuthContext';

function Expenses() {
  const { user } = useAuth();
  
  const [expenses, setExpenses] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState(null);
  const currencySymbol = getCurrencySymbol(user?.default_currency);

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterFriend, setFilterFriend] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const fetchExpenses = async () => {
    try {
      const [res, usersRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/users/all')
      ]);
      const sorted = res.data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses(sorted || []);
      
      const map = {};
      usersRes.data.forEach(u => map[u.id] = u);
      setUsersMap(map);
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const clearFilters = () => {
    setFilterCategory('');
    setFilterFriend('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // Extract unique categories and friends from the user's expenses
  const availableCategories = [...new Set(expenses.map(e => e.category))];
  const friendIds = new Set();
  expenses.forEach(e => e.splits.forEach(s => {
    if (s.user_id !== user.id) friendIds.add(s.user_id);
  }));

  const filteredExpenses = expenses.filter(expense => {
    if (filterCategory && expense.category !== filterCategory) return false;
    
    if (filterFriend) {
      const involved = expense.splits.some(s => s.user_id === parseInt(filterFriend) && s.user_id !== user.id);
      if (!involved) return false;
    }

    const expDate = new Date(expense.date).toISOString().split('T')[0];
    if (filterDateFrom && expDate < filterDateFrom) return false;
    if (filterDateTo && expDate > filterDateTo) return false;

    return true;
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <Header />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>All Expenses</h2>
        <button 
          className="btn-secondary" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} /> {showFilters ? 'Hide Filters' : 'Filters'}
        </button>
      </div>

      {showFilters && (
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem', animation: 'fadeIn 0.2s' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div className="input-group">
              <label>Category</label>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="glass-select" style={{ appearance: 'auto' }}>
                <option value="">All Categories</option>
                {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            <div className="input-group">
              <label>Involving Friend</label>
              <select value={filterFriend} onChange={(e) => setFilterFriend(e.target.value)} className="glass-select" style={{ appearance: 'auto' }}>
                <option value="">Anyone</option>
                {[...friendIds].map(id => (
                  <option key={id} value={id}>{usersMap[id]?.name || 'Unknown User'}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>From Date</label>
              <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'white' }} />
            </div>

            <div className="input-group">
              <label>To Date</label>
              <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'white' }} />
            </div>
          </div>
          
          {(filterCategory || filterFriend || filterDateFrom || filterDateTo) && (
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={clearFilters}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(248, 113, 113, 0.1)', color: 'var(--color-danger)', border: '1px solid rgba(248, 113, 113, 0.2)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}
              >
                <X size={16} /> Clear Filters
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading expenses...</p>
      ) : filteredExpenses.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <List size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No expenses found</h3>
          <p style={{ color: 'var(--text-muted)' }}>Try adjusting your filters or adding a new expense.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {filteredExpenses.map((expense) => {
            const mySplit = expense.splits.find(s => s.user_id === user.id);
            const isCreator = expense.created_by_id === user.id;
            return (
              <div 
                key={expense.id} 
                className="glass-card expense-card" 
                style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}
                onClick={() => setSelectedExpenseId(expense.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: 0 }}>{expense.description}</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(expense.date).toLocaleDateString()}</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    {expense.category}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{currencySymbol}{expense.total_amount.toFixed(2)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {mySplit ? (
                      <>
                        {mySplit.amount_paid > 0 && <div style={{ color: 'var(--color-success)', fontSize: '0.9rem', fontWeight: 500 }}>You paid: {currencySymbol}{mySplit.amount_paid.toFixed(2)}</div>}
                        {mySplit.amount_owed > 0 && <div style={{ color: 'var(--color-danger)', fontSize: '0.9rem', fontWeight: 500 }}>Your share: {currencySymbol}{mySplit.amount_owed.toFixed(2)}</div>}
                      </>
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Not involved</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button */}
      <button 
        className="fab"
        title="Add Expense"
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
            fetchExpenses();
          }} 
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
            fetchExpenses();
          }}
        />
      )}
    </div>
  );
}

export default Expenses;
