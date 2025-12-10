import React, { useEffect, useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { getSlideContents, updateSlideContent, getBooks, getStationery } from '../../service/api.js';

const SlideEditor = ({ slideNumber, content, onSave, books, stationery }) => {
  const [title, setTitle] = useState(content?.title || '');
  const [body, setBody] = useState(content?.body || '');
  const [titleFontSize, setTitleFontSize] = useState(content?.title_font_size || '32');
  const [bodyFontSize, setBodyFontSize] = useState(content?.body_font_size || '18');
  const [titleFontFamily, setTitleFontFamily] = useState(content?.title_font_family || 'Arial');
  const [bodyFontFamily, setBodyFontFamily] = useState(content?.body_font_family || 'Arial');
  const [titleColor, setTitleColor] = useState(content?.title_color || '#111827');
  const [bodyColor, setBodyColor] = useState(content?.body_color || '#6b7280');
  const [primaryBtnBg, setPrimaryBtnBg] = useState(content?.primary_button_bg_color || '#008080');
  const [primaryBtnText, setPrimaryBtnText] = useState(content?.primary_button_text_color || '#ffffff');
  const [primaryBtnLabel, setPrimaryBtnLabel] = useState(content?.primary_button_label || 'Explore Books');
  const [primaryBtnUrl, setPrimaryBtnUrl] = useState(content?.primary_button_url || '/categories');
  const [secondaryBtnBg, setSecondaryBtnBg] = useState(content?.secondary_button_bg_color || '#ffffff');
  const [secondaryBtnText, setSecondaryBtnText] = useState(content?.secondary_button_text_color || '#374151');
  const [secondaryBtnLabel, setSecondaryBtnLabel] = useState(content?.secondary_button_label || 'New Arrivals');
  const [secondaryBtnUrl, setSecondaryBtnUrl] = useState(content?.secondary_button_url || '/new-arrivals');
  const [imageWidth, setImageWidth] = useState(content?.image_width || '600');
  const [imageHeight, setImageHeight] = useState(content?.image_height || '400');
  const [selectedType, setSelectedType] = useState(content?.selected_item_type || '');
  const [selectedId, setSelectedId] = useState(content?.selected_item_id || '');
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setTitle(content?.title || '');
    setBody(content?.body || '');
    setTitleFontSize(content?.title_font_size || '32');
    setBodyFontSize(content?.body_font_size || '18');
    setTitleFontFamily(content?.title_font_family || 'Arial');
    setBodyFontFamily(content?.body_font_family || 'Arial');
    setTitleColor(content?.title_color || '#111827');
    setBodyColor(content?.body_color || '#6b7280');
    setPrimaryBtnBg(content?.primary_button_bg_color || '#008080');
    setPrimaryBtnText(content?.primary_button_text_color || '#ffffff');
    setPrimaryBtnLabel(content?.primary_button_label || 'Explore Books');
    setPrimaryBtnUrl(content?.primary_button_url || '/categories');
    setSecondaryBtnBg(content?.secondary_button_bg_color || '#ffffff');
    setSecondaryBtnText(content?.secondary_button_text_color || '#374151');
    setSecondaryBtnLabel(content?.secondary_button_label || 'New Arrivals');
    setSecondaryBtnUrl(content?.secondary_button_url || '/new-arrivals');
    setImageWidth(content?.image_width || '600');
    setImageHeight(content?.image_height || '400');
    setSelectedType(content?.selected_item_type || '');
    setSelectedId(content?.selected_item_id || '');
  }, [content]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(slideNumber, { 
        title, 
        body,
        title_font_size: titleFontSize,
        body_font_size: bodyFontSize,
        title_font_family: titleFontFamily,
        body_font_family: bodyFontFamily,
        image_width: imageWidth,
        image_height: imageHeight,
        title_color: titleColor,
        body_color: bodyColor,
        primary_button_bg_color: primaryBtnBg,
        primary_button_text_color: primaryBtnText,
        primary_button_label: primaryBtnLabel || null,
        primary_button_url: primaryBtnUrl || null,
        secondary_button_bg_color: secondaryBtnBg,
        secondary_button_text_color: secondaryBtnText,
        secondary_button_label: secondaryBtnLabel || null,
        secondary_button_url: secondaryBtnUrl || null,
        selected_item_type: selectedType || null,
        selected_item_id: selectedId ? Number(selectedId) : null,
      });
      showToast({ title: 'Đã lưu', message: `Đã lưu nội dung cho Slide #${slideNumber}`, type: 'success' });
    } catch (err) {
      showToast({ title: 'Lỗi', message: 'Lỗi khi lưu nội dung, vui lòng thử lại.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Slide #{slideNumber}</h3>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Nhập tiêu đề slide"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Nhập nội dung mô tả"
          />
        </div>
        
        {/* Font size controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cỡ chữ tiêu đề (px)</label>
            <input
              type="number"
              value={titleFontSize}
              onChange={(e) => setTitleFontSize(e.target.value)}
              min="12"
              max="72"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="32"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cỡ chữ nội dung (px)</label>
            <input
              type="number"
              value={bodyFontSize}
              onChange={(e) => setBodyFontSize(e.target.value)}
              min="12"
              max="48"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="18"
            />
          </div>
        </div>

        {/* Font family controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Font chữ tiêu đề</label>
            <select
              value={titleFontFamily}
              onChange={(e) => setTitleFontFamily(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
              <option value="Tahoma">Tahoma</option>
              <option value="Trebuchet MS">Trebuchet MS</option>
              <option value="Impact">Impact</option>
              <option value="Comic Sans MS">Comic Sans MS</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Font chữ nội dung</label>
            <select
              value={bodyFontFamily}
              onChange={(e) => setBodyFontFamily(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
              <option value="Tahoma">Tahoma</option>
              <option value="Trebuchet MS">Trebuchet MS</option>
              <option value="Impact">Impact</option>
              <option value="Comic Sans MS">Comic Sans MS</option>
            </select>
          </div>
        </div>

        {/* Image size controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chiều rộng ảnh (px)</label>
            <input
              type="number"
              value={imageWidth}
              onChange={(e) => setImageWidth(e.target.value)}
              min="200"
              max="1200"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chiều cao ảnh (px)</label>
            <input
              type="number"
              value={imageHeight}
              onChange={(e) => setImageHeight(e.target.value)}
              min="150"
              max="800"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="400"
            />
          </div>
        </div>

        {/* Color controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Màu tiêu đề</label>
            <div className="flex items-center gap-3">
              <input type="color" value={titleColor} onChange={(e) => setTitleColor(e.target.value)} />
              <input
                type="text"
                value={titleColor}
                onChange={(e) => setTitleColor(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Màu nội dung</label>
            <div className="flex items-center gap-3">
              <input type="color" value={bodyColor} onChange={(e) => setBodyColor(e.target.value)} />
              <input
                type="text"
                value={bodyColor}
                onChange={(e) => setBodyColor(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nút chính - nền</label>
            <div className="flex items-center gap-3">
              <input type="color" value={primaryBtnBg} onChange={(e) => setPrimaryBtnBg(e.target.value)} />
              <input
                type="text"
                value={primaryBtnBg}
                onChange={(e) => setPrimaryBtnBg(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nút chính - chữ</label>
            <div className="flex items-center gap-3">
              <input type="color" value={primaryBtnText} onChange={(e) => setPrimaryBtnText(e.target.value)} />
              <input
                type="text"
                value={primaryBtnText}
                onChange={(e) => setPrimaryBtnText(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung Nút chính</label>
            <input
              type="text"
              value={primaryBtnLabel}
              onChange={(e) => setPrimaryBtnLabel(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="Ví dụ: Khám phá Sách"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nút chính - URL</label>
            <input
              type="text"
              value={primaryBtnUrl}
              onChange={(e) => setPrimaryBtnUrl(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="Ví dụ: /categories hoặc https://example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nút phụ - nền</label>
            <div className="flex items-center gap-3">
              <input type="color" value={secondaryBtnBg} onChange={(e) => setSecondaryBtnBg(e.target.value)} />
              <input
                type="text"
                value={secondaryBtnBg}
                onChange={(e) => setSecondaryBtnBg(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nút phụ - chữ</label>
            <div className="flex items-center gap-3">
              <input type="color" value={secondaryBtnText} onChange={(e) => setSecondaryBtnText(e.target.value)} />
              <input
                type="text"
                value={secondaryBtnText}
                onChange={(e) => setSecondaryBtnText(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung Nút phụ</label>
            <input
              type="text"
              value={secondaryBtnLabel}
              onChange={(e) => setSecondaryBtnLabel(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="Ví dụ: Hàng mới về"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nút phụ - URL</label>
            <input
              type="text"
              value={secondaryBtnUrl}
              onChange={(e) => setSecondaryBtnUrl(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="Ví dụ: /new-arrivals hoặc https://example.com"
            />
          </div>
        </div>

        {/* Item selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại sản phẩm hiển thị</label>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setSelectedId('');
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Không chọn</option>
              <option value="book">Sách</option>
              <option value="stationery">Văn phòng phẩm</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chọn sản phẩm</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={!selectedType}
              className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100"
            >
              <option value="">{selectedType ? 'Chọn một mục' : 'Chọn loại trước'}</option>
              {selectedType === 'book' && (books || []).map((b) => (
                <option key={b.book_id} value={b.book_id}>{b.title}</option>
              ))}
              {selectedType === 'stationery' && (stationery || []).map((s) => (
                <option key={s.stationery_id} value={s.stationery_id}>{s.title}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : 'Lưu' }
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AdminHeroSlides() {
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState([]);
  const [stationery, setStationery] = useState([]);
  const [activeSlide, setActiveSlide] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSlideContents();
        setContents(data || []);
        // Fetch options for dropdowns
        try {
          const bookList = await getBooks({ limit: 50 });
          setBooks(Array.isArray(bookList) ? bookList : []);
        } catch {}
        try {
          const stationeryList = await getStationery({ limit: 50 });
          setStationery(Array.isArray(stationeryList) ? stationeryList : []);
        } catch {}
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const contentByNumber = (n) => contents.find((c) => c.slide_number === n) || { slide_number: n, title: '', body: '' };

  const handleSave = async (slideNumber, payload) => {
    const updated = await updateSlideContent(slideNumber, payload);
    setContents((prev) => {
      const others = prev.filter((c) => c.slide_number !== slideNumber);
      return [...others, updated].sort((a, b) => a.slide_number - b.slide_number);
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Quản lý nội dung Hero Section</h2>
      <p className="text-gray-600">Chỉnh sửa tiêu đề và nội dung cho 3 slide ở trang chủ.</p>
      <div className="flex items-center gap-2">
        {[1,2,3].map((n) => (
          <button
            key={n}
            onClick={() => setActiveSlide(n)}
            className={`px-4 py-2 rounded-md border transition-colors ${activeSlide === n ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >
            {`Slide ${n}`}
          </button>
        ))}
      </div>
      <div>
        <SlideEditor
          slideNumber={activeSlide}
          content={contentByNumber(activeSlide)}
          onSave={handleSave}
          books={books}
          stationery={stationery}
        />
      </div>
    </div>
  );
}
