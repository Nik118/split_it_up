import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Activity, ArrowRight, CheckCircle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import ExpenseModal from '../components/ExpenseModal';
import SettleModal from '../components/SettleModal';
import Header from '../components/Header';
import { getCurrencySymbol } from '../utils/currency';

function Dashboard() {
  const { user } = useAuth();
  const [balances, setBalances] = useState([]);
  const [activities, setActivities] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [settlePayee, setSettlePayee] = useState(null);
  const [settleAmount, setSettleAmount] = useState(0);

  const currencySymbol = getCurrencySymbol(user?.default_currency);
  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9'];

  const fetchDashboardData = async () => {
    try {
      const [balanceRes, activityRes, expensesRes, usersRes] = await Promise.all([
        api.get('/balances/simplify'),
        api.get('/activity'),
        api.get('/expenses'),
        api.get('/users/all')
      ]);
      setBalances(balanceRes.data.debts || []);
      setActivities(activityRes.data || []);
      
      const categoryMap = {};
      expensesRes.data.forEach(exp => {
        categoryMap[exp.category] = (categoryMap[exp.category] || 0) + exp.total_amount;
      });
      setCategoryData(Object.keys(categoryMap).map(key => ({ name: key, value: categoryMap[key] })));
      
      const map = {};
      usersRes.data.forEach(u => map[u.id] = u);
      setUsersMap(map);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  let totalOwedToYou = 0;
  let totalYouOwe = 0;

  balances.forEach(debt => {
    if (debt.creditor_id === user.id) {
      totalOwedToYou += debt.amount;
    } else if (debt.debtor_id === user.id) {
      totalYouOwe += debt.amount;
    }
  });

  const myDebts = balances.filter(d => d.debtor_id === user?.id);
  const debtsToMe = balances.filter(d => d.creditor_id === user?.id);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <Header />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        <div style={{ background: 'rgba(52, 211, 153, 0.1)', padding: '1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total Owed to You</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-success)' }}>{currencySymbol}{totalOwedToYou.toFixed(2)}</p>
        </div>
        <div style={{ background: 'rgba(248, 113, 113, 0.1)', padding: '1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid rgba(248, 113, 113, 0.2)' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>You Owe</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-danger)' }}>{currencySymbol}{totalYouOwe.toFixed(2)}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        
        {/* Left Column: Detailed Balances */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--color-danger)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowRight size={20} /> You Owe
            </h2>
            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
            ) : myDebts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>You don't owe anything.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {myDebts.map((debt, idx) => {
                  const creditor = usersMap[debt.creditor_id];
                  return (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: idx === myDebts.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <img 
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(creditor?.name || 'User')}&background=random&color=fff&size=40`} 
                          alt="Avatar" 
                          style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                        />
                        <div>
                          <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{creditor?.name}</div>
                          <div style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{currencySymbol}{debt.amount.toFixed(2)}</div>
                        </div>
                      </div>
                      <button 
                        className="btn-primary" 
                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                        onClick={() => {
                          setSettlePayee(creditor);
                          setSettleAmount(debt.amount);
                        }}
                      >
                        Settle Up
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--color-success)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowRight size={20} style={{ transform: 'rotate(180deg)' }} /> Owed To You
            </h2>
            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
            ) : debtsToMe.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Nobody owes you anything.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {debtsToMe.map((debt, idx) => {
                  const debtor = usersMap[debt.debtor_id];
                  return (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: idx === debtsToMe.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <img 
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(debtor?.name || 'User')}&background=random&color=fff&size=40`} 
                          alt="Avatar" 
                          style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                        />
                        <div>
                          <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{debtor?.name}</div>
                          <div style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>{currencySymbol}{debt.amount.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {balances.length === 0 && !loading && (
             <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <CheckCircle size={48} color="var(--color-success)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>You're all settled up!</h3>
              <p style={{ color: 'var(--text-muted)' }}>You don't owe anyone, and nobody owes you.</p>
            </div>
          )}
        </div>

        {/* Right Column: Analytics & Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Spending by Category</h2>
            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
            ) : categoryData.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No expenses yet to show.</p>
            ) : (
              <>
                <div style={{ height: '300px', width: '100%', position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${currencySymbol}${value.toFixed(2)}`} contentStyle={{ background: 'var(--bg-surface)', border: 'none', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Spent</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                      {currencySymbol}{categoryData.reduce((acc, curr) => acc + curr.value, 0).toFixed(0)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
                  {categoryData.map((entry, index) => (
                    <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: COLORS[index % COLORS.length] }}></div>
                      <span style={{ color: 'var(--text-secondary)' }}>{entry.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="glass-card" style={{ padding: '2rem', height: 'fit-content' }}>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} /> Recent Activity
            </h2>
            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading activity...</p>
            ) : activities.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No recent activity.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '600px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {activities.map((activity, idx) => (
                  <div key={activity.id} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                    {idx !== activities.length - 1 && (
                      <div style={{ position: 'absolute', left: '16px', top: '32px', bottom: '-24px', width: '2px', background: 'rgba(255,255,255,0.05)' }}></div>
                    )}
                    <img 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(activity.user?.name || 'User')}&background=random&color=fff&size=32`} 
                      alt="Avatar" 
                      style={{ width: '32px', height: '32px', borderRadius: '50%', zIndex: 1, border: '2px solid var(--bg-surface)' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        <span style={{ fontWeight: 'bold' }}>{activity.user?.id === user.id ? 'You' : activity.user?.name}</span> {activity.details}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {new Date(activity.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

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
            fetchDashboardData();
          }} 
        />
      )}

      {settlePayee && (
        <SettleModal 
          onClose={() => setSettlePayee(null)}
          onSuccess={() => {
            setSettlePayee(null);
            setLoading(true);
            fetchDashboardData();
          }}
          payee={settlePayee}
          amount={settleAmount}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  );
}

export default Dashboard;
