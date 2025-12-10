'use client';

export default function FAQPage() {
    const faqs = [
        {
            category: "Đặt Hàng & Thanh Toán",
            questions: [
                {
                    q: "Làm thế nào để đặt hàng trên website?",
                    a: "Bạn có thể duyệt sách, thêm vào giỏ hàng và tiến hành thanh toán. Chúng tôi chấp nhận nhiều phương thức thanh toán bao gồm thẻ tín dụng, chuyển khoản ngân hàng và thanh toán khi nhận hàng."
                },
                {
                    q: "Tôi có thể hủy đơn hàng không?",
                    a: "Bạn có thể hủy đơn hàng trước khi đơn hàng được xác nhận và đóng gói. Vui lòng liên hệ với chúng tôi ngay lập tức qua hotline hoặc email để được hỗ trợ."
                },
                {
                    q: "Các phương thức thanh toán nào được chấp nhận?",
                    a: "Chúng tôi chấp nhận thanh toán qua thẻ tín dụng/ghi nợ, chuyển khoản ngân hàng, ví điện tử và thanh toán khi nhận hàng (COD)."
                }
            ]
        },
        {
            category: "Vận Chuyển & Giao Hàng",
            questions: [
                {
                    q: "Thời gian giao hàng là bao lâu?",
                    a: "Đơn hàng trong nội thành TP.HCM thường được giao trong vòng 1-2 ngày làm việc. Đơn hàng ngoại thành và các tỉnh thành khác có thể mất 3-5 ngày làm việc."
                },
                {
                    q: "Phí vận chuyển là bao nhiêu?",
                    a: "Phí vận chuyển được tính dựa trên trọng lượng và địa điểm giao hàng. Miễn phí vận chuyển cho đơn hàng từ 300.000đ trở lên trong nội thành TP.HCM."
                },
                {
                    q: "Tôi có thể theo dõi đơn hàng của mình không?",
                    a: "Có, sau khi đơn hàng được gửi đi, bạn sẽ nhận được mã vận đơn qua email hoặc SMS để theo dõi tình trạng giao hàng."
                }
            ]
        },
        {
            category: "Đổi Trả & Hoàn Tiền",
            questions: [
                {
                    q: "Chính sách đổi trả như thế nào?",
                    a: "Bạn có thể đổi trả sách trong vòng 7 ngày kể từ ngày nhận hàng nếu sản phẩm còn nguyên vẹn, chưa qua sử dụng và còn đầy đủ bao bì."
                },
                {
                    q: "Tôi có được hoàn tiền không?",
                    a: "Có, chúng tôi sẽ hoàn tiền trong vòng 7-10 ngày làm việc sau khi nhận được sản phẩm đổi trả và xác nhận sản phẩm đạt điều kiện."
                },
                {
                    q: "Chi phí đổi trả do ai chịu?",
                    a: "Nếu sản phẩm bị lỗi do nhà sản xuất hoặc giao sai hàng, chúng tôi sẽ chịu chi phí vận chuyển. Trong các trường hợp khác, khách hàng sẽ chịu chi phí vận chuyển đổi trả."
                }
            ]
        },
        {
            category: "Tài Khoản & Bảo Mật",
            questions: [
                {
                    q: "Làm thế nào để tạo tài khoản?",
                    a: "Nhấp vào nút 'Đăng Ký' ở góc trên bên phải, điền thông tin cá nhân và xác nhận email để hoàn tất đăng ký."
                },
                {
                    q: "Tôi quên mật khẩu, phải làm sao?",
                    a: "Nhấp vào 'Quên Mật Khẩu' trên trang đăng nhập, nhập email đã đăng ký và làm theo hướng dẫn trong email để đặt lại mật khẩu."
                },
                {
                    q: "Thông tin cá nhân của tôi có được bảo mật không?",
                    a: "Chúng tôi cam kết bảo mật thông tin cá nhân của bạn theo chính sách bảo mật. Thông tin của bạn sẽ không được chia sẻ với bên thứ ba mà không có sự đồng ý của bạn."
                }
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-4xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Câu Hỏi Thường Gặp</h1>
                    <p className="text-lg text-gray-600">
                        Tìm câu trả lời cho những câu hỏi phổ biến về dịch vụ của chúng tôi
                    </p>
                </div>

                <div className="space-y-8">
                    {faqs.map((category, idx) => (
                        <div key={idx} className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-6 pb-3 border-b border-gray-200">
                                {category.category}
                            </h2>
                            <div className="space-y-6">
                                {category.questions.map((faq, qIdx) => (
                                    <div key={qIdx}>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                                            {faq.q}
                                        </h3>
                                        <p className="text-gray-600 leading-relaxed">
                                            {faq.a}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-12 bg-[#008080] text-white rounded-lg p-8 text-center">
                    <h2 className="text-2xl font-semibold mb-4">Vẫn Còn Thắc Mắc?</h2>
                    <p className="mb-6">
                        Đội ngũ hỗ trợ khách hàng của chúng tôi luôn sẵn sàng giúp đỡ bạn
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href="/contact"
                            className="bg-white text-[#008080] px-6 py-3 rounded font-medium hover:bg-gray-100 transition-colors"
                        >
                            Liên Hệ Chúng Tôi
                        </a>
                        <a
                            href="tel:02812345678"
                            className="bg-transparent border-2 border-white text-white px-6 py-3 rounded font-medium hover:bg-white hover:text-[#008080] transition-colors"
                        >
                            Gọi: 028 1234 5678
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
