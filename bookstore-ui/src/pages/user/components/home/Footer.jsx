'use client';

import { useState, useEffect } from 'react';
import Link from '../../compat/Link';
import { getStationery, getStationeryCategories } from '../../../../service/api';

export default function Footer() {
    const [hasStationeryItems, setHasStationeryItems] = useState(false);

    // Check if non-Yoga stationery items exist
    useEffect(() => {
        const checkStationeryItems = async () => {
            try {
                const categoriesResponse = await getStationeryCategories();
                const allCategories = Array.isArray(categoriesResponse) ? categoriesResponse : (categoriesResponse?.data || []);

                const yogaCats = allCategories.filter(cat =>
                    cat.name.toLowerCase().includes('yoga')
                );
                const yogaIds = yogaCats.map(cat => cat.category_id);

                const response = await getStationery({ skip: 0, limit: 10 });
                const allItems = Array.isArray(response) ? response : (response?.data || []);

                const nonYogaItems = allItems.filter(item => {
                    if (!item.categories || item.categories.length === 0) return true;
                    const hasYogaCategory = item.categories.some(cat => yogaIds.includes(cat.category_id));
                    return !hasYogaCategory;
                });

                setHasStationeryItems(nonYogaItems.length > 0);
            } catch (err) {
                console.error('Error checking stationery items:', err);
                setHasStationeryItems(false);
            }
        };

        checkStationeryItems();
    }, []);

    return (
        <footer className="bg-white border-t border-gray-200">
            <div className="max-w-8xl mx-auto px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Logo & Description Column */}
                    <div className="lg:col-span-3 mt-4">
                        <div className="mb-4">
                            <img src="/assets/logi.jpg" alt="Book Tâm Nguồn" className="w-58 h-40 mb-4" />
                        </div>
                    </div>

                    {/* Navigation Columns Group */}
                    <div className="lg:col-span-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                        {/* Shop Column */}
                        <div>
                            <h3 className="text-md font-bold text-gray-900 uppercase tracking-wider mb-4">Mua Sắm</h3>
                            <ul className="space-y-3 font-semibold">
                                <li><Link href="/books" className="text-md text-gray-600 hover:text-[#008080] transition-colors">Sách Mới</Link></li>
                                <li><Link href="/yoga" className="text-md text-gray-600 hover:text-[#008080] transition-colors">Dụng cụ Yoga</Link></li>
                                {hasStationeryItems && (
                                    <li><Link href="/van-phong-pham" className="text-md text-gray-600 hover:text-[#008080] transition-colors">Văn Phòng Phẩm</Link></li>
                                )}
                                <li><Link href="/books?bestSeller=1" className="text-md text-gray-600 hover:text-[#008080] transition-colors">Bán Chạy</Link></li>
                            </ul>
                        </div>

                        {/* About Column */}
                        <div>
                            <h3 className="text-md font-bold text-gray-900 uppercase tracking-wider mb-4">Về Chúng Tôi</h3>
                            <ul className="space-y-3 font-semibold">
                                <li><Link href="/about" className="text-md text-gray-600 hover:text-[#008080] transition-colors">Giới thiệu</Link></li>
                                <li><Link href="/contact" className="text-md text-gray-600 hover:text-[#008080] transition-colors">Liên Hệ</Link></li>
                            </ul>
                        </div>

                        {/* Policy Column */}
                        <div>
                            <h3 className="text-md font-bold text-gray-900 uppercase tracking-wider mb-4">Chính Sách</h3>
                            <ul className="space-y-3 font-semibold">
                                <li><Link href="/chinh-sach-bao-mat" className="text-md text-gray-600 hover:text-[#008080] transition-colors">Chính sách bảo mật</Link></li>
                                <li><Link href="/dieu-khoan-dich-vu" className="text-md text-gray-600 hover:text-[#008080] transition-colors">Điều khoản dịch vụ</Link></li>
                                <li><Link href="/van-chuyen-doi-tra" className="text-md text-gray-600 hover:text-[#008080] transition-colors">Vận chuyển & Đổi trả</Link></li>
                            </ul>
                        </div>

                        {/* Support Column */}
                        <div>
                            <h3 className="text-md font-bold text-gray-900 uppercase tracking-wider mb-4">Hỗ Trợ</h3>
                            <ul className="space-y-3 font-semibold">
                                <li><Link href="/contact" className="text-md text-gray-600 hover:text-[#008080] transition-colors">Liên hệ hỗ trợ</Link></li>
                                <li><Link href="/kha-nang-truy-cap" className="text-md text-gray-600 hover:text-[#008080] transition-colors">Khả năng truy cập</Link></li>
                            </ul>
                        </div>
                    </div>

                    {/* Contact Information Column */}
                    <div className="lg:col-span-3">
                        <h3 className="text-md font-bold text-gray-900 uppercase tracking-wider mb-4">Liên Hệ</h3>
                        <div className="space-y-3 font-semibold">
                            <div className="flex items-start">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <a href="mailto:info@booktamnguon.vn" className="text-md text-gray-600 hover:text-[#008080] transition-colors">Thebookstore.vn@gmail.com</a>
                            </div>
                            <div className="flex items-start">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <a href="tel:0964996195" className="text-md text-gray-600 hover:text-[#008080] transition-colors">0798979028</a>
                            </div>
                            <div className="flex items-start">
                                <p className="mr-3 text-gray-500">Zalo</p>
                                <a href="https://zalo.me/0798979028" className="text-md text-gray-600 hover:text-[#008080] transition-colors">0798979028</a>
                            </div>
                            <div className="flex items-start">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="text-md text-gray-600">35/6 đường TTH15 Tổ 30 KP3A, Quận 12, Thành phố Hồ Chí Minh, Việt Nam</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Partners Section */}
                <div className="border-gray-200 mt-5">
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 lg:gap-16">
                        <div className="flex items-center justify-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow duration-300">
                            <img
                                src="/assets/momo.png"
                                alt="MoMo"
                                className="h-12 md:h-14 lg:h-16 w-auto object-contain hover:grayscale-0 transition-all duration-300"
                            />
                        </div>
                        <div className="flex items-center justify-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow duration-300">
                            <img
                                src="/assets/zalo.png"
                                alt="Zalo Pay"
                                className="h-12 md:h-14 lg:h-16 w-auto object-contain hover:grayscale-0 transition-all duration-300"
                            />
                        </div>
                        <div className="flex items-center justify-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow duration-300">
                            <img
                                src="/assets/ghn.png"
                                alt="Giao Hàng Nhanh"
                                className="h-12 md:h-14 lg:h-16 w-auto object-contain hover:grayscale-0 transition-all duration-300"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-200 text-center text-gray-500 text-lg">
                    <p>&copy; 2021 Tâm Nguồn Book. All Right Reserved.</p>
                </div>
            </div>
        </footer>
    );
}