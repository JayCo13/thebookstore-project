import Link from '../compat/Link';
import BookCard from '../components/home/BookCard';
import { useCart } from '../../../hooks/useCart';
import { useWishlist } from '../../../hooks/useWishlist';
import { useToast } from '../../../contexts/ToastContext.jsx';

export default function NewArrivalsPage() {
  const books = [
    { id: 101, title: 'Fresh Insights', author: 'A. Writer', cover: '/assets/book-cover.svg', category: 'Fiction', price: '$19.99', isNewRelease: true },
    { id: 102, title: 'Next Big Thing', author: 'B. Author', cover: '/assets/Yoasoi_sang.jpg', category: 'Art & Design', price: '$29.99', isNewRelease: true },
    { id: 103, title: 'Cutting Edge', author: 'C. Researcher', cover: '/assets/yoga_voighe.jpg', category: 'Computer Science', price: '$39.99', isNewRelease: true },
    { id: 104, title: 'Culinary Trends', author: 'D. Chef', cover: '/assets/74_lathutay.jpg', category: 'Cooking', price: '$24.99', isNewRelease: true },
  ];

  const { addToCart } = useCart();
  const { addToWishlist } = useWishlist();
  const { showToast } = useToast();

  return (
    <section className="pt-24 pb-8 px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#2D2D2D] relative inline-block">
            New Arrivals
            <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-[#008080]"></span>
          </h1>
          <p className="text-gray-600 mt-4">Check out the latest additions to our catalog.</p>
        </div>
        <Link href="/books" className="text-[#008080] font-medium hover:underline">Browse all books</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {books.map((book) => (
          <BookCard 
            key={book.id} 
            book={book} 
            addToCart={(b) => { addToCart(b); showToast({ title: 'Added to cart', message: `${b.title}`, type: 'success', actionLabel: 'View Cart', onAction: () => { window.location.href = '/cart'; } }); }} 
            addToWishlist={(b) => { addToWishlist(b); showToast({ title: 'Added to wishlist', message: `${b.title}`, type: 'success', actionLabel: 'View Wishlist', onAction: () => { window.location.href = '/wishlist'; } }); }} 
            onViewDetails={() => {}}
          />
        ))}
      </div>
    </section>
  );
}