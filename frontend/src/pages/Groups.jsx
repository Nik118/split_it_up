import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import api from '../services/api';
import GroupModal from '../components/GroupModal';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';

function Groups() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]); // for adding members
  const [selectedGroup, setSelectedGroup] = useState(null);

  const fetchGroups = async () => {
    try {
      const res = await api.get('/groups');
      setGroups(res.data || []);
    } catch (err) {
      console.error("Failed to fetch groups", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users/all');
      setAllUsers(res.data.filter(u => u.id !== user.id));
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    fetchGroups();
    fetchUsers();
  }, []);

  const handleAddMember = async (groupId, userId) => {
    try {
      await api.post(`/groups/${groupId}/members/${userId}`);
      alert("Member added successfully!");
      fetchGroups(); // refresh
    } catch (err) {
      alert("Failed to add member: " + (err.response?.data?.detail || "Unknown error"));
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <Header />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>Your Groups</h2>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading groups...</p>
      ) : groups.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Users size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No groups yet</h3>
          <p style={{ color: 'var(--text-muted)' }}>Create a group to share expenses with friends, family, or roommates.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {groups.map((group) => (
            <div 
              key={group.id} 
              className="glass-card group-card" 
              style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}
              onClick={() => navigate(`/groups/${group.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: 0 }}>{group.name}</h3>
                <span style={{ fontSize: '0.8rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary)', padding: '0.25rem 0.75rem', borderRadius: '12px' }}>
                  {group.members.length} Members
                </span>
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {group.members.slice(0, 5).map(member => (
                    <img 
                      key={member.id}
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random&color=fff&size=32`} 
                      alt={member.name}
                      title={member.id === user.id ? 'You' : member.name}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--bg-surface)' }}
                    />
                  ))}
                  {group.members.length > 5 && (
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      +{group.members.length - 5}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button for Groups */}
      <button 
        className="fab"
        title="Create Group"
        onClick={() => setShowModal(true)}
      >
        <Plus size={24} />
      </button>

      {showModal && (
        <GroupModal 
          onClose={() => setShowModal(false)} 
          onSuccess={() => {
            setShowModal(false);
            setLoading(true);
            fetchGroups();
          }} 
        />
      )}
    </div>
  );
}

export default Groups;
