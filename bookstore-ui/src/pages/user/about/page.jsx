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
            <h1 className="text-4xl md:text-4xl font-semibold text-[#2D2D2D] tracking-tight mb-5">Mr. Phương Trịnh</h1>
            <p className="mt-2 text-gray-800 leading-relaxed text-lg mb-3">- CEO & Nhà Sáng Lập Tâm Nguồn Book</p>
            <p className="mt-2 text-gray-800 leading-relaxed text-lg mb-3">- PGĐ Phương Nam Book</p>
            <div className="mt-4 space-y-4 text-gray-600 leading-relaxed max-w-prose">
              <i className="text-2xl">"Trao tặng yêu thương - lan tỏa tri thức"</i>
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
                src="/assets/logo-left.png"
                alt="Logo TÂM NGUỒN BOOK"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Right: Story */}
            <div className="fade-in-up">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-black mb-6">
                Câu Chuyện Của Tâm Nguồn Book
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  <i className="font-bold mr-1">TÂM NGUỒN BOOK</i> là nơi giới thiệu, xuất bản và phân phối xuất bản phẩm (sách) và các ấn phẩm phụ trợ uy tín vì mục tiêu lan tỏa tri thức; kết nối bạn đọc với tác giả.
                </p>
                <p>
                  <i className="font-bold mr-1">TÂM NGUỒN BOOK</i> không chỉ là địa chỉ uy tín để chọn sách mà còn là nơi giao lưu học hỏi, chia sẻ tri thức và trao tặng nhau những món quà yêu thương, ý nghĩa.

                </p>
                <p>
                  <i className="font-bold mr-1">TÂM NGUỒN BOOK</i> hỗ trợ tư vấn xuất bản và phát hành văn hóa phẩm như: sách đọc, sách điện tử (eBook), sách nói (audiobook), lịch, sản phẩm văn hóa… Bạn có ý tưởng, bạn đam mê viết và mong muốn chia sẻ kiến thức đến mọi người, chúng tôi sẽ giúp bạn hoàn thành quyển sách của chính bạn.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="/contact" className="px-5 py-3 rounded-md bg-black text-white font-medium hover:bg-gray-800 transition">Liên Hệ Với Chúng Tôi</a>
                <a href="/books" className="px-5 py-3 rounded-md border border-black text-black font-medium hover:bg-black/5 transition">Khám Phá Sách</a>
              </div>
            </div>
          </div>
        </div>

        {/* Mission Section */}
        <div className="mt-24 max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-4 px-6 py-8 bg-gradient-to-r from-gray-50 via-white to-gray-50 rounded-2xl border border-gray-200">
            {/* Left decorative element */}
            <div className="hidden md:flex items-center gap-2">
              <div className="w-12 h-[2px] bg-gradient-to-r from-transparent to-black"></div>
              <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
            </div>

            {/* Main content */}
            <div className="text-center">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-black">
                TÂM NGUỒN BOOK
              </h2>
              <div className="flex items-center justify-center gap-3 mt-2">
                <div className="hidden sm:block w-8 h-[1px] bg-gradient-to-r from-transparent to-gray-300"></div>
                <p className="text-sm md:text-base lg:text-lg text-gray-600 font-medium italic">
                  Giải pháp toàn diện về xuất bản và phát hành văn hóa phẩm
                </p>
                <div className="hidden sm:block w-8 h-[1px] bg-gradient-to-l from-transparent to-gray-300"></div>
              </div>
            </div>

            {/* Right decorative element */}
            <div className="hidden md:flex items-center gap-2">
              <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
              <div className="w-12 h-[2px] bg-gradient-to-l from-transparent to-black"></div>
            </div>
          </div>
        </div>

        {/* Call to Action Section */}
        <div className="mt-24 py-12 bg-white rounded-xl text-black border-t border-l border-r border-black">
          <div className="max-w-4xl mx-auto text-center px-4">
            <h2 className="text-2xl md:text-3xl font-semibold mb-6">
              Ghé thăm 'kệ sách' của chúng tôi và tìm người bạn đồng hành tiếp theo của bạn.
            </h2>
            <a
              href="/books"
              className="inline-block bg-white text-black hover:bg-gray-100 font-medium py-3 px-8 rounded-full transition-colors duration-300 shadow-md hover:shadow-lg"
            >
              Khám Phá Tất Cả Sách
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}