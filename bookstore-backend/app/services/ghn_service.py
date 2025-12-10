import os
import httpx
from typing import Dict, List, Any, Optional, Tuple
import unicodedata
from decimal import Decimal
import logging
from app.config import settings

logger = logging.getLogger(__name__)

class GHNService:
    def __init__(self):
        self.api_token = settings.ghn_api_token
        self.shop_id = settings.ghn_shop_id
        self.base_url = settings.ghn_base_url
        
        if not self.api_token or not self.shop_id:
            logger.warning("GHN credentials not configured. GHN integration will be disabled.")
    
    def is_configured(self) -> bool:
        """Check if GHN service is properly configured."""
        return bool(self.api_token and self.shop_id)

    @staticmethod
    def _strip_accents(text: str) -> str:
        try:
            return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")
        except Exception:
            return text

    @staticmethod
    def _normalize(text: str) -> str:
        if text is None:
            return ""
        text = str(text).lower().strip()
        text = GHNService._strip_accents(text)
        return " ".join(text.split())

    async def get_provinces(self) -> Optional[List[Dict[str, Any]]]:
        """Fetch GHN provinces master data."""
        if not self.is_configured():
            return None
        headers = {
            "Content-Type": "application/json",
            "Token": self.api_token,
        }
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"{self.base_url}/master-data/province", headers=headers, timeout=20.0)
            if resp.status_code != 200:
                logger.error(f"GHN provinces API failed {resp.status_code}: {resp.text}")
                return None
            data = resp.json()
            return data.get("data") or []
        except Exception as e:
            logger.error(f"Error fetching GHN provinces: {e}")
            return None

    async def get_districts(self, province_id: int) -> Optional[List[Dict[str, Any]]]:
        """Fetch GHN districts for a province."""
        if not self.is_configured():
            return None
        headers = {
            "Content-Type": "application/json",
            "Token": self.api_token,
        }
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{self.base_url}/master-data/district",
                    json={"province_id": int(province_id)},
                    headers=headers,
                    timeout=20.0,
                )
            if resp.status_code != 200:
                logger.error(f"GHN districts API failed {resp.status_code}: {resp.text}")
                return None
            data = resp.json()
            return data.get("data") or []
        except Exception as e:
            logger.error(f"Error fetching GHN districts: {e}")
            return None

    async def get_wards(self, district_id: int) -> Optional[List[Dict[str, Any]]]:
        """Fetch GHN wards for a district."""
        if not self.is_configured():
            return None
        headers = {
            "Content-Type": "application/json",
            "Token": self.api_token,
        }
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{self.base_url}/master-data/ward",
                    json={"district_id": int(district_id)},
                    headers=headers,
                    timeout=20.0,
                )
            if resp.status_code != 200:
                logger.error(f"GHN wards API failed {resp.status_code}: {resp.text}")
                return None
            data = resp.json()
            return data.get("data") or []
        except Exception as e:
            logger.error(f"Error fetching GHN wards: {e}")
            return None

    @staticmethod
    def _name_matches(candidate: Dict[str, Any], query_norm: str, name_key: str) -> bool:
        """Accent-insensitive contains match against name and NameExtension list."""
        try:
            name = GHNService._normalize(candidate.get(name_key) or "")
            if query_norm in name or name in query_norm:
                return True
            exts = candidate.get("NameExtension") or candidate.get("name_extension") or []
            for ext in exts:
                ext_norm = GHNService._normalize(ext)
                if query_norm in ext_norm or ext_norm in query_norm:
                    return True
        except Exception:
            pass
        return False

    async def find_province(self, name_query: str) -> Optional[Dict[str, Any]]:
        provinces = await self.get_provinces()
        if not provinces:
            return None
        qn = self._normalize(name_query)
        # Prefer exact contains, then best token overlap
        for p in provinces:
            if self._name_matches(p, qn, "ProvinceName"):
                return p
        # Fallback: token overlap scoring
        tokens = set(qn.split())
        best, best_score = None, 0
        for p in provinces:
            name_tokens = set(self._normalize(p.get("ProvinceName", "")).split())
            score = len(tokens & name_tokens)
            if score > best_score:
                best, best_score = p, score
        return best

    async def find_district(self, province_id: int, name_query: str) -> Optional[Dict[str, Any]]:
        districts = await self.get_districts(province_id)
        if not districts:
            return None
        qn = self._normalize(name_query)
        for d in districts:
            if self._name_matches(d, qn, "DistrictName"):
                return d
        tokens = set(qn.split())
        best, best_score = None, 0
        for d in districts:
            name_tokens = set(self._normalize(d.get("DistrictName", "")).split())
            score = len(tokens & name_tokens)
            if score > best_score:
                best, best_score = d, score
        return best

    async def find_ward(self, district_id: int, name_query: str) -> Optional[Dict[str, Any]]:
        wards = await self.get_wards(district_id)
        if not wards:
            return None
        qn = self._normalize(name_query)
        for w in wards:
            if self._name_matches(w, qn, "WardName"):
                return w
        tokens = set(qn.split())
        best, best_score = None, 0
        for w in wards:
            name_tokens = set(self._normalize(w.get("WardName", "")).split())
            score = len(tokens & name_tokens)
            if score > best_score:
                best, best_score = w, score
        return best

    async def calculate_shipping_fee(self, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Calculate shipping fee using GHN API.

        Expected params keys (strings or ints are accepted, will be coerced):
        - to_district_id (required)
        - to_ward_code (required)
        - from_district_id (optional)
        - from_ward_code (optional)
        - service_type_id (optional, default 2)
        - weight (optional, default 500)
        - length (optional, default 20)
        - width (optional, default 15)
        - height (optional, default 10)
        - insurance_value (optional, default 0)
        - items (optional, for heavy service type 5)

        Returns fee breakdown dictionary or None on failure.
        """
        if not self.is_configured():
            logger.error("GHN service is not configured")
            return None

        try:
            # Coerce and build payload
            to_district_id = int(params.get("to_district_id")) if params.get("to_district_id") is not None else None
            to_ward_code = str(params.get("to_ward_code")) if params.get("to_ward_code") is not None else None
            if not to_district_id or not to_ward_code:
                logger.error("Missing required params to_district_id or to_ward_code for fee calculation")
                return None

            payload: Dict[str, Any] = {
                "service_type_id": int(params.get("service_type_id", 2)),
                "to_district_id": to_district_id,
                "to_ward_code": to_ward_code,
                "weight": int(params.get("weight", 500)),
                "length": int(params.get("length", 20)),
                "width": int(params.get("width", 15)),
                "height": int(params.get("height", 10)),
                "insurance_value": int(params.get("insurance_value", 0)),
                "coupon": None,
            }

            # Optional origin params
            if params.get("from_district_id") is not None:
                payload["from_district_id"] = int(params.get("from_district_id"))
            if params.get("from_ward_code") is not None:
                payload["from_ward_code"] = str(params.get("from_ward_code"))

            # Items for heavy service
            if payload["service_type_id"] == 5 and params.get("items"):
                items = []
                for item in params.get("items", []):
                    try:
                        items.append({
                            "name": str(item.get("name", "Book")),
                            "quantity": int(item.get("quantity", 1)),
                            "length": int(item.get("length", payload["length"])),
                            "width": int(item.get("width", payload["width"])),
                            "height": int(item.get("height", payload["height"])),
                            "weight": int(item.get("weight", payload["weight"]))
                        })
                    except Exception:
                        continue
                if items:
                    payload["items"] = items

            headers = {
                "Content-Type": "application/json",
                "ShopId": self.shop_id,
                "Token": self.api_token,
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/v2/shipping-order/fee",
                    json=payload,
                    headers=headers,
                    timeout=20.0,
                )

            if response.status_code != 200:
                logger.error(f"GHN fee API failed {response.status_code}: {response.text}")
                return None

            data = response.json()
            if data.get("code") == 200 and data.get("data"):
                fee = data["data"]
                return {
                    "total": fee.get("total"),
                    "service_fee": fee.get("service_fee"),
                    "insurance_fee": fee.get("insurance_fee", 0),
                    "pick_station_fee": fee.get("pick_station_fee", 0),
                    "coupon_value": fee.get("coupon_value", 0),
                    "cod_fee": fee.get("cod_fee", 0),
                    "pick_remote_areas_fee": fee.get("pick_remote_areas_fee", 0),
                    "deliver_remote_areas_fee": fee.get("deliver_remote_areas_fee", 0),
                    "cod_failed_fee": fee.get("cod_failed_fee", 0),
                }
            else:
                logger.error(f"GHN fee API returned error: {data}")
                return None
        except Exception as e:
            logger.error(f"Error calculating GHN shipping fee: {e}")
            return None
    
    async def create_order(self, order_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Create an order in GHN system.
        
        Args:
            order_data: Dictionary containing order information with the following structure:
            {
                "to_name": str,
                "to_phone": str,
                "to_address": str,
                "to_ward_code": str,
                "to_district_id": int,
                "cod_amount": float,
                "items": [
                    {
                        "name": str,
                        "quantity": int,
                        "price": float,
                        "length": int,
                        "width": int,
                        "height": int,
                        "weight": int
                    }
                ]
            }
        
        Returns:
            Dictionary containing GHN response or None if failed
        """
        if not self.is_configured():
            logger.error("GHN service is not configured")
            return None
        
        try:
            logger.info(f"Creating GHN order with input data: {order_data}")
            
            # Check if any item has free shipping - if so, shop pays delivery fee
            has_free_ship = order_data.get("has_free_ship", False)
            
            # Transform data according to GHN API requirements
            payment_method = str(order_data.get("payment_method") or "").lower()
            
            # If any item has free shipping, shop pays delivery fee (payment_type_id = 1)
            if has_free_ship:
                computed_payment_type_id = 1  # Shop/Seller pays delivery fee
                logger.info("Free shipping detected - setting payment_type_id=1 (Shop pays delivery)")
            elif payment_method == "cod":
                computed_payment_type_id = 2
            elif payment_method == "momo":
                computed_payment_type_id = 1
            else:
                computed_payment_type_id = 2 if int(order_data.get("cod_amount", 0) or 0) > 0 else 1

            ghn_payload = {
                "payment_type_id": computed_payment_type_id,
                "note": "TheBookStore",
                "required_note": "CHOXEMHANGKHONGTHU",
                "from_name": "TheBookStore",
                "from_phone": "0987654321",
                "from_address": "35/6 đường TTH15 Tổ 30 KP3A, Quận 12, Thành phố Hồ Chí Minh, Việt Nam",
                "from_ward_name": "Tân Thới Hiệp",
                "from_district_name": "Quận 12",
                "from_province_name": "HCM",
                "to_name": order_data.get("to_name"),
                "to_phone": order_data.get("to_phone"),
                "to_address": order_data.get("to_address"),
                "to_ward_code": order_data.get("to_ward_code"),
                "to_district_id": order_data.get("to_district_id"),
                "cod_amount": int(order_data.get("cod_amount", 0) or 0),
                "weight": 300,
                "length": 20,
                "width": 15,
                "height": 10,
                "service_id": int(order_data.get("service_id", 0) or 0),
                "service_type_id": 2,
                "items": []
            }
            
            # Transform items
            for item in order_data.get("items", []):
                ghn_item = {
                    "name": item.get("name"),
                    "quantity": item.get("quantity"),
                    "price": int(item.get("price", 0)),
                    "length": item.get("length", 20),
                    "width": item.get("width", 15),
                    "height": item.get("height", 10),
                    "weight": item.get("weight", 300)
                }
                ghn_payload["items"].append(ghn_item)
            
            if ghn_payload["items"]:
                # Calculate total weight by summing (weight × quantity) for all items
                total_weight = sum(item["weight"] * item["quantity"] for item in ghn_payload["items"])
                
                # Calculate maximum dimensions from all items - always use these for accurate shipping
                max_length = max(int(item.get("length", 20)) for item in ghn_payload["items"]) if ghn_payload["items"] else 20
                max_width = max(int(item.get("width", 15)) for item in ghn_payload["items"]) if ghn_payload["items"] else 15
                max_height = max(int(item.get("height", 10)) for item in ghn_payload["items"]) if ghn_payload["items"] else 10

                # Weight: always use total combined weight from items (minimum 300g)
                ghn_payload["weight"] = max(total_weight, 300)

                # Dimensions: always use the largest dimensions from items
                ghn_payload["length"] = max_length
                ghn_payload["width"] = max_width
                ghn_payload["height"] = max_height
            
            logger.info(f"Final GHN payload: {ghn_payload}")
            
            headers = {
                "Content-Type": "application/json",
                "ShopId": self.shop_id,
                "Token": self.api_token
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/shiip/public-api/v2/shipping-order/create",
                    json=ghn_payload,
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get("code") == 200:
                        logger.info(f"GHN order created successfully: {result.get('data', {}).get('order_code')}")
                        return result.get("data")
                    else:
                        logger.error(f"GHN API error: {result.get('message')}")
                        return None
                else:
                    logger.error(f"GHN API request failed with status {response.status_code}: {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error creating GHN order: {str(e)}")
            return None

    async def get_order_detail(self, order_code: str) -> Optional[Dict[str, Any]]:
        """Fetch GHN shipping order detail by order code."""
        if not self.is_configured():
            logger.error("GHN service is not configured")
            return None
        if not order_code:
            return None
        headers = {
            "Content-Type": "application/json",
            "ShopId": self.shop_id,
            "Token": self.api_token,
        }
        payload = {"order_code": str(order_code)}
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{self.base_url}/shiip/public-api/v2/shipping-order/detail",
                    json=payload,
                    headers=headers,
                    timeout=20.0,
                )
            if resp.status_code != 200:
                logger.error(f"GHN detail API failed {resp.status_code}: {resp.text}")
                return None
            data = resp.json()
            # Expect shape { code: 200, data: { status: '...' } }
            if data.get("code") == 200:
                return data.get("data") or {}
            logger.error(f"GHN detail API returned error: {data}")
            return None
        except Exception as e:
            logger.error(f"Error fetching GHN order detail: {e}")
            return None
    
    def prepare_order_data_from_request(self, order_request, books_data: Dict[int, Any], stationery_data: Optional[Dict[int, Any]] = None) -> Dict[str, Any]:
        """
        Prepare order data for GHN API directly from request data.
        
        Args:
            order_request: OrderCreate request object
            books_data: Dictionary mapping book_id to book data
            
        Returns:
            Dictionary formatted for GHN API
        """
        # Build full address
        address_parts = [order_request.shipping_address_line1]
        if order_request.shipping_address_line2:
            address_parts.append(order_request.shipping_address_line2)
        
        full_address = ", ".join(address_parts)
        
        # Prepare items data
        items: List[Dict[str, Any]] = []
        total_amount = 0
        has_free_ship = False  # Track if any item has free shipping

        # Always include books from order.items using DB dimensions
        for item in getattr(order_request, 'items', []) or []:
            book = books_data.get(item.book_id)
            if book:
                # Check if book has free shipping
                if getattr(book, 'is_free_ship', False):
                    has_free_ship = True
                item_price = float(book.discounted_price or book.price)
                total_amount += item_price * item.quantity
                items.append({
                    "name": book.title,
                    "quantity": item.quantity,
                    "price": int(item_price),
                    "length": int(float(book.length)) if book.length is not None else 20,
                    "width": int(float(book.width)) if book.width is not None else 15,
                    "height": int(float(book.height)) if book.height is not None else 10,
                    "weight": int(book.weight) if book.weight is not None else 300
                })

        # Include stationery from ghn_items using DB dimensions when available
        if hasattr(order_request, 'ghn_items') and order_request.ghn_items:
            for gi in order_request.ghn_items:
                gi_price = int(float(getattr(gi, 'price', 0) or 0))
                gi_quantity = int(getattr(gi, 'quantity', 0) or 0)
                if gi_quantity <= 0:
                    continue
                total_amount += gi_price * gi_quantity

                sid = getattr(gi, 'stationery_id', None)
                st = None
                if stationery_data and sid:
                    st = stationery_data.get(sid)

                if st:
                    # Check if stationery has free shipping
                    if getattr(st, 'is_free_ship', False):
                        has_free_ship = True
                    items.append({
                        "name": st.title,
                        "quantity": gi_quantity,
                        "price": gi_price,
                        "length": int(float(st.length)) if st.length is not None else 20,
                        "width": int(float(st.width)) if st.width is not None else 15,
                        "height": int(float(st.height)) if st.height is not None else 10,
                        "weight": int(st.weight) if st.weight is not None else 300
                    })
                else:
                    # Fallback to provided data if DB lookup failed
                    items.append({
                        "name": getattr(gi, 'name', 'Item'),
                        "quantity": gi_quantity,
                        "price": gi_price,
                        "length": int(getattr(gi, 'length', 20) or 20),
                        "width": int(getattr(gi, 'width', 15) or 15),
                        "height": int(getattr(gi, 'height', 10) or 10),
                        "weight": int(getattr(gi, 'weight', 300) or 300)
                    })
        
        pm = str(getattr(order_request, 'payment_method', '') or '').lower()
        if pm == 'cod':
            cod_amount = int(total_amount)
        elif pm == 'momo':
            cod_amount = 0
        else:
            if hasattr(order_request, 'cod_amount') and order_request.cod_amount is not None:
                try:
                    cod_amount = int(float(order_request.cod_amount))
                except Exception:
                    cod_amount = int(total_amount)
            else:
                cod_amount = int(total_amount)
        
        pkg_length = getattr(order_request, 'package_length', None)
        pkg_width = getattr(order_request, 'package_width', None)
        pkg_height = getattr(order_request, 'package_height', None)
        pkg_weight = getattr(order_request, 'package_weight', None)

        return {
            "to_name": order_request.shipping_full_name or "Customer",
            "to_phone": order_request.shipping_phone_number,
            "to_address": full_address,
            "to_ward_code": getattr(order_request, 'ghn_ward_code', None),
            "to_district_id": getattr(order_request, 'ghn_district_id', None),
            "cod_amount": cod_amount,
            "items": items,
            "service_id": getattr(order_request, 'shipping_service_id', None),
            "payment_method": getattr(order_request, 'payment_method', None),
            "package_length": pkg_length,
            "package_width": pkg_width,
            "package_height": pkg_height,
            "package_weight": pkg_weight,
            "has_free_ship": has_free_ship,  # Flag for free shipping items
        }

    def prepare_order_data_from_order(self, order, order_items: List[Any]) -> Dict[str, Any]:
        """
        Prepare order data for GHN API from database order and items.
        
        Args:
            order: Order model instance
            order_items: List of OrderItem model instances
            
        Returns:
            Dictionary formatted for GHN API
        """
        # Build full address
        address_parts = [order.shipping_address_line1]
        if order.shipping_address_line2:
            address_parts.append(order.shipping_address_line2)
        
        full_address = ", ".join(address_parts)
        
        # Prepare items data
        items = []
        has_free_ship = False  # Track if any item has free shipping
        for item in order_items:
            book = item.book
            stationery = getattr(item, 'stationery', None)
            
            # Check if book or stationery has free shipping
            if book and getattr(book, 'is_free_ship', False):
                has_free_ship = True
            if stationery and getattr(stationery, 'is_free_ship', False):
                has_free_ship = True
            
            if book:
                items.append({
                    "name": book.title,
                    "quantity": item.quantity,
                    "price": int(float(item.price_at_purchase)),  # GHN expects integer price
                    "length": int(book.length) if book.length else 25,
                    "width": int(book.width) if book.width else 18,
                    "height": int(book.height) if book.height else 5,
                    "weight": int(book.weight) if book.weight else 300
                })
            elif stationery:
                items.append({
                    "name": stationery.title,
                    "quantity": item.quantity,
                    "price": int(float(item.price_at_purchase)),
                    "length": int(stationery.length_cm) if stationery.length_cm else 20,
                    "width": int(stationery.width_cm) if stationery.width_cm else 15,
                    "height": int(stationery.height_cm) if stationery.height_cm else 10,
                    "weight": int(stationery.weight_grams) if stationery.weight_grams else 300
                })
        
        return {
            "to_name": order.shipping_full_name or f"{order.shipping_address_line1}",
            "to_phone": order.shipping_phone_number,
            "to_address": full_address,
            "to_ward_code": order.ghn_ward_code,
            "to_district_id": order.ghn_district_id,
            "cod_amount": float(order.total_amount),
            "items": items,
            "has_free_ship": has_free_ship,  # Flag for free shipping items
        }
