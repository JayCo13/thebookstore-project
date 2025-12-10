import { useEffect, useMemo, useState } from 'react';
import Image from '../../compat/Image';
import Link from '../../compat/Link';
import { parsePrice } from '../../../../utils/currency';
import { EyeIcon, ShoppingCartIcon, HeartIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/20/solid';
import { Truck } from 'lucide-react';

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

export default function StationeryCard({ item, onViewDetails, addToCart, addToWishlist }) {
  const images = useMemo(() => {
    const list = [];
    if (Array.isArray(item.images)) {
      for (let i = 0; i < Math.min(3, item.images.length); i++) {
        if (item.images[i]) list.push(item.images[i]);
      }
    }
    if (list.length === 0 && item.cover) list.push(item.cover);
    return list;
  }, [item]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [images]);

  return (
    <div className="group rounded-lg overflow-hidden">
      <div className="relative w-full aspect-[2/3]">
        <div className="absolute inset-0">
          {images.map((src, i) => (
            <Image
              key={i}
              src={src}
              alt={item.title}
              fill
              className={`object-cover transition-opacity duration-700 ease-in-out ${i === index ? 'opacity-100' : 'opacity-0'}`}
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ))}
        </div>
        {/* Tag badge - impressive ribbon style */}
        {item.tag && (
          <span className={`absolute top-3 left-3 text-white text-sm font-bold px-3 py-1.5 rounded-lg shadow-lg ${item.tag === 'Bán chạy' ? 'bg-gradient-to-r from-rose-500 to-pink-500' :
              item.tag === 'Mới ra mắt' || item.tag === 'Mới' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                item.tag === 'Giảm giá' ? 'bg-gradient-to-r from-purple-500 to-indigo-500' :
                  'bg-gradient-to-r from-teal-500 to-emerald-500'
            }`}>
            {item.tag}
          </span>
        )}
        {/* Free shipping badge */}
        {item.isFreeShip && (
          <span
            className="absolute top-3 left-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5"
            style={{ marginTop: item.tag ? '36px' : '0' }}
          >
            <Truck className="w-4 h-4" />
            Miễn phí ship
          </span>
        )}
        {/* Discount percentage badge */}
        {item.discountedPrice && (() => {
          const op = parsePrice(item.originalPrice);
          const dp = parsePrice(item.discountedPrice);
          const pct = op > dp && op > 0 ? Math.round(((op - dp) / op) * 100) : null;
          return pct != null ? (
            <span className="absolute top-3 right-3 bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm font-bold px-3 py-1.5 rounded-lg shadow-lg">-{pct}%</span>
          ) : null;
        })()}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        {/* Bottom-centered icon actions */}
        <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
          <button
            className="p-2.5 rounded-full bg-white/90 text-[#008080] shadow-sm transition ease-out duration-200 hover:bg-[#008080] hover:text-white hover:scale-105"
            onClick={() => onViewDetails?.(item)}
            aria-label="Xem chi tiết"
          >
            <EyeIcon className="h-5 w-5" />
          </button>
          <button
            className="p-2.5 rounded-full bg-white/90 text-[#008080] shadow-sm transition ease-out duration-200 hover:bg-[#008080] hover:text-white hover:scale-105"
            onClick={() => addToCart?.(item)}
            aria-label="Add to cart"
          >
            <ShoppingCartIcon className="h-5 w-5" />
          </button>
          <button
            className="p-2.5 rounded-full bg-white/90 text-[#008080] shadow-sm transition ease-out duration-200 hover:bg-[#008080] hover:text-white hover:scale-105"
            onClick={() => addToWishlist?.(item)}
            aria-label="Add to wishlist"
          >
            <HeartIcon className="h-5 w-5" />
          </button>
        </div>
        {images.length > 1 && (
          <div className="absolute bottom-3 right-3 flex gap-1">
            {images.slice(0, 3).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/60'}`}
              />
            ))}
          </div>
        )}
      </div>
      <div className="pt-3">
        <h3 className="text-lg font-semibold text-[#2D2D2D] truncate">{item.title}</h3>
        {/* Rating displayed above category (always shown with safe fallbacks) */}
        <div className="mt-1 flex items-center gap-2">
          <div className="flex items-center">
            {[0, 1, 2, 3, 4].map((i) => (
              <StarIcon
                key={i}
                className={`h-4 w-4 ${i < Math.round((typeof item.avg_rating === 'number' ? item.avg_rating : (typeof item.rating === 'number' ? item.rating : 0)) || 0) ? 'text-amber-500' : 'text-gray-300'}`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-600">({typeof item.review_count === 'number' ? item.review_count : (Array.isArray(item.reviews) ? item.reviews.length : 0)} đánh giá)</span>
        </div>
        {item.category && (
          <p className="text-xs text-gray-500 mt-1 truncate">
            <span className="bg-gray-100 px-2 py-1 rounded-full">{item.category}</span>
          </p>
        )}
        <div className="mt-2 flex items-center justify-between">
          {item.discountedPrice ? (
            <span className="flex items-center gap-2">
              <span className="text-red-600 font-semibold animate-pulse">{item.discountedPrice}</span>
              <span className="text-sm text-gray-500 line-through">{item.originalPrice}</span>
            </span>
          ) : (
            <span className="text-[#008080] font-semibold">{item.price}</span>
          )}
          <Link
            to={`/stationery/${slugify(item.title)}`}
            className="text-sm text-[#008080] hover:text-[#006666] font-medium transition-colors"
          >
            Xem chi tiết →
          </Link>
        </div>
      </div>
    </div>
  );
}
