'use client';

export default function TermsConditionsPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-8xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-6 mt-10">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Điều Khoản Dịch Vụ</h1>
                    <p className="text-lg text-gray-600">
                        Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Chấp Nhận Điều Khoản</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Bằng việc truy cập và sử dụng website Book Tâm Nguồn, bạn đồng ý tuân thủ và bị ràng buộc
                            bởi các điều khoản và điều kiện sau đây. Nếu bạn không đồng ý với bất kỳ phần nào của
                            các điều khoản này, vui lòng không sử dụng dịch vụ của chúng tôi.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Định Nghĩa</h2>
                        <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                            <li><strong>"Chúng tôi", "Của chúng tôi":</strong> Đề cập đến Book Tâm Nguồn</li>
                            <li><strong>"Bạn", "Khách hàng":</strong> Đề cập đến người sử dụng dịch vụ</li>
                            <li><strong>"Website":</strong> Đề cập đến trang web của Book Tâm Nguồn</li>
                            <li><strong>"Sản phẩm":</strong> Đề cập đến sách và các sản phẩm khác được bán trên website</li>
                            <li><strong>"Dịch vụ":</strong> Đề cập đến tất cả các dịch vụ được cung cấp qua website</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Tài Khoản Người Dùng</h2>
                        <div className="space-y-3 text-gray-600">
                            <p>Khi tạo tài khoản, bạn cam kết:</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Cung cấp thông tin chính xác, đầy đủ và cập nhật</li>
                                <li>Bảo mật thông tin đăng nhập của bạn</li>
                                <li>Chịu trách nhiệm cho tất cả hoạt động dưới tài khoản của bạn</li>
                                <li>Thông báo ngay cho chúng tôi nếu phát hiện sử dụng trái phép</li>
                                <li>Không chia sẻ tài khoản với người khác</li>
                            </ul>
                            <p className="mt-3">
                                Chúng tôi có quyền đình chỉ hoặc chấm dứt tài khoản của bạn nếu phát hiện
                                vi phạm điều khoản dịch vụ.
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Đặt Hàng và Thanh Toán</h2>
                        <div className="space-y-3 text-gray-600">
                            <h3 className="text-lg font-medium text-gray-900">4.1. Đặt Hàng</h3>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Đơn hàng chỉ được xác nhận sau khi thanh toán thành công</li>
                                <li>Chúng tôi có quyền từ chối hoặc hủy đơn hàng trong một số trường hợp</li>
                                <li>Giá cả và tình trạng sản phẩm có thể thay đổi mà không cần báo trước</li>
                            </ul>

                            <h3 className="text-lg font-medium text-gray-900 mt-4">4.2. Thanh Toán</h3>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Tất cả giá cả được hiển thị bằng VNĐ</li>
                                <li>Thanh toán phải được thực hiện đầy đủ trước khi giao hàng (trừ COD)</li>
                                <li>Chúng tôi chấp nhận các phương thức thanh toán được liệt kê trên website</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Giao Hàng</h2>
                        <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                            <li>Thời gian giao hàng chỉ mang tính chất ước tính</li>
                            <li>Chúng tôi không chịu trách nhiệm cho việc chậm trễ do đơn vị vận chuyển</li>
                            <li>Khách hàng có trách nhiệm kiểm tra hàng hóa khi nhận</li>
                            <li>Vui lòng báo ngay nếu phát hiện hư hỏng hoặc sai sót</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Đổi Trả và Hoàn Tiền</h2>
                        <p className="text-gray-600 mb-3">
                            Chính sách đổi trả và hoàn tiền được quy định chi tiết trong trang
                            <a href="/van-chuyen-doi-tra" className="text-[#008080] hover:underline"> Chính Sách Vận Chuyển & Đổi Trả</a>.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Quyền Sở Hữu Trí Tuệ</h2>
                        <div className="space-y-3 text-gray-600">
                            <p>
                                Tất cả nội dung trên website, bao gồm nhưng không giới hạn ở văn bản, hình ảnh,
                                logo, biểu tượng, video và phần mềm, đều thuộc quyền sở hữu của Book Tâm Nguồn
                                hoặc được cấp phép sử dụng hợp pháp.
                            </p>
                            <p>Bạn không được phép:</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Sao chép, phân phối hoặc sửa đổi nội dung mà không có sự cho phép</li>
                                <li>Sử dụng nội dung cho mục đích thương mại</li>
                                <li>Tái tạo hoặc khai thác website theo bất kỳ cách nào</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Hành Vi Bị Cấm</h2>
                        <p className="text-gray-600 mb-3">Khi sử dụng dịch vụ, bạn không được:</p>
                        <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                            <li>Vi phạm bất kỳ luật pháp nào</li>
                            <li>Gửi spam hoặc nội dung quấy rối</li>
                            <li>Tải lên virus hoặc mã độc hại</li>
                            <li>Cố gắng truy cập trái phép vào hệ thống</li>
                            <li>Sử dụng robot, spider hoặc công cụ tự động khác</li>
                            <li>Giả mạo danh tính hoặc nguồn gốc</li>
                            <li>Thu thập thông tin người dùng khác</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Giới Hạn Trách Nhiệm</h2>
                        <div className="space-y-3 text-gray-600">
                            <p>
                                Trong phạm vi pháp luật cho phép, Book Tâm Nguồn không chịu trách nhiệm cho:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Thiệt hại gián tiếp, ngẫu nhiên hoặc do hậu quả</li>
                                <li>Mất mát dữ liệu hoặc lợi nhuận</li>
                                <li>Gián đoạn dịch vụ hoặc lỗi kỹ thuật</li>
                                <li>Nội dung của bên thứ ba</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Bồi Thường</h2>
                        <p className="text-gray-600">
                            Bạn đồng ý bồi thường và giữ cho Book Tâm Nguồn không bị thiệt hại khỏi bất kỳ
                            khiếu nại, tổn thất, trách nhiệm pháp lý, chi phí hoặc phí tổn nào phát sinh từ
                            việc bạn vi phạm các điều khoản này hoặc sử dụng dịch vụ không đúng cách.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Thay Đổi Điều Khoản</h2>
                        <p className="text-gray-600">
                            Chúng tôi có quyền sửa đổi các điều khoản này bất cứ lúc nào. Các thay đổi sẽ có
                            hiệu lực ngay khi được đăng tải trên website. Việc bạn tiếp tục sử dụng dịch vụ
                            sau khi có thay đổi đồng nghĩa với việc bạn chấp nhận các điều khoản mới.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Luật Áp Dụng</h2>
                        <p className="text-gray-600">
                            Các điều khoản này được điều chỉnh và giải thích theo pháp luật Việt Nam.
                            Mọi tranh chấp phát sinh sẽ được giải quyết tại Tòa án có thẩm quyền tại TP.HCM.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Liên Hệ</h2>
                        <p className="text-gray-600 mb-3">
                            Nếu bạn có câu hỏi về các điều khoản này, vui lòng liên hệ:
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
