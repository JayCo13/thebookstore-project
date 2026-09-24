/**
 * GoShip API Service
 * Location lookups and shipping quotes for the checkout form.
 *
 * Everything here goes through an edge function, and that is a deliberate change
 * from the carriers this replaced:
 *
 *   - Viettel Post served its address book unauthenticated, so the SPA fetched
 *     provinces and wards straight from the carrier. GoShip requires a Bearer
 *     token on EVERY endpoint, including /cities. Putting that token in the
 *     bundle would ship a credential that can also book shipments — the exact
 *     mistake the GHN integration made with its API token. So the lookups are
 *     proxied by `goship-locations`.
 *
 *   - Quotes go through `goship-shipping-fee`, which also keeps the shop's
 *     pickup origin server-side.
 *
 * The upshot: the browser bundle holds no shipping credential of any kind.
 */
import { formatPrice, parsePrice } from '../utils/currency';
import { getBook, getShippingLocations, getShippingQuote, getStationeryItem } from './api';

/**
 * Province / city list.
 * @returns {Promise<Array>} [{ id, name, code }]
 */
export const getProvinces = async () => {
  const { places } = await getShippingLocations({ type: 'cities' });
  return (places || []).map((p) => ({ id: p.id, name: p.name, code: p.id }));
};

/**
 * Districts of a city.
 * @param {string} cityId - GoShip city code, e.g. "700000"
 */
export const getDistricts = async (cityId) => {
  const { places } = await getShippingLocations({ type: 'districts', parent: String(cityId) });
  return (places || []).map((p) => ({ id: p.id, name: p.name, code: p.id, provinceId: String(cityId) }));
};

/**
 * Wards of a district.
 * @param {string} districtId - GoShip district code, e.g. "701200"
 */
export const getWards = async (districtId) => {
  const { places } = await getShippingLocations({ type: 'wards', parent: String(districtId) });
  return (places || []).map((p) => ({
    id: p.id,
    name: p.name,
    // `code` is what the order row stores. GoShip ward ids are numeric while
    // city and district codes are strings, so everything is kept as text.
    code: String(p.id),
    districtId: String(districtId),
  }));
};

/**
 * Quote a destination + parcel.
 * @returns {Promise<Object>} { total, rateId, carrier, carrierCode, service, eta, services }
 */
export const calculateShippingFee = async (params) => {
  const {
    cityId,
    districtId,
    weight = 500,
    length = 20,
    width = 15,
    height = 10,
    amount = 0,
    cod = 0,
  } = params;

  const result = await getShippingQuote({
    city: String(cityId),
    district: String(districtId),
    weight: Math.round(weight),
    length: Math.round(length),
    width: Math.round(width),
    height: Math.round(height),
    amount: Math.round(amount),
    cod: Math.round(cod),
  });

  const cheapest = result?.cheapest;
  if (!cheapest) {
    throw new Error(result?.detail || 'Không tính được phí vận chuyển');
  }

  return {
    total: cheapest.fee,
    // Carried into the order so fulfilment books THIS quote rather than
    // re-pricing, which is what guarantees the customer pays what they saw.
    rateId: cheapest.rate,
    carrier: cheapest.carrier,
    carrierCode: cheapest.carrier_code,
    service: cheapest.service,
    eta: cheapest.expected,
    services: result.services || [],
  };
};

/**
 * Aggregate a cart into one parcel and quote it.
 * @param {Array} cartItems
 * @param {Object} destination - { cityId, districtId }
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
        return { weight: weight != null ? weight * qty : null, length, width, height, qty };
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
      return {
        weight: normalize(details?.weight ?? details?.weight_grams) != null
          ? normalize(details?.weight ?? details?.weight_grams) * qty
          : null,
        length: normalize(details?.length ?? details?.length_cm),
        width: normalize(details?.width ?? details?.width_cm),
        height: normalize(details?.height ?? details?.height_cm),
        qty,
      };
    };

    let totalWeight = 0;
    let maxLength = 0;
    let maxWidth = 0;
    let maxHeight = 0;
    for (const it of cartItems) {
      const d = await getDimsForItem(it);
      if (d.weight != null) totalWeight += d.weight;
      if (d.length != null) maxLength = Math.max(maxLength, d.length);
      if (d.width != null) maxWidth = Math.max(maxWidth, d.width);
      if (d.height != null) maxHeight = Math.max(maxHeight, d.height);
    }

    if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
      totalWeight = cartItems.reduce((sum, item) => sum + (300 * (item.quantity || 1)), 0);
    }
    if (maxLength <= 0) maxLength = 20;
    if (maxWidth <= 0) maxWidth = 15;
    if (maxHeight <= 0) maxHeight = 10;

    const totalValue = cartItems.reduce(
      (sum, item) => sum + (parsePrice(item.price) * (item.quantity || 1)),
      0,
    );

    return await calculateShippingFee({
      cityId: destination.cityId,
      districtId: destination.districtId,
      weight: Math.round(totalWeight),
      length: Math.round(maxLength),
      width: Math.round(maxWidth),
      height: Math.round(maxHeight),
      amount: Math.min(totalValue, 5000000), // declared value, capped
    });
  } catch (error) {
    console.error('Error calculating cart shipping fee:', error);
    throw error;
  }
};

/** Format shipping fee for display */
export const formatShippingFee = (fee) => formatPrice(fee);

/**
 * Nothing to validate on the client any more: the browser holds no shipping
 * credential. Kept so callers that gate on configuration keep working.
 */
export const validateShippingConfig = () => true;
