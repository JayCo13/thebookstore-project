import React from 'react';
import Modal from '../../../components/ui/Modal';
import AddressForm from './AddressForm';

export default function AddressModal({ 
  isOpen, 
  onClose, 
  address = null, 
  onSubmit, 
  isLoading = false 
}) {
  const title = address ? 'Edit Address' : 'Add New Address';

  const handleSubmit = (formData) => {
    onSubmit(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="p-6">
        <AddressForm
          address={address}
          onSubmit={handleSubmit}
          onCancel={onClose}
          isLoading={isLoading}
        />
      </div>
    </Modal>
  );
}