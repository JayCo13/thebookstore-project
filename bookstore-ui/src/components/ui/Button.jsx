import React from 'react';
import './ui.css';

const Button = ({ children, variant = 'primary', size = 'medium', className = '', ...props }) => {
  const classes = `ui-btn ui-btn-${variant} ui-btn-${size} ${className}`.trim();
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
};

export default Button;