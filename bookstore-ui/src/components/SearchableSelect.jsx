import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const SearchableSelect = ({
  options = [],
  value,
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Type to search...",
  disabled = false,
  loading = false,
  loadingText = "Loading...",
  noOptionsText = "No options available",
  displayKey = "name",
  valueKey = "id",
  className = "",
  label,
  required = false,
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionsRef = useRef([]);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option[displayKey]?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find selected option
  const selectedOption = options.find(option => 
    option[valueKey] === value
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
    }
  };

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && optionsRef.current[highlightedIndex]) {
      optionsRef.current[highlightedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [highlightedIndex]);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const toggleDropdown = () => {
    if (!disabled && !loading) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className={`relative ${className}`} ref={dropdownRef}>
        {/* Main button/input */}
        <div className={`relative ${disabled || loading ? 'opacity-60' : ''}`}>
          <button
            type="button"
            onClick={toggleDropdown}
            onKeyDown={handleKeyDown}
            disabled={disabled || loading}
            className={`
              relative w-full px-3 py-2 text-left bg-white border rounded-md shadow-sm transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-[#008080] focus:border-[#008080]
              ${disabled || loading 
                ? 'bg-gray-50 cursor-not-allowed border-gray-200 text-gray-400' 
                : 'border-gray-300 hover:border-gray-400 cursor-pointer hover:shadow-md'
              }
              ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
              ${isOpen && !disabled && !loading ? 'ring-2 ring-[#008080] border-[#008080] shadow-lg' : ''}
            `}
          >
            <span className={`block truncate ${disabled || loading ? 'text-gray-400' : ''}`}>
              {loading ? loadingText : (selectedOption ? selectedOption[displayKey] : placeholder)}
            </span>
            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              {disabled && !loading ? (
                <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ) : (
                <ChevronDownIcon 
                  className={`h-5 w-5 transition-all duration-200 ${
                    disabled || loading ? 'text-gray-300' : 'text-gray-400'
                  } ${
                    isOpen && !disabled && !loading ? 'transform rotate-180 text-[#008080]' : ''
                  }`} 
                />
              )}
            </span>
          </button>
          
          {/* Disabled overlay with tooltip */}
          {disabled && !loading && (
            <div className="absolute inset-0 bg-gray-100 bg-opacity-50 rounded-md flex items-center justify-center pointer-events-none">
              <div className="bg-gray-600 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {placeholder.includes('tỉnh') ? 'Vui lòng chọn tỉnh/thành phố trước' : 
                 placeholder.includes('quận') ? 'Vui lòng chọn quận/huyện trước' : 
                 'Không khả dụng'}
              </div>
            </div>
          )}
        </div>

        {/* Dropdown */}
        {isOpen && !loading && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
            {/* Search input */}
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setHighlightedIndex(-1);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#008080] focus:border-[#008080]"
                />
              </div>
            </div>

            {/* Options list */}
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <button
                    key={option[valueKey]}
                    ref={el => optionsRef.current[index] = el}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`
                      w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100
                      ${highlightedIndex === index ? 'bg-gray-100' : ''}
                      ${selectedOption && selectedOption[valueKey] === option[valueKey] 
                        ? 'bg-[#008080] text-white hover:bg-[#006666]' 
                        : ''
                      }
                    `}
                  >
                    {option[displayKey]}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500 text-center">
                  {searchTerm ? `No results for "${searchTerm}"` : noOptionsText}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default SearchableSelect;