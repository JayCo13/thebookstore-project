import React from 'react';

export default function ContactPage() {
    return (
        <section className="min-h-screen bg-white pt-32 pb-20">
            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-3xl md:text-4xl font-bold text-[#2D2D2D] mb-4">
                        Liên Hệ Với Chúng Tôi
                    </h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Chúng tôi luôn sẵn sàng hỗ trợ bạn. Liên hệ với chúng tôi qua các kênh bên dưới.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Contact Information */}
                    <div className="space-y-6">
                        {/* Info Cards */}
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-[#008080]/10 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6 text-[#008080]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[#2D2D2D] text-lg mb-1">Địa chỉ</h3>
                                    <p className="text-gray-600">35/6 đường TTH15 Tổ 30 KP3A</p>
                                    <p className="text-gray-600">Quận 12, Thành phố Hồ Chí Minh, Việt Nam</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-[#008080]/10 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6 text-[#008080]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[#2D2D2D] text-lg mb-1">Điện thoại</h3>
                                    <a href="tel:0798979028" className="text-gray-600 hover:text-[#008080] transition-colors">
                                        0798 979 028
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-[#008080]/10 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6 text-[#008080]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[#2D2D2D] text-lg mb-1">Email</h3>
                                    <a href="mailto:Thebookstore.vn@gmail.com" className="text-gray-600 hover:text-[#008080] transition-colors">
                                        Thebookstore.vn@gmail.com
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-[#008080]/10 flex items-center justify-center flex-shrink-0">
                                    <img src="/assets/zaloicon.webp" alt="Zalo" className="w-6 h-6 object-contain" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[#2D2D2D] text-lg mb-1">Zalo</h3>
                                    <a
                                        href="https://zalo.me/0798979028"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-600 hover:text-[#008080] transition-colors"
                                    >
                                        0798 979 028
                                    </a>
                                </div>
                            </div>
                        </div>



                        {/* Business Hours */}
                        <div className="bg-[#008080]/5 border border-[#008080]/20 rounded-2xl p-6">
                            <h3 className="font-semibold text-[#2D2D2D] text-lg mb-3 flex items-center gap-2">
                                <svg className="w-5 h-5 text-[#008080]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Giờ làm việc
                            </h3>
                            <div className="space-y-2 text-gray-600">
                                <div className="flex justify-between">
                                    <span>Thứ 2 - Thứ 6:</span>
                                    <span className="font-medium">8:00 - 21:00</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Thứ 7 - Chủ nhật:</span>
                                    <span className="font-medium">9:00 - 18:00</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Map - Full Height */}
                    <div className="lg:sticky lg:top-32 h-[600px] lg:h-[700px]">
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden h-full">
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3918.214!2d106.6285!3d10.8700!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTDCsDUyJzEyLjAiTiAxMDbCsDM3JzQyLjYiRQ!5e0!3m2!1svi!2s!4v1701234567890!5m2!1svi!2s"
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen=""
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="Vị trí cửa hàng Tâm Nguồn Book"
                                className="hover:grayscale-0 transition-all duration-500"
                            ></iframe>
                        </div>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="mt-16">
                    <h2 className="text-2xl font-bold text-[#2D2D2D] text-center mb-8">Câu Hỏi Thường Gặp</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                            <h3 className="font-semibold text-[#2D2D2D] mb-2">Thời gian giao hàng là bao lâu?</h3>
                            <p className="text-gray-600 text-sm">Đơn hàng sẽ được giao trong vòng 2-5 ngày làm việc tùy theo khu vực. Nội thành TP.HCM thường nhận hàng trong 1-2 ngày.</p>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                            <h3 className="font-semibold text-[#2D2D2D] mb-2">Có hỗ trợ đổi trả không?</h3>
                            <p className="text-gray-600 text-sm">Chúng tôi hỗ trợ đổi trả trong vòng 7 ngày kể từ khi nhận hàng nếu sản phẩm còn nguyên seal hoặc bị lỗi từ nhà sản xuất.</p>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                            <h3 className="font-semibold text-[#2D2D2D] mb-2">Phương thức thanh toán nào được chấp nhận?</h3>
                            <p className="text-gray-600 text-sm">Chúng tôi chấp nhận thanh toán COD (khi nhận hàng), chuyển khoản ngân hàng, MoMo và ZaloPay.</p>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                            <h3 className="font-semibold text-[#2D2D2D] mb-2">Làm sao để theo dõi đơn hàng?</h3>
                            <p className="text-gray-600 text-sm">Sau khi đặt hàng, bạn sẽ nhận được mã vận đơn qua Zalo. Bạn có thể theo dõi trạng thái đơn hàng trong trang "Đơn hàng của tôi".</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
