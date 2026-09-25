import { useState, useEffect, useCallback } from 'react';
import {
  getProvinces,
  getDistricts,
  getWards,
  calculateCartShippingFee,
  validateShippingConfig
} from '../service/goshipService';

/**
 * Location data and shipping quotes for the checkout form, via GoShip.
 *
 * Same three-tier shape every carrier this shop has used takes (province →
 * district → ward), so the form itself never had to change. What did change is
 * that GoShip codes places with STRINGS ("700000"), not integers.
 */
export const useGoshipLocation = () => {
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

  // The browser holds no shipping credential at all now, so this is always
  // true. Kept because the checkout form still gates the submit on it.
  const [isConfigValid, setIsConfigValid] = useState(false);

  useEffect(() => {
    setIsConfigValid(validateShippingConfig());
  }, []);

  // Load provinces
  const loadProvinces = useCallback(async () => {
    setLoadingProvinces(true);
    setError(null);

    try {
      const provincesData = await getProvinces();
      setProvinces(provincesData);
    } catch (err) {
      setError(`Không tải được danh sách Tỉnh/Thành phố: ${err.message}`);
      console.error('Error loading provinces:', err);
    } finally {
      setLoadingProvinces(false);
    }
  }, []);

  // Load provinces on mount
  useEffect(() => {
    loadProvinces();
  }, [loadProvinces]);

  // Load districts when province changes
  const loadDistricts = useCallback(async (provinceId) => {
    if (!provinceId) return;

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
      setError(`Không tải được danh sách Quận/Huyện: ${err.message}`);
      console.error('Error loading districts:', err);
    } finally {
      setLoadingDistricts(false);
    }
  }, []);

  // Load wards when district changes
  const loadWards = useCallback(async (districtId) => {
    if (!districtId) return;

    setLoadingWards(true);
    setError(null);
    setWards([]);
    setSelectedWard(null);
    setShippingFee(null);

    try {
      const wardsData = await getWards(districtId);
      setWards(wardsData);
    } catch (err) {
      setError(`Không tải được danh sách Phường/Xã: ${err.message}`);
      console.error('Error loading wards:', err);
    } finally {
      setLoadingWards(false);
    }
  }, []);

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
  // The quote depends on city + district only, so picking a ward must not throw
  // away a price the customer can already see.
  const handleWardChange = useCallback((ward) => {
    setSelectedWard(ward);
  }, []);

  // Calculate shipping fee for cart.
  //
  // Deliberately does NOT wait for the ward: GoShip prices on city + district,
  // and the ward is only needed to book the shipment. Quoting a step earlier
  // means the price is already on screen by the time the customer finishes
  // picking an address, instead of them watching a spinner afterwards.
  const calculateShipping = useCallback(async (cartItems) => {
    if (!selectedProvince || !selectedDistrict || !cartItems || cartItems.length === 0) {
      setShippingFee(null);
      return null;
    }

    setCalculatingShipping(true);
    setError(null);

    try {
      // GoShip prices on city + district; the ward only matters when the
      // shipment is actually booked.
      const destination = {
        cityId: selectedProvince.id,
        districtId: selectedDistrict.id,
      };

      const feeData = await calculateCartShippingFee(cartItems, destination);
      setShippingFee(feeData);
      return feeData;
    } catch (err) {
      setError(`Không tính được phí vận chuyển: ${err.message}`);
      console.error('Error calculating shipping fee:', err);
      return null;
    } finally {
      setCalculatingShipping(false);
    }
  }, [selectedProvince, selectedDistrict]);

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
