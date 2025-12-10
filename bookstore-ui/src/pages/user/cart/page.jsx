'use client';

import { useState, useEffect } from 'react';
import Image from '../compat/Image';
import Link from '../compat/Link';
import { useCart } from '../../../hooks/useCart';
// Using standard HTML elements instead of UI components

export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, getCartTotal } = useCart();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className="container mx-auto px-4 pt-28 pb-16">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 pt-28 pb-16">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Giỏ hàng của bạn</h1>

      {cartItems.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-2xl font-medium text-gray-700 mb-4">Giỏ hàng của bạn đang trống</h2>
          <p className="text-gray-500 mb-8">Hiện tại bạn chưa thêm bất kỳ sách nào vào giỏ hàng.</p>
          <Link href="/" className="bg-[#008080] text-white px-6 py-3 rounded-md hover:bg-[#006666] transition-colors">
            Tiếp tục mua sắm
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left pb-4">Sản phẩm</th>
                      <th className="text-center pb-4">Số lượng</th>
                      <th className="text-right pb-4">Giá</th>
                      <th className="text-right pb-4">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-4">
                          <div className="flex items-center">
                            <div className="h-24 w-16 relative flex-shrink-0">
                              <Image
                                src={item.cover}
                                alt={item.title}
                                fill
                                className="object-cover rounded"
                                sizes="64px"
                              />
                            </div>
                            <div className="ml-4">
                              <h3 className="font-medium text-gray-900">{item.title}</h3>
                              <p className="text-sm text-gray-500">{item.author}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center justify-center">
                            <button
                              className="p-1 rounded-full hover:bg-gray-100"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              aria-label="Decrease quantity"
                            >
                              -
                            </button>
                            <span className="mx-3 w-8 text-center">{item.quantity}</span>
                            <button
                              className="p-1 rounded-full hover:bg-gray-100"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-4 text-right">
                          <span className="font-medium">{item.price}</span>
                        </td>
                        <td className="py-4 text-right">
                          <button
                            className="text-red-500 hover:text-red-700 p-2"
                            onClick={() => removeFromCart(item.id)}
                            aria-label="Remove item"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-6 pb-4 border-b">Tóm tắt đơn hàng</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tạm Tính</span>
                  <span className="font-medium">{getCartTotal()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phí Ship</span>
                  <span className="font-medium">Chưa tính</span>
                </div>
                <div className="flex justify-between pt-4 border-t">
                  <span className="text-lg font-bold">Tổng tạm thanh toán</span>
                  <span className="text-lg font-bold text-[#008080]">{getCartTotal()}</span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="block w-full text-center bg-[#008080] text-white py-3 rounded-md hover:bg-[#006666] transition-colors font-medium"
              >
                Thanh toán ngay
              </Link>

              <Link
                href="/"
                className="block w-full text-center border border-gray-300 text-gray-700 py-3 rounded-md hover:bg-gray-50 transition-colors mt-4 font-medium"
              >
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}