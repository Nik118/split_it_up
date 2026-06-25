import React, { useState, useEffect } from 'react';
import { X, Scale, Hash, Percent, PieChart, Upload, FileText, ScanLine } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getCurrencySymbol } from '../utils/currency';
import './ExpenseModal.css'; // We will create this

function ExpenseModal({ onClose, onSuccess, initialGroupId, initialExpense }) {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [splitMethod, setSplitMethod] = useState('EQUAL');
  const [category, setCategory] = useState('General');
  const [payerId, setPayerId] = useState(user?.id);
  
  const [allUsers, setAllUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId || '');
  
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [splitData, setSplitData] = useState({}); // stores amount/percentage/shares for each user
  const [loading, setLoading] = useState(false);
  const currencySymbol = getCurrencySymbol(user?.default_currency);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, groupsRes] = await Promise.all([
          api.get('/users/all'),
          api.get('/groups')
        ]);
        const others = usersRes.data.filter(u => u.id !== user.id);
        setAllUsers(others);
        setFriends(others);
        setGroups(groupsRes.data || []);
      } catch (err) {
        console.error("Failed to fetch data for modal", err);
      }
    };
    fetchData();
  }, [user.id]);

  useEffect(() => {
    if (selectedGroupId && !initialExpense) {
      const group = groups.find(g => g.id === parseInt(selectedGroupId));
      if (group) {
        const groupMembers = group.members.filter(m => m.id !== user.id);
        setFriends(groupMembers);
        
        // Auto-select group members by default
        const memberIds = groupMembers.map(m => m.id);
        setSelectedFriends(memberIds);
        
        const newSplitData = {};
        memberIds.forEach(id => newSplitData[id] = 0);
        setSplitData(newSplitData);
      }
    } else if (!selectedGroupId && !initialExpense) {
      setFriends(allUsers);
      setSelectedFriends([]);
      setSplitData({});
    }
  }, [selectedGroupId, groups, allUsers, user.id, initialExpense]);

  useEffect(() => {
    if (initialExpense && allUsers.length > 0) {
      setDescription(initialExpense.description);
      setAmount(initialExpense.total_amount);
      setSplitMethod(initialExpense.split_method);
      setCategory(initialExpense.category);
      setSelectedGroupId(initialExpense.group_id || '');
      
      const payer = initialExpense.splits.find(s => s.amount_paid > 0);
      setPayerId(payer ? payer.user_id : user.id);
      
      const selected = initialExpense.splits.filter(s => s.user_id !== user.id).map(s => s.user_id);
      setSelectedFriends(selected);

      const newSplitData = {};
      initialExpense.splits.forEach(s => {
        newSplitData[s.user_id] = initialExpense.split_method === 'EXACT' ? s.amount_owed :
                                  initialExpense.split_method === 'PERCENTAGE' ? s.percentage :
                                  initialExpense.split_method === 'SHARE' ? s.shares : 0;
      });
      setSplitData(newSplitData);
      
      if (initialExpense.group_id) {
        const group = groups.find(g => g.id === initialExpense.group_id);
        if (group) setFriends(group.members.filter(m => m.id !== user.id));
      } else {
        setFriends(allUsers);
      }
      if (initialExpense.receipt_url) setReceiptUrl(initialExpense.receipt_url);
    }
  }, [initialExpense, allUsers, groups, user.id]);

  const handleScanReceipt = async () => {
    if (!receiptFile) return;
    setIsScanning(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', receiptFile);
    
    try {
      const res = await api.post('/uploads/scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setReceiptUrl(res.data.url);
      
      // Auto-fill from AI mock
      if (res.data.extracted_data) {
        setDescription(res.data.extracted_data.description);
        setAmount(res.data.extracted_data.amount);
        setCategory(res.data.extracted_data.category);
        alert("Receipt scanned! Form fields updated.");
      }
    } catch (err) {
      setError("Failed to scan receipt.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleDescriptionBlur = async () => {
    if (description.trim().length > 2 && category === 'General') {
      try {
        const res = await api.post('/ai/categorize', { description });
        if (res.data && res.data.category) {
          setCategory(res.data.category);
        }
      } catch (err) {
        console.error("Failed to fetch smart category", err);
      }
    }
  };

  const handleFriendToggle = (friendId) => {
    if (selectedFriends.includes(friendId)) {
      setSelectedFriends(selectedFriends.filter(id => id !== friendId));
      const newData = { ...splitData };
      delete newData[friendId];
      setSplitData(newData);
    } else {
      setSelectedFriends([...selectedFriends, friendId]);
      setSplitData({ ...splitData, [friendId]: 0 });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (selectedFriends.length === 0) {
      setError("Please select at least one friend to split with.");
      return;
    }

    setLoading(true);
    setError('');

    let splitsMap = {};

    splitsMap[user.id] = {
      user_id: user.id,
      amount_paid: 0.0,
      amount_owed: splitMethod === 'EXACT' ? parseFloat(splitData[user.id] || 0) : 0,
      percentage: splitMethod === 'PERCENTAGE' ? parseFloat(splitData[user.id] || 0) : null,
      shares: splitMethod === 'SHARE' ? parseFloat(splitData[user.id] || 0) : null
    };

    selectedFriends.forEach(fid => {
      splitsMap[fid] = {
        user_id: fid,
        amount_paid: 0.0,
        amount_owed: splitMethod === 'EXACT' ? parseFloat(splitData[fid] || 0) : 0,
        percentage: splitMethod === 'PERCENTAGE' ? parseFloat(splitData[fid] || 0) : null,
        shares: splitMethod === 'SHARE' ? parseFloat(splitData[fid] || 0) : null
      };
    });

    if (!splitsMap[payerId]) {
      splitsMap[payerId] = {
        user_id: payerId,
        amount_paid: 0.0,
        amount_owed: 0.0,
        percentage: splitMethod === 'PERCENTAGE' ? 0 : null,
        shares: splitMethod === 'SHARE' ? 0 : null
      };
    }
    splitsMap[payerId].amount_paid = parseFloat(amount);

    let splits = Object.values(splitsMap);

    try {
      let finalReceiptUrl = receiptUrl;
      
      // Upload the file if it's new and hasn't been scanned
      if (receiptFile && !receiptUrl) {
        const formData = new FormData();
        formData.append('file', receiptFile);
        const res = await api.post('/uploads/receipt', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        finalReceiptUrl = res.data.url;
      }

      const payload = {
        description,
        total_amount: parseFloat(amount),
        currency: user?.default_currency || 'INR',
        category,
        receipt_url: finalReceiptUrl || null,
        split_method: splitMethod,
        group_id: selectedGroupId ? parseInt(selectedGroupId) : null,
        splits: splits
      };
      
      if (initialExpense) {
        await api.put(`/expenses/${initialExpense.id}`, payload);
      } else {
        await api.post('/expenses', payload);
      }
      onSuccess();
    } catch (err) {
      let errMsg = err.response?.data?.detail;
      if (Array.isArray(errMsg)) errMsg = errMsg[0].msg;
      else if (typeof errMsg === 'object') errMsg = JSON.stringify(errMsg);
      setError(errMsg || 'Failed to create expense.');
    } finally {
      setLoading(false);
    }
  };

  const handleSplitDataChange = (uid, val) => {
    setSplitData({ ...splitData, [uid]: val });
  };

  return (
    <div className="modal-overlay">
      <div className="glass-card modal-content">
        <div className="modal-header">
          <h2>{initialExpense ? 'Edit Expense' : 'Add Expense'}</h2>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Receipt Upload Section */}
          <div className="input-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px dashed var(--border-color)', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <FileText size={18} /> Attach Receipt
            </label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => {
                  setReceiptFile(e.target.files[0]);
                  setReceiptUrl(''); // reset URL since it's a new file
                }}
                style={{ flex: 1, padding: '0.5rem', background: 'var(--bg-base)', borderRadius: '4px' }}
              />
              {receiptFile && !receiptUrl && (
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={handleScanReceipt}
                  disabled={isScanning}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <ScanLine size={16} /> {isScanning ? 'Scanning...' : 'AI Auto-Fill'}
                </button>
              )}
            </div>
            {receiptUrl && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Upload size={14} /> Receipt attached successfully!
              </div>
            )}
          </div>

          <div className="input-group">
            <label>Description</label>
            <input 
              type="text" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              onBlur={handleDescriptionBlur}
              placeholder="e.g. Dinner at Mcdonalds" 
              required 
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label>Amount ({currencySymbol})</label>
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="glass-select">
                <option value="General">🏷️ General</option>
                <option value="Food">🍔 Food & Drink</option>
                <option value="Travel">✈️ Travel</option>
                <option value="Entertainment">🎬 Entertainment</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label>Who Paid?</label>
            <select value={payerId} onChange={(e) => setPayerId(parseInt(e.target.value))} className="glass-select">
              <option value={user.id}>You</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Associate with Group (Optional)</label>
            <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} className="glass-select">
              <option value="">-- No Group (Individual Expense) --</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Split Method</label>
            <div className="split-method-group">
              {[
                { id: 'EQUAL', label: 'Equal', icon: <Scale size={16} /> },
                { id: 'EXACT', label: 'Exact', icon: <Hash size={16} /> },
                { id: 'PERCENTAGE', label: 'Percent', icon: <Percent size={16} /> },
                { id: 'SHARE', label: 'Share', icon: <PieChart size={16} /> }
              ].map(method => (
                <button 
                  type="button" 
                  key={method.id}
                  className={`split-btn ${splitMethod === method.id ? 'active' : ''}`}
                  onClick={() => setSplitMethod(method.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  {method.icon}
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label>Select Friends to Split With</label>
            <div className="friends-list">
              {friends.map(friend => (
                <div key={friend.id} className="friend-item">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={selectedFriends.includes(friend.id)}
                      onChange={() => handleFriendToggle(friend.id)}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <img 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name)}&background=random&color=fff&size=32`} 
                        alt={friend.name} 
                        style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                      />
                      <span style={{ fontSize: '1rem' }}>{friend.name}</span>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Split Inputs (if not EQUAL) */}
          {splitMethod !== 'EQUAL' && selectedFriends.length > 0 && (
            <div className="dynamic-split-section">
              <h4>Specify {splitMethod.toLowerCase()} for each person:</h4>
              <div className="split-inputs">
                <div className="split-input-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random&color=fff&size=24`} 
                      alt="You" 
                      style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                    />
                    <span>You</span>
                  </div>
                  <input 
                    type="number" step="0.01" 
                    value={splitData[user.id] || ''} 
                    onChange={(e) => handleSplitDataChange(user.id, e.target.value)} 
                    placeholder={splitMethod === 'PERCENTAGE' ? '%' : (splitMethod === 'SHARE' ? 'shares' : '₹')}
                  />
                </div>
                {selectedFriends.map(fid => {
                  const f = friends.find(fr => fr.id === fid);
                  return (
                    <div key={fid} className="split-input-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <img 
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(f?.name || 'Friend')}&background=random&color=fff&size=24`} 
                          alt={f?.name} 
                          style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                        />
                        <span>{f?.name}</span>
                      </div>
                      <input 
                        type="number" step="0.01" 
                        value={splitData[fid] || ''} 
                        onChange={(e) => handleSplitDataChange(fid, e.target.value)} 
                        placeholder={splitMethod === 'PERCENTAGE' ? '%' : (splitMethod === 'SHARE' ? 'shares' : '₹')}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }} disabled={loading}>
            {loading ? 'Saving...' : (initialExpense ? 'Save Changes' : 'Add Expense')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ExpenseModal;
