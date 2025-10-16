import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);

const parsePrice = (priceStr) => {
  if (priceStr == null) return 0;
  const num = parseFloat(String(priceStr).replace(/[^0-9.]/g, ''));
  return Number.isNaN(num) ? 0 : num;
};

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
    setCartItems((prev) => {
      const idx = prev.findIndex((it) => it.id === book.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: (next[idx].quantity || 1) + 1 };
        return next;
      }
      const item = {
        id: book.id,
        title: book.title,
        author: book.author,
        cover: book.cover,
        price: book.price, // keep original string for display
        quantity: 1,
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
    return () => cartItems.reduce((sum, it) => sum + parsePrice(it.price) * (it.quantity || 1), 0).toFixed(2);
  }, [cartItems]);

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    getCartCount,
    getCartTotal,
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