import { useState } from 'react';
import { MapPinIcon, EnvelopeIcon, PhoneIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

// FAQ data
const faqs = [
  {
    id: 1,
    question: 'Thời gian giao hàng dự kiến là bao lâu?',
    answer: 'Đơn hàng nội thành TP.HCM thường được giao trong 1-2 ngày làm việc. Các tỉnh thành khác từ 3-5 ngày.'
  },
  {
    id: 2,
    question: 'Chính sách đổi trả sản phẩm như thế nào?',
    answer: 'Bạn có thể đổi trả sản phẩm trong vòng 7 ngày kể từ ngày nhận hàng nếu sản phẩm bị lỗi do nhà sản xuất hoặc bị hư hỏng trong quá trình vận chuyển. Sản phẩm đổi trả phải còn nguyên vẹn, không có dấu hiệu đã qua sử dụng.'
  },
  {
    id: 3,
    question: 'Làm thế nào để theo dõi đơn hàng của tôi?',
    answer: 'Sau khi đăng nhập, bạn có thể truy cập trang "Lịch sử đơn hàng" trong tài khoản cá nhân để xem trạng thái chi tiết. Ngoài ra, chúng tôi cũng sẽ gửi email thông báo khi đơn hàng của bạn được xác nhận và giao thành công.'
  },
  {
    id: 4,
    question: 'Tôi có thể thanh toán bằng những phương thức nào?',
    answer: 'The Book Store chấp nhận nhiều phương thức thanh toán khác nhau bao gồm: thanh toán khi nhận hàng (COD), chuyển khoản ngân hàng, thẻ tín dụng/ghi nợ (Visa, Mastercard, JCB), và các ví điện tử như Momo, ZaloPay, VNPay.'
  },
  {
    id: 5,
    question: 'Làm thế nào để tôi có thể hủy đơn hàng?',
    answer: 'Bạn có thể hủy đơn hàng trong vòng 30 phút sau khi đặt hàng thành công thông qua trang "Lịch sử đơn hàng" trong tài khoản của bạn. Nếu đã quá thời gian này, vui lòng liên hệ với chúng tôi qua hotline 076.8979.028 để được hỗ trợ.'
  },
];

// FAQ Item Component
function FaqItem({ faq, isOpen, toggleOpen }) {
  return (
    <div className="border-b border-gray-200 py-4">
      <button
        className="flex justify-between items-center w-full text-left focus:outline-none"
        onClick={toggleOpen}
      >
        <h3 className="text-lg font-medium text-[#2D2D2D]">{faq.question}</h3>
        <span className="ml-6 flex-shrink-0">
          {isOpen ? (
            <ChevronUpIcon className="h-5 w-5 text-[#008080]" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
          )}
        </span>
      </button>
      
      {isOpen && (
        <div className="mt-3 pr-12">
          <p className="text-base text-gray-600">{faq.answer}</p>
        </div>
      )}
    </div>
  );
}

// Contact Form Component
function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSubmitStatus({
        success: true,
        message: 'Tin nhắn của bạn đã được gửi thành công. Chúng tôi sẽ phản hồi sớm nhất có thể!'
      });
      
      // Reset form after successful submission
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      setSubmitStatus({
        success: false,
        message: 'Có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại sau.'
      });
    } finally {
      setIsSubmitting(false);
      
      // Auto-clear status after 5 seconds
      setTimeout(() => {
        setSubmitStatus(null);
      }, 5000);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 md:p-8">
      <h3 className="text-xl font-serif font-semibold text-[#2D2D2D] mb-6">
        Gửi tin nhắn cho chúng tôi
      </h3>
      
      {submitStatus && (
        <div className={`p-4 mb-6 rounded-md ${submitStatus.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {submitStatus.message}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Họ và tên
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#008080] focus:border-transparent transition-colors duration-300 outline-none"
              placeholder="Nhập họ và tên của bạn"
            />
          </div>
          
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#008080] focus:border-transparent transition-colors duration-300 outline-none"
              placeholder="example@email.com"
            />
          </div>
          
          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Số điện thoại
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#008080] focus:border-transparent transition-colors duration-300 outline-none"
              placeholder="Nhập số điện thoại của bạn"
            />
          </div>
          
          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
              Tiêu đề
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#008080] focus:border-transparent transition-colors duration-300 outline-none"
              placeholder="Tiêu đề tin nhắn"
            />
          </div>
          
          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Nội dung tin nhắn
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows="5"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#008080] focus:border-transparent transition-colors duration-300 outline-none resize-none"
              placeholder="Nhập nội dung tin nhắn của bạn"
            ></textarea>
          </div>
          
          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 px-4 bg-[#2D2D2D] hover:bg-[#008080] text-white font-medium rounded-md transition-colors duration-300 flex justify-center items-center ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang gửi...
                </>
              ) : 'Gửi tin nhắn'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// Interactive Map Component
function InteractiveMap() {
  const handleViewDirections = () => {
    const address = encodeURIComponent('35/6, đường TTH-15, khu phố 3A, P. Tân Thới Hiệp, Quận 12, TP.HCM');
    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 md:p-8 h-full min-h-[400px] flex flex-col">
      
      <h3 className="text-xl font-serif font-semibold text-[#2D2D2D] mb-4">
        Vị trí cửa hàng
      </h3>
      <div className="relative rounded-lg overflow-hidden flex-grow">
        <iframe 
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3918.3054370157515!2d106.63178021026738!3d10.864357357521712!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3175296649a43889%3A0x10933795e5c13222!2sGREEN%20GARDEN%20Coffee%20%26%20Tea%20(V%C6%AF%E1%BB%9CN%20XANH%20Cafe)!5e0!3m2!1svi!2s!4v1760499362042!5m2!1svi!2s"
          width="100%" 
          height="300"
          style={{border: 0, minHeight: '300px'}}
          allowFullScreen="" 
          loading="lazy" 
          referrerPolicy="no-referrer-when-downgrade"
          title="Vị trí The Book Store trên Google Maps"
          className="w-full h-full min-h-[300px] rounded-lg"
        ></iframe>
        
        {/* Fallback button overlay */}
        <div className="absolute bottom-4 right-4">
          <button 
            onClick={handleViewDirections}
            className="px-3 py-2 bg-white/90 hover:bg-white text-[#2D2D2D] hover:text-[#008080] font-medium rounded-md transition-colors duration-300 inline-flex items-center shadow-md text-sm"
          >
            <MapPinIcon className="h-4 w-4 mr-1" />
            Mở trong Google Maps
          </button>
        </div>
      </div>
      
      <div className="mt-4 text-gray-600">
        <p className="text-sm">
          <span className="font-medium">Giờ mở cửa:</span> 8:00 - 21:00 (Thứ 2 - Chủ Nhật)
        </p>
        <p className="text-sm mt-1">
          <span className="font-medium">Điện thoại:</span> 076.8979.028
        </p>
      </div>
    </div>
  );
}

// Main Contact Page Component
export default function ContactPage() {
  const [openFaqId, setOpenFaqId] = useState(1);

  const toggleFaq = (id) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-16">
        
        {/* Page Header */}
        <div className="text-center mb-12 mt-12">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#2D2D2D] mb-4 tracking-tight">
            Chúng tôi luôn sẵn lòng lắng nghe
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Hãy liên hệ với The Book Store nếu bạn có bất kỳ câu hỏi nào hoặc cần hỗ trợ. 
            Chúng tôi sẽ phản hồi trong vòng 24 giờ làm việc.
          </p>
        </div>

        {/* Contact Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {/* Address */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="bg-[#008080]/10 p-3 rounded-full mb-4">
                <MapPinIcon className="h-6 w-6 text-[#008080]" />
              </div>
              <h3 className="text-lg font-semibold text-[#2D2D2D] mb-2">Địa chỉ Cửa hàng</h3>
              <p className="text-gray-600">
                35/6, đường TTH-15, khu phố 3A, P. Tân Thới Hiệp, Quận 12, TP.HCM
              </p>
            </div>
          </div>

          {/* Email */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="bg-[#008080]/10 p-3 rounded-full mb-4">
                <EnvelopeIcon className="h-6 w-6 text-[#008080]" />
              </div>
              <h3 className="text-lg font-semibold text-[#2D2D2D] mb-2">Gửi Email cho chúng tôi</h3>
              <p className="text-gray-600">
                hotro@thebookstore.vn
              </p>
            </div>
          </div>

          {/* Phone */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="bg-[#008080]/10 p-3 rounded-full mb-4">
                <PhoneIcon className="h-6 w-6 text-[#008080]" />
              </div>
              <h3 className="text-lg font-semibold text-[#2D2D2D] mb-2">Gọi ngay để được hỗ trợ</h3>
              <p className="text-gray-600">
                076.8979.028
                <span className="block text-sm text-gray-500 mt-1">(8:00 - 21:00)</span>
              </p>
            </div>
          </div>
        </div>

        {/* Main Contact Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-16">
          <div className="order-1 lg:order-none">
            <ContactForm />
          </div>
          <div className="h-full">
            <InteractiveMap />
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 md:p-8">
          <h2 className="text-2xl font-serif font-semibold text-[#2D2D2D] mb-8 text-center">
            Các câu hỏi thường gặp
          </h2>
          
          <div className="max-w-3xl mx-auto">
            {faqs.map((faq) => (
              <FaqItem
                key={faq.id}
                faq={faq}
                isOpen={openFaqId === faq.id}
                toggleOpen={() => toggleFaq(faq.id)}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}