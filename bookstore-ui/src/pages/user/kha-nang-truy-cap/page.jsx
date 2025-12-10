'use client';

export default function AccessibilityPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-8xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-6 mt-10">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Cam Kết Về Khả Năng Truy Cập</h1>
                    <p className="text-lg text-gray-600">
                        Book Tâm Nguồn cam kết cung cấp trải nghiệm mua sắm dễ tiếp cận cho tất cả mọi người
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Cam Kết Của Chúng Tôi</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Tại Book Tâm Nguồn, chúng tôi tin rằng mọi người đều có quyền tiếp cận thông tin và
                            mua sắm trực tuyến một cách dễ dàng. Chúng tôi cam kết làm cho website của mình
                            dễ tiếp cận và thân thiện với người dùng cho tất cả mọi người, bao gồm cả những
                            người khuyết tật.
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                            Chúng tôi liên tục nỗ lực cải thiện khả năng truy cập của website theo các tiêu
                            chuẩn WCAG (Web Content Accessibility Guidelines) 2.1 cấp độ AA.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Các Tính Năng Hỗ Trợ</h2>
                        <div className="space-y-4">
                            <div className="flex items-start">
                                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-[#008080] flex items-center justify-center mr-3 mt-1">
                                    <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">Điều Hướng Bằng Bàn Phím</h3>
                                    <p className="text-gray-600">
                                        Website của chúng tôi có thể được điều hướng hoàn toàn bằng bàn phím,
                                        cho phép người dùng không thể sử dụng chuột vẫn có thể truy cập tất cả các chức năng.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start">
                                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-[#008080] flex items-center justify-center mr-3 mt-1">
                                    <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">Tương Thích Với Trình Đọc Màn Hình</h3>
                                    <p className="text-gray-600">
                                        Chúng tôi sử dụng HTML ngữ nghĩa và thuộc tính ARIA để đảm bảo website
                                        hoạt động tốt với các trình đọc màn hình như JAWS, NVDA và VoiceOver.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start">
                                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-[#008080] flex items-center justify-center mr-3 mt-1">
                                    <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">Độ Tương Phản Màu Sắc</h3>
                                    <p className="text-gray-600">
                                        Chúng tôi duy trì tỷ lệ tương phản màu sắc cao giữa văn bản và nền để
                                        đảm bảo khả năng đọc tốt cho người khiếm thị hoặc mù màu.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start">
                                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-[#008080] flex items-center justify-center mr-3 mt-1">
                                    <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">Văn Bản Có Thể Thay Đổi Kích Thước</h3>
                                    <p className="text-gray-600">
                                        Người dùng có thể phóng to văn bản lên đến 200% mà không làm mất chức năng
                                        hoặc nội dung của trang.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start">
                                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-[#008080] flex items-center justify-center mr-3 mt-1">
                                    <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">Mô Tả Thay Thế Cho Hình Ảnh</h3>
                                    <p className="text-gray-600">
                                        Tất cả hình ảnh có ý nghĩa đều có văn bản thay thế (alt text) mô tả
                                        để trình đọc màn hình có thể truyền đạt thông tin cho người dùng.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start">
                                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-[#008080] flex items-center justify-center mr-3 mt-1">
                                    <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">Thiết Kế Responsive</h3>
                                    <p className="text-gray-600">
                                        Website của chúng tôi hoạt động tốt trên tất cả các thiết bị và kích thước
                                        màn hình, từ điện thoại di động đến máy tính để bàn.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Hỗ Trợ Thêm</h2>
                        <p className="text-gray-600 mb-4">
                            Ngoài các tính năng trên website, chúng tôi cũng cung cấp các dịch vụ hỗ trợ sau:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                            <li>Hỗ trợ đặt hàng qua điện thoại cho khách hàng gặp khó khăn với website</li>
                            <li>Tư vấn sản phẩm chi tiết qua điện thoại hoặc email</li>
                            <li>Giao hàng tận nơi với dịch vụ chăm sóc đặc biệt</li>
                            <li>Hỗ trợ kỹ thuật để giải quyết các vấn đề truy cập</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Phản Hồi và Cải Thiện</h2>
                        <p className="text-gray-600 mb-4">
                            Chúng tôi luôn nỗ lực cải thiện khả năng truy cập của website. Nếu bạn gặp bất kỳ
                            khó khăn nào khi sử dụng website hoặc có đề xuất về cách chúng tôi có thể cải thiện
                            khả năng truy cập, vui lòng liên hệ với chúng tôi.
                        </p>
                        <p className="text-gray-600 mb-4">
                            Phản hồi của bạn rất quan trọng đối với chúng tôi và sẽ giúp chúng tôi tiếp tục
                            cải thiện trải nghiệm cho tất cả người dùng.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Liên Hệ</h2>
                        <p className="text-gray-600 mb-4">
                            Nếu bạn cần hỗ trợ hoặc muốn báo cáo vấn đề về khả năng truy cập, vui lòng liên hệ:
                        </p>
                        <div className="bg-gray-50 p-6 rounded space-y-3">
                            <div className="flex items-center text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-[#008080]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span><strong>Điện thoại:</strong>0798979028</span>
                            </div>
                            <div className="flex items-center text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-[#008080]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span><strong>Email:</strong>Thebookstore.vn@gmail.com</span>
                            </div>
                            <div className="flex items-start text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 mt-0.5 text-[#008080]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span><strong>Địa chỉ:</strong> 35/6 đường TTH15 Tổ 30 KP3A, Quận 12, Thành phố Hồ Chí Minh, Việt Nam</span>
                            </div>
                        </div>
                    </section>

                    <section className="bg-[#008080] text-white p-6 rounded-lg">
                        <h2 className="text-xl font-semibold mb-3">Cam Kết Liên Tục</h2>
                        <p className="leading-relaxed">
                            Khả năng truy cập là một hành trình liên tục, không phải đích đến. Chúng tôi cam kết
                            tiếp tục đánh giá và cải thiện website của mình để đảm bảo rằng tất cả khách hàng
                            đều có trải nghiệm mua sắm tuyệt vời.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
