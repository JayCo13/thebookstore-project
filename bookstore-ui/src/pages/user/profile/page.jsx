import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import Image from "../compat/Image";
import AddressCard from '../components/AddressCard';
import AddressModal from '../components/AddressModal';
import { 
  getUserProfile, 
  updateUserProfile, 
  getAddresses, 
  createAddress, 
  updateAddress, 
  deleteAddress, 
  setDefaultAddress 
} from '../../../service/api';

export default function ProfilePage() {
  const { user, isAuthenticated, updateUser } = useAuth();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressLoading, setAddressLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone_number: user.phone_number || ''
      });
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated) {
      loadAddresses();
    }
  }, [isAuthenticated]);

  const loadAddresses = async () => {
    try {
      const response = await getAddresses();
      setAddresses(response.addresses || []);
    } catch (error) {
      console.error('Error loading addresses:', error);
      showToast('Failed to load addresses', 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await updateUserProfile(formData);
      updateUser(response);
      showToast('Profile updated successfully', 'success');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('Failed to update profile', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone_number: user.phone_number || ''
      });
    }
    setIsEditing(false);
  };

  // Address management methods
  const handleAddAddress = () => {
    setEditingAddress(null);
    setAddressModalOpen(true);
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setAddressModalOpen(true);
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) {
      return;
    }

    try {
      await deleteAddress(addressId);
      await loadAddresses();
      showToast('Address deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting address:', error);
      showToast('Failed to delete address', 'error');
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      await setDefaultAddress(addressId);
      await loadAddresses();
      showToast('Default address updated', 'success');
    } catch (error) {
      console.error('Error setting default address:', error);
      showToast('Failed to set default address', 'error');
    }
  };

  const handleAddressSubmit = async (addressData) => {
    setAddressLoading(true);
    try {
      if (editingAddress) {
        await updateAddress(editingAddress.address_id, addressData);
        showToast('Address updated successfully', 'success');
      } else {
        await createAddress(addressData);
        showToast('Address added successfully', 'success');
      }
      await loadAddresses();
      setAddressModalOpen(false);
      setEditingAddress(null);
    } catch (error) {
      console.error('Error saving address:', error);
      showToast('Failed to save address', 'error');
    } finally {
      setAddressLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <section className="min-h-screen pt-20 pb-16 bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center pt-32">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xl shadow-gray-100/50 p-16 backdrop-blur-sm">
              <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">Access Denied</h1>
              <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">Please log in to view your profile and manage your account settings.</p>
              <a href="/login" className="inline-block px-10 py-5 rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 text-white font-bold hover:from-gray-800 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 text-lg">
                Go to Login
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen pt-20 pb-16 bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16 pt-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight mb-6">
            My Profile
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Manage your personal information, account settings, and saved addresses
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xl shadow-gray-100/50 p-8 md:p-12 lg:p-16 backdrop-blur-sm">
          {/* Profile Header */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mb-16">
            {/* Avatar */}
            <div className="lg:col-span-3 flex justify-center lg:justify-start">
              <div className="relative group">
                <div className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border-4 border-white shadow-xl overflow-hidden transition-transform group-hover:scale-105">
                  {user?.profile_picture ? (
                    <Image 
                      src={user.profile_picture} 
                      alt="Profile" 
                      fill 
                      className="object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
                      <span className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-700">
                        {user?.first_name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white shadow-lg"></div>
              </div>
            </div>

            {/* User Info */}
            <div className="lg:col-span-6 text-center lg:text-left space-y-6">
              <div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 tracking-tight">
                  {user?.first_name} {user?.last_name}
                </h2>
                <p className="text-lg md:text-xl text-gray-600 mb-6">{user?.email}</p>
              </div>
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                <span className="px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 text-sm font-medium rounded-full border border-green-200">
                  {user?.auth_provider === 'google' ? 'Google Account' : 'Local Account'}
                </span>
                <span className="px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-sm font-medium rounded-full border border-blue-200">
                  {user?.role?.role_name || user?.role || 'Customer'}
                </span>
              </div>
            </div>

            {/* Edit Button */}
            <div className="lg:col-span-3 flex flex-col gap-3 justify-center lg:justify-start">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-8 py-4 rounded-xl border-2 border-gray-900 text-gray-900 font-semibold hover:bg-gray-900 hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    className="px-8 py-4 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-8 py-4 rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 text-white font-semibold hover:from-gray-800 hover:to-gray-700 transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Profile Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {/* First Name */}
            <div className="space-y-3">
              <label className="block text-base font-semibold text-gray-800 mb-3">
                First Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-gray-900/10 focus:border-gray-900 transition-all duration-300 text-lg font-medium bg-white shadow-sm hover:shadow-md"
                  placeholder="Enter your first name"
                />
              ) : (
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl text-gray-900 font-medium text-lg border border-gray-200">
                  {user?.first_name || 'Not provided'}
                </div>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-3">
              <label className="block text-base font-semibold text-gray-800 mb-3">
                Last Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-gray-900/10 focus:border-gray-900 transition-all duration-300 text-lg font-medium bg-white shadow-sm hover:shadow-md"
                  placeholder="Enter your last name"
                />
              ) : (
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl text-gray-900 font-medium text-lg border border-gray-200">
                  {user?.last_name || 'Not provided'}
                </div>
              )}
            </div>

            {/* Email */}
            <div className="space-y-3 lg:col-span-2 xl:col-span-1">
              <label className="block text-base font-semibold text-gray-800 mb-3">
                Email Address
              </label>
              <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl text-gray-900 font-medium text-lg border border-blue-200 relative">
                {user?.email}
                <span className="block text-sm text-blue-600 mt-1 font-medium">(Cannot be changed)</span>
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div className="mt-20 pt-12 border-t-2 border-gray-100">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-10 tracking-tight">Account Information</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="block text-base font-semibold text-gray-800 mb-3">
                  Member Since
                </label>
                <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl text-gray-900 font-medium text-lg border border-purple-200">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) : 'Unknown'}
                </div>
              </div>
              <div className="space-y-3">
                <label className="block text-base font-semibold text-gray-800 mb-3">
                  Account Status
                </label>
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                  <span className={`px-4 py-2 text-base font-semibold rounded-full border-2 ${
                    user?.is_active 
                      ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200' 
                      : 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200'
                  }`}>
                    {user?.is_active ? '✓ Active' : '✗ Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Address Management */}
          <div className="mt-20 pt-12 border-t-2 border-gray-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-12">
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 tracking-tight">Saved Addresses</h3>
                <p className="text-gray-600 text-lg">Manage your delivery addresses for faster checkout</p>
              </div>
              <button
                onClick={handleAddAddress}
                className="px-8 py-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white font-semibold rounded-xl hover:from-gray-800 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 whitespace-nowrap"
              >
                + Add New Address
              </button>
            </div>

            {addresses.length === 0 ? (
              <div className="text-center py-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl border-2 border-dashed border-gray-300">
                <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h4 className="text-2xl font-bold text-gray-900 mb-4">No addresses saved yet</h4>
                <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">Add your first address to make checkout faster and easier for future orders</p>
                <button
                  onClick={handleAddAddress}
                  className="px-10 py-5 bg-gradient-to-r from-gray-900 to-gray-800 text-white font-bold rounded-xl hover:from-gray-800 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 text-lg"
                >
                  Add Your First Address
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {addresses.map((address) => (
                  <AddressCard
                    key={address.address_id}
                    address={address}
                    isDefault={address.is_default_shipping}
                    onEdit={handleEditAddress}
                    onDelete={handleDeleteAddress}
                    onSetDefault={handleSetDefaultAddress}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Address Modal */}
        <AddressModal
          isOpen={addressModalOpen}
          onClose={() => {
            setAddressModalOpen(false);
            setEditingAddress(null);
          }}
          address={editingAddress}
          onSubmit={handleAddressSubmit}
          isLoading={addressLoading}
        />
      </div>
    </section>
  );
}