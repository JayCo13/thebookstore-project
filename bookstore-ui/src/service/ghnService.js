/**
 * GHN (Giao Hang Nhanh) API Service
 * Handles location fetching and shipping fee calculation for Vietnam
 */
import { formatPrice, parsePrice } from '../utils/currency';
import { getBook, getStationeryItem } from './api';
// GHN API Configuration
const GHN_API_TOKEN = process.env.REACT_APP_GHN_API_TOKEN;
const GHN_SHOP_ID = process.env.REACT_APP_GHN_SHOP_ID;
const GHN_API_BASE_URL = process.env.REACT_APP_GHN_API_BASE_URL;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Sleep function for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Enhanced fetch with retry logic
 */
const fetchWithRetry = async (url, options, retries = MAX_RETRIES) => {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      if (i === retries) {
        throw new Error(`Failed after ${retries + 1} attempts: ${error.message}`);
      }

      console.warn(`Attempt ${i + 1} failed, retrying in ${RETRY_DELAY}ms...`, error.message);
      await sleep(RETRY_DELAY * (i + 1)); // Exponential backoff
    }
  }
};

// Default headers for GHN API requests
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Token': GHN_API_TOKEN,
});

const getHeadersWithShopId = () => ({
  'Content-Type': 'application/json',
  'Token': GHN_API_TOKEN,
  'ShopId': GHN_SHOP_ID,
});

/**
 * Fetch all provinces in Vietnam
 * @returns {Promise<Array>} Array of provinces with ProvinceID and ProvinceName
 */
export const getProvinces = async () => {
  try {
    const response = await fetchWithRetry(`${GHN_API_BASE_URL}/master-data/province`, {
      method: 'GET',
      headers: getHeaders(),
    });

    const data = await response.json();

    if (data.code === 200) {
      return data.data.map(province => ({
        id: province.ProvinceID,
        name: province.ProvinceName,
        code: province.Code,
        nameExtension: province.NameExtension || []
      }));
    } else {
      throw new Error(data.message || 'Failed to fetch provinces');
    }
  } catch (error) {
    console.error('Error fetching provinces:', error);
    throw error;
  }
};

/**
 * Fetch districts by province ID
 * @param {number} provinceId - The province ID
 * @returns {Promise<Array>} Array of districts with DistrictID and DistrictName
 */
export const getDistricts = async (provinceId) => {
  try {
    const response = await fetchWithRetry(`${GHN_API_BASE_URL}/master-data/district`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        province_id: parseInt(provinceId)
      }),
    });

    const data = await response.json();

    if (data.code === 200) {
      return data.data.map(district => ({
        id: district.DistrictID,
        name: district.DistrictName,
        code: district.Code,
        provinceId: district.ProvinceID,
        type: district.Type,
        supportType: district.SupportType,
        nameExtension: district.NameExtension || []
      }));
    } else {
      throw new Error(data.message || 'Failed to fetch districts');
    }
  } catch (error) {
    console.error('Error fetching districts:', error);
    throw error;
  }
};

/**
 * Fetch wards by district ID
 * @param {number} districtId - The district ID
 * @returns {Promise<Array>} Array of wards with WardCode and WardName
 */
export const getWards = async (districtId) => {
  try {
    const response = await fetchWithRetry(`${GHN_API_BASE_URL}/master-data/ward`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        district_id: parseInt(districtId)
      }),
    });

    const data = await response.json();

    if (data.code === 200) {
      return data.data.map(ward => ({
        code: ward.WardCode,
        name: ward.WardName,
        districtId: ward.DistrictID,
        canUpdateCOD: ward.CanUpdateCOD,
        supportType: ward.SupportType,
        nameExtension: ward.NameExtension || []
      }));
    } else {
      throw new Error(data.message || 'Failed to fetch wards');
    }
  } catch (error) {
    console.error('Error fetching wards:', error);
    throw error;
  }
};

/**
 * Get available shipping services between two locations
 * @param {number} fromDistrictId - Origin district ID
 * @param {number} toDistrictId - Destination district ID
 * @returns {Promise<Array>} Array of available services
 */
export const getAvailableServices = async (fromDistrictId, toDistrictId) => {
  try {
    const response = await fetchWithRetry(`${GHN_API_BASE_URL}/v2/shipping-order/available-services`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        shop_id: parseInt(GHN_SHOP_ID),
        from_district: parseInt(fromDistrictId),
        to_district: parseInt(toDistrictId)
      }),
    });

    const data = await response.json();

    if (data.code === 200) {
      return data.data.map(service => ({
        serviceId: service.service_id,
        shortName: service.short_name,
        serviceName: service.service_name,
        serviceTypeId: service.service_type_id
      }));
    } else {
      throw new Error(data.message || 'Failed to fetch available services');
    }
  } catch (error) {
    console.error('Error fetching available services:', error);
    throw error;
  }
};

/**
 * Calculate shipping fee
 * @param {Object} params - Shipping calculation parameters
 * @param {number} params.toDistrictId - Destination district ID
 * @param {string} params.toWardCode - Destination ward code
 * @param {number} params.fromDistrictId - Origin district ID (optional, will use shop default)
 * @param {string} params.fromWardCode - Origin ward code (optional, will use shop default)
 * @param {number} params.serviceTypeId - Service type (2: Standard, 5: Heavy)
 * @param {number} params.weight - Weight in grams
 * @param {number} params.length - Length in cm
 * @param {number} params.width - Width in cm
 * @param {number} params.height - Height in cm
 * @param {number} params.insuranceValue - Insurance value (optional)
 * @param {Array} params.items - Array of items for heavy service
 * @returns {Promise<Object>} Shipping fee details
 */
export const calculateShippingFee = async (params) => {
  try {
    const {
      toDistrictId,
      toWardCode,
      fromDistrictId,
      fromWardCode,
      serviceTypeId = 2, // Default to standard service
      weight = 500, // Default 500g
      length = 20,   // Default 20cm
      width = 15,    // Default 15cm
      height = 10,   // Default 10cm
      insuranceValue = 0,
      items = []
    } = params;

    const requestBody = {
      service_type_id: serviceTypeId,
      to_district_id: parseInt(toDistrictId),
      to_ward_code: toWardCode.toString(),
      weight: parseInt(weight),
      length: parseInt(length),
      width: parseInt(width),
      height: parseInt(height),
      insurance_value: parseInt(insuranceValue),
      coupon: null
    };

    // Add origin location if provided
    if (fromDistrictId) {
      requestBody.from_district_id = parseInt(fromDistrictId);
    }
    if (fromWardCode) {
      requestBody.from_ward_code = fromWardCode.toString();
    }

    // Add items for heavy service
    if (serviceTypeId === 5 && items.length > 0) {
      requestBody.items = items.map(item => ({
        name: item.name || 'Book',
        quantity: parseInt(item.quantity || 1),
        length: parseInt(item.length || length),
        width: parseInt(item.width || width),
        height: parseInt(item.height || height),
        weight: parseInt(item.weight || weight)
      }));
    }

    console.log('=== GHN FEE REQUEST ===');
    console.log('Request Body:', requestBody);

    const response = await fetchWithRetry(`${GHN_API_BASE_URL}/v2/shipping-order/fee`, {
      method: 'POST',
      headers: getHeadersWithShopId(),
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log('=== GHN FEE RESPONSE ===');
    console.log('Response:', data);

    if (data.code === 200) {
      return {
        total: data.data.total,
        serviceFee: data.data.service_fee,
        insuranceFee: data.data.insurance_fee || 0,
        pickStationFee: data.data.pick_station_fee || 0,
        couponValue: data.data.coupon_value || 0,
        codFee: data.data.cod_fee || 0,
        pickRemoteAreasFee: data.data.pick_remote_areas_fee || 0,
        deliverRemoteAreasFee: data.data.deliver_remote_areas_fee || 0,
        codFailedFee: data.data.cod_failed_fee || 0
      };
    } else {
      throw new Error(data.message || 'Failed to calculate shipping fee');
    }
  } catch (error) {
    console.error('Error calculating shipping fee:', error);
    throw error;
  }
};

/**
 * Calculate shipping fee for cart items
 * @param {Array} cartItems - Array of cart items
 * @param {Object} destination - Destination address
 * @returns {Promise<Object>} Shipping fee calculation result
 */
export const calculateCartShippingFee = async (cartItems, destination) => {
  try {
    const normalize = (v) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : null;
    };

    const getDimsForItem = async (item) => {
      const qty = parseInt(item.quantity || 1);
      const weight = normalize(item.weight ?? item.weight_grams);
      const length = normalize(item.length ?? item.length_cm);
      const width = normalize(item.width ?? item.width_cm);
      const height = normalize(item.height ?? item.height_cm);
      if (weight != null || length != null || width != null || height != null) {
        return {
          weight: weight != null ? weight * qty : null,
          length,
          width,
          height,
          qty,
        };
      }
      let details = null;
      try {
        details = await getBook(item.id);
      } catch { }
      if (!details) {
        try {
          details = await getStationeryItem(item.id);
        } catch { }
      }
      const w = normalize(details?.weight ?? details?.weight_grams);
      const l = normalize(details?.length ?? details?.length_cm);
      const wi = normalize(details?.width ?? details?.width_cm);
      const h = normalize(details?.height ?? details?.height_cm);
      return {
        weight: w != null ? w * qty : null,
        length: l,
        width: wi,
        height: h,
        qty,
      };
    };

    let totalWeight = 0;
    let maxLength = 0;
    let maxWidth = 0;
    let maxHeight = 0;
    const itemDetails = [];
    for (const it of cartItems) {
      const d = await getDimsForItem(it);
      if (d.weight != null) totalWeight += d.weight;
      if (d.length != null) maxLength = Math.max(maxLength, d.length);
      if (d.width != null) maxWidth = Math.max(maxWidth, d.width);
      if (d.height != null) maxHeight = Math.max(maxHeight, d.height);
      itemDetails.push(d);
    }

    if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
      totalWeight = cartItems.reduce((sum, item) => sum + (300 * (item.quantity || 1)), 0);
    }
    if (maxLength <= 0) maxLength = 20;
    if (maxWidth <= 0) maxWidth = 15;
    if (maxHeight <= 0) maxHeight = 10;

    const totalValue = cartItems.reduce((sum, item) => sum + (parsePrice(item.price) * (item.quantity || 1)), 0);

    const serviceTypeId = totalWeight > 20000 ? 5 : 2;

    const shippingParams = {
      toDistrictId: destination.districtId,
      toWardCode: destination.wardCode,
      serviceTypeId,
      weight: Math.round(totalWeight),
      length: Math.round(maxLength),
      width: Math.round(maxWidth),
      height: Math.round(maxHeight),
      insuranceValue: Math.min(totalValue, 5000000), // Max 5M VND insurance
    };

    if (serviceTypeId === 5) {
      shippingParams.items = itemDetails.map((d, idx) => ({
        name: cartItems[idx]?.title || 'Item',
        quantity: d.qty || 1,
        weight: Math.round((d.weight != null ? d.weight : 300 * (d.qty || 1))),
        length: Math.round(d.length != null ? d.length : 20),
        width: Math.round(d.width != null ? d.width : 15),
        height: Math.round(d.height != null ? d.height : 3 * (d.qty || 1)),
      }));
    }

    console.log('=== GHN CART AGGREGATION ===');
    console.log('Aggregated Params:', {
      destination,
      serviceTypeId,
      weight: shippingParams.weight,
      length: shippingParams.length,
      width: shippingParams.width,
      height: shippingParams.height,
      insuranceValue: shippingParams.insuranceValue,
      itemsCount: Array.isArray(shippingParams.items) ? shippingParams.items.length : 0,
    });
    if (Array.isArray(shippingParams.items) && shippingParams.items.length > 0) {
      console.log('Heavy Service Items:', shippingParams.items);
    }

    return await calculateShippingFee(shippingParams);
  } catch (error) {
    console.error('Error calculating cart shipping fee:', error);
    throw error;
  }
};

/**
 * Format shipping fee for display
 * @param {number} fee - Fee in VND
 * @returns {string} Formatted fee string
 */
export const formatShippingFee = (fee) => {
  return formatPrice(fee);
};

/**
 * Validate GHN API configuration
 * @returns {boolean} True if configuration is valid
 */
export const validateGHNConfig = () => {
  if (!GHN_API_TOKEN || !GHN_SHOP_ID || !GHN_API_BASE_URL) {
    console.error('GHN API configuration is incomplete. Please check your environment variables.');
    return false;
  }
  return true;
};
