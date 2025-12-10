'use client';

export default function ShippingReturnsPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-8xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-6 mt-10">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Chính Sách Vận Chuyển & Đổi Trả</h1>
                    <p className="text-lg text-gray-600">
                        Thông tin chi tiết về vận chuyển và chính sách đổi trả của chúng tôi
                    </p>
                </div>

                <div className="space-y-8">
                    {/* Shipping Policy */}
                    <div className="bg-white rounded-lg shadow-sm p-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-3 text-[#008080]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                            Chính Sách Vận Chuyển
                        </h2>

                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-3">Thời Gian Giao Hàng</h3>
                                <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                                    <li><strong>Nội thành TP.HCM:</strong> 1-2 ngày làm việc</li>
                                    <li><strong>Các tỉnh thành lân cận:</strong> 2-3 ngày làm việc</li>
                                    <li><strong>Các tỉnh thành khác:</strong> 3-5 ngày làm việc</li>
                                    <li><strong>Vùng sâu, vùng xa:</strong> 5-7 ngày làm việc</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-3">Phí Vận Chuyển</h3>
                                <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                                    <li><strong>Miễn phí vận chuyển:</strong> Đơn hàng từ 300.000đ trở lên (nội thành TP.HCM)</li>
                                    <li><strong>Nội thành TP.HCM:</strong> 25.000đ - 35.000đ</li>
                                    <li><strong>Ngoại thành & các tỉnh:</strong> 35.000đ - 60.000đ (tùy theo khoảng cách và trọng lượng)</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-3">Đối Tác Vận Chuyển</h3>
                                <p className="text-gray-600 mb-2">
                                    Chúng tôi hợp tác với các đơn vị vận chuyển uy tín:
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                                    <li>Giao Hàng Nhanh (GHN)</li>
                                    <li>Giao Hàng Tiết Kiệm (GHTK)</li>
                                    <li>Viettel Post</li>
                                    <li>J&T Express</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-3">Theo Dõi Đơn Hàng</h3>
                                <p className="text-gray-600">
                                    Sau khi đơn hàng được gửi đi, bạn sẽ nhận được mã vận đơn qua email hoặc SMS.
                                    Bạn có thể theo dõi tình trạng đơn hàng trong mục "Đơn Hàng Của Tôi" hoặc trực tiếp
                                    trên website của đơn vị vận chuyển.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Returns Policy */}
                    <div className="bg-white rounded-lg shadow-sm p-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-3 text-[#008080]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Chính Sách Đổi Trả
                        </h2>

                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-3">Điều Kiện Đổi Trả</h3>
                                <p className="text-gray-600 mb-2">Sản phẩm được chấp nhận đổi trả khi:</p>
                                <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                                    <li>Trong vòng 7 ngày kể từ ngày nhận hàng</li>
                                    <li>Sản phẩm còn nguyên vẹn, chưa qua sử dụng</li>
                                    <li>Còn đầy đủ bao bì, tem nhãn, hóa đơn</li>
                                    <li>Không bị rách, ướt, bẩn hoặc hư hỏng</li>
                                    <li>Không thuộc danh mục sản phẩm không được đổi trả (sách điện tử, sách đã qua sử dụng)</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-3">Trường Hợp Được Đổi Trả</h3>
                                <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                                    <li>Sản phẩm bị lỗi do nhà sản xuất</li>
                                    <li>Giao sai sản phẩm</li>
                                    <li>Sản phẩm bị hư hỏng trong quá trình vận chuyển</li>
                                    <li>Không đúng mô tả trên website</li>
                                    <li>Khách hàng đổi ý (trong vòng 7 ngày và đáp ứng điều kiện)</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-3">Quy Trình Đổi Trả</h3>
                                <ol className="list-decimal list-inside space-y-2 text-gray-600 ml-4">
                                    <li>Liên hệ với bộ phận chăm sóc khách hàng qua hotline hoặc email</li>
                                    <li>Cung cấp thông tin đơn hàng và lý do đổi trả</li>
                                    <li>Đóng gói sản phẩm cẩn thận và gửi lại theo địa chỉ được hướng dẫn</li>
                                    <li>Chờ xác nhận và xử lý từ bộ phận chăm sóc khách hàng (1-3 ngày làm việc)</li>
                                    <li>Nhận sản phẩm mới hoặc hoàn tiền (7-10 ngày làm việc)</li>
                                </ol>
                            </div>

                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-3">Chi Phí Đổi Trả</h3>
                                <ul className="list-disc list-inside space-y-2 text-gray-600 ml-4">
                                    <li><strong>Lỗi từ nhà bán:</strong> Chúng tôi chịu toàn bộ chi phí vận chuyển</li>
                                    <li><strong>Khách hàng đổi ý:</strong> Khách hàng chịu chi phí vận chuyển đổi trả</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-3">Hoàn Tiền</h3>
                                <p className="text-gray-600">
                                    Sau khi nhận và kiểm tra sản phẩm đổi trả, chúng tôi sẽ hoàn tiền trong vòng 7-10 ngày làm việc
                                    qua phương thức thanh toán ban đầu hoặc chuyển khoản ngân hàng theo yêu cầu của khách hàng.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Contact Section */}
                    <div className="bg-[#008080] text-white rounded-lg p-8">
                        <h2 className="text-2xl font-semibold mb-4">Cần Hỗ Trợ?</h2>
                        <p className="mb-6">
                            Nếu bạn có bất kỳ câu hỏi nào về vận chuyển hoặc đổi trả, vui lòng liên hệ với chúng tôi:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span>Hotline: 028 1234 5678</span>
                            </div>
                            <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span>Email: info@booktamnguon.vn</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
