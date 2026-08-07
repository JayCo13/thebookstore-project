/**
 * Vietnamese phone helpers, aligned with what GHN's create-order API accepts.
 *
 * GHN validates the recipient phone server-side (`master_data_validate_phone`)
 * and rejects the whole shipping order with a 400 when it doesn't like the
 * number — which used to leave the order sitting in our DB with no waybill and
 * no visible error. Verified against GHN's preview endpoint:
 *
 *   0912345678   (mobile, 10 digits)      -> accepted
 *   0356789012 / 0812345678               -> accepted
 *   02839123456 (landline, 11 digits)     -> accepted
 *   84912345678 (no leading 0)            -> accepted
 *   091234567   (9 digits)                -> REJECTED
 *   0123456789  (invalid 012 prefix)      -> REJECTED
 *   0283912345  (landline, only 10)       -> REJECTED
 *
 * So: mobile is 10 digits with a 03/05/07/08/09 prefix; landline is 11 digits
 * starting 02. Everything else must be blocked at the form, before we accept
 * money for an order we can't actually ship.
 */

/**
 * Strip formatting and coerce to the local `0…` form GHN expects.
 * Handles "0912 345 678", "+84 912 345 678", "84912345678", "0912.345.678".
 * Returns '' when there's nothing usable.
 */
export function normalizeVnPhone(raw) {
  if (!raw) return '';
  let digits = String(raw).replace(/\D+/g, '');
  if (!digits) return '';
  // +84 / 84 prefix -> local 0 form (but leave a genuine "0…" number alone).
  if (digits.startsWith('84') && !digits.startsWith('840')) {
    digits = '0' + digits.slice(2);
  } else if (digits.startsWith('840')) {
    digits = digits.slice(2);
  }
  return digits;
}

const MOBILE_RE = /^0[35789]\d{8}$/;   // 10 digits
const LANDLINE_RE = /^02\d{9}$/;       // 11 digits

/** True when GHN will accept the number as a recipient phone. */
export function isValidVnPhone(raw) {
  const p = normalizeVnPhone(raw);
  return MOBILE_RE.test(p) || LANDLINE_RE.test(p);
}

/** Message shown when validation fails. */
export const PHONE_ERROR_MESSAGE =
  'Số điện thoại không hợp lệ. Vui lòng nhập số di động 10 chữ số (VD: 0987654321) ' +
  'hoặc số máy bàn 11 chữ số (VD: 02839123456).';
