'use client';

import Link from '../../compat/Link';
import { BookOpenIcon, BeakerIcon, ClockIcon, PaintBrushIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

// Map displayed genres to actual category names used on the Books page
const genreToCategory = {
  'Fiction': 'Fiction',
  'Science': 'Computer Science',
  'History': 'History', // If no books currently match, the Books page will show "No books match your filters"
  'Art & Design': 'Art & Design',
};

const genres = [
  { id: 1, name: 'Fiction', icon: <BookOpenIcon className="h-8 w-8" /> },
  { id: 2, name: 'Science', icon: <BeakerIcon className="h-8 w-8" /> },
  { id: 3, name: 'History', icon: <ClockIcon className="h-8 w-8" /> },
  { id: 4, name: 'Art & Design', icon: <PaintBrushIcon className="h-8 w-8" /> },
];

export default function GenreCategories() {
  return (
    <section className="py-20 px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10">
        <div>
          <h2 className="text-3xl font-bold text-[#2D2D2D] relative inline-block">
            Explore by Genre
            <span className="absolute -bottom-2 left-0 w-1/2 h-1 bg-[#008080]"></span>
          </h2>
          <p className="text-gray-600 mt-4 max-w-xl">Browse categories to quickly find books that match your interests.</p>
        </div>
        <Link href="/books" className="mt-4 md:mt-0 text-[#008080] font-medium hover:underline flex items-center group">
          Browse all categories
          <ArrowRightIcon className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
        {genres.map((genre) => (
          <Link
            key={genre.id}
            href={`/books?category=${encodeURIComponent(genreToCategory[genre.name] ?? genre.name)}`}
            className="flex flex-col items-center text-center group"
          >
            <div className="mb-3 p-3 rounded-full ring-1 ring-gray-300 text-[#008080] bg-transparent transition duration-200 ease-out group-hover:bg-[#008080] group-hover:text-white group-hover:scale-105">
              {genre.icon}
            </div>
            <h3 className="text-sm sm:text-base font-medium text-[#2D2D2D] group-hover:text-[#008080]">{genre.name}</h3>
          </Link>
        ))}
      </div>
    </section>
  );
}