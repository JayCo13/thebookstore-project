import React from 'react';
import './ui.css';

const Input = ({ className = '', ...props }) => {
  return <input className={`ui-input ${className}`.trim()} {...props} />;
};

export default Input;