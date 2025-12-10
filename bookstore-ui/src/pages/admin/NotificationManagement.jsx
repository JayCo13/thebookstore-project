import { useState, useEffect } from 'react';
import { getNotifications, createNotification, updateNotification, deleteNotification, toggleNotification } from '../../service/api';
import { getBookCoverUrl } from '../../service/api';

export default function NotificationManagement() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingNotification, setEditingNotification] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [mobileImageFile, setMobileImageFile] = useState(null);
    const [mobileImagePreview, setMobileImagePreview] = useState(null);
    const [previewMode, setPreviewMode] = useState('desktop'); // 'desktop' or 'mobile'
    const [formData, setFormData] = useState({
        message: '',
        is_active: true,
        background_color: '#008080',
        text_color: '#FFFFFF',
        text_align: 'center',
        font_weight: 'normal',
        image_url: null,
        mobile_image_url: null
    });

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const data = await getNotifications();
            setNotifications(data || []);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            alert('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleMobileImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setMobileImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setMobileImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate: must have either message or image
        if (!formData.message && !imageFile && !formData.image_url && !mobileImageFile && !formData.mobile_image_url) {
            alert('Please provide either a message or an image');
            return;
        }

        try {
            let finalData = { ...formData };

            // If there's a new image file, we'll use the preview as base64 for now
            // In production, you'd upload to server and get URL
            if (imageFile) {
                finalData.image_url = imagePreview;
            }

            // Handle mobile image
            if (mobileImageFile) {
                finalData.mobile_image_url = mobileImagePreview;
            }

            if (editingNotification) {
                await updateNotification(editingNotification.notification_id, finalData);
            } else {
                await createNotification(finalData);
            }
            await fetchNotifications();
            resetForm();
            alert(editingNotification ? 'Notification updated!' : 'Notification created!');
        } catch (error) {
            console.error('Failed to save notification:', error);
            alert('Failed to save notification');
        }
    };

    const handleEdit = (notification) => {
        setEditingNotification(notification);
        setFormData({
            message: notification.message || '',
            is_active: notification.is_active,
            background_color: notification.background_color || '#008080',
            text_color: notification.text_color || '#FFFFFF',
            text_align: notification.text_align || 'center',
            font_weight: notification.font_weight || 'normal',
            image_url: notification.image_url || null,
            mobile_image_url: notification.mobile_image_url || null
        });
        if (notification.image_url) {
            setImagePreview(notification.image_url);
        }
        if (notification.mobile_image_url) {
            setMobileImagePreview(notification.mobile_image_url);
        }
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this notification?')) return;
        try {
            await deleteNotification(id);
            await fetchNotifications();
            alert('Notification deleted!');
        } catch (error) {
            console.error('Failed to delete notification:', error);
            alert('Failed to delete notification');
        }
    };

    const handleToggle = async (id) => {
        try {
            await toggleNotification(id);
            await fetchNotifications();
        } catch (error) {
            console.error('Failed to toggle notification:', error);
            alert('Failed to toggle notification');
        }
    };

    const resetForm = () => {
        setFormData({
            message: '',
            is_active: true,
            background_color: '#008080',
            text_color: '#FFFFFF',
            text_align: 'center',
            font_weight: 'normal',
            image_url: null,
            mobile_image_url: null
        });
        setEditingNotification(null);
        setShowForm(false);
        setImageFile(null);
        setImagePreview(null);
        setMobileImageFile(null);
        setMobileImagePreview(null);
        setPreviewMode('desktop');
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('vi-VN');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008080]"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Quản Lý Thông Báo</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-4 py-2 bg-[#008080] text-white rounded-lg hover:bg-[#006666] transition-colors"
                >
                    {showForm ? 'Hủy' : '+ Tạo Thông Báo Mới'}
                </button>
            </div>

            {/* Create/Edit Form */}
            {showForm && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">
                        {editingNotification ? 'Chỉnh Sửa Thông Báo' : 'Tạo Thông Báo Mới'}
                    </h2>
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column - Form Fields */}
                            <div className="space-y-4">
                                {/* Message */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nội Dung Thông Báo (Tùy chọn nếu có hình ảnh)
                                    </label>
                                    <textarea
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#008080]"
                                        rows="3"
                                        maxLength="500"
                                        placeholder="Nhập nội dung thông báo hoặc để trống nếu chỉ dùng hình ảnh..."
                                    />
                                    <p className="text-sm text-gray-500 mt-1">
                                        {formData.message.length}/500 ký tự
                                    </p>
                                </div>

                                {/* Desktop Image Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Hình Nền Desktop (Tùy chọn)
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#008080]"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Hình ảnh sẽ được dùng làm nền cho thông báo trên máy tính
                                    </p>
                                </div>

                                {/* Mobile Image Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Hình Nền Mobile (Vuông - Tùy chọn)
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleMobileImageChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#008080]"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Hình vuông sẽ hiển thị dạng popup giữa màn hình trên điện thoại
                                    </p>
                                </div>

                                {/* Text Alignment */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Căn Chỉnh Văn Bản
                                    </label>
                                    <div className="flex gap-2">
                                        {['left', 'center', 'right'].map((align) => (
                                            <button
                                                key={align}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, text_align: align })}
                                                className={`flex-1 px-4 py-2 rounded-md border transition-colors ${formData.text_align === align
                                                    ? 'bg-[#008080] text-white border-[#008080]'
                                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {align === 'left' && '⬅️ Trái'}
                                                {align === 'center' && '⬌ Giữa'}
                                                {align === 'right' && '➡️ Phải'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Font Weight */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Độ Đậm Chữ
                                    </label>
                                    <div className="flex gap-2">
                                        {['normal', 'bold'].map((weight) => (
                                            <button
                                                key={weight}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, font_weight: weight })}
                                                className={`flex-1 px-4 py-2 rounded-md border transition-colors ${formData.font_weight === weight
                                                    ? 'bg-[#008080] text-white border-[#008080]'
                                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {weight === 'normal' ? 'Bình Thường' : 'Đậm'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Colors */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Màu Nền
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={formData.background_color}
                                                onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                                                className="h-10 w-20 rounded cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={formData.background_color}
                                                onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#008080]"
                                                placeholder="#008080"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Màu Chữ
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={formData.text_color}
                                                onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                                                className="h-10 w-20 rounded cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={formData.text_color}
                                                onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#008080]"
                                                placeholder="#FFFFFF"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="h-4 w-4 text-[#008080] focus:ring-[#008080] border-gray-300 rounded"
                                    />
                                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                                        Kích hoạt ngay (hiển thị cho người dùng)
                                    </label>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-[#008080] text-white rounded-md hover:bg-[#006666] transition-colors"
                                    >
                                        {editingNotification ? 'Cập Nhật' : 'Tạo Thông Báo'}
                                    </button>
                                    {editingNotification && (
                                        <button
                                            type="button"
                                            onClick={resetForm}
                                            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                                        >
                                            Hủy Chỉnh Sửa
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Right Column - Preview */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Xem Trước
                                    </label>
                                    <div className="flex bg-gray-100 rounded-lg p-1">
                                        <button
                                            type="button"
                                            onClick={() => setPreviewMode('desktop')}
                                            className={`px-3 py-1 text-xs rounded-md transition-colors ${previewMode === 'desktop' ? 'bg-white shadow text-[#008080]' : 'text-gray-500'}`}
                                        >
                                            Desktop
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewMode('mobile')}
                                            className={`px-3 py-1 text-xs rounded-md transition-colors ${previewMode === 'mobile' ? 'bg-white shadow text-[#008080]' : 'text-gray-500'}`}
                                        >
                                            Mobile
                                        </button>
                                    </div>
                                </div>

                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 min-h-[300px] flex items-center justify-center">
                                    {previewMode === 'desktop' ? (
                                        <div className="w-full">
                                            <p className="text-sm text-gray-600 mb-3 text-center">
                                                Hiển thị dạng banner ở cuối trang
                                            </p>
                                            <div
                                                className="relative rounded-lg shadow-2xl px-6 py-4 flex items-center justify-between gap-4 overflow-hidden"
                                                style={{
                                                    backgroundColor: imagePreview ? 'transparent' : formData.background_color,
                                                    color: formData.text_color,
                                                    backgroundImage: imagePreview ? `url(${imagePreview})` : 'none',
                                                    backgroundSize: imagePreview ? 'contain' : 'cover',
                                                    backgroundPosition: 'center',
                                                    backgroundRepeat: 'no-repeat',
                                                    minHeight: imagePreview ? '200px' : 'auto',
                                                    boxShadow: '0 10px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)'
                                                }}
                                            >
                                                {/* Close button preview */}
                                                <div className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/30 backdrop-blur-sm">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </div>

                                                {/* Content */}
                                                <div
                                                    className="flex-1 pr-12"
                                                    style={{
                                                        textAlign: formData.text_align,
                                                        fontWeight: formData.font_weight,
                                                        textShadow: imagePreview ? '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)' : 'none',
                                                        position: 'relative',
                                                        zIndex: 1
                                                    }}
                                                >
                                                    {formData.message && (
                                                        <p className="text-base leading-relaxed">
                                                            {formData.message || 'Nội dung thông báo...'}
                                                        </p>
                                                    )}
                                                    {!formData.message && !imagePreview && (
                                                        <p className="text-sm opacity-50">
                                                            Thêm văn bản hoặc hình ảnh...
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative w-[300px] h-[500px] bg-gray-200 rounded-[2rem] border-4 border-gray-800 overflow-hidden flex items-center justify-center shadow-xl">
                                            {/* Mobile Screen Mockup */}
                                            <div className="absolute inset-0 bg-white opacity-50"></div>

                                            {/* Mobile Overlay Preview */}
                                            <div className="relative z-10 w-[260px] bg-white rounded-xl shadow-2xl overflow-hidden animate-popup">
                                                <div className="relative">
                                                    {mobileImagePreview ? (
                                                        <img
                                                            src={mobileImagePreview}
                                                            alt="Mobile Preview"
                                                            className="w-full h-auto object-contain"
                                                        />
                                                    ) : (
                                                        <div
                                                            className="w-full h-[260px] flex items-center justify-center"
                                                            style={{ backgroundColor: formData.background_color }}
                                                        >
                                                            <p style={{ color: formData.text_color }} className="text-center px-4">
                                                                {formData.message || 'Chưa có hình ảnh mobile'}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Close button */}
                                                    <div className="absolute top-2 right-2 p-1 rounded-full bg-black/30 backdrop-blur-sm">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Notifications Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Nội Dung
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Trạng Thái
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Hình Ảnh
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Ngày Tạo
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Hành Động
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {notifications.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                    Chưa có thông báo nào. Tạo thông báo đầu tiên!
                                </td>
                            </tr>
                        ) : (
                            notifications.map((notification) => (
                                <tr key={notification.notification_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900 max-w-xs truncate">
                                            {notification.message || '(Không có nội dung)'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleToggle(notification.notification_id)}
                                            className={`px-3 py-1 rounded-full text-xs font-semibold ${notification.is_active
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                                }`}
                                        >
                                            {notification.is_active ? 'Đang Hoạt Động' : 'Tắt'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                                        <div className="flex gap-2">
                                            {notification.image_url && (
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">Desktop</span>
                                            )}
                                            {notification.mobile_image_url && (
                                                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">Mobile</span>
                                            )}
                                            {!notification.image_url && !notification.mobile_image_url && (
                                                <span>Không có ảnh</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(notification.created_at)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleEdit(notification)}
                                            className="text-[#008080] hover:text-[#006666] mr-4"
                                        >
                                            Sửa
                                        </button>
                                        <button
                                            onClick={() => handleDelete(notification.notification_id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Xóa
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
