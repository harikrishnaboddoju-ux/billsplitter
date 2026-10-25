import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import GroupBanner from './components/GroupBanner';
import StatsCards from './components/StatsCards';
import BillsList from './components/BillsList';
import SettleUpView from './components/SettleUpView';
import ExpensePredictorView from './components/ExpensePredictorView';
import AnalyticsView from './components/AnalyticsView';
import GroupMembersView from './components/GroupMembersView';
import AddBillModal from './components/AddBillModal';
import CreateGroupModal from './components/CreateGroupModal';
import AddMemberModal from './components/AddMemberModal';
import EditProfileModal from './components/EditProfileModal';
import DeleteGroupModal from './components/DeleteGroupModal';
import SmartAgentDrawer from './components/SmartAgentDrawer';

import { 
  fetchUsers, 
  createUser, 
  fetchGroups, 
  fetchGroupDetails, 
  createGroup, 
  addGroupMember, 
  updateMemberRole,
  addBill, 
  deleteBill, 
  recordSettlement, 
  fetchForecast, 
  fetchNotifications 
} from './utils/api';

import { 
  Receipt, 
  CreditCard, 
  Sparkles, 
  PieChart, 
  Users, 
  MessageSquarePlus,
  PlusCircle,
  Layers
} from 'lucide-react';
import './App.css';

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [groups, setGroups] = useState([]);
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('bills');
  const [forecastData, setForecastData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(null);

  // Modals
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isSmartChatOpen, setIsSmartChatOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isDeleteGroupOpen, setIsDeleteGroupOpen] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Theme synchronization
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Load Group Details & Forecast
  const loadGroup = async (groupId) => {
    try {
      const details = await fetchGroupDetails(groupId);
      setCurrentGroup(details);

      // Load ML Forecast for this group
      try {
        const forecast = await fetchForecast(groupId);
        setForecastData(forecast);
      } catch (fErr) {
        console.warn('Forecast fetch warning:', fErr);
      }
    } catch (err) {
      console.error('Failed to load group details:', err);
    }
  };

  const refreshGroupsList = async () => {
    try {
      const list = await fetchGroups();
      setGroups(list);
      return list;
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const refreshCurrentGroup = async () => {
    if (currentGroupId) {
      await loadGroup(currentGroupId);
    }
  };

  const refreshNotifications = async (userId) => {
    if (!userId) return;
    try {
      const notifs = await fetchNotifications(userId);
      setNotifications(notifs);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  // Initial Data Bootstrapping
  const initData = async () => {
    setLoading(true);
    setConnectionError(null);
    try {
      const [fetchedUsers, fetchedGroups] = await Promise.all([
        fetchUsers(),
        fetchGroups()
      ]);

      setUsers(fetchedUsers);
      const hariKrishnaUser = fetchedUsers.find(u => u.name?.toLowerCase().includes('hari krishna')) || fetchedUsers[0];
      if (hariKrishnaUser) {
        setCurrentUser(hariKrishnaUser);
      }

      setGroups(fetchedGroups);
      if (fetchedGroups.length > 0) {
        const firstGroupId = fetchedGroups[0].id;
        setCurrentGroupId(firstGroupId);
        await loadGroup(firstGroupId);
      }

      if (hariKrishnaUser) {
        await refreshNotifications(hariKrishnaUser.id);
      }
    } catch (err) {
      console.error('Initialization error:', err);
      setConnectionError(err.message || 'Failed to connect to BillSplitter backend service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initData();
  }, []);

  // When switching groups
  const handleSelectGroup = async (groupId) => {
    setCurrentGroupId(groupId);
    setLoading(true);
    await loadGroup(groupId);
    setLoading(false);
  };

  // Add Bill
  const handleAddBill = async (billData) => {
    if (!currentGroupId) return;
    try {
      await addBill(currentGroupId, billData);
      showToast(`Logged bill "${billData.title}"!`);
      await refreshCurrentGroup();
      await refreshGroupsList();
    } catch (err) {
      alert('Failed to log bill: ' + err.message);
    }
  };

  // Delete Bill
  const handleDeleteBill = async (billId) => {
    if (!currentGroupId) return;
    if (!window.confirm('Delete this bill? Balances will be recalculated automatically.')) return;
    try {
      await deleteBill(currentGroupId, billId);
      showToast('Bill removed.');
      await refreshCurrentGroup();
      await refreshGroupsList();
    } catch (err) {
      alert('Failed to delete bill: ' + err.message);
    }
  };

  // Record Settlement
  const handleRecordSettlement = async (settleData) => {
    if (!currentGroupId) return;
    try {
      await recordSettlement(currentGroupId, settleData);
      showToast('Payment recorded successfully!');
      await refreshCurrentGroup();
      await refreshNotifications(currentUser?.id);
    } catch (err) {
      alert('Settlement failed: ' + err.message);
    }
  };

  // Create Group
  const handleCreateGroup = async (groupData) => {
    try {
      const newG = await createGroup(groupData);
      showToast(`Group "${newG.name}" created!`);
      const updatedList = await refreshGroupsList();
      setGroups(updatedList);
      setCurrentGroupId(newG.id);
      await loadGroup(newG.id);
    } catch (err) {
      alert('Failed to create group: ' + err.message);
    }
  };

  // Delete Group
  const handleGroupDeleted = async (deletedGroupId) => {
    showToast('Group deleted successfully!');
    const updatedList = groups.filter(g => g.id !== deletedGroupId);
    setGroups(updatedList);

    if (currentGroupId === deletedGroupId) {
      if (updatedList.length > 0) {
        setCurrentGroupId(updatedList[0].id);
        await loadGroup(updatedList[0].id);
      } else {
        setCurrentGroupId(null);
        setCurrentGroup(null);
        setForecastData(null);
      }
    }
  };

  // Edit Member Profile
  const handleOpenEditProfile = (userToEdit) => {
    setEditingUser(userToEdit || currentUser);
    setIsEditProfileOpen(true);
  };

  const handleProfileUpdated = (updatedUser) => {
    // 1. Update users list
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    
    // 2. Update currentUser if matching
    if (currentUser?.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }

    // 3. Update currentGroup.members if present
    if (currentGroup?.members) {
      setCurrentGroup(prev => ({
        ...prev,
        members: prev.members.map(m => m.id === updatedUser.id ? { ...m, ...updatedUser } : m)
      }));
    }

    showToast(`Profile for ${updatedUser.name} updated!`);
  };

  // Add Member
  const handleAddExistingMember = async (userId, role) => {
    if (!currentGroupId) return;
    try {
      await addGroupMember(currentGroupId, { user_id: userId, role });
      showToast('Member added to group!');
      await refreshCurrentGroup();
    } catch (err) {
      alert('Failed to add member: ' + err.message);
    }
  };

  // Create User & Add
  const handleCreateAndAddUser = async (userData) => {
    if (!currentGroupId) return;
    try {
      const newUser = await createUser(userData);
      const updatedUsers = await fetchUsers();
      setUsers(updatedUsers);
      await addGroupMember(currentGroupId, { user_id: newUser.id, role: userData.role });
      showToast(`Added ${newUser.name} to group!`);
      await refreshCurrentGroup();
    } catch (err) {
      alert('Error creating/adding user: ' + err.message);
      throw err;
    }
  };

  // Update Member Role
  const handleUpdateMemberRole = async (userId, newRole) => {
    if (!currentGroupId) return;
    try {
      await updateMemberRole(currentGroupId, userId, newRole);
      showToast(`Updated member role to ${newRole}!`);
      await refreshCurrentGroup();
    } catch (err) {
      alert('Failed to update member role: ' + err.message);
    }
  };

  const currency = currentGroup?.currency || '₹';

  return (
    <div className="app-layout">
      {/* Top Navbar */}
      <Navbar 
        groups={groups}
        currentGroup={currentGroup}
        onSelectGroup={handleSelectGroup}
        users={users}
        currentUser={currentUser}
        onSelectUser={setCurrentUser}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
        notifications={notifications}
        onRefreshNotifications={() => refreshNotifications(currentUser?.id)}
        onOpenEditProfile={handleOpenEditProfile}
      />

      {/* Main Body */}
      {connectionError && groups.length === 0 ? (
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="glass-card" style={{ maxWidth: '540px', padding: '36px', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(244, 63, 94, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--rose)',
              margin: '0 auto 18px'
            }}>
              <Layers size={32} />
            </div>
            <h2 style={{ fontSize: '1.35rem', marginBottom: '10px' }}>Backend Service Connecting...</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '20px', lineHeight: 1.6 }}>
              {connectionError}
            </p>
            <div style={{ background: 'var(--bg-card-solid)', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '24px', textAlign: 'left', border: '1px solid var(--border-color)' }}>
              💡 <strong>Render Free Tier Notice:</strong> Inactive web services spin down automatically. The initial wake-up can take 30 to 60 seconds.
            </div>
            <button className="btn-primary" onClick={initData} style={{ padding: '12px 28px', fontSize: '0.95rem', margin: '0 auto' }}>
              Retry Connection
            </button>
          </div>
        </main>
      ) : groups.length === 0 || !currentGroup ? (
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="glass-card" style={{ maxWidth: '520px', padding: '40px', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1E272E',
              margin: '0 auto 18px'
            }}>
              <Layers size={32} />
            </div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>No Active Expense Groups</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.5 }}>
              All groups have been cleaned up! Ready for your spot review with faculty. Create your fresh B.Tech student group (canteen splits, cricket turf, outings) below.
            </p>
            <button className="btn-primary" onClick={() => setIsCreateGroupOpen(true)} style={{ padding: '12px 24px', fontSize: '1rem' }}>
              <PlusCircle size={18} /> Create New Student Group
            </button>
          </div>
        </main>
      ) : (
        <>
          {/* Group Info Banner & Quick Actions */}
          <GroupBanner 
            group={currentGroup}
            onOpenAddBill={() => setIsAddBillOpen(true)}
            onOpenSettleModal={() => setActiveTab('settle')}
            onOpenAddMember={() => setIsAddMemberOpen(true)}
            onOpenSmartChat={() => setIsSmartChatOpen(true)}
            onOpenDeleteGroup={() => setIsDeleteGroupOpen(true)}
          />

          {/* Clean Simplified Navigation Tabs */}
          <nav className="tab-navigation">
            <button 
              className={`nav-tab-btn ${activeTab === 'bills' ? 'active' : ''}`}
              onClick={() => setActiveTab('bills')}
            >
              <Receipt size={16} /> Bills & Overview
            </button>
            <button 
              className={`nav-tab-btn ${activeTab === 'settle' ? 'active' : ''}`}
              onClick={() => setActiveTab('settle')}
            >
              <CreditCard size={16} /> Settle Up
            </button>
            <button 
              className={`nav-tab-btn ${activeTab === 'forecast' ? 'active' : ''}`}
              onClick={() => setActiveTab('forecast')}
            >
              <Sparkles size={16} /> AI Forecast (&lt;10k)
            </button>
            <button 
              className={`nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <PieChart size={16} /> Analytics
            </button>
            <button 
              className={`nav-tab-btn ${activeTab === 'members' ? 'active' : ''}`}
              onClick={() => setActiveTab('members')}
            >
              <Users size={16} /> Members & Profiles
            </button>
          </nav>

          {/* Main Content Area */}
          <main className="main-content">
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Sparkles size={32} className="pulseGlow" />
                <div style={{ marginTop: '12px', fontSize: '1.1rem' }}>Loading BillSplitter AI Workspace...</div>
              </div>
            ) : (
              <>
                {/* Simplified Top Stat Cards */}
                <StatsCards 
                  group={currentGroup}
                  currentUser={currentUser}
                  forecastData={forecastData}
                />

                {/* Active Tab View */}
                {activeTab === 'bills' && (
                  <BillsList 
                    bills={currentGroup?.bills || []}
                    members={currentGroup?.members || []}
                    currency={currency}
                    currentUser={currentUser}
                    onDeleteBill={handleDeleteBill}
                    onOpenAddBill={() => setIsAddBillOpen(true)}
                  />
                )}

                {activeTab === 'settle' && (
                  <SettleUpView 
                    group={currentGroup}
                    currentUser={currentUser}
                    currency={currency}
                    onRecordSettlement={handleRecordSettlement}
                  />
                )}

                {activeTab === 'forecast' && (
                  <ExpensePredictorView 
                    forecastData={forecastData}
                    group={currentGroup}
                    currency={currency}
                  />
                )}

                {activeTab === 'analytics' && (
                  <AnalyticsView 
                    group={currentGroup}
                    currency={currency}
                  />
                )}

                {activeTab === 'members' && (
                  <GroupMembersView 
                    group={currentGroup}
                    currentUser={currentUser}
                    onOpenAddMember={() => setIsAddMemberOpen(true)}
                    onOpenEditProfile={handleOpenEditProfile}
                    onUpdateMemberRole={handleUpdateMemberRole}
                  />
                )}
              </>
            )}
          </main>
        </>
      )}

      {/* Floating Smart Splitter AI Trigger Button */}
      <button 
        className="floating-ai-btn"
        onClick={() => setIsSmartChatOpen(!isSmartChatOpen)}
        title="Open Smart AI Bill Assistant"
      >
        <MessageSquarePlus size={20} />
        <span>Ask Smart Agent</span>
      </button>

      {/* Smart Agent AI & Receipt Scanner Drawer */}
      <SmartAgentDrawer 
        isOpen={isSmartChatOpen}
        onClose={() => setIsSmartChatOpen(false)}
        group={currentGroup}
        currentUser={currentUser}
        currency={currency}
        onAddBillFromAgent={handleAddBill}
      />

      {/* Modals */}
      <AddBillModal 
        isOpen={isAddBillOpen}
        onClose={() => setIsAddBillOpen(false)}
        members={currentGroup?.members || []}
        currency={currency}
        currentUser={currentUser}
        onAddBill={handleAddBill}
      />

      <CreateGroupModal 
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        users={users}
        currentUser={currentUser}
        onCreateGroup={handleCreateGroup}
      />

      <AddMemberModal 
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        group={currentGroup}
        users={users}
        onAddExistingMember={handleAddExistingMember}
        onCreateAndAddUser={handleCreateAndAddUser}
      />

      {/* Feature 1: Edit Member Profile Modal */}
      <EditProfileModal 
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        user={editingUser}
        onProfileUpdated={handleProfileUpdated}
      />

      {/* Feature 2: Delete Existing Group Modal */}
      <DeleteGroupModal 
        isOpen={isDeleteGroupOpen}
        onClose={() => setIsDeleteGroupOpen(false)}
        group={currentGroup}
        onGroupDeleted={handleGroupDeleted}
      />

      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="toast-container">
          <div className="toast">
            <Sparkles size={18} color="var(--accent-secondary)" />
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
