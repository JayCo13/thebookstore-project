import Image from '../../compat/Image';
import Link from '../../compat/Link';
import { EyeIcon, ShoppingBagIcon, HeartIcon } from '@heroicons/react/24/outline';

export default function BookCard({ book, onViewDetails, addToCart, addToWishlist }) {
  return (
    <div className="group rounded-lg overflow-hidden">
      <div className="relative w-full aspect-[2/3]">
        <Image
          src={book.cover}
          alt={book.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
        {book.tag && (
          <span className="absolute top-3 left-3 bg-[#008080] text-white text-xs font-medium px-2 py-1 rounded">
            {book.tag}
          </span>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        {/* Bottom-centered icon actions */}
        <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
          <button
            className="p-2.5 rounded-full bg-white/90 text-[#008080] shadow-sm transition ease-out duration-200 hover:bg-[#008080] hover:text-white hover:scale-105"
            onClick={() => onViewDetails?.(book)}
            aria-label="Quick view"
          >
            <EyeIcon className="h-5 w-5" />
          </button>
          <button
            className="p-2.5 rounded-full bg-white/90 text-[#008080] shadow-sm transition ease-out duration-200 hover:bg-[#008080] hover:text-white hover:scale-105"
            onClick={() => addToCart?.(book)}
            aria-label="Add to cart"
          >
            <ShoppingBagIcon className="h-5 w-5" />
          </button>
          <button
            className="p-2.5 rounded-full bg-white/90 text-[#008080] shadow-sm transition ease-out duration-200 hover:bg-[#008080] hover:text-white hover:scale-105"
            onClick={() => addToWishlist?.(book)}
            aria-label="Add to wishlist"
          >
            <HeartIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="pt-3">
        <h3 className="text-lg font-semibold text-[#2D2D2D] truncate">{book.title}</h3>
        {book.author && <p className="text-sm text-gray-600 mt-1 truncate">{book.author}</p>}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[#008080] font-semibold">{book.price}</span>
        </div>
      </div>
    </div>
  );
}