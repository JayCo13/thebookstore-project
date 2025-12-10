import { useState, useEffect, useCallback } from 'react';
import {
  getProvinces,
  getDistricts,
  getWards,
  calculateCartShippingFee,
  validateGHNConfig
} from '../service/ghnService';

/**
 * Custom hook for managing GHN location data and shipping calculations
 */
export const useGHNLocation = () => {
  // Location data states
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);

  // Selected location states
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedWard, setSelectedWard] = useState(null);

  // Loading states
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [calculatingShipping, setCalculatingShipping] = useState(false);

  // Error states
  const [error, setError] = useState(null);

  // Shipping fee state
  const [shippingFee, setShippingFee] = useState(null);

  // Configuration validation
  const [isConfigValid, setIsConfigValid] = useState(false);

  // Validate configuration on mount
  useEffect(() => {
    const configValid = validateGHNConfig();
    setIsConfigValid(configValid);
    if (!configValid) {
      setError('GHN API configuration is incomplete. Please check your environment variables.');
    }
  }, []);

  // Load provinces on mount
  useEffect(() => {
    if (isConfigValid) {
      loadProvinces();
    }
  }, [isConfigValid]);

  // Load provinces
  const loadProvinces = useCallback(async () => {
    if (!isConfigValid) return;

    setLoadingProvinces(true);
    setError(null);

    try {
      const provincesData = await getProvinces();
      setProvinces(provincesData);
    } catch (err) {
      setError(`Failed to load provinces: ${err.message}`);
      console.error('Error loading provinces:', err);
    } finally {
      setLoadingProvinces(false);
    }
  }, [isConfigValid]);

  // Load districts when province changes
  const loadDistricts = useCallback(async (provinceId) => {
    if (!provinceId || !isConfigValid) return;

    setLoadingDistricts(true);
    setError(null);
    setDistricts([]);
    setWards([]);
    setSelectedDistrict(null);
    setSelectedWard(null);
    setShippingFee(null);

    try {
      const districtsData = await getDistricts(provinceId);
      setDistricts(districtsData);
    } catch (err) {
      setError(`Failed to load districts: ${err.message}`);
      console.error('Error loading districts:', err);
    } finally {
      setLoadingDistricts(false);
    }
  }, [isConfigValid]);

  // Load wards when district changes
  const loadWards = useCallback(async (districtId) => {
    if (!districtId || !isConfigValid) return;

    setLoadingWards(true);
    setError(null);
    setWards([]);
    setSelectedWard(null);
    setShippingFee(null);

    try {
      const wardsData = await getWards(districtId);
      setWards(wardsData);
    } catch (err) {
      setError(`Failed to load wards: ${err.message}`);
      console.error('Error loading wards:', err);
    } finally {
      setLoadingWards(false);
    }
  }, [isConfigValid]);

  // Handle province selection
  const handleProvinceChange = useCallback((province) => {
    setSelectedProvince(province);
    setSelectedDistrict(null);
    setSelectedWard(null);
    setShippingFee(null);

    if (province) {
      loadDistricts(province.id);
    } else {
      setDistricts([]);
      setWards([]);
    }
  }, [loadDistricts]);

  // Handle district selection
  const handleDistrictChange = useCallback((district) => {
    setSelectedDistrict(district);
    setSelectedWard(null);
    setShippingFee(null);

    if (district) {
      loadWards(district.id);
    } else {
      setWards([]);
    }
  }, [loadWards]);

  // Handle ward selection
  const handleWardChange = useCallback((ward) => {
    setSelectedWard(ward);
    setShippingFee(null);
  }, []);

  // Calculate shipping fee for cart
  const calculateShipping = useCallback(async (cartItems) => {
    if (!selectedDistrict || !selectedWard || !cartItems || cartItems.length === 0) {
      setShippingFee(null);
      return null;
    }

    setCalculatingShipping(true);
    setError(null);

    try {
      const destination = {
        districtId: selectedDistrict.id,
        wardCode: selectedWard.code
      };

      const feeData = await calculateCartShippingFee(cartItems, destination);
      setShippingFee(feeData);
      return feeData;
    } catch (err) {
      setError(`Failed to calculate shipping fee: ${err.message}`);
      console.error('Error calculating shipping fee:', err);
      return null;
    } finally {
      setCalculatingShipping(false);
    }
  }, [selectedDistrict, selectedWard]);

  // Reset all selections
  const resetSelections = useCallback(() => {
    setSelectedProvince(null);
    setSelectedDistrict(null);
    setSelectedWard(null);
    setDistricts([]);
    setWards([]);
    setShippingFee(null);
    setError(null);
  }, []);

  // Get complete address string
  const getCompleteAddress = useCallback(() => {
    if (!selectedProvince || !selectedDistrict || !selectedWard) {
      return '';
    }

    return `${selectedWard.name}, ${selectedDistrict.name}, ${selectedProvince.name}`;
  }, [selectedProvince, selectedDistrict, selectedWard]);

  // Check if location selection is complete
  const isLocationComplete = useCallback(() => {
    return !!(selectedProvince && selectedDistrict && selectedWard);
  }, [selectedProvince, selectedDistrict, selectedWard]);

  // Get location data for form submission
  const getLocationData = useCallback(() => {
    if (!isLocationComplete()) {
      return null;
    }

    return {
      province: selectedProvince,
      district: selectedDistrict,
      ward: selectedWard,
      completeAddress: getCompleteAddress(),
      shippingFee: shippingFee
    };
  }, [selectedProvince, selectedDistrict, selectedWard, shippingFee, isLocationComplete, getCompleteAddress]);

  return {
    // Data
    provinces,
    districts,
    wards,
    selectedProvince,
    selectedDistrict,
    selectedWard,
    shippingFee,

    // Loading states
    loadingProvinces,
    loadingDistricts,
    loadingWards,
    calculatingShipping,

    // Error state
    error,

    // Configuration
    isConfigValid,

    // Actions
    handleProvinceChange,
    handleDistrictChange,
    handleWardChange,
    calculateShipping,
    resetSelections,

    // Utilities
    getCompleteAddress,
    isLocationComplete,
    getLocationData,

    // Manual loaders (for retry functionality)
    loadProvinces,
    loadDistricts: (provinceId) => loadDistricts(provinceId),
    loadWards: (districtId) => loadWards(districtId)
  };
};