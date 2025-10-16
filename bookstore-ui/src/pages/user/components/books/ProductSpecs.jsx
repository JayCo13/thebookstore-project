/**
 * Product Specifications component
 * Displays technical details of the book in a two-column layout
 */

export default function ProductSpecs({ book }) {
  // Format date to Vietnamese format
  const formatDate = (dateString) => {
    if (!dateString) return 'Chưa cập nhật';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  // Specifications to display
  const specifications = [
    { label: 'Mã hàng', value: book.SKU || 'Chưa cập nhật' },
    { label: 'Tác giả', value: book.authors?.map(author => `${author.FirstName} ${author.LastName}`).join(', ') || 'Chưa cập nhật' },
    { label: 'Nhà xuất bản', value: book.publisher?.PublisherName || 'Chưa cập nhật' },
    { label: 'Năm xuất bản', value: book.PublicationDate ? new Date(book.PublicationDate).getFullYear() : 'Chưa cập nhật' },
    { label: 'Số trang', value: book.NumberOfPages ? `${book.NumberOfPages} trang` : 'Chưa cập nhật' },
    { label: 'Kích thước', value: book.Dimensions || 'Chưa cập nhật' },
    { label: 'Loại bìa', value: book.Format || 'Chưa cập nhật' },
    { label: 'Trọng lượng', value: book.WeightGrams ? `${book.WeightGrams} gram` : 'Chưa cập nhật' },
    { label: 'Ngôn ngữ', value: book.Language || 'Chưa cập nhật' },
    { label: 'ISBN-10', value: book.ISBN10 || 'Chưa cập nhật' },
    { label: 'ISBN-13', value: book.ISBN13 || 'Chưa cập nhật' },
    { label: 'Ngày phát hành', value: formatDate(book.PublicationDate) },
  ];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
      {specifications.map((spec, index) => (
        <div key={index} className="flex">
          <dt className="w-1/3 flex-shrink-0 text-gray-500">{spec.label}:</dt>
          <dd className="w-2/3 text-gray-900">{spec.value}</dd>
        </div>
      ))}
    </div>
  );
}