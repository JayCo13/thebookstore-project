/**
 * Breadcrumbs component for book detail page
 * Shows navigation path: Home > Category > Book Title
 */

import { Link } from 'react-router-dom';

export default function Breadcrumbs({ category, bookTitle }) {
  return (
    <nav className="flex py-4 text-sm">
      <ol className="flex items-center space-x-1">
        <li>
          <Link 
            to="/" 
            className="text-gray-500 hover:text-amber-600 transition-colors"
          >
            Trang chủ
          </Link>
        </li>
        
        <li className="flex items-center">
          <span className="mx-2 text-gray-400">/</span>
        </li>
        
        {category && (
          <>
            <li>
              <Link 
                to={`/categories/${category.Slug}`} 
                className="text-gray-500 hover:text-amber-600 transition-colors"
              >
                {category.CategoryName}
              </Link>
            </li>
            
            <li className="flex items-center">
              <span className="mx-2 text-gray-400">/</span>
            </li>
          </>
        )}
        
        <li>
          <span className="text-amber-600 font-medium truncate max-w-[200px] inline-block">
            {bookTitle}
          </span>
        </li>
      </ol>
    </nav>
  );
}