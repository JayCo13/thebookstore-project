/**
 * Product Description component
 * Displays the long-form description of the book
 */

export default function ProductDescription({ book }) {
  // If no description is available
  if (!book.LongDescription && !book.ShortDescription) {
    return (
      <div className="text-gray-500 italic">
        Chưa có mô tả chi tiết cho sản phẩm này.
      </div>
    );
  }
  
  // Use long description if available, otherwise use short description
  const description = book.LongDescription || book.ShortDescription;
  
  // Split description into paragraphs and render
  const paragraphs = description.split('\n').filter(p => p.trim() !== '');
  
  return (
    <div className="prose prose-amber max-w-none">
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="mb-4">
          {paragraph}
        </p>
      ))}
    </div>
  );
}