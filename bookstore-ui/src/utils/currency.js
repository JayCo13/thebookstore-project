/**
 * Currency formatting utilities for Vietnamese Dong (VND)
 * Formats prices in the accurate VND format: ₫250.000
 */

/**
 * Format a price value to Vietnamese Dong format with thousand separators
 * @param {number|string} price - The price value to format
 * @returns {string} Formatted price string (e.g., "₫250.000")
 */
export const formatPrice = (price) => {
  // Handle null, undefined, or empty values
  if (price === null || price === undefined || price === '') {
    return '0₫';
  }

  // Convert to number if it's a string
  let numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  // Handle invalid numbers
  if (isNaN(numPrice)) {
    return '0₫';
  }

  // Round to nearest whole number since VND doesn't use decimals in practice
  numPrice = Math.round(numPrice);

  // Format with dots as thousand separators (Vietnamese standard)
  // Convert number to string and add dots every 3 digits from right
  const numStr = numPrice.toString();
  const formatted = numStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${formatted}₫`;
};

/**
 * Format a price value to Vietnamese Dong format with decimal places if needed
 * @param {number|string} price - The price value to format
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted price string
 */
export const formatPriceWithDecimals = (price, decimals = 0) => {
  // Handle null, undefined, or empty values
  if (price === null || price === undefined || price === '') {
    return '0₫';
  }

  // Convert to number if it's a string
  let numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  // Handle invalid numbers
  if (isNaN(numPrice)) {
    return '0₫';
  }

  // Format with specified decimal places
  let formatted;
  if (decimals === 0) {
    // Use the same formatting as formatPrice for consistency
    numPrice = Math.round(numPrice);
    const numStr = numPrice.toString();
    formatted = numStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  } else {
    // For decimal places, use toFixed and then format
    const fixedPrice = numPrice.toFixed(decimals);
    const [integerPart, decimalPart] = fixedPrice.split('.');
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    formatted = decimalPart ? `${formattedInteger},${decimalPart}` : formattedInteger;
  }

  return `${formatted}₫`;
};

/**
 * Parse a VND formatted string back to a number
 * @param {string} formattedPrice - Formatted price string (e.g., "₫250.000")
 * @returns {number} Numeric value
 */
export const parsePrice = (formattedPrice) => {
  if (!formattedPrice || typeof formattedPrice !== 'string') {
    return 0;
  }

  // Remove the ₫ symbol, đ symbol (for backward compatibility), and spaces
  const cleanPrice = formattedPrice.replace(/[₫đ]/g, '').replace(/\s/g, '');
  
  // Check if there's a comma (decimal separator)
  const hasDecimal = cleanPrice.includes(',');
  
  if (hasDecimal) {
    // Split by comma to separate integer and decimal parts
    const [integerPart, decimalPart] = cleanPrice.split(',');
    // Remove dots from integer part (thousand separators) and combine with decimal
    const numericString = integerPart.replace(/\./g, '') + '.' + decimalPart;
    const parsed = parseFloat(numericString);
    return isNaN(parsed) ? 0 : parsed;
  } else {
    // No decimal, just remove dots (thousand separators)
    const numericString = cleanPrice.replace(/\./g, '');
    const parsed = parseFloat(numericString);
    return isNaN(parsed) ? 0 : parsed;
  }
};

/**
 * Format currency for display in forms (without symbol for input fields)
 * @param {number|string} price - The price value to format
 * @returns {string} Formatted price string without symbol
 */
export const formatPriceForInput = (price) => {
  // Handle null, undefined, or empty values
  if (price === null || price === undefined || price === '') {
    return '';
  }

  // Convert to number if it's a string
  let numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  // Handle invalid numbers
  if (isNaN(numPrice)) {
    return '';
  }

  // Round to nearest whole number and format with dots as thousand separators
  numPrice = Math.round(numPrice);
  const numStr = numPrice.toString();
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Default export
export default {
  formatPrice,
  formatPriceWithDecimals,
  parsePrice,
  formatPriceForInput
};