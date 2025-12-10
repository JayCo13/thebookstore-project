import { useMemo, useState } from 'react';
import Image from '../compat/Image';
import Link from '../compat/Link';
import { parsePrice } from '../../../utils/currency';

export default function ProductDetailLayout({
  title,
  images = [],
  priceText,
  oldPriceText,
  discountPriceText,
  stock = 0,
  categories = [],
  briefDescription,
  fullDescription,
  onAddToCart,
  onAddToWishlist,
  backLink = { href: '/', label: 'Trang Chủ' },
  badges = [],
  children,
  extraSections = null,
  showBreadcrumb = true,
  authorText,
  isbnText,
  skuText,
  publishDateText,
}) {
  const galleryImages = useMemo(() => images.filter(Boolean), [images]);
  const [selectedImage, setSelectedImage] = useState(galleryImages[0] || null);
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="min-h-screen bg-gray-50">
      {showBreadcrumb && (
        <div className="bg-white border-b mt-16 md:mt-20">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <nav className="flex items-center space-x-2 text-lg text-gray-500">
              <Link to="/" className="hover:text-[#008080] transition-colors">Home</Link>
              <span>›</span>
              <Link to={backLink.href} className="hover:text-[#008080] transition-colors">{backLink.label}</Link>
              <span>›</span>
              <span className="text-gray-800 font-semibold truncate">{title}</span>
            </nav>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Main Product Information */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8 p-4 md:p-8">
            {/* Product Image */}
            <div className="lg:col-span-2 flex flex-col items-center gap-3">
              <div className="relative w-full max-w-xs aspect-[2/3] rounded-xl overflow-hidden shadow-lg">
                <Image
                  src={selectedImage || galleryImages[0] || 'https://via.placeholder.com/300x450/008080/ffffff?text=No+Image'}
                  alt={title}
                  fill
                  className="object-cover"
                />
                {badges && badges.length > 0 && (
                  <div className="absolute top-4 left-4 bg-[#008080] text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg">
                    {badges[0]}
                  </div>
                )}
                {discountPriceText && oldPriceText && (
                  (() => {
                    const op = parsePrice(oldPriceText);
                    const dp = parsePrice(discountPriceText);
                    const pct = op > dp && op > 0 ? Math.round(((op - dp) / op) * 100) : null;
                    return pct != null ? (
                      <div className="absolute top-4 right-4 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-bounce">
                        -{pct}%
                      </div>
                    ) : null;
                  })()
                )}
              </div>
              {galleryImages.length > 1 && (
                <div className="grid grid-cols-5 gap-2 w-full max-w-[320px]">
                  {galleryImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(img)}
                      className={`aspect-square relative rounded border ${selectedImage === img ? 'border-emerald-500' : 'border-gray-200'} overflow-hidden bg-white`}
                    >
                      <Image src={img} alt={`${title} ${idx + 1}`} fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Information */}
            <div className="lg:col-span-3 space-y-6">
              {/* Title */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">{title}</h1>
                  {(authorText || publishDateText) && (
                    <div className="mt-3 text-lg md:text-2xl text-gray-600">
                      {authorText && (
                        <span>
                          <span className="font-bold">Tác giả:</span> {authorText}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {children && (
                  <div className="flex items-center gap-2 flex-shrink-0 self-start md:self-auto">
                    {children}
                  </div>
                )}
              </div>

              {/* Price and Stock */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    {discountPriceText ? (
                      <div className="flex items-center gap-3">
                        <span className="text-2xl md:text-3xl font-bold text-red-600 animate-pulse">{discountPriceText}</span>
                        <span className="text-base md:text-lg text-gray-500 line-through">{oldPriceText}</span>
                      </div>
                    ) : (
                      <span className="text-2xl md:text-3xl font-bold text-emerald-600">{priceText}</span>
                    )}
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm text-gray-500 font-medium">Hàng trong kho</p>
                    <p className="text-lg font-bold text-gray-900">Còn lại: {stock || 0}</p>
                  </div>
                </div>
              </div>

              {(categories && categories.length > 0) || isbnText || skuText ? (
                <div className="flex flex-wrap items-center gap-2">
                  {categories && categories.length > 0 && (
                    categories.map((category, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-[#008080]/10 text-[#008080] text-sm font-medium rounded-full"
                      >
                        {category}
                      </span>
                    ))
                  )}
                  {isbnText && (
                    <span className="px-3 py-1 bg-[#008080]/10 text-[#008080] text-sm font-medium rounded-full">
                      Mã: {isbnText}
                    </span>
                  )}
                  {skuText && (
                    <span className="px-3 py-1 bg-[#008080]/10 text-[#008080] text-sm font-medium rounded-full">
                      Mã: {skuText}
                    </span>
                  )}
                </div>
              ) : null}
              {(authorText || publishDateText) && (
                <div className="mt-3 ml-0 md:ml-2 text-md text-gray-600">
                  {publishDateText && (
                    <span>
                      <span className="text-lg font-medium">Ngày xuất bản:</span> {publishDateText}
                    </span>
                  )}
                </div>
              )}
              {/* Brief Description */}
              {(briefDescription || fullDescription) && (
                <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-xl">
                  {briefDescription && (
                    <div className="flex flex-col">
                      <span className="text-md mb-1 text-gray-500 uppercase tracking-wide">Tóm Tắt:</span>
                      <div
                        className="text-sm font-medium text-gray-900 prose prose-sm max-w-none whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: briefDescription }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Quantity and Actions */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-50 rounded-lg p-3 gap-3">
                  <span className="text-sm font-semibold text-gray-700">Số Lượng:</span>
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white w-full sm:w-auto justify-center sm:justify-start">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1 || stock === 0}
                      className="px-4 py-2 sm:px-3 sm:py-1.5 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition-colors border-r border-gray-200"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={Math.max(1, Math.min(stock || 10, 10))}
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setQuantity(Math.max(1, Math.min(val, Math.max(1, Math.min(stock || 10, 10)))));
                      }}
                      className="w-16 sm:w-12 py-1.5 text-center text-sm font-semibold border-0 focus:ring-0 focus:outline-none"
                      disabled={stock === 0}
                    />
                    <button
                      onClick={() => setQuantity(Math.min(quantity + 1, Math.max(1, Math.min(stock || 10, 10))))}
                      disabled={quantity >= Math.max(1, Math.min(stock || 10, 10)) || stock === 0}
                      className="px-4 py-2 sm:px-3 sm:py-1.5 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition-colors border-l border-gray-200"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => onAddToCart && onAddToCart(quantity)}
                    disabled={stock === 0}
                    className="flex-1 px-6 py-3 bg-[#008080] text-white rounded-lg hover:bg-[#006666] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-sm"
                  >
                    Thêm {quantity > 1 ? `${quantity} ` : ''} vào giỏ hàng
                  </button>
                  {onAddToWishlist && (
                    <button
                      onClick={() => onAddToWishlist()}
                      className="px-6 py-3 border-2 border-[#008080] text-[#008080] rounded-lg hover:bg-[#008080] hover:text-white transition-colors font-semibold text-sm w-full sm:w-auto"
                    >
                      Thêm vào Yêu Thích
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width Description Section */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Mô Tả Chi Tiết</h2>
            <div className="prose prose-gray max-w-none">
              {fullDescription ? (
                <div
                  className="text-gray-700 leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: fullDescription }}
                />
              ) : (
                <div className="text-gray-500 italic">
                  <p>No detailed description available.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {extraSections}
      </div>
    </div>
  );
}