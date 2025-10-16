'use client';

import { useEffect, useState } from 'react';
import Image from '../compat/Image';
import Link from '../compat/Link';
import { useWishlist } from '../../../hooks/useWishlist';
import { useCart } from '../../../hooks/useCart';
import { useToast } from '../../../contexts/ToastContext.jsx';

export default function WishlistPage() {
  const { wishlistItems, removeFromWishlist, getWishlistCount } = useWishlist();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className="container mx-auto px-4 pt-28 pb-16">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 pt-28 pb-16">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Your Wishlist</h1>

      {getWishlistCount() === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-2xl font-medium text-gray-700 mb-4">Your wishlist is empty</h2>
          <p className="text-gray-500 mb-8">Save books you love to your wishlist and easily find them later.</p>
          <Link href="/books" className="bg-[#008080] text-white px-6 py-3 rounded-md hover:bg-[#006666] transition-colors">
            Browse Books
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
                      <th className="text-left pb-4">Product</th>
                      <th className="text-right pb-4">Price</th>
                      <th className="text-right pb-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wishlistItems.map((item) => (
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
                              <p className="font-medium text-gray-900">{item.title}</p>
                              {item.author && (
                                <p className="text-sm text-gray-600">{item.author}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-right">
                          <span className="font-medium text-gray-900">{item.price}</span>
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <button 
                              className="px-3 py-1 bg-[#008080] text-white rounded-md hover:bg-[#006666] transition-colors"
                              onClick={() => { 
                                addToCart(item);
                                showToast({ title: 'Added to cart', message: `${item.title}`, type: 'success', actionLabel: 'View Cart', onAction: () => { window.location.href = '/cart'; } });
                              }}
                            >
                              Add to Cart
                            </button>
                            <button 
                              className="px-3 py-1 border border-red-600 text-red-600 rounded-md hover:bg-red-50 transition-colors"
                              onClick={() => removeFromWishlist(item.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-6">Wishlist Summary</h2>
              <p className="text-gray-700">Items: <span className="font-medium">{getWishlistCount()}</span></p>
              <p className="mt-2 text-gray-500">Add items to your cart to purchase them.</p>
              <Link 
                href="/cart" 
                className="mt-6 block text-center border border-gray-300 text-gray-700 py-3 rounded-md hover:bg-gray-50 transition-colors font-medium"
              >
                View Cart
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}