import Image from "../compat/Image";

export default function AboutPage() {
  return (
    <section className="min-h-[80vh] pt-40 pb-20 px-4 md:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto soft-rise">
        {/* CEO Spotlight */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center justify-center">
          {/* Left: Circular gradient background with portrait overlay */}
          <div className="relative flex items-center justify-center float-slow bw-frame rounded-full p-3 bg-white">
            {/* Gradient circle background */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[56%] max-w-sm aspect-square rounded-full bg-white border-4 border-black" />
            </div>

            {/* Portrait (circular) */}
            <div className="relative z-10 w-[95%] max-w-xs aspect-square rounded-full overflow-hidden shadow-sm ring-2 ring-black animate-float-slow">
              <Image src="/assets/ceo.jpg" alt="CEO Portrait" fill className="object-cover" />
            </div>
          </div>

          {/* Right: Intro and CTAs */}
          <div className="text-center md:text-left fade-in-up">
            <h1 className="text-3xl md:text-4xl font-semibold text-[#2D2D2D] tracking-tight">Mr. Phương Trịnh</h1>
             <p className="mt-2 text-gray-600 leading-relaxed">- CEO & Nhà Sáng Lập The Book Store</p>
             <p className="mt-2 text-gray-600 leading-relaxed">- PGĐ Phương Nam Book</p>
            <div className="mt-4 space-y-4 text-gray-800 leading-relaxed max-w-prose">
              <p>Tôi là một người kết hợp giữa marketing và viết lách, thường được truyền cảm hứng bởi những cuốn sách hay và sự chính xác trong từng dấu phẩy.</p>
              <p>Tôi được biết đến với khả năng xây dựng các chiến lược kết nối độc giả và biến những tựa sách tuyệt vời thành những cuộc trò chuyện lâu dài.</p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 justify-center md:justify-start">
              <a href="/" className="px-5 py-3 rounded-md border border-black text-black font-medium hover:bg-black/5 transition">VỀ CHÚNG TÔI</a>
            </div>
          </div>
        </div>

        {/* Company Story Section */}
        <div className="mt-24 relative overflow-hidden rounded-2xl bw-frame bg-white p-8 md:p-12">
          {/* Subtle monochrome accents */}
          <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 bg-black/5 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 bg-black/5 rounded-full blur-3xl" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
            {/* Left: Logo Image */}
            <div className="relative h-[200px] md:h-[300px] rounded-xl overflow-hidden">
              <img
                src="/assets/logo.jpg"
                alt="Logo The Book Store" 
                className="w-full h-full object-contain" 
              />
            </div>
            
            {/* Right: Story */}
            <div className="fade-in-up">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-black mb-6">
                Câu Chuyện Của The Book Store
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  Câu chuyện của chúng tôi không bắt đầu từ một kế hoạch kinh doanh lớn lao, 
                  mà từ một tình yêu đơn giản với mùi giấy mới và sức nặng của tri thức trên tay. 
                  Từ một góc nhỏ trên mạng xã hội, chúng tôi đã ấp ủ giấc mơ về một 'ngôi nhà' 
                  cho những tâm hồn đồng điệu.
                </p>
                <p>
                  Năm 2018, The Book Store chính thức ra đời với vỏn vẹn 100 đầu sách và một 
                  niềm tin mãnh liệt: sách không chỉ là kiến thức, mà còn là cầu nối giữa 
                  những con người. Chúng tôi bắt đầu bằng việc tuyển chọn từng cuốn sách, 
                  đọc và cảm nhận trước khi giới thiệu đến độc giả.
                </p>
                <p>
                  Ngày hôm nay, với hơn 10,000 đầu sách và một cộng đồng hơn 50,000 độc giả, 
                  chúng tôi vẫn giữ nguyên tâm niệm ban đầu: mỗi cuốn sách gửi đi là một 
                  lời mời gọi khám phá, một cơ hội kết nối, và một hạt giống tri thức được gieo mầm.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="/contact" className="px-5 py-3 rounded-md bg-black text-white font-medium hover:bg-[#4a6b5a] transition">Liên Hệ Với Chúng Tôi</a>
                <a href="/books" className="px-5 py-3 rounded-md border border-black text-black font-medium hover:bg-black/5 transition">Khám Phá Sách</a>
              </div>
            </div>
          </div>
        </div>

        {/* Mission Section */}
        <div className="mt-24 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-black mb-6">
            Sứ Mệnh Của Chúng Tôi
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            Tại The Book Store, chúng tôi tin rằng mỗi cuốn sách đều có sức mạnh thay đổi. 
            Sứ mệnh của chúng tôi là tuyển chọn và mang đến những đầu sách giá trị, 
            xây dựng một cộng đồng nơi những người yêu sách có thể kết nối, 
            chia sẻ và cùng nhau lan tỏa tri thức.
          </p>
        </div>

        {/* Values Grid */}
        <div className="mt-24">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-black mb-12 text-center">
            Những Gì Chúng Tôi Tin Tưởng
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 bw-frame">
              <div className="flex justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[#547B6A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-black mb-3 text-center">
                Sách Tuyển Chọn Kỹ Lưỡng
              </h3>
              <p className="text-gray-600 text-center">
                Mỗi cuốn sách trên kệ đều được chúng tôi đọc và lựa chọn cẩn thận, đảm bảo mang lại giá trị thực sự cho độc giả.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 bw-frame">
              <div className="flex justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[#547B6A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-black mb-3 text-center">
                Cộng Đồng Gắn Kết
              </h3>
              <p className="text-gray-600 text-center">
                Chúng tôi không chỉ bán sách, chúng tôi xây dựng một không gian để bạn chia sẻ đam mê và kết nối với những người cùng sở thích.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 bw-frame">
              <div className="flex justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[#547B6A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-black mb-3 text-center">
                Dịch Vụ Tận Tâm
              </h3>
              <p className="text-gray-600 text-center">
                Từ việc gói quà miễn phí đến tư vấn nhiệt tình, sự hài lòng của bạn là ưu tiên hàng đầu của chúng tôi.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action Section */}
        <div className="mt-24 py-12 bg-black rounded-xl text-white">
          <div className="max-w-4xl mx-auto text-center px-4">
            <h2 className="text-2xl md:text-3xl font-semibold mb-6">
              Ghé thăm 'kệ sách' của chúng tôi và tìm người bạn đồng hành tiếp theo của bạn.
            </h2>
            <a 
              href="/books" 
              className="inline-block bg-[#547B6A] hover:bg-[#d06b3b] text-white font-medium py-3 px-8 rounded-full transition-colors duration-300 shadow-md hover:shadow-lg"
            >
              Khám Phá Tất Cả Sách
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}