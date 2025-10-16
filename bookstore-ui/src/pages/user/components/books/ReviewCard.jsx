/**
 * Review Card component
 * Displays an individual customer review
 */

import Image from 'next/image';
import { StarIcon } from '@heroicons/react/20/solid';

export default function ReviewCard({ review }) {
  // Format date to Vietnamese format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  // Get user's full name or fallback
  const userName = review.user
    ? `${review.user.FirstName} ${review.user.LastName}`
    : 'Người dùng ẩn danh';
  
  // Get user's avatar or fallback
  const userAvatar = review.user?.ProfilePictureURL || '/assets/default-avatar.png';
  
  return (
    <div className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
      <div className="flex items-start">
        {/* User avatar */}
        <div className="flex-shrink-0 mr-4">
          <div className="relative h-10 w-10 rounded-full overflow-hidden">
            <Image
              src={userAvatar}
              alt={userName}
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
        </div>
        
        {/* Review content */}
        <div className="flex-1">
          {/* User name and date */}
          <div className="flex justify-between mb-1">
            <h4 className="font-medium text-gray-900">{userName}</h4>
            <span className="text-sm text-gray-500">{formatDate(review.ReviewDate)}</span>
          </div>
          
          {/* Rating */}
          <div className="flex mb-2">
            {[0, 1, 2, 3, 4].map((rating) => (
              <StarIcon
                key={rating}
                className={`h-4 w-4 ${
                  review.Rating > rating
                    ? 'text-yellow-400'
                    : 'text-gray-300'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
          
          {/* Review title */}
          {review.Title && (
            <h5 className="font-medium text-gray-900 mb-1">{review.Title}</h5>
          )}
          
          {/* Review comment */}
          <p className="text-gray-700">{review.Comment}</p>
          
          {/* Helpful buttons */}
          <div className="flex items-center mt-3">
            <span className="text-sm text-gray-500 mr-4">
              {review.HelpfulVotes} người thấy hữu ích
            </span>
            <button className="text-sm text-gray-500 hover:text-amber-600">
              Hữu ích
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}