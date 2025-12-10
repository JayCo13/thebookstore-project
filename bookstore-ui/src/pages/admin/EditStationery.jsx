import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Input } from '../../components';
import { useToast } from '../../contexts/ToastContext';
import {
  getStationeryItem,
  updateStationery,
  getCategories,
  createCategory,
  uploadStationeryImage,
  uploadStationeryImage2,
  uploadStationeryImage3,
  getBookCoverUrl
} from '../../service/api';
import './CreateBook.css';
import RichEditor from '../../components/RichEditor';

const EditStationery = () => {
  const navigate = useNavigate();
  const { id } = useParams();
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
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Discount
  const [discountType, setDiscountType] = useState('percentage');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountedPrice, setDiscountedPrice] = useState('');

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [itemRes, catsRes] = await Promise.all([
          getStationeryItem(id),
          getCategories()
        ]);
        const item = Array.isArray(itemRes) ? itemRes[0] : (itemRes?.data || itemRes);
        const cats = Array.isArray(catsRes) ? catsRes : (catsRes?.data || []);
        setCategories(cats);
        if (item) {
          setForm({
            title: item.title || '',
            slug: item.slug || '',
            // Align to backend response fields
            short_description: item.brief_description || '',
            description: item.full_description || '',
            price: item.price || '',
            stock_quantity: item.stock_quantity || '',
            category_ids: (item.categories || []).map(c => c.category_id),
            image_url: item.image_url || '',
            image2_url: item.image2_url || '',
            image3_url: item.image3_url || '',
            sku: item.sku || '',
            is_best_seller: !!item.is_best_seller,
            is_new: !!item.is_new,
            is_discount: !!item.is_discount,
            is_free_ship: !!item.is_free_ship,
            // Backend response uses *_cm and weight_grams
            height: item.height_cm || '',
            width: item.width_cm || '',
            length: item.length_cm || '',
            weight: item.weight_grams || '',
          });
          if (item.discount_percentage) {
            setDiscountType('percentage');
            setDiscountPercentage(String(item.discount_percentage));
          } else if (item.discount_amount) {
            setDiscountType('amount');
            setDiscountAmount(String(item.discount_amount));
          }
          if (item.discounted_price) {
            setDiscountedPrice(String(item.discounted_price));
          }
        }
      } catch (err) {
        console.error('Failed to load item', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

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

  const handleCategorySelect = (e) => {
    const categoryId = parseInt(e.target.value, 10);
    if (!categoryId) return;
    setForm(prev => ({ ...prev, category_ids: Array.from(new Set([...(prev.category_ids || []), categoryId])) }));
    e.target.value = '';
  };

  const removeCategory = (cid) => {
    setForm(prev => ({ ...prev, category_ids: (prev.category_ids || []).filter(id => id !== cid) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
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
      await updateStationery(id, payload);
      showToast('Cập nhật thành công', 'success');
      navigate('/admin/stationery');
    } catch (err) {
      console.error('Update failed:', err);
      showToast('Cập nhật thất bại: ' + (err?.message || 'Unknown error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const openCategoryModal = () => {
    setCategoryForm({ name: '', description: '' });
    setShowCategoryModal(true);
  };
  const closeCategoryModal = () => setShowCategoryModal(false);
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
      const res = await getCategories();
      const data = Array.isArray(res) ? res : (res?.data || []);
      setCategories(data);
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

  const handleUploadImageSlot = async (slot, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn tệp ảnh hợp lệ', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Kích thước ảnh phải nhỏ hơn 5MB', 'error');
      return;
    }
    try {
      setIsUploadingImage(true);
      if (slot === 1) await uploadStationeryImage(id, file);
      else if (slot === 2) await uploadStationeryImage2(id, file);
      else await uploadStationeryImage3(id, file);

      // Refresh item to get latest image URLs from backend
      const refreshed = await getStationeryItem(id);
      const item = Array.isArray(refreshed) ? refreshed[0] : (refreshed?.data || refreshed);
      setForm((prev) => ({
        ...prev,
        image_url: item?.image_url || prev.image_url,
        image2_url: item?.image2_url || prev.image2_url,
        image3_url: item?.image3_url || prev.image3_url,
      }));
      showToast('Tải ảnh thành công', 'success');
    } catch (error) {
      console.error('Upload image failed', error);
      showToast('Tải ảnh thất bại', 'error');
    } finally {
      setIsUploadingImage(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Đang tải dữ liệu...</div>;
  }

  const currentImages = [form.image_url, form.image2_url, form.image3_url]
    .filter(Boolean)
    .map((src) => getBookCoverUrl(src));

  return (
    <div className="create-book">
      <h1 className="title">Sửa Văn Phòng Phẩm</h1>
      <div className="grid">
        {/* Left: Product Images */}
        <div className="left-col">
          <div className="image-card">
            <div className="main-image">
              {currentImages.length > 0 ? (
                <img
                  src={currentImages[Math.min(activeImageIndex, currentImages.length - 1)]}
                  alt="Ảnh sản phẩm"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                />
              ) : (
                <div className="placeholder">
                  <span>Chưa có ảnh</span>
                </div>
              )}
            </div>
            {currentImages.length > 0 && (
              <div className="thumbnails">
                {currentImages.map((src, idx) => (
                  <div
                    key={idx}
                    className={`thumbnail-item ${activeImageIndex === idx ? 'active' : ''}`}
                    onClick={() => setActiveImageIndex(idx)}
                    title={`Ảnh ${idx + 1}`}
                  >
                    <img src={src} alt={`Ảnh ${idx + 1}`} />
                  </div>
                ))}
              </div>
            )}
            <div className="subsection" style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>Cập nhật ảnh</div>
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <div style={{ marginBottom: 4 }}>Ảnh 1</div>
                  {form.image_url && (<img src={getBookCoverUrl(form.image_url)} alt="image1" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }} />)}
                  <input type="file" accept="image/*" onChange={(e) => handleUploadImageSlot(1, e.target.files?.[0])} />
                </div>
                <div>
                  <div style={{ marginBottom: 4 }}>Ảnh 2</div>
                  {form.image2_url && (<img src={getBookCoverUrl(form.image2_url)} alt="image2" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }} />)}
                  <input type="file" accept="image/*" onChange={(e) => handleUploadImageSlot(2, e.target.files?.[0])} />
                </div>
                <div>
                  <div style={{ marginBottom: 4 }}>Ảnh 3</div>
                  {form.image3_url && (<img src={getBookCoverUrl(form.image3_url)} alt="image3" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }} />)}
                  <input type="file" accept="image/*" onChange={(e) => handleUploadImageSlot(3, e.target.files?.[0])} />
                </div>
              </div>
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
              <Button type="submit" disabled={saving || isUploadingImage}>{saving ? 'Đang lưu...' : (isUploadingImage ? 'Đang tải ảnh...' : 'Lưu')}</Button>
            </div>
          </form>
        </div>
      </div>

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

export default EditStationery;
