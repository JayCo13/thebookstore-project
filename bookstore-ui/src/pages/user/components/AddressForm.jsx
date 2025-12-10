import React, { useState, useEffect } from 'react';

export default function AddressForm({
  address = null,
  onSubmit,
  onCancel,
  isLoading = false
}) {
  const [formData, setFormData] = useState({
    phone_number: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    is_default_shipping: false
  });

  const [errors, setErrors] = useState({});

  // Populate form when editing
  useEffect(() => {
    if (address) {
      setFormData({
        phone_number: address.phone_number || '',
        address_line_1: address.address_line_1 || '',
        address_line_2: address.address_line_2 || '',
        city: address.city || '',
        is_default_shipping: address.is_default_shipping || address.is_default || false
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
      newErrors.phone_number = 'Vui lòng nhập số điện thoại';
    }

    if (!formData.address_line_1.trim()) {
      newErrors.address_line_1 = 'Vui lòng nhập địa chỉ';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'Vui lòng nhập thành phố';
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Phone Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Số điện thoại *
        </label>
        <input
          type="tel"
          name="phone_number"
          value={formData.phone_number}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-black focus:border-transparent transition ${errors.phone_number ? 'border-red-300' : 'border-gray-300'
            }`}
          placeholder="Nhập số điện thoại"
          disabled={isLoading}
        />
        {errors.phone_number && (
          <p className="mt-1 text-sm text-red-600">{errors.phone_number}</p>
        )}
      </div>

      {/* Address Line 1 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Địa chỉ *
        </label>
        <input
          type="text"
          name="address_line_1"
          value={formData.address_line_1}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-black focus:border-transparent transition ${errors.address_line_1 ? 'border-red-300' : 'border-gray-300'
            }`}
          placeholder="Số nhà, tên đường, phường/xã"
          disabled={isLoading}
        />
        {errors.address_line_1 && (
          <p className="mt-1 text-sm text-red-600">{errors.address_line_1}</p>
        )}
      </div>

      {/* Address Line 2 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Địa chỉ bổ sung
        </label>
        <input
          type="text"
          name="address_line_2"
          value={formData.address_line_2}
          onChange={handleInputChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent transition"
          placeholder="Căn hộ, tòa nhà, tầng, v.v."
          disabled={isLoading}
        />
      </div>

      {/* City */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Thành phố / Tỉnh *
        </label>
        <input
          type="text"
          name="city"
          value={formData.city}
          onChange={handleInputChange}
          className={`w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-black focus:border-transparent transition ${errors.city ? 'border-red-300' : 'border-gray-300'
            }`}
          placeholder="Nhập thành phố / tỉnh"
          disabled={isLoading}
        />
        {errors.city && (
          <p className="mt-1 text-sm text-red-600">{errors.city}</p>
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
          Đặt làm địa chỉ giao hàng mặc định
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
          Hủy
        </button>
        <button
          type="submit"
          className="flex-1 px-6 py-3 bg-black text-white font-medium rounded-md hover:bg-gray-800 transition disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? 'Đang lưu...' : (address ? 'Cập nhật' : 'Thêm địa chỉ')}
        </button>
      </div>
    </form>
  );
}