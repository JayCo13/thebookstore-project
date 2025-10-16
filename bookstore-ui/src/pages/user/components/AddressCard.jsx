import React from 'react';

export default function AddressCard({ 
  address, 
  onEdit, 
  onDelete, 
  onSetDefault, 
  isDefault = false,
  showActions = true 
}) {
  const handleSetDefault = () => {
    if (!isDefault && onSetDefault) {
      onSetDefault(address.address_id);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(address);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(address.address_id);
    }
  };

  return (
    <div className={`relative p-6 rounded-xl border-2 transition-all duration-200 ${
      isDefault 
        ? 'border-black bg-gray-50' 
        : 'border-gray-200 bg-white hover:border-gray-300'
    }`}>
      {/* Default Badge */}
      {isDefault && (
        <div className="absolute top-4 right-4">
          <span className="px-3 py-1 bg-black text-white text-xs font-medium rounded-full">
            Default
          </span>
        </div>
      )}

      {/* Address Content */}
      <div className="space-y-3">
        {/* Phone Number */}
        {address.phone_number && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-sm font-medium text-gray-900">{address.phone_number}</span>
          </div>
        )}

        {/* Address Lines */}
        <div className="space-y-1">
          <p className="text-gray-900 font-medium">{address.address_line1}</p>
          {address.address_line2 && (
            <p className="text-gray-700">{address.address_line2}</p>
          )}
          <p className="text-gray-700">
            {address.city}, {address.postal_code}
          </p>
          <p className="text-gray-700">{address.country}</p>
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 transition"
            >
              Delete
            </button>
          </div>

          {!isDefault && (
            <button
              onClick={handleSetDefault}
              className="px-4 py-2 text-sm font-medium text-black bg-white border border-black rounded-md hover:bg-black hover:text-white transition"
            >
              Set as Default
            </button>
          )}
        </div>
      )}
    </div>
  );
}