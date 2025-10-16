'use client';

import { useState, useEffect } from 'react';
import Image from '../compat/Image';
import Link from '../compat/Link';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../../hooks/useCart';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { 
  getAddresses, 
  createAddress, 
  createOrder 
} from '../../../service/api';
// Using standard HTML elements instead of UI components

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cartItems, getCartTotal, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    paymentMethod: 'credit'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressesLoading, setAddressesLoading] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (isAuthenticated && user) {
      loadUserData();
      loadAddresses();
    }
  }, [isAuthenticated, user]);

  const loadUserData = () => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        phone: user.phone_number || ''
      }));
    }
  };

  const loadAddresses = async () => {
    try {
      setAddressesLoading(true);
      const userAddresses = await getAddresses();
      setAddresses(userAddresses);
      
      // Auto-select default address if available
      const defaultAddress = userAddresses.find(addr => addr.is_default);
      if (defaultAddress && !selectedAddressId) {
        setSelectedAddressId(defaultAddress.id);
        fillAddressData(defaultAddress);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
    } finally {
      setAddressesLoading(false);
    }
  };

  const fillAddressData = (address) => {
    setFormData(prev => ({
      ...prev,
      phone: address.phone_number || prev.phone,
      address: address.address_line_1 || '',
      city: address.city || '',
      postalCode: address.postal_code || '',
      country: address.country || ''
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePaymentMethodChange = (value) => {
    setFormData(prev => ({ ...prev, paymentMethod: value }));
  };

  const handleAddressSelection = (addressId) => {
    setSelectedAddressId(addressId);
    setUseNewAddress(false);
    
    if (addressId) {
      const selectedAddress = addresses.find(addr => addr.id === addressId);
      if (selectedAddress) {
        fillAddressData(selectedAddress);
      }
    }
  };

  const handleUseNewAddress = () => {
    setUseNewAddress(true);
    setSelectedAddressId(null);
    // Clear address fields but keep user info
    setFormData(prev => ({
      ...prev,
      address: '',
      city: '',
      postalCode: '',
      country: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Prepare order data
      const orderData = {
        items: cartItems.map(item => ({
          book_id: item.id,
          quantity: item.quantity,
          price: parseFloat(item.price.replace('$', ''))
        })),
        shipping_details: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone_number: formData.phone,
          address_line_1: formData.address,
          city: formData.city,
          postal_code: formData.postalCode,
          country: formData.country
        },
        payment_method: formData.paymentMethod
      };

      // Add address handling for authenticated users
      if (isAuthenticated) {
        if (selectedAddressId) {
          orderData.address_id = selectedAddressId;
        } else if (useNewAddress && saveNewAddress) {
          orderData.save_new_address = true;
        }
      }

      // Create the order
      const result = await createOrder(orderData);
      
      if (result) {
        showToast('Order placed successfully!', 'success');
        clearCart();
        navigate('/checkout/success');
      }
    } catch (error) {
      console.error('Order creation error:', error);
      showToast('Failed to place order. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isClient) {
    return <div className="container mx-auto px-4 pt-28 pb-16">Loading...</div>;
  }

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 pt-28 pb-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
        <p className="mb-8">You need to add items to your cart before checking out.</p>
        <Link href="/" className="bg-[#008080] text-white px-6 py-3 rounded-md hover:bg-[#006666] transition-colors">
          Browse Books
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-28 pb-16">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Address Selection for Authenticated Users */}
            {isAuthenticated && addresses.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold mb-6">Select Shipping Address</h2>
                
                <div className="space-y-4">
                  {addresses.map((address) => (
                    <div 
                      key={address.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedAddressId === address.id 
                          ? 'border-[#008080] bg-[#008080]/5' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => handleAddressSelection(address.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <input
                            type="radio"
                            name="selectedAddress"
                            value={address.id}
                            checked={selectedAddressId === address.id}
                            onChange={() => handleAddressSelection(address.id)}
                            className="mt-1 h-4 w-4 text-[#008080] focus:ring-[#008080]"
                          />
                          <div>
                            <div className="font-medium text-gray-900">
                              {address.address_line_1}
                            </div>
                            <div className="text-sm text-gray-600">
                              {address.city}, {address.postal_code}
                            </div>
                            <div className="text-sm text-gray-600">
                              {address.country}
                            </div>
                            {address.phone_number && (
                              <div className="text-sm text-gray-600">
                                Phone: {address.phone_number}
                              </div>
                            )}
                          </div>
                        </div>
                        {address.is_default && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#008080] text-white">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <div 
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      useNewAddress 
                        ? 'border-[#008080] bg-[#008080]/5' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={handleUseNewAddress}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="selectedAddress"
                        value="new"
                        checked={useNewAddress}
                        onChange={handleUseNewAddress}
                        className="h-4 w-4 text-[#008080] focus:ring-[#008080]"
                      />
                      <div className="font-medium text-gray-900">
                        Use a new address
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-6">Shipping Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
                  <input 
                    id="firstName" 
                    name="firstName" 
                    value={formData.firstName} 
                    onChange={handleInputChange} 
                    required 
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#008080] focus:border-[#008080]"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input 
                    id="lastName" 
                    name="lastName" 
                    value={formData.lastName} 
                    onChange={handleInputChange} 
                    required 
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#008080] focus:border-[#008080]"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                  <input 
                    id="email" 
                    name="email" 
                    type="email" 
                    value={formData.email} 
                    onChange={handleInputChange} 
                    required 
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#008080] focus:border-[#008080]"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <input 
                    id="phone" 
                    name="phone" 
                    type="tel" 
                    value={formData.phone} 
                    onChange={handleInputChange} 
                    required 
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#008080] focus:border-[#008080]"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">Street Address</label>
                  <input 
                    id="address" 
                    name="address" 
                    value={formData.address} 
                    onChange={handleInputChange} 
                    required 
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#008080] focus:border-[#008080]"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">City</label>
                  <input 
                    id="city" 
                    name="city" 
                    value={formData.city} 
                    onChange={handleInputChange} 
                    required 
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#008080] focus:border-[#008080]"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">Postal Code</label>
                  <input 
                    id="postalCode" 
                    name="postalCode" 
                    value={formData.postalCode} 
                    onChange={handleInputChange} 
                    required 
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#008080] focus:border-[#008080]"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700">Country</label>
                  <select 
                    id="country" 
                    name="country" 
                    value={formData.country} 
                    onChange={handleInputChange} 
                    required 
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#008080] focus:border-[#008080]"
                  >
                    <option value="">Select Country</option>
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Australia">Australia</option>
                    <option value="Germany">Germany</option>
                    <option value="France">France</option>
                    <option value="Japan">Japan</option>
                    <option value="South Korea">South Korea</option>
                    <option value="Singapore">Singapore</option>
                    <option value="Vietnam">Vietnam</option>
                  </select>
                </div>

                {/* Save Address Option for Authenticated Users */}
                {isAuthenticated && useNewAddress && (
                  <div className="md:col-span-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="saveAddress"
                        checked={saveNewAddress}
                        onChange={(e) => setSaveNewAddress(e.target.checked)}
                        className="h-4 w-4 text-[#008080] focus:ring-[#008080] border-gray-300 rounded"
                      />
                      <label htmlFor="saveAddress" className="text-sm text-gray-700">
                        Save this address to my profile for future orders
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-6">Payment Method</h2>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3 border p-4 rounded-md">
                  <input 
                    type="radio" 
                    id="credit" 
                    name="paymentMethod" 
                    value="credit" 
                    checked={formData.paymentMethod === 'credit'} 
                    onChange={(e) => handlePaymentMethodChange(e.target.value)} 
                    className="h-4 w-4 text-[#008080] focus:ring-[#008080]"
                  />
                  <label htmlFor="credit" className="flex-1 cursor-pointer">
                    <div className="font-medium">Credit Card</div>
                    <div className="text-sm text-gray-500">Pay with Visa, Mastercard, or American Express</div>
                  </label>
                  <div className="flex space-x-2">
                    <div className="w-10 h-6 bg-blue-600 rounded"></div>
                    <div className="w-10 h-6 bg-red-500 rounded"></div>
                    <div className="w-10 h-6 bg-gray-800 rounded"></div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 border p-4 rounded-md">
                  <input 
                    type="radio" 
                    id="paypal" 
                    name="paymentMethod" 
                    value="paypal" 
                    checked={formData.paymentMethod === 'paypal'} 
                    onChange={(e) => handlePaymentMethodChange(e.target.value)} 
                    className="h-4 w-4 text-[#008080] focus:ring-[#008080]"
                  />
                  <label htmlFor="paypal" className="flex-1 cursor-pointer">
                    <div className="font-medium">PayPal</div>
                    <div className="text-sm text-gray-500">Pay with your PayPal account</div>
                  </label>
                  <div className="w-10 h-6 bg-blue-700 rounded"></div>
                </div>
                
                <div className="flex items-center space-x-3 border p-4 rounded-md">
                  <input 
                    type="radio" 
                    id="bank" 
                    name="paymentMethod" 
                    value="bank" 
                    checked={formData.paymentMethod === 'bank'} 
                    onChange={(e) => handlePaymentMethodChange(e.target.value)} 
                    className="h-4 w-4 text-[#008080] focus:ring-[#008080]"
                  />
                  <label htmlFor="bank" className="flex-1 cursor-pointer">
                    <div className="font-medium">Bank Transfer</div>
                    <div className="text-sm text-gray-500">Pay directly from your bank account</div>
                  </label>
                  <div className="w-10 h-6 bg-green-600 rounded"></div>
                </div>
              </div>
            </div>
            
            <button 
              type="submit" 
              className="w-full bg-[#008080] hover:bg-[#006666] text-white py-3 rounded-md transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Complete Order'}
            </button>
          </form>
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-6 pb-4 border-b">Order Summary</h2>
            
            <div className="space-y-4 mb-6">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center py-3 border-b">
                  <div className="h-16 w-12 relative flex-shrink-0">
                    <Image 
                      src={item.cover} 
                      alt={item.title}
                      fill
                      className="object-cover rounded"
                      sizes="48px"
                    />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                      <span className="text-sm font-medium">{item.price}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <hr className="my-4 border-t border-gray-200" />
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">${getCartTotal()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium">Free</span>
              </div>
              <div className="flex justify-between pt-4 border-t">
                <span className="text-lg font-bold">Total</span>
                <span className="text-lg font-bold text-[#008080]">${getCartTotal()}</span>
              </div>
            </div>
            
            <Link 
              href="/cart" 
              className="block w-full text-center border border-gray-300 text-gray-700 py-3 rounded-md hover:bg-gray-50 transition-colors font-medium"
            >
              Back to Cart
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}