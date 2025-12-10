import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { formatPrice, parsePrice } from '../utils/currency';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const raw = localStorage.getItem('cartItems');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
    } catch {
      // ignore
    }
  }, [cartItems]);

  const addToCart = (book) => {
    if (!book) return;
    const quantityToAdd = book.quantity || 1;
    setCartItems((prev) => {
      const idx = prev.findIndex((it) => it.id === book.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: (next[idx].quantity || 0) + quantityToAdd };
        return next;
      }

      // Determine the actual price to use (discounted if available, otherwise regular price)
      const actualPrice = book.discounted_price != null ? book.discounted_price : book.price;

      // Ensure price is properly formatted for display
      let formattedPrice = actualPrice;
      if (typeof actualPrice === 'number' || (typeof actualPrice === 'string' && !actualPrice.includes('₫'))) {
        formattedPrice = formatPrice(actualPrice);
      }

      // Store both original and discounted prices for display
      const item = {
        id: book.id,
        title: book.title,
        author: book.author,
        cover: book.cover,
        price: formattedPrice, // store formatted actual price for display
        originalPrice: book.price, // store original price for comparison
        discountedPrice: book.discounted_price, // store discounted price if available
        isFreeShip: book.isFreeShip || book.is_free_ship || false, // preserve free shipping flag
        stationery_id: book.stationery_id, // for stationery items
        quantity: quantityToAdd,
      };
      return [...prev, item];
    });
  };

  const removeFromCart = (id) => {
    setCartItems((prev) => prev.filter((it) => it.id !== id));
  };

  const updateQuantity = (id, qty) => {
    setCartItems((prev) => {
      const next = prev.map((it) => (it.id === id ? { ...it, quantity: Math.max(0, qty) } : it));
      return next.filter((it) => it.quantity > 0);
    });
  };

  const getCartCount = useMemo(() => {
    return () => cartItems.reduce((sum, it) => sum + (it.quantity || 1), 0);
  }, [cartItems]);

  const getCartTotal = useMemo(() => {
    return () => {
      const total = cartItems.reduce((sum, it) => sum + parsePrice(it.price) * (it.quantity || 1), 0);
      return formatPrice(total);
    };
  }, [cartItems]);

  const getCartTotalRaw = useMemo(() => {
    return () => cartItems.reduce((sum, it) => sum + parsePrice(it.price) * (it.quantity || 1), 0);
  }, [cartItems]);

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    getCartCount,
    getCartTotal,
    getCartTotalRaw,
    clearCart: () => setCartItems([]),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
};