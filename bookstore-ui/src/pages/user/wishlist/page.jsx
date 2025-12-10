import { useState, useEffect } from 'react';
import Image from '../compat/Image';
import Link from '../compat/Link';
import { EyeIcon, ShoppingCartIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useWishlist } from '../../../hooks/useWishlist';
import { useCart } from '../../../hooks/useCart';
import { useToast } from '../../../contexts/ToastContext.jsx';

const slugify = (text) => {
  if (!text) return '';
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export default function WishlistPage() {
  const { wishlistItems, removeFromWishlist, getWishlistCount } = useWishlist();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    setIsClient(true);
    // Initialize quantities for all wishlist items
    const initialQuantities = {};
    wishlistItems.forEach(item => {
      initialQuantities[item.id] = 1;
    });
    setQuantities(initialQuantities);
  }, [wishlistItems]);

  // Function to update quantity for a specific item
  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity >= 1) {
      setQuantities(prev => ({
        ...prev,
        [itemId]: newQuantity
      }));
    }
  };

  if (!isClient) {
    return <div className="container mx-auto px-4 pt-28 pb-16">Đang tải...</div>;
  }

  return (
    <div className="container mx-auto px-4 pt-28 pb-16">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Danh sách yêu thích</h1>

      {getWishlistCount() === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-2xl font-medium text-gray-700 mb-4">Danh sách yêu thích trống</h2>
          <p className="text-gray-500 mb-8">Lưu sách mà bạn thích vào danh sách yêu thích và dễ dàng tìm thấy lại.</p>
          <Link href="/books" className="bg-[#008080] text-white px-6 py-3 rounded-md hover:bg-[#006666] transition-colors">
            Duyệt sách
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Desktop table view */}
              <div className="hidden lg:block">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-600 uppercase">Sản phẩm</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold tracking-wider text-gray-600 uppercase">Số lượng</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold tracking-wider text-gray-600 uppercase">Giá</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold tracking-wider text-gray-600 uppercase">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {wishlistItems.map((item) => {
                      const currentQuantity = quantities[item.id] || 1;
                      return (
                        <tr key={item.id}>
                          <td className="px-6 py-4">
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
                                <p className="font-medium text-gray-900">{item.title}</p>
                                {item.author && (
                                  <p className="text-sm text-gray-600">{item.author}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center">
                              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                                <button
                                  onClick={() => updateQuantity(item.id, currentQuantity - 1)}
                                  disabled={currentQuantity <= 1}
                                  className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={currentQuantity}
                                  onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                                  className="w-12 py-1.5 text-center text-sm font-semibold border-0 focus:ring-0 focus:outline-none"
                                />
                                <button
                                  onClick={() => updateQuantity(item.id, currentQuantity + 1)}
                                  className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-sm font-semibold transition-colors"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-medium text-gray-900">{item.price}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end space-x-2">
                              <Link
                                href={`/book/${slugify(item.title)}`}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm"
                              >
                                <EyeIcon className="h-4 w-4 mr-1" />
                              </Link>
                              <button 
                                className="inline-flex items-center px-3 py-2 bg-[#008080] text-white rounded-md hover:bg-[#006666] transition-colors text-sm"
                                onClick={() => { 
                                  const cartItem = {
                                    id: item.id,
                                    title: item.title,
                                    author: item.author,
                                    cover: item.cover,
                                    price: item.price,
                                    quantity: currentQuantity
                                  };
                                  addToCart(cartItem);
                                  showToast({ 
                                    title: 'Added to cart', 
                                    message: `${currentQuantity} x ${item.title}`, 
                                    type: 'success', 
                                    actionLabel: 'View Cart', 
                                    onAction: () => { window.location.href = '/cart'; } 
                                  });
                                }}
                              >
                                <ShoppingCartIcon className="h-4 w-4 mr-1" />
                                 
                              </button>
                              <button 
                                className="inline-flex items-center px-3 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 transition-colors text-sm"
                                onClick={() => removeFromWishlist(item.id)}
                              >
                                <TrashIcon className="h-4 w-4 mr-1" />
                                
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile card view */}
              <div className="block lg:hidden p-4 space-y-4">
                {wishlistItems.map((item) => {
                  const currentQuantity = quantities[item.id] || 1;
                  return (
                    <div key={item.id} className="rounded-lg border border-gray-200 bg-white shadow-sm">
                      <div className="p-4 flex">
                        <div className="h-24 w-16 relative flex-shrink-0">
                          <Image 
                            src={item.cover} 
                            alt={item.title}
                            fill
                            className="object-cover rounded"
                            sizes="64px"
                          />
                        </div>
                        <div className="ml-4 flex-1">
                          <p className="font-medium text-gray-900">{item.title}</p>
                          {item.author && (
                            <p className="text-sm text-gray-600">{item.author}</p>
                          )}

                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                              <button
                                onClick={() => updateQuantity(item.id, currentQuantity - 1)}
                                disabled={currentQuantity <= 1}
                                className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={currentQuantity}
                                onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                                className="w-12 py-1.5 text-center text-sm font-semibold border-0 focus:ring-0 focus:outline-none"
                              />
                              <button
                                onClick={() => updateQuantity(item.id, currentQuantity + 1)}
                                className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-sm font-semibold transition-colors"
                              >
                                +
                              </button>
                            </div>

                            <div className="text-right flex-0">
                              <div className="text-base font-semibold text-gray-900">{item.price}</div>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link
                              href={`/book/${slugify(item.title)}`}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm"
                            >
                              <EyeIcon className="h-4 w-4 mr-1" />
                              Xem chi tiết
                            </Link>
                            <button 
                              className="inline-flex items-center px-3 py-2 bg-[#008080] text-white rounded-md hover:bg-[#006666] transition-colors text-sm"
                              onClick={() => { 
                                const cartItem = {
                                  id: item.id,
                                  title: item.title,
                                  author: item.author,
                                  cover: item.cover,
                                  price: item.price,
                                  quantity: currentQuantity
                                };
                                addToCart(cartItem);
                                showToast({ 
                                  title: 'Added to cart', 
                                  message: `${currentQuantity} x ${item.title}`, 
                                  type: 'success', 
                                  actionLabel: 'View Cart', 
                                  onAction: () => { window.location.href = '/cart'; } 
                                });
                              }}
                            >
                              <ShoppingCartIcon className="h-4 w-4 mr-1" />
                              Thêm vào giỏ hàng
                            </button>
                            <button 
                              className="inline-flex items-center px-3 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 transition-colors text-sm"
                              onClick={() => removeFromWishlist(item.id)}
                            >
                              <TrashIcon className="h-4 w-4 mr-1" />
                              Xoá
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl text-[#008080] text-center font-bold mb-6">Tóm tắt danh sách yêu thích</h2>
              <p className="text-gray-700">Số lượng sách: <span className="font-medium font-bold">{getWishlistCount()}</span></p>
              <p className="mt-2 text-gray-500">Thêm sách vào giỏ hàng để mua.</p>
              <Link 
                href="/cart" 
                className="mt-6 block text-center border border-[#008080] text-gray-700 py-3 rounded-md hover:bg-[#008080] hover:text-white transition-colors font-medium"
              >
                Xem giỏ hàng
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
