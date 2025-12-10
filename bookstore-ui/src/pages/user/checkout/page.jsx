'use client';

import { useState, useEffect } from 'react';
import Image from '../compat/Image';
import Link from '../compat/Link';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../../hooks/useCart';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { useGHNLocation } from '../../../hooks/useGHNLocation';
import { MinusIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Truck, PartyPopper, Banknote } from 'lucide-react';
import {
  getAddresses,
  createAddress,
  createOrder
} from '../../../service/api';
import { formatShippingFee } from '../../../service/ghnService';
import { formatPrice, parsePrice, formatPriceForInput } from '../../../utils/currency';
import SearchableSelect from '../../../components/SearchableSelect';
import GuestAccountDialog from '../../../components/GuestAccountDialog';

// Using standard HTML elements instead of UI components

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cartItems, getCartTotal, getCartTotalRaw, clearCart, removeFromCart, updateQuantity } = useCart();
  const { user, isAuthenticated, createAccountFromGuest } = useAuth();
  const { showToast } = useToast();
  const [isClient, setIsClient] = useState(false);

  // GHN Location hook
  const {
    provinces,
    districts,
    wards,
    selectedProvince,
    selectedDistrict,
    selectedWard,
    shippingFee,
    loadingProvinces,
    loadingDistricts,
    loadingWards,
    calculatingShipping,
    error: locationError,
    isConfigValid,
    handleProvinceChange,
    handleDistrictChange,
    handleWardChange,
    calculateShipping,
    getCompleteAddress,
    isLocationComplete,
    getLocationData
  } = useGHNLocation();
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
    addressLine2: '',
    paymentMethod: 'cod'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [quantityEdits, setQuantityEdits] = useState({});
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  const [showGuestDialog, setShowGuestDialog] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState(null);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);



  const normalizeText = (s) => {
    if (!s) return '';
    return String(s)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  };

  useEffect(() => {
    if (!isConfigValid) return;
    if (!formData.address) return;
    if (!provinces || provinces.length === 0) return;
    const text = normalizeText(formData.address);
    const match = provinces.find((p) => text.includes(normalizeText(p.name)));
    if (match && (!selectedProvince || selectedProvince.id !== match.id)) {
      handleProvinceChange(match);
    }
  }, [formData.address, provinces, isConfigValid, selectedProvince, handleProvinceChange]);

  useEffect(() => {
    if (!formData.address) return;
    if (!selectedProvince) return;
    if (!districts || districts.length === 0) return;
    const text = normalizeText(formData.address);
    const match = districts.find((d) => text.includes(normalizeText(d.name)));
    if (match && (!selectedDistrict || selectedDistrict.id !== match.id)) {
      handleDistrictChange(match);
    }
  }, [districts, selectedProvince, formData.address, selectedDistrict, handleDistrictChange]);

  useEffect(() => {
    if (!formData.address) return;
    if (!selectedDistrict) return;
    if (!wards || wards.length === 0) return;
    const text = normalizeText(formData.address);
    const match = wards.find((w) => text.includes(normalizeText(w.name)));
    if (match && (!selectedWard || selectedWard.code !== match.code)) {
      handleWardChange(match);
    }
  }, [wards, selectedDistrict, formData.address, selectedWard, handleWardChange]);
  useEffect(() => {
    setIsClient(true);
    if (isAuthenticated && user) {
      loadUserData();
      loadAddresses();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    const next = {};
    cartItems.forEach((it) => { next[it.id] = String(it.quantity || 1); });
    setQuantityEdits(next);
  }, [cartItems]);

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
      const response = await getAddresses();

      // Backend returns {addresses: [...], default_address_id: n}
      const addressList = response.addresses || response || [];

      // Map address fields for consistent usage
      const mappedAddresses = addressList.map(addr => ({
        ...addr,
        id: addr.address_id || addr.id,
        is_default: addr.is_default_shipping || addr.is_default
      }));

      setAddresses(mappedAddresses);

      // Auto-select default address if available
      const defaultAddress = mappedAddresses.find(addr => addr.is_default) ||
        (response.default_address_id && mappedAddresses.find(addr => addr.id === response.default_address_id));
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
      address: address.address_line_1 || ''
    }));
  };

  // Check if any cart item has free shipping
  const hasFreeShipItem = cartItems.some(item => item.isFreeShip || item.is_free_ship);

  // Calculate shipping fee when location is complete and cart items change (skip if free ship)
  useEffect(() => {
    if (hasFreeShipItem) {
      // Skip shipping calculation - will use 0
      return;
    }
    if (isLocationComplete() && cartItems.length > 0 && isConfigValid) {
      calculateShipping(cartItems);
    }
  }, [selectedProvince, selectedDistrict, selectedWard, cartItems, isLocationComplete, calculateShipping, isConfigValid, hasFreeShipItem]);

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

    // For guest users, show dialog first before submitting
    if (!isAuthenticated) {
      // Validate form first
      const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address'];
      const missingFields = requiredFields.filter(field => !formData[field]?.trim());

      if (missingFields.length > 0) {
        showToast(`Vui lòng điền đầy đủ thông tin bắt buộc: ${missingFields.join(', ')}`, 'error');
        return;
      }

      // Validate GHN location selection
      if (!isLocationComplete()) {
        showToast('Vui lòng chọn Tỉnh/Thành phố, Quận/Huyện, Xã/Phường cho địa chỉ giao hàng', 'error');
        return;
      }

      // Show guest account dialog
      setShowGuestDialog(true);
      return;
    }

    // For authenticated users, proceed normally
    await submitOrder();
  };

  const submitOrder = async (skipDialog = false) => {
    setIsSubmitting(true);

    try {
      // Validate required fields
      const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address'];
      const missingFields = requiredFields.filter(field => !formData[field]?.trim());

      if (missingFields.length > 0) {
        showToast(`Vui lòng điền đầy đủ thông tin bắt buộc: ${missingFields.join(', ')}`, 'error');
        return;
      }

      // Validate GHN location selection
      if (!isLocationComplete()) {
        showToast('Vui lòng chọn Tỉnh/Thành phố, Quận/Huyện, Xã/Phường cho địa chỉ giao hàng', 'error');
        return;
      }

      // Check if GHN configuration is valid
      if (!isConfigValid) {
        showToast('Dịch vụ giao hàng không khả dụng. Vui lòng liên hệ với hỗ trợ.', 'error');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        showToast('Vui lòng nhập email hợp lệ, ví dụ: example@gmail.com', 'error');
        return;
      }

      // Validate phone number (basic validation)
      const phoneRegex = /^[\+]?[0-9][\d]{0,15}$/;
      if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
        showToast('Vui lòng nhập số điện thoại hợp lệ, ví dụ: 0987654321', 'error');
        return;
      }

      // Validate cart items
      if (!cartItems || cartItems.length === 0) {
        showToast('Giỏ hàng của bạn đang trống. Vui lòng thêm ít nhất 1 cuốn sách trước khi thanh toán.', 'error');
        return;
      }

      // Get GHN location data
      const locationData = getLocationData();
      const completeAddress = getCompleteAddress();

      // Calculate total amount for COD (free shipping if any item has free ship)
      const cartTotal = getCartTotalRaw();
      const effectiveShippingFee = hasFreeShipItem ? 0 : (shippingFee?.total || 0);
      const totalAmount = cartTotal + effectiveShippingFee;

      // Prepare order data with proper structure matching backend OrderCreate schema
      const orderData = {
        // Only send books to backend items; stationery goes via ghn_items
        items: cartItems
          .filter(item => !!item.author)
          .map(item => ({
            book_id: parseInt(item.id),
            quantity: parseInt(item.quantity)
          })),
        // Send non-book items to GHN to ensure they appear in GHN dashboard
        // Heuristic: stationery items typically have no author field
        ghn_items: cartItems
          .filter(item => !item.author)
          .map(item => ({
            stationery_id: parseInt(item.stationery_id ?? item.id),
            name: item.title,
            quantity: parseInt(item.quantity),
            price: parsePrice(item.price)
          })),
        // Add shipping fee information (0 if any item has free shipping)
        shipping_fee: hasFreeShipItem ? 0 : (shippingFee?.total || 0),
        shipping_method: hasFreeShipItem ? 'Free Shipping' : 'GHN Express',
        // Add payment method and cod_amount logic
        payment_method: formData.paymentMethod,
        cod_amount: formData.paymentMethod === 'cod' ? getCartTotalRaw() : 0
      };

      // Handle address for authenticated users
      if (isAuthenticated) {
        // Add customer full name for GHN integration
        orderData.shipping_full_name = `${formData.firstName} ${formData.lastName}`.trim();

        // ALWAYS include these fields for GHN integration, regardless of address selection
        orderData.shipping_phone_number = formData.phone.trim();
        orderData.shipping_address_line1 = formData.address.trim();
        orderData.shipping_address_line2 = formData.addressLine2?.trim() || null;
        orderData.shipping_city = completeAddress;
        orderData.shipping_postal_code = selectedWard.code;
        orderData.shipping_country = 'Vietnam';

        // Add GHN specific data - REQUIRED for all authenticated orders
        orderData.ghn_province_id = selectedProvince.id;
        orderData.ghn_district_id = selectedDistrict.id;
        orderData.ghn_ward_code = selectedWard.code;
        orderData.ghn_province_name = selectedProvince.name;
        orderData.ghn_district_name = selectedDistrict.name;
        orderData.ghn_ward_name = selectedWard.name;
        orderData.shipping_service_id = shippingFee?.service_id;

        // Package dimensions for GHN (using defaults)
        orderData.package_weight = 1000; // 1kg default
        orderData.package_length = 30;   // 30cm
        orderData.package_width = 20;    // 20cm
        orderData.package_height = 10;   // 10cm

        if (selectedAddressId) {
          // Use existing saved address (but still send all fields above for GHN)
          orderData.shipping_address_id = selectedAddressId;
        } else if (useNewAddress) {
          // Provide new address data with GHN location
          orderData.shipping_address = {
            phone_number: formData.phone.trim(),
            address_line1: formData.address.trim(),
            address_line2: formData.addressLine2?.trim() || null,
            city: completeAddress,
            postal_code: selectedWard.code,
            country: 'Vietnam',
            is_default_shipping: false,
            // Add GHN specific data
            ghn_province_id: selectedProvince.id,
            ghn_district_id: selectedDistrict.id,
            ghn_ward_code: selectedWard.code,
            ghn_province_name: selectedProvince.name,
            ghn_district_name: selectedDistrict.name,
            ghn_ward_name: selectedWard.name
          };
          // Save address if requested
          if (saveNewAddress) {
            orderData.save_address = true;
          }
        }
      } else {
        // Guest checkout - provide shipping details directly with GHN location
        orderData.guest_email = formData.email.trim().toLowerCase();
        orderData.shipping_phone_number = formData.phone.trim();
        orderData.shipping_address_line1 = formData.address.trim();
        orderData.shipping_address_line2 = formData.addressLine2?.trim() || null;
        orderData.shipping_city = completeAddress;
        orderData.shipping_postal_code = selectedWard.code;
        orderData.shipping_country = 'Vietnam';
        // Add customer full name for GHN integration
        orderData.shipping_full_name = `${formData.firstName} ${formData.lastName}`.trim();
        // Add GHN specific data for guest checkout
        orderData.ghn_province_id = selectedProvince.id;
        orderData.ghn_district_id = selectedDistrict.id;
        orderData.ghn_ward_code = selectedWard.code;
        orderData.ghn_province_name = selectedProvince.name;
        orderData.ghn_district_name = selectedDistrict.name;
        orderData.ghn_ward_name = selectedWard.name;
        orderData.shipping_service_id = shippingFee?.service_id;

        // Package dimensions for GHN (using defaults)
        orderData.package_weight = 1000; // 1kg default
        orderData.package_length = 30;   // 30cm
        orderData.package_width = 20;    // 20cm
        orderData.package_height = 10;   // 10cm
      }

      // Creating order
      console.log('=== ORDER SUBMISSION DEBUG ===');
      console.log('User Authentication Status:', isAuthenticated);
      console.log('Current User:', user);
      console.log('Cart Items:', cartItems);
      console.log('Form Data:', formData);
      console.log('Selected Address ID:', selectedAddressId);
      console.log('Use New Address:', useNewAddress);
      console.log('Save New Address:', saveNewAddress);
      console.log('GHN Location Data:');
      console.log('  - Province:', selectedProvince);
      console.log('  - District:', selectedDistrict);
      console.log('  - Ward:', selectedWard);
      console.log('Shipping Fee:', shippingFee);
      console.log('Complete Address:', completeAddress);
      console.log('Final Order Data being sent to API:', JSON.stringify(orderData, null, 2));
      console.log('=== END ORDER DEBUG ===');

      // Create the order
      const result = await createOrder(orderData);
      console.groupCollapsed('Checkout: Order creation response');
      console.log('Order result:', result);
      console.log('Order ID:', result?.order_id || result?.id);
      console.log('GHN Order Code:', result?.ghn_order_code || '(none)');
      if (result?.ghn_order_code) {
        console.log('Zalo ZNS: backend will send notification after GHN creation.');
        const normalizePhone = (phone) => {
          if (!phone) return null;
          const raw = String(phone).replace(/\D+/g, '');
          if (!raw) return null;
          if (raw.startsWith('0')) return '84' + raw.slice(1);
          if (raw.startsWith('84')) return raw;
          if (raw.length >= 9) return '84' + raw;
          return raw;
        };
        const phoneNormalized = normalizePhone(isAuthenticated ? (orderData.shipping_address?.phone_number) : orderData.shipping_phone_number);
        const baseTotal = Number((result?.total_amount ?? getCartTotalRaw()) || 0);
        const fee = Number(shippingFee?.total || 0);
        const totalNumber = baseTotal + fee;
        const parts = [
          isAuthenticated ? orderData.shipping_address?.address_line1 : orderData.shipping_address_line1,
          isAuthenticated ? orderData.shipping_address?.ghn_ward_name : orderData.ghn_ward_name,
          isAuthenticated ? orderData.shipping_address?.ghn_district_name : orderData.ghn_district_name,
          isAuthenticated ? orderData.shipping_address?.ghn_province_name : orderData.ghn_province_name,
        ].filter(Boolean);
        const addressJoined = parts.join(', ');
        const template_data = {
          order_code: result?.ghn_order_code,
          total: totalNumber,
          address: addressJoined || '',
          deli_code: result?.ghn_order_code,
          customer_name: orderData?.shipping_full_name || '',
          payment_method: String(orderData?.payment_method || '').toUpperCase(),
          tracking_id: '(generated server-side)',
          items: (() => {
            const arr = Array.isArray(cartItems) ? cartItems : [];
            const parts2 = arr.map(it => {
              const t = it?.title || it?.book?.title || it?.stationery?.title || '';
              const q = Number(it?.quantity || 0);
              return t && q > 0 ? `${t} x${q}` : null;
            }).filter(Boolean);
            let s = parts2.join(', ');
            if (s.length > 200) s = s.slice(0, 197) + '...';
            return s;
          })(),
        };
        console.groupCollapsed('Checkout: ZNS payload preview');
        console.log('phone:', phoneNormalized);
        console.log('template_id:', '(server configured)');
        console.log('template_data:', template_data);
        console.groupEnd();
      } else {
        console.log('Zalo ZNS: GHN code missing; notification will be skipped.');
      }
      console.groupEnd();

      if (result && (result.order_id || result.id)) {
        showToast('Đặt hàng thành công!', 'success');

        // Auto-save phone number for authenticated users
        if (isAuthenticated && formData.phone && formData.phone.trim()) {
          try {
            const { updateUserPhone } = await import('../../../service/api');
            await updateUserPhone(formData.phone.trim());
            console.log('Phone number auto-saved to user profile');
          } catch (phoneError) {
            // Don't fail the order if phone save fails
            console.warn('Failed to save phone number to profile:', phoneError);
          }
        }

        clearCart();

        // Navigate to success page with order ID
        const orderId = result.order_id || result.id;
        navigate(`/checkout/success?orderId=${orderId}`);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Order creation error:', error);

      // Handle specific error types
      if (error.status === 400) {
        showToast(error.message || 'Invalid order data. Please check your information.', 'error');
      } else if (error.status === 401) {
        showToast('Please log in to complete your order.', 'error');
        navigate('/login');
      } else if (error.status === 422) {
        showToast('Some items in your cart are no longer available. Please review your cart.', 'error');
      } else if (error.status === 500) {
        showToast('Server error. Please try again later.', 'error');
      } else if (error.message) {
        showToast(error.message, 'error');
      } else {
        showToast('Failed to place order. Please try again.', 'error');
      }
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
        <h1 className="text-3xl font-bold mb-4">Giỏ hàng của bạn đang trống</h1>
        <p className="mb-8">Hãy thêm sách vào giỏ hàng để thanh toán nhé.</p>
        <Link href="/" className="bg-[#008080] text-white px-6 py-3 rounded-md hover:bg-[#006666] transition-colors">
          Quay lại mua sách
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-28 pb-16">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Thanh Toán</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form id="checkout-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Address Selection for Authenticated Users */}
            {isAuthenticated && addresses.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold mb-6">Select Shipping Address</h2>

                <div className="space-y-4">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${selectedAddressId === address.id
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
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${useNewAddress
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
              <h2 className="text-xl font-bold mb-6">Thông tin giao hàng</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">Tên <span className="text-red-500">*</span></label>
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
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Họ và tên đệm <span className="text-red-500">*</span></label>
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
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email <span className="text-red-500">*</span></label>
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
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Số điện thoại <span className="text-red-500">*</span></label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#008080] focus:border-[#008080]"
                  />
                  {isAuthenticated && (
                    <p className="text-xs text-gray-600 mt-1">
                      📝 Số điện thoại của bạn sẽ được lưu vào hồ sơ để thanh toán nhanh hơn lần sau.
                    </p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">Địa chỉ <span className="text-red-500">*</span></label>
                  <input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#008080] focus:border-[#008080]"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700">Địa chỉ chi tiết (Tùy chọn)</label>
                  <input
                    id="addressLine2"
                    name="addressLine2"
                    value={formData.addressLine2}
                    onChange={handleInputChange}
                    placeholder="Số nhà, tên đường, tên phố, etc."
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#008080] focus:border-[#008080]"
                  />
                </div>

                {/* Modern Location Selection Section */}
                <div className="md:col-span-2 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#008080] rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Thông tin vị trí giao hàng</h3>
                      <p className="text-sm text-gray-600">Chọn địa điểm để tính phí vận chuyển chính xác</p>
                    </div>
                  </div>

                  {!isConfigValid && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800 flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Lỗi cấu hình dịch vụ giao hàng
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Province Selection */}
                    <div className="space-y-2">
                      <SearchableSelect
                        label="Tỉnh/Thành phố"
                        required
                        options={provinces}
                        value={selectedProvince?.id || ''}
                        onChange={(province) => handleProvinceChange(province)}
                        placeholder="Chọn tỉnh/thành phố"
                        searchPlaceholder="Tìm kiếm tỉnh/thành phố..."
                        loading={loadingProvinces}
                        loadingText="Đang tải danh sách tỉnh/thành phố..."
                        disabled={!isConfigValid}
                        noOptionsText="Không có dữ liệu tỉnh/thành phố"
                        displayKey="name"
                        valueKey="id"
                        className="transition-all duration-200"
                      />
                    </div>

                    {/* District Selection */}
                    <div className="space-y-2">
                      <SearchableSelect
                        label="Quận/Huyện"
                        required
                        options={districts}
                        value={selectedDistrict?.id || ''}
                        onChange={(district) => handleDistrictChange(district)}
                        placeholder={!selectedProvince ? "Chọn tỉnh/thành phố trước" : "Chọn quận/huyện"}
                        searchPlaceholder="Tìm kiếm quận/huyện..."
                        loading={loadingDistricts}
                        loadingText="Đang tải danh sách quận/huyện..."
                        disabled={!selectedProvince || districts.length === 0}
                        noOptionsText={!selectedProvince ? "Vui lòng chọn tỉnh/thành phố trước" : "Không có dữ liệu quận/huyện"}
                        displayKey="name"
                        valueKey="id"
                        className="transition-all duration-200"
                      />
                    </div>

                    {/* Ward Selection */}
                    <div className="space-y-2">
                      <SearchableSelect
                        label="Phường/Xã"
                        required
                        options={wards}
                        value={selectedWard?.code || ''}
                        onChange={(ward) => handleWardChange(ward)}
                        placeholder={!selectedDistrict ? "Chọn quận/huyện trước" : "Chọn phường/xã"}
                        searchPlaceholder="Tìm kiếm phường/xã..."
                        loading={loadingWards}
                        loadingText="Đang tải danh sách phường/xã..."
                        disabled={!selectedDistrict || wards.length === 0}
                        noOptionsText={!selectedDistrict ? "Vui lòng chọn quận/huyện trước" : "Không có dữ liệu phường/xã"}
                        displayKey="name"
                        valueKey="code"
                        className="transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Display complete address when location is selected */}
                {isLocationComplete() && (
                  <div className="md:col-span-2 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800">
                      <strong>Địa chỉ hoàn chỉnh:</strong> {getCompleteAddress()}
                    </p>
                  </div>
                )}

                {/* Display shipping fee when calculated */}
                {shippingFee && (
                  <div className="md:col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-800">Phí vận chuyển (GHN Express):</span>
                      <span className="font-semibold text-blue-900">
                        {formatShippingFee(shippingFee.total)}
                      </span>
                    </div>
                    {calculatingShipping && (
                      <p className="text-xs text-blue-600 mt-1">Calculating shipping fee...</p>
                    )}
                  </div>
                )}

                {/* Display location error if any */}
                {locationError && (
                  <div className="md:col-span-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">{locationError}</p>
                  </div>
                )}

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
                        Lưu địa chỉ này vào hồ sơ của tôi để đơn hàng sau
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-6">Phương thức thanh toán</h2>

              <div className="space-y-4">
                <div className="flex items-center space-x-3 border p-4 rounded-md">
                  <input
                    type="radio"
                    id="cod"
                    name="paymentMethod"
                    value="cod"
                    checked={formData.paymentMethod === 'cod'}
                    onChange={(e) => handlePaymentMethodChange(e.target.value)}
                    className="h-4 w-4 text-[#008080] focus:ring-[#008080]"
                  />
                  <label htmlFor="cod" className="flex-1 cursor-pointer">
                    <div className="font-medium">Thanh toán khi nhận hàng</div>
                    <div className="text-sm text-gray-500">Thanh toán COD</div>
                  </label>
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
                      <Banknote className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>

                {/* MoMo temporarily disabled */}
                {/* <div className="flex items-center space-x-3 border p-4 rounded-md opacity-50 cursor-not-allowed">
                  <input
                    type="radio"
                    id="momo"
                    name="paymentMethod"
                    value="momo"
                    disabled
                    className="h-4 w-4 text-gray-400"
                  />
                  <label htmlFor="momo" className="flex-1">
                    <div className="font-medium text-gray-400">Ví MoMo</div>
                    <div className="text-sm text-gray-400">Tạm thời không khả dụng</div>
                  </label>
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">M</span>
                    </div>
                  </div>
                </div> */}
              </div>
            </div>

            {/* Submit Button - only visible on desktop */}
            <button
              type="submit"
              className="hidden lg:block w-full bg-[#008080] hover:bg-[#006666] text-white py-3 rounded-md transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || isCreatingAccount}
            >
              {isSubmitting || isCreatingAccount ? 'Đang xử lý...' : 'Hoàn tất đơn hàng'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-6 pb-4 border-b">Tóm tắt đơn hàng</h2>

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
                    <p
                      className="text-sm font-medium text-gray-900 break-words overflow-hidden"
                      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                      title={item.title}
                    >
                      {item.title}
                    </p>
                    {/* Price display with discount */}
                    <div className="mt-1">
                      {item.discountedPrice ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#008080]">
                            {item.discountedPrice}
                          </span>
                          <span className="text-xs text-gray-400 line-through">
                            {item.originalPrice}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-gray-900">
                          {formatPriceForInput(parsePrice(item.price))}₫
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between mt-2 items-center">
                      <div className="flex items-center gap-2">
                        <button
                          className="p-2 rounded-md hover:bg-gray-100 border border-gray-200"
                          onClick={() => {
                            const next = Math.max(1, (parseInt(quantityEdits[item.id] || '1', 10) - 1));
                            setQuantityEdits((prev) => ({ ...prev, [item.id]: String(next) }));
                            updateQuantity(item.id, next);
                          }}
                          aria-label="Giảm số lượng"
                        >
                          <MinusIcon className="h-4 w-4 text-gray-700" />
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={99}
                          value={quantityEdits[item.id] || ''}
                          onChange={(e) => {
                            const v = e.target.value.replace(/[^0-9]/g, '');
                            setQuantityEdits((prev) => ({ ...prev, [item.id]: v }));
                          }}
                          onBlur={() => {
                            let val = parseInt(quantityEdits[item.id] || '1', 10);
                            if (Number.isNaN(val) || val < 1) val = 1;
                            if (val > 99) val = 99;
                            setQuantityEdits((prev) => ({ ...prev, [item.id]: String(val) }));
                            updateQuantity(item.id, val);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              let val = parseInt(quantityEdits[item.id] || '1', 10);
                              if (Number.isNaN(val) || val < 1) val = 1;
                              if (val > 99) val = 99;
                              setQuantityEdits((prev) => ({ ...prev, [item.id]: String(val) }));
                              updateQuantity(item.id, val);
                            }
                          }}
                          className="w-16 px-2 py-1 border border-gray-300 rounded-md text-sm text-center focus:outline-none focus:ring-[#008080] focus:border-[#008080]"
                          aria-label="Số lượng"
                        />
                        <button
                          className="p-2 rounded-md hover:bg-gray-100 border border-gray-200"
                          onClick={() => {
                            const next = Math.min(99, (parseInt(quantityEdits[item.id] || '1', 10) + 1));
                            setQuantityEdits((prev) => ({ ...prev, [item.id]: String(next) }));
                            updateQuantity(item.id, next);
                          }}
                          aria-label="Tăng số lượng"
                        >
                          <PlusIcon className="h-4 w-4 text-gray-700" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        {confirmRemoveId === item.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              className="px-2 py-1 text-white bg-red-600 rounded-md text-xs hover:bg-red-700"
                              onClick={() => { removeFromCart(item.id); setConfirmRemoveId(null); }}
                            >
                              Xóa
                            </button>
                            <button
                              className="px-2 py-1 border border-gray-300 rounded-md text-xs hover:bg-gray-50"
                              onClick={() => setConfirmRemoveId(null)}
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            className="p-2 rounded-md hover:bg-red-50 border border-red-200"
                            onClick={() => setConfirmRemoveId(item.id)}
                            aria-label="Xóa sản phẩm"
                          >
                            <TrashIcon className="h-4 w-4 text-red-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <hr className="my-4 border-t border-gray-200" />

            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Tổng tiền</span>
                <span className="font-medium">{getCartTotal()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Đơn vị giao hàng {hasFreeShipItem ? '' : '(GHN Express)'}</span>
                <span className="font-medium">
                  {hasFreeShipItem ? (
                    <span className="text-orange-600 font-bold flex items-center gap-1">
                      <Truck className="w-4 h-4" />
                      Miễn phí ship
                    </span>
                  ) : calculatingShipping ? (
                    <span className="text-blue-600">Đang tính toán...</span>
                  ) : shippingFee ? (
                    formatShippingFee(shippingFee.total)
                  ) : isLocationComplete() ? (
                    <span className="text-orange-600">Đang tính toán...</span>
                  ) : (
                    <span className="text-gray-500">Chọn địa chỉ</span>
                  )}
                </span>
              </div>
              {shippingFee && !hasFreeShipItem && (
                <div className="text-xs text-gray-500 -mt-2">
                  Service Fee: {formatShippingFee(shippingFee.serviceFee)}
                  {shippingFee.insuranceFee > 0 && (
                    <span> • Bảo hiểm: {formatShippingFee(shippingFee.insuranceFee)}</span>
                  )}
                </div>
              )}
              <div className="flex justify-between pt-4 border-t">
                <span className="text-lg font-bold">Tổng cộng</span>
                <span className="text-lg font-bold text-[#008080]">
                  {formatPrice(getCartTotalRaw() + (hasFreeShipItem ? 0 : (shippingFee?.total || 0)))}
                </span>
              </div>
              {!hasFreeShipItem && shippingFee && (
                <div className="text-xs text-gray-500 text-right">
                  (Giao hàng: {formatShippingFee(shippingFee.total)})
                </div>
              )}
              {hasFreeShipItem && (
                <div className="text-sm text-orange-600 text-right font-medium flex items-center justify-end gap-1">
                  <PartyPopper className="w-4 h-4" />
                  Đơn hàng của bạn được miễn phí vận chuyển!
                </div>
              )}
            </div>

            <Link
              href="/cart"
              className="block w-full text-center border border-gray-300 text-gray-700 py-3 rounded-md hover:bg-gray-50 transition-colors font-medium"
            >
              Quay lại giỏ hàng
            </Link>
          </div>
        </div>
      </div>

      {/* Submit Button - only on mobile, appears after order summary */}
      <div className="block lg:hidden mt-8 px-4">
        <button
          type="submit"
          form="checkout-form"
          className="w-full bg-[#008080] hover:bg-[#006666] text-white py-4 px-8 rounded-lg transition-all font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          disabled={isSubmitting || isCreatingAccount}
        >
          {isSubmitting || isCreatingAccount ? 'Đang xử lý...' : 'Hoàn tất đơn hàng'}
        </button>
      </div>

      {/* Guest Account Creation Dialog */}
      {showGuestDialog && (
        <GuestAccountDialog
          isOpen={showGuestDialog}
          onClose={() => {
            // User clicked skip - proceed with guest checkout
            setShowGuestDialog(false);
            submitOrder(); // Submit as guest
          }}
          orderData={{
            orderId: null, // No order yet
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phoneNumber: formData.phone
          }}
          onCreateAccount={async (guestData) => {
            setShowGuestDialog(false);
            setIsCreatingAccount(true);
            showToast('Đang xử lý...', 'info');

            try {
              // Use standard register API
              const { register, login } = await import('../../../service/api');

              let accountCreated = false;

              try {
                // Try to register the account
                await register({
                  first_name: guestData.first_name,
                  last_name: guestData.last_name,
                  email: guestData.email,
                  password: guestData.password
                });
                accountCreated = true;
                sessionStorage.setItem('account_just_created', 'true');
                showToast('Tài khoản đã được tạo thành công!', 'success');
              } catch (registerError) {
                // If email already exists, try to login instead
                if (registerError.message && registerError.message.includes('already registered')) {
                  console.log('Email already registered, attempting login...');
                  showToast('Email đã tồn tại. Đang đăng nhập...', 'info');
                } else {
                  // Other registration errors, rethrow
                  throw registerError;
                }
              }

              // Auto-login (works for both new registration and existing account)
              const loginResult = await login({
                email: guestData.email,
                password: guestData.password
              });

              if (loginResult.access_token) {
                if (!accountCreated) {
                  showToast('Đăng nhập thành công!', 'success');
                }
                // Now submit order as authenticated user
                await submitOrder();
              } else {
                throw new Error('Login failed');
              }
            } catch (error) {
              console.error('Account creation/login failed:', error);

              // Check if it's a wrong password error
              if (error.message && (error.message.includes('Invalid') || error.message.includes('password'))) {
                showToast('Email đã tồn tại với mật khẩu khác. Đang xử lý đơn hàng...', 'warning');
              } else {
                showToast('Không thể tạo tài khoản. Đang xử lý đơn hàng...', 'warning');
              }

              // Still proceed with guest checkout
              await submitOrder();
            } finally {
              setIsCreatingAccount(false);
            }
          }}
        />
      )}
    </div>
  );
}
