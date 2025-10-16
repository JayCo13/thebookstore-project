/**
 * Reviews Section component
 * Displays customer reviews with a summary and individual review cards
 */

'use client';

import { useState } from 'react';
import { StarIcon } from '@heroicons/react/20/solid';
import ReviewCard from './ReviewCard';

export default function ReviewsSection({ reviews = [] }) {
  const [showReviewForm, setShowReviewForm] = useState(false);
  
  // Calculate average rating
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, review) => sum + review.Rating, 0) / reviews.length).toFixed(1)
    : '0.0';
  
  // Calculate rating distribution
  const ratingCounts = [5, 4, 3, 2, 1].map(rating => {
    const count = reviews.filter(review => review.Rating === rating).length;
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
    return { rating, count, percentage };
  });
  
  return (
    <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <h2 className="text-xl font-bold p-6 border-b border-gray-200">
        Đánh giá từ khách hàng
      </h2>
      
      <div className="p-6">
        {/* Two-column layout */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left column - Rating summary */}
          <div className="md:w-1/3">
            <div className="flex flex-col items-center">
              <div className="text-5xl font-bold text-amber-600 mb-2">
                {averageRating}
                <span className="text-xl text-gray-500">/5</span>
              </div>
              
              <div className="flex mb-4">
                {[0, 1, 2, 3, 4].map((rating) => (
                  <StarIcon
                    key={rating}
                    className={`h-6 w-6 ${
                      parseFloat(averageRating) > rating
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }`}
                    aria-hidden="true"
                  />
                ))}
              </div>
              
              <p className="text-sm text-gray-500 mb-6">
                {reviews.length} đánh giá
              </p>
              
              {/* Rating distribution */}
              <div className="w-full space-y-2">
                {ratingCounts.map(({ rating, count, percentage }) => (
                  <div key={rating} className="flex items-center">
                    <div className="flex items-center w-12">
                      <span className="text-sm text-gray-600">{rating}</span>
                      <StarIcon className="h-4 w-4 text-yellow-400 ml-1" />
                    </div>
                    <div className="flex-1 h-2 mx-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="w-8 text-xs text-gray-500">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Right column - Reviews list */}
          <div className="md:w-2/3">
            {/* Write review button */}
            <div className="mb-6">
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
              >
                Viết nhận xét của bạn
              </button>
            </div>
            
            {/* Review form (toggled by button) */}
            {showReviewForm && (
              <div className="mb-6 p-4 border border-gray-200 rounded-lg">
                <h3 className="text-lg font-medium mb-4">Viết nhận xét của bạn</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Chức năng đánh giá sẽ được triển khai trong phiên bản tiếp theo.
                </p>
              </div>
            )}
            
            {/* Reviews list */}
            {reviews.length > 0 ? (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <ReviewCard key={review.ReviewID} review={review} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  Hãy là người đầu tiên nhận xét về sản phẩm này!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}