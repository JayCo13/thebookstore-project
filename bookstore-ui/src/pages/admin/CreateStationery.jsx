import React, { useEffect, useState } from 'react';
import { Button, Input } from '../../components';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import {
  createStationery,
  getCategories,
  createCategory,
  uploadStationeryImage,
  uploadStationeryImage2,
  uploadStationeryImage3,
  getStaticFileUrl
} from '../../service/api';
import './CreateBook.css';
import RichEditor from '../../components/RichEditor';

const CreateStationery = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    title: '',
    slug: '',
    short_description: '',
    description: '',
    price: '',
    stock_quantity: '',
    category_ids: [],
    image_url: '',
    image2_url: '',
    image3_url: '',
    sku: '',
    // Flags similar to book
    is_best_seller: false,
    is_new: false,
    is_discount: false,
    is_free_ship: false,
    // Shipping dimensions
    height: '',
    width: '',
    length: '',
    weight: ''
  });

  // Discount state
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' | 'amount'
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountedPrice, setDiscountedPrice] = useState('');

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Image selection state (up to 3 images)
  const [selectedImages, setSelectedImages] = useState([]); // File[]
  const [imagePreviews, setImagePreviews] = useState([]); // string[]
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Category modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        const res = await getCategories();
        const data = Array.isArray(res) ? res : (res?.data || []);
        setCategories(data);
      } catch (err) {
        console.error('Failed to load categories', err);
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // Discount calculation
  useEffect(() => {
    const price = parseFloat(form.price || '');
    if (!isNaN(price)) {
      let result = '';
      if (discountType === 'percentage' && discountPercentage) {
        const p = parseFloat(discountPercentage);
        if (!isNaN(p)) {
          const calc = price - (price * p / 100);
          result = calc >= 0 ? calc.toFixed(2) : '';
        }
      } else if (discountType === 'amount' && discountAmount) {
        const a = parseFloat(discountAmount);
        if (!isNaN(a)) {
          const calc = price - a;
          result = calc >= 0 ? calc.toFixed(2) : '';
        }
      }
      setDiscountedPrice(result);
    } else {
      setDiscountedPrice('');
    }
  }, [form.price, discountType, discountPercentage, discountAmount]);

  // Images handling
  const handleImagesSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const valid = [];
    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        showToast('Vui lòng chọn tệp ảnh hợp lệ', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast('Kích thước ảnh phải nhỏ hơn 5MB', 'error');
        return;
      }
      valid.push(file);
    });
    if (!valid.length) return;
    valid.slice(0, 3).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreviews((prev) => [...prev, ev.target.result]);
      reader.readAsDataURL(file);
    });
    setSelectedImages((prev) => [...prev, ...valid.slice(0, 3)].slice(0, 3));
    if (imagePreviews.length === 0) setActiveImageIndex(0);
  };

  const removeImageAt = (idx) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
    if (activeImageIndex === idx) setActiveImageIndex(0);
    else if (activeImageIndex > idx) setActiveImageIndex((prev) => Math.max(0, prev - 1));
  };

  const handleCategorySelect = (e) => {
    const categoryId = parseInt(e.target.value, 10);
    if (!categoryId) return;
    setForm(prev => ({ ...prev, category_ids: Array.from(new Set([...(prev.category_ids || []), categoryId])) }));
    e.target.value = '';
  };

  const removeCategory = (id) => {
    setForm(prev => ({ ...prev, category_ids: (prev.category_ids || []).filter(cid => cid !== id) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        title: form.title,
        slug: form.slug?.trim() || null,
        // Map to backend schema field names
        brief_description: form.short_description || null,
        full_description: form.description || null,
        // Backend expects integer price
        price: Number.isFinite(parseFloat(form.price)) ? Math.round(parseFloat(form.price)) : 0,
        stock_quantity: parseInt(form.stock_quantity, 10) || 0,
        category_ids: (form.category_ids || []).map(n => parseInt(n, 10)).filter(Boolean),
        image_url: form.image_url || null,
        image2_url: form.image2_url || null,
        image3_url: form.image3_url || null,
        sku: form.sku?.trim() ? form.sku.trim() : null,
        is_best_seller: !!form.is_best_seller,
        is_new: !!form.is_new,
        is_discount: !!form.is_discount,
        is_free_ship: !!form.is_free_ship,
        // Dimensions & weight (backend expects *_cm and weight_grams)
        height_cm: form.height ? parseFloat(form.height) : null,
        width_cm: form.width ? parseFloat(form.width) : null,
        length_cm: form.length ? parseFloat(form.length) : null,
        weight_grams: form.weight ? Math.round(parseFloat(form.weight)) : null,
        // Discount fields (let backend compute discounted_price)
        discount_percentage: discountType === 'percentage' && discountPercentage ? parseFloat(discountPercentage) : null,
        discount_amount: discountType === 'amount' && discountAmount ? Math.round(parseFloat(discountAmount)) : null,
      };
      const created = await createStationery(payload);
      const createdId = created?.stationery_id || created?.data?.stationery_id || created?.id;

      // Upload selected images if any
      if (createdId && selectedImages.length) {
        try {
          setIsUploadingImage(true);
          if (selectedImages[0]) await uploadStationeryImage(createdId, selectedImages[0]);
          if (selectedImages[1]) await uploadStationeryImage2(createdId, selectedImages[1]);
          if (selectedImages[2]) await uploadStationeryImage3(createdId, selectedImages[2]);
        } catch (uploadErr) {
          console.error('Upload images failed', uploadErr);
          showToast('Tải ảnh thất bại một phần', 'warning');
        } finally {
          setIsUploadingImage(false);
        }
      }
      showToast('Tạo văn phòng phẩm thành công', 'success');
      navigate('/admin/stationery');
    } catch (err) {
      console.error('Create failed:', err);
      showToast('Tạo thất bại: ' + (err?.message || 'Unknown error'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Category modal handlers
  const openCategoryModal = () => {
    setCategoryForm({ name: '', description: '' });
    setShowCategoryModal(true);
  };
  const closeCategoryModal = () => {
    setShowCategoryModal(false);
  };
  const handleCategoryFormChange = (e) => {
    const { name, value } = e.target;
    setCategoryForm((prev) => ({ ...prev, [name]: value }));
  };
  const createCategoryInline = async () => {
    if (!categoryForm.name.trim()) {
      showToast('Tên danh mục là bắt buộc', 'error');
      return;
    }
    try {
      setIsCreatingCategory(true);
      const newCat = await createCategory(categoryForm);
      // Refresh categories
      const res = await getCategories();
      const data = Array.isArray(res) ? res : (res?.data || []);
      setCategories(data);
      // Auto-select
      if (newCat?.category_id) {
        setForm((prev) => ({
          ...prev,
          category_ids: Array.from(new Set([...(prev.category_ids || []), newCat.category_id]))
        }));
      }
      showToast('Tạo danh mục thành công', 'success');
      closeCategoryModal();
    } catch (error) {
      console.error('Create category failed', error);
      showToast('Tạo danh mục thất bại', 'error');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Đang tải danh mục...</div>;
  }

  return (
    <div className="create-book">
      <h1 className="title">Thêm Văn Phòng Phẩm</h1>
      <div className="grid">
        {/* Left: Product Images */}
        <div className="left-col">
          <div className="image-card">
            <div className="main-image">
              {imagePreviews.length > 0 ? (
                <img
                  src={imagePreviews[activeImageIndex]}
                  alt="Ảnh xem trước"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                />
              ) : (
                <div className="placeholder">
                  <span>Chọn ảnh</span>
                </div>
              )}
            </div>
            <div className="image-upload-section">
              <input
                type="file"
                id="stationery-image-upload"
                accept="image/*"
                multiple
                onChange={handleImagesSelect}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="upload-button"
                onClick={() => document.getElementById('stationery-image-upload').click()}
              >
                {selectedImages.length > 0 ? 'Thay đổi ảnh' : 'Chọn ảnh'}
              </button>
              {imagePreviews.length > 0 && (
                <div className="thumbnails">
                  {imagePreviews.map((src, idx) => (
                    <div
                      key={idx}
                      className={`thumbnail-item ${activeImageIndex === idx ? 'active' : ''}`}
                      onClick={() => setActiveImageIndex(idx)}
                      title={`Ảnh ${idx + 1}`}
                    >
                      <img src={src} alt={`Ảnh ${idx + 1}`} />
                      <button
                        type="button"
                        className="thumbnail-remove"
                        onClick={(e) => { e.stopPropagation(); removeImageAt(idx); }}
                        aria-label="Xóa ảnh"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Flags moved to left column */}
            <div className="subsection">
              <h3>Trạng thái</h3>
              <div className="flags">
                <label className="flag-item">
                  <input type="checkbox" name="is_best_seller" checked={form.is_best_seller} onChange={handleChange} />
                  Bán chạy
                </label>
                <label className="flag-item">
                  <input type="checkbox" name="is_new" checked={form.is_new} onChange={handleChange} />
                  Hàng mới
                </label>
                <label className="flag-item">
                  <input type="checkbox" name="is_discount" checked={form.is_discount} onChange={handleChange} />
                  Khuyến mãi
                </label>
                <label className="flag-item" style={{ background: '#e6f7e6', padding: '4px 8px', borderRadius: '4px' }}>
                  <input type="checkbox" name="is_free_ship" checked={form.is_free_ship} onChange={handleChange} />
                  🚚 Miễn phí vận chuyển
                </label>
              </div>
            </div>

            {/* Discount moved to left column */}
            <div className="subsection">
              <h3>Giảm giá</h3>
              <div className="discount-type">
                <label className="flag-item">
                  <input type="radio" name="discountType" checked={discountType === 'percentage'} onChange={() => setDiscountType('percentage')} />
                  Theo phần trăm
                </label>
                <label className="flag-item">
                  <input type="radio" name="discountType" checked={discountType === 'amount'} onChange={() => setDiscountType('amount')} />
                  Theo số tiền
                </label>
              </div>
              {discountType === 'percentage' ? (
                <label>
                  Phần trăm giảm (%)
                  <Input type="number" min="0" max="100" step="0.01" value={discountPercentage} onChange={(e) => setDiscountPercentage(e.target.value)} />
                </label>
              ) : (
                <label>
                  Số tiền giảm
                  <Input type="number" min="0" step="0.01" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
                </label>
              )}
              <label>
                Giá sau giảm
                <Input type="number" value={discountedPrice || form.price} readOnly />
              </label>
            </div>
          </div>
        </div>

        {/* Right: Form Fields */}
        <div className="right-col">
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
            <div className="subsection">
              <label>
                Tên
                <Input name="title" value={form.title} onChange={handleChange} required />
              </label>
              <label>
                Slug
                <Input name="slug" value={form.slug} onChange={handleChange} placeholder="ten-san-pham-than-thien-seo" />
              </label>
              <label>
                SKU
                <Input name="sku" value={form.sku} onChange={handleChange} />
              </label>
              <label>
                Mô tả ngắn
                <RichEditor
                  value={form.short_description}
                  onChange={(html) => setForm(prev => ({ ...prev, short_description: html }))}
                  placeholder="Nhập mô tả ngắn..."
                  minHeight={150}
                />
              </label>
              <label>
                Mô tả
                <RichEditor
                  value={form.description}
                  onChange={(html) => setForm(prev => ({ ...prev, description: html }))}
                  placeholder="Nhập mô tả chi tiết sản phẩm..."
                  minHeight={300}
                />
              </label>
            </div>

            <div className="subsection" style={{ display: 'flex', gap: 12 }}>
              <label style={{ flex: 1 }}>
                Giá
                <Input type="number" name="price" value={form.price} onChange={handleChange} min="0" step="0.01" />
              </label>
              <label style={{ flex: 1 }}>
                Tồn kho
                <Input type="number" name="stock_quantity" value={form.stock_quantity} onChange={handleChange} min="0" />
              </label>
            </div>

            {/* Dimensions & Weight */}
            <div className="subsection">
              <h3>Kích thước & Khối lượng</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <label>
                  <span style={{ fontSize: 12, color: '#666' }}>Chiều cao (cm)</span>
                  <Input name="height" type="number" step="0.01" min="0" value={form.height} onChange={handleChange} placeholder="0" />
                </label>
                <label>
                  <span style={{ fontSize: 12, color: '#666' }}>Chiều rộng (cm)</span>
                  <Input name="width" type="number" step="0.01" min="0" value={form.width} onChange={handleChange} placeholder="0" />
                </label>
                <label>
                  <span style={{ fontSize: 12, color: '#666' }}>Chiều dài (cm)</span>
                  <Input name="length" type="number" step="0.01" min="0" value={form.length} onChange={handleChange} placeholder="0" />
                </label>
                <label>
                  <span style={{ fontSize: 12, color: '#666' }}>Khối lượng (gram)</span>
                  <Input name="weight" type="number" step="0.01" min="0" value={form.weight} onChange={handleChange} placeholder="0" />
                </label>
              </div>
            </div>

            <div className="subsection">
              <h3>Danh mục</h3>
              <div className="category-actions">
                <select onChange={handleCategorySelect} defaultValue="">
                  <option value="" disabled>Chọn danh mục...</option>
                  {categories.map(cat => (
                    <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
                  ))}
                </select>
                <Button type="button" variant="secondary" onClick={openCategoryModal}>Thêm danh mục</Button>
              </div>
              <div className="selected-chips">
                {(form.category_ids || []).map(id => {
                  const cat = categories.find(c => c.category_id === id);
                  return (
                    <span key={id} className="chip">
                      {cat?.name || id}
                      <button type="button" onClick={() => removeCategory(id)} className="chip-close">×</button>
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="actions">
              <Button type="button" variant="secondary" onClick={() => navigate('/admin/stationery')}>Hủy</Button>
              <Button type="submit" disabled={submitting || isUploadingImage}>{submitting ? 'Đang lưu...' : (isUploadingImage ? 'Đang tải ảnh...' : 'Lưu')}</Button>
            </div>
          </form>
        </div>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 style={{ marginBottom: 12 }}>Thêm danh mục</h3>
            <label>
              Tên danh mục
              <Input name="name" value={categoryForm.name} onChange={handleCategoryFormChange} />
            </label>
            <label>
              Mô tả
              <textarea name="description" value={categoryForm.description} onChange={handleCategoryFormChange} rows={4} className="textarea" />
            </label>
            <div className="modal-actions">
              <Button type="button" variant="secondary" onClick={closeCategoryModal}>Đóng</Button>
              <Button type="button" onClick={createCategoryInline} disabled={isCreatingCategory}>{isCreatingCategory ? 'Đang tạo...' : 'Tạo'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateStationery;
