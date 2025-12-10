# GHN API Integration Test Guide

## Overview
The GHN (Giao Hang Nhanh) API has been successfully integrated into the checkout page for real-time shipping fee calculation and location selection.

## Features Implemented

### 1. Location Services
- **Province Selection**: Dropdown with all Vietnamese provinces
- **District Selection**: Cascading dropdown based on selected province
- **Ward Selection**: Cascading dropdown based on selected district

### 2. Shipping Fee Calculation
- **Real-time Calculation**: Automatically calculates shipping fees when location is complete
- **Cart Integration**: Considers total weight and dimensions of cart items
- **Fee Breakdown**: Shows service fee, insurance fee, and total shipping cost
- **Currency Display**: Shows fees in Vietnamese Dong (VND) with USD conversion

### 3. Error Handling & Reliability
- **Retry Logic**: Automatic retry with exponential backoff for API failures
- **Loading States**: Visual indicators during data fetching
- **Error Messages**: User-friendly error messages for API issues
- **Configuration Validation**: Checks for required environment variables

## Environment Setup Required

Before testing, ensure these environment variables are set in `.env`:

```env
# GHN API Configuration
REACT_APP_GHN_API_TOKEN=your_ghn_api_token_here
REACT_APP_GHN_SHOP_ID=your_shop_id_here
REACT_APP_GHN_API_BASE_URL=https://dev-online-gateway.ghn.vn
```

## Testing Scenarios

### 1. Basic Location Selection
1. Navigate to `/checkout` page
2. Add items to cart first (required for shipping calculation)
3. Select "Use a new address" option
4. Test the cascading dropdowns:
   - Select a Province → Districts should load
   - Select a District → Wards should load
   - Select a Ward → Shipping fee should calculate

### 2. Shipping Fee Calculation
1. Complete location selection
2. Verify shipping fee appears in order summary
3. Check that total includes shipping cost
4. Verify fee breakdown shows service and insurance fees

### 3. Error Handling
1. Test with invalid API credentials (should show configuration error)
2. Test with network issues (should show retry attempts)
3. Test incomplete location selection (should show validation errors)

### 4. Order Submission
1. Complete all required fields including GHN location
2. Submit order
3. Verify order data includes:
   - `ghn_province_id`, `ghn_district_id`, `ghn_ward_code`
   - `province_name`, `district_name`, `ward_name`
   - `shipping_fee` and `shipping_method`

## Files Modified/Created

### New Files
- `src/service/ghnService.js` - GHN API service functions
- `src/hooks/useGHNLocation.js` - Custom React hook for location management
- `.env` - Environment configuration (needs actual API credentials)

### Modified Files
- `src/pages/user/checkout/page.jsx` - Updated UI and integration
- Order submission logic updated to include GHN data

## API Endpoints Used

1. **GET** `/master-data/province` - Fetch provinces
2. **POST** `/master-data/district` - Fetch districts by province
3. **POST** `/master-data/ward` - Fetch wards by district
4. **POST** `/v2/shipping-order/fee` - Calculate shipping fees
5. **POST** `/v2/shipping-order/available-services` - Get available services

## Known Limitations

1. **API Credentials**: Requires valid GHN API token and shop ID
2. **Vietnam Only**: Currently configured for Vietnam locations only
3. **Weight Estimation**: Uses estimated weights for books (500g default)
4. **Currency**: Shipping fees in VND, converted to USD for display

## Next Steps

1. Obtain valid GHN API credentials from GHN developer portal
2. Update `.env` file with actual credentials
3. Test with real API responses
4. Consider adding more shipping services (currently uses Standard service)
5. Add support for different product types with accurate weights

## Troubleshooting

### Common Issues
1. **"GHN API configuration is incomplete"**: Check environment variables
2. **"Failed to load provinces"**: Verify API token and base URL
3. **Shipping fee not calculating**: Ensure cart has items and location is complete
4. **Network errors**: Check internet connection and API endpoint availability

### Debug Information
- Check browser console for detailed error messages
- Network tab shows API request/response details
- Loading states indicate which step is currently processing