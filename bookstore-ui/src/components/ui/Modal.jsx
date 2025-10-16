import React from 'react';
import './ui.css';

const Modal = ({ isOpen, onClose, title, size = 'medium', children }) => {
  if (!isOpen) return null;
  return (
    <div className="ui-modal-overlay" onClick={onClose}>
      <div className={`ui-modal ui-modal-${size}`} onClick={(e) => e.stopPropagation()}>
        <div className="ui-modal-header">
          <h3>{title}</h3>
          <button className="ui-btn ui-btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="ui-modal-body">{children}</div>
      </div>
    </div>
  );
};

export default Modal;