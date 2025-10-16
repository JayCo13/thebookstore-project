import React, { useState, useEffect } from 'react';

export default function AddressForm({ 
  address = null, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}) {
  const [formData, setFormData] = useState({
    phone_number: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postal_code: '',
    country: '',
    is_default_shipping: false
  });

  const [errors, setErrors] = useState({});

  // Populate form when editing
  useEffect(() => {
    if (address) {
      setFormData({
        phone_number: address.phone_number || '',
        address_line1: address.address_line1 || '',
        address_line2: address.address_line2 || '',
        city: address.city || '',
        postal_code: address.postal_code || '',
        country: address.country || '',
        is_default_shipping: address.is_default_shipping || false
      });
    }
  }, [address]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'Phone number is required';
    }

    if (!formData.address_line1.trim()) {
      newErrors.address_line1 = 'Address line 1 is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.postal_code.trim()) {
      newErrors.postal_code = 'Postal code is required';
    }

    if (!formData.country.trim()) {
      newErrors.country = 'Country is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Phone Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Phone Number *
        </label>
        <input
          type="tel"
          name="phone_number"
          value={formData.phone_number}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-black focus:border-transparent transition ${
            errors.phone_number ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Enter your phone number"
          disabled={isLoading}
        />
        {errors.phone_number && (
          <p className="mt-1 text-sm text-red-600">{errors.phone_number}</p>
        )}
      </div>

      {/* Address Line 1 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Address Line 1 *
        </label>
        <input
          type="text"
          name="address_line1"
          value={formData.address_line1}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-black focus:border-transparent transition ${
            errors.address_line1 ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Street address, P.O. box, company name, c/o"
          disabled={isLoading}
        />
        {errors.address_line1 && (
          <p className="mt-1 text-sm text-red-600">{errors.address_line1}</p>
        )}
      </div>

      {/* Address Line 2 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Address Line 2
        </label>
        <input
          type="text"
          name="address_line2"
          value={formData.address_line2}
          onChange={handleInputChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent transition"
          placeholder="Apartment, suite, unit, building, floor, etc."
          disabled={isLoading}
        />
      </div>

      {/* City and Postal Code */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            City *
          </label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-black focus:border-transparent transition ${
              errors.city ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter city"
            disabled={isLoading}
          />
          {errors.city && (
            <p className="mt-1 text-sm text-red-600">{errors.city}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Postal Code *
          </label>
          <input
            type="text"
            name="postal_code"
            value={formData.postal_code}
            onChange={handleInputChange}
            className={`w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-black focus:border-transparent transition ${
              errors.postal_code ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter postal code"
            disabled={isLoading}
          />
          {errors.postal_code && (
            <p className="mt-1 text-sm text-red-600">{errors.postal_code}</p>
          )}
        </div>
      </div>

      {/* Country */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Country *
        </label>
        <select
          name="country"
          value={formData.country}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-black focus:border-transparent transition ${
            errors.country ? 'border-red-300' : 'border-gray-300'
          }`}
          disabled={isLoading}
        >
          <option value="">Select a country</option>
          <option value="United States">United States</option>
          <option value="Canada">Canada</option>
          <option value="United Kingdom">United Kingdom</option>
          <option value="Australia">Australia</option>
          <option value="Germany">Germany</option>
          <option value="France">France</option>
          <option value="Japan">Japan</option>
          <option value="South Korea">South Korea</option>
          <option value="Singapore">Singapore</option>
          <option value="Malaysia">Malaysia</option>
          <option value="Thailand">Thailand</option>
          <option value="Philippines">Philippines</option>
          <option value="Indonesia">Indonesia</option>
          <option value="Vietnam">Vietnam</option>
          <option value="India">India</option>
          <option value="China">China</option>
          <option value="Other">Other</option>
        </select>
        {errors.country && (
          <p className="mt-1 text-sm text-red-600">{errors.country}</p>
        )}
      </div>

      {/* Default Shipping Checkbox */}
      <div className="flex items-center">
        <input
          type="checkbox"
          name="is_default_shipping"
          checked={formData.is_default_shipping}
          onChange={handleInputChange}
          className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
          disabled={isLoading}
        />
        <label className="ml-2 block text-sm text-gray-700">
          Set as default shipping address
        </label>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-6 py-3 bg-black text-white font-medium rounded-md hover:bg-gray-800 transition disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : (address ? 'Update Address' : 'Add Address')}
        </button>
      </div>
    </form>
  );
}