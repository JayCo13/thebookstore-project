'use client';

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-8xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-6 mt-10">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Chính Sách Bảo Mật</h1>
                    <p className="text-lg text-gray-600">
                        Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Giới Thiệu</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Book Tâm Nguồn cam kết bảo vệ quyền riêng tư và bảo mật thông tin cá nhân của khách hàng.
                            Chính sách bảo mật này giải thích cách chúng tôi thu thập, sử dụng, lưu trữ và bảo vệ
                            thông tin cá nhân của bạn khi sử dụng website và dịch vụ của chúng tôi.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Thông Tin Chúng Tôi Thu Thập</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">2.1. Thông Tin Cá Nhân</h3>
                                <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                                    <li>Họ tên</li>
                                    <li>Địa chỉ email</li>
                                    <li>Số điện thoại</li>
                                    <li>Địa chỉ giao hàng</li>
                                    <li>Thông tin thanh toán</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">2.2. Thông Tin Tự Động</h3>
                                <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                                    <li>Địa chỉ IP</li>
                                    <li>Loại trình duyệt</li>
                                    <li>Hệ điều hành</li>
                                    <li>Thời gian truy cập</li>
                                    <li>Trang web giới thiệu</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Cách Chúng Tôi Sử Dụng Thông Tin</h2>
                        <p className="text-gray-600 mb-3">Chúng tôi sử dụng thông tin của bạn để:</p>
                        <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                            <li>Xử lý và giao hàng đơn hàng của bạn</li>
                            <li>Gửi thông báo về đơn hàng và cập nhật giao hàng</li>
                            <li>Cải thiện trải nghiệm mua sắm của bạn</li>
                            <li>Gửi thông tin khuyến mãi và ưu đãi (nếu bạn đồng ý)</li>
                            <li>Phân tích và cải thiện dịch vụ của chúng tôi</li>
                            <li>Phát hiện và ngăn chặn gian lận</li>
                            <li>Tuân thủ các nghĩa vụ pháp lý</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Chia Sẻ Thông Tin</h2>
                        <p className="text-gray-600 mb-3">
                            Chúng tôi không bán hoặc cho thuê thông tin cá nhân của bạn cho bên thứ ba.
                            Chúng tôi chỉ chia sẻ thông tin của bạn với:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                            <li><strong>Đối tác vận chuyển:</strong> Để giao hàng đến bạn</li>
                            <li><strong>Nhà cung cấp dịch vụ thanh toán:</strong> Để xử lý thanh toán</li>
                            <li><strong>Nhà cung cấp dịch vụ IT:</strong> Để duy trì và cải thiện website</li>
                            <li><strong>Cơ quan pháp luật:</strong> Khi được yêu cầu theo quy định pháp luật</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Bảo Mật Thông Tin</h2>
                        <p className="text-gray-600 mb-3">
                            Chúng tôi áp dụng các biện pháp bảo mật kỹ thuật và tổ chức phù hợp để bảo vệ
                            thông tin cá nhân của bạn khỏi truy cập trái phép, mất mát hoặc tiết lộ:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                            <li>Mã hóa SSL/TLS cho tất cả các giao dịch</li>
                            <li>Lưu trữ dữ liệu an toàn trên máy chủ được bảo vệ</li>
                            <li>Kiểm soát truy cập nghiêm ngặt</li>
                            <li>Đào tạo nhân viên về bảo mật dữ liệu</li>
                            <li>Giám sát và kiểm tra bảo mật thường xuyên</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Cookies</h2>
                        <p className="text-gray-600 mb-3">
                            Chúng tôi sử dụng cookies và công nghệ tương tự để:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                            <li>Ghi nhớ thông tin đăng nhập của bạn</li>
                            <li>Lưu giỏ hàng của bạn</li>
                            <li>Phân tích lưu lượng truy cập website</li>
                            <li>Cá nhân hóa nội dung và quảng cáo</li>
                        </ul>
                        <p className="text-gray-600 mt-3">
                            Bạn có thể quản lý cookies thông qua cài đặt trình duyệt của mình.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Quyền Của Bạn</h2>
                        <p className="text-gray-600 mb-3">Bạn có quyền:</p>
                        <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                            <li>Truy cập và xem thông tin cá nhân của bạn</li>
                            <li>Yêu cầu sửa đổi thông tin không chính xác</li>
                            <li>Yêu cầu xóa thông tin cá nhân của bạn</li>
                            <li>Từ chối nhận email marketing</li>
                            <li>Rút lại sự đồng ý xử lý dữ liệu</li>
                            <li>Khiếu nại với cơ quan quản lý</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Lưu Trữ Dữ Liệu</h2>
                        <p className="text-gray-600">
                            Chúng tôi lưu trữ thông tin cá nhân của bạn trong thời gian cần thiết để thực hiện
                            các mục đích được nêu trong chính sách này hoặc theo yêu cầu của pháp luật.
                            Sau đó, chúng tôi sẽ xóa hoặc ẩn danh hóa thông tin của bạn một cách an toàn.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Thay Đổi Chính Sách</h2>
                        <p className="text-gray-600">
                            Chúng tôi có thể cập nhật chính sách bảo mật này theo thời gian. Mọi thay đổi sẽ được
                            đăng tải trên trang này với ngày cập nhật mới. Chúng tôi khuyến khích bạn xem lại
                            chính sách này định kỳ để cập nhật thông tin mới nhất.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Liên Hệ</h2>
                        <p className="text-gray-600 mb-3">
                            Nếu bạn có bất kỳ câu hỏi nào về chính sách bảo mật này hoặc muốn thực hiện
                            quyền của mình, vui lòng liên hệ với chúng tôi:
                        </p>
                        <div className="bg-gray-50 p-4 rounded space-y-2 text-gray-600">
                            <p><strong>Email:</strong> info@booktamnguon.vn</p>
                            <p><strong>Điện thoại:</strong> 028 1234 5678</p>
                            <p><strong>Địa chỉ:</strong> 123 Đường Nguyễn Huệ, Quận 1, TP.HCM</p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
