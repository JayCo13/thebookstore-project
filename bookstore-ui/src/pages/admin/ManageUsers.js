import React, { useState, useEffect } from 'react';
import { Button, Input, Modal } from '../../components';
import './ManageUsers.css';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const mockUsers = [
        { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Customer', status: 'Active', joinDate: '2024-01-15', orders: 5 },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Customer', status: 'Active', joinDate: '2024-02-20', orders: 12 },
        { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Admin', status: 'Active', joinDate: '2023-12-10', orders: 0 },
        { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'Customer', status: 'Inactive', joinDate: '2024-03-05', orders: 3 },
        { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', role: 'Customer', status: 'Active', joinDate: '2024-01-30', orders: 8 },
        { id: 6, name: 'Diana Prince', email: 'diana@example.com', role: 'Moderator', status: 'Active', joinDate: '2024-02-14', orders: 2 }
      ];
      setUsers(mockUsers);
      setFilteredUsers(mockUsers);
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = users.filter(user => {
      const matchesTerm = !term ||
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term);
      const matchesRole = roleFilter === 'All' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'All' || user.status === statusFilter;
      return matchesTerm && matchesRole && matchesStatus;
    });
    setFilteredUsers(filtered);
  }, [searchTerm, users, roleFilter, statusFilter]);

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    setUsers(users.filter(user => user.id !== userToDelete.id));
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  const handleStatusToggle = (userId) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === 'Active' ? 'Inactive' : 'Active' }
        : user
    ));
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Admin': return 'admin';
      case 'Moderator': return 'moderator';
      case 'Customer': return 'customer';
      default: return 'customer';
    }
  };

  const getStatusColor = (status) => {
    return status === 'Active' ? 'active' : 'inactive';
  };

  if (loading) {
    return (
      <div className="manage-users-loading">
        <div className="loading-spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="manage-users">
      <div className="page-header">
        <h1>Manage Users</h1>
        <Button variant="primary">Add New User</Button>
      </div>

      {/* Search and Filters */}
      <div className="users-controls">
        <div className="search-section">
          <Input
            placeholder="Search users by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-section" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="filter-item">
            <label style={{ fontSize: 12, color: '#6c757d' }}>Role</label>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="ui-select">
              <option>All</option>
              <option>Admin</option>
              <option>Moderator</option>
              <option>Customer</option>
            </select>
          </div>
          <div className="filter-item">
            <label style={{ fontSize: 12, color: '#6c757d' }}>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="ui-select">
              <option>All</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>
        <div className="stats-summary">
          <span className="stat-item">Total: {users.length}</span>
          <span className="stat-item">Active: {users.filter(u => u.status === 'Active').length}</span>
          <span className="stat-item">Inactive: {users.filter(u => u.status === 'Inactive').length}</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Join Date</th>
              <th>Orders</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="user-info">
                    <div className="user-avatar">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="user-name">{user.name}</span>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge ${getRoleColor(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${getStatusColor(user.status)}`}>
                    {user.status}
                  </span>
                </td>
                <td>{new Date(user.joinDate).toLocaleDateString()}</td>
                <td>{user.orders}</td>
                <td>
                  <div className="action-buttons">
                    <Button 
                      size="small" 
                      variant="outline"
                      onClick={() => handleViewUser(user)}
                    >
                      View
                    </Button>
                    <Button 
                      size="small" 
                      variant={user.status === 'Active' ? 'secondary' : 'success'}
                      onClick={() => handleStatusToggle(user.id)}
                    >
                      {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button 
                      size="small" 
                      variant="danger"
                      onClick={() => handleDeleteUser(user)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="no-users">
            <p>No users found matching your search criteria.</p>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="User Details"
        size="large"
      >
        {selectedUser && (
          <div className="user-details">
            <div className="user-detail-header">
              <div className="user-avatar large">
                {selectedUser.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="user-detail-info">
                <h3>{selectedUser.name}</h3>
                <p>{selectedUser.email}</p>
                <span className={`role-badge ${getRoleColor(selectedUser.role)}`}>
                  {selectedUser.role}
                </span>
              </div>
            </div>
            <div className="user-detail-stats">
              {typeof selectedUser.status !== 'undefined' && (
                <div className="detail-stat">
                  <label>Status:</label>
                  <span className={`status-badge ${getStatusColor(selectedUser.status)}`}>
                    {selectedUser.status}
                  </span>
                </div>
              )}
              {selectedUser.joinDate && (
                <div className="detail-stat">
                  <label>Join Date:</label>
                  <span>{new Date(selectedUser.joinDate).toLocaleDateString()}</span>
                </div>
              )}
              {typeof selectedUser.orders !== 'undefined' && (
                <div className="detail-stat">
                  <label>Total Orders:</label>
                  <span>{selectedUser.orders}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Delete"
        size="small"
      >
        {userToDelete && (
          <div className="delete-confirmation">
            <p>Are you sure you want to delete user <strong>{userToDelete.name}</strong>?</p>
            <p className="warning-text">This action cannot be undone.</p>
            <div className="modal-actions" style={{ display:'flex', justifyContent:'center', gap:'12px' }}>
              <Button size="large" variant="secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button size="large" variant="danger" onClick={confirmDelete}>
                Delete User
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ManageUsers;