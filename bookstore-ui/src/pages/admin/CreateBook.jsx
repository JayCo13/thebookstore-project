import React, { useState, useEffect } from 'react';
import { Button, Input } from '../../components';
import RichEditor from '../../components/RichEditor';
import apiService from '../../service/api';
import { useToast } from '../../contexts/ToastContext';
import './CreateBook.css';
import DescriptionEditorModal from '../../components/DescriptionEditorModal.jsx';

const CreateBook = () => {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    title: '',
    slug: '',
    isbn: '',
    // Mô tả ngắn để hiển thị ở danh sách
    short_description: '',
    // Mô tả chi tiết
    description: '',
    price: '',
    stock_quantity: '',
    publication_date: '',
    is_active: true,
    is_free_ship: false,
    author_ids: [],
    category_ids: [],
    // Shipping dimensions
    height: '',
    width: '',
    length: '',
    weight: ''
  });

  const [selectedAuthors, setSelectedAuthors] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Trạng thái tải ảnh (hỗ trợ nhiều ảnh bìa)
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Read sample images state
  const [selectedReadSampleImages, setSelectedReadSampleImages] = useState([]);
  const [isUploadingReadSample, setIsUploadingReadSample] = useState(false);

  // Audio sample state
  const [selectedAudioSample, setSelectedAudioSample] = useState(null);
  const [isUploadingAudioSample, setIsUploadingAudioSample] = useState(false);
  const [showShortDescriptionModal, setShowShortDescriptionModal] = useState(false);
  const [showFullDescriptionModal, setShowFullDescriptionModal] = useState(false);

  // Modal state
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [authorForm, setAuthorForm] = useState({ name: '', bio: '' });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [isCreatingAuthor, setIsCreatingAuthor] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Load existing authors and categories
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [authorsResponse, categoriesResponse] = await Promise.all([
          apiService.getAuthors(),
          apiService.getCategories()
        ]);
        setAuthors(authorsResponse || []);
        setCategories(categoriesResponse || []);
      } catch (error) {
        console.error('Error loading authors and categories:', error);
        showToast('Failed to load authors and categories', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Chọn nhiều ảnh bìa
  const handleImagesSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validFiles = [];
    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        showToast('Vui lòng chọn tệp ảnh hợp lệ', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast('Kích thước ảnh phải nhỏ hơn 5MB', 'error');
        return;
      }
      validFiles.push(file);
    });

    if (!validFiles.length) return;

    // Tạo preview cho từng ảnh
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreviews((prev) => [...prev, ev.target.result]);
      };
      reader.readAsDataURL(file);
    });

    setSelectedImages((prev) => [...prev, ...validFiles]);
    if (imagePreviews.length === 0) setActiveImageIndex(0);
  };

  const removeImageAt = (idx) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
    if (activeImageIndex === idx) setActiveImageIndex(0);
    else if (activeImageIndex > idx) setActiveImageIndex((prev) => Math.max(0, prev - 1));
  };

  const handleReadSampleImagesSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setSelectedReadSampleImages(files);
    }
  };

  const handleAudioSampleSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedAudioSample(file);
    }
  };

  // Handle author selection
  const handleAuthorSelect = (e) => {
    const authorId = parseInt(e.target.value);
    if (authorId && !selectedAuthors.find(a => a.author_id === authorId)) {
      const author = authors.find(a => a.author_id === authorId);
      if (author) {
        const newSelectedAuthors = [...selectedAuthors, author];
        setSelectedAuthors(newSelectedAuthors);
        setForm(prev => ({
          ...prev,
          author_ids: newSelectedAuthors.map(a => a.author_id)
        }));
      }
    }
    e.target.value = '';
  };

  // Handle category selection
  const handleCategorySelect = (e) => {
    const categoryId = parseInt(e.target.value);
    if (categoryId && !selectedCategories.find(c => c.category_id === categoryId)) {
      const category = categories.find(c => c.category_id === categoryId);
      if (category) {
        const newSelectedCategories = [...selectedCategories, category];
        setSelectedCategories(newSelectedCategories);
        setForm(prev => ({
          ...prev,
          category_ids: newSelectedCategories.map(c => c.category_id)
        }));
      }
    }
    e.target.value = '';
  };

  // Remove selected author
  const removeAuthor = (authorId) => {
    const newSelectedAuthors = selectedAuthors.filter(a => a.author_id !== authorId);
    setSelectedAuthors(newSelectedAuthors);
    setForm(prev => ({
      ...prev,
      author_ids: newSelectedAuthors.map(a => a.author_id)
    }));
  };

  // Remove selected category
  const removeCategory = (categoryId) => {
    const newSelectedCategories = selectedCategories.filter(c => c.category_id !== categoryId);
    setSelectedCategories(newSelectedCategories);
    setForm(prev => ({
      ...prev,
      category_ids: newSelectedCategories.map(c => c.category_id)
    }));
  };

  // Modal handling functions
  const openAuthorModal = () => {
    setAuthorForm({ name: '', bio: '' });
    setShowAuthorModal(true);
  };

  const closeAuthorModal = () => {
    setShowAuthorModal(false);
    setAuthorForm({ name: '', bio: '' });
  };

  const openCategoryModal = () => {
    setCategoryForm({ name: '', description: '' });
    setShowCategoryModal(true);
  };

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setCategoryForm({ name: '', description: '' });
  };

  const handleAuthorFormChange = (e) => {
    const { name, value } = e.target;
    setAuthorForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryFormChange = (e) => {
    const { name, value } = e.target;
    setCategoryForm(prev => ({ ...prev, [name]: value }));
  };

  const createAuthor = async () => {
    if (!authorForm.name.trim()) {
      showToast('Author name is required', 'error');
      return;
    }

    setIsCreatingAuthor(true);
    try {
      const newAuthor = await apiService.createAuthor(authorForm);

      // Refresh authors list
      const authorsResponse = await apiService.getAuthors();
      setAuthors(authorsResponse || []);

      // Auto-select the new author
      const newSelectedAuthors = [...selectedAuthors, newAuthor];
      setSelectedAuthors(newSelectedAuthors);
      setForm(prev => ({
        ...prev,
        author_ids: newSelectedAuthors.map(a => a.author_id)
      }));

      showToast('Author created successfully!', 'success');
      closeAuthorModal();
    } catch (error) {
      console.error('Error creating author:', error);
      showToast('Failed to create author', 'error');
    } finally {
      setIsCreatingAuthor(false);
    }
  };

  const createCategory = async () => {
    if (!categoryForm.name.trim()) {
      showToast('Category name is required', 'error');
      return;
    }

    setIsCreatingCategory(true);
    try {
      const newCategory = await apiService.createCategory(categoryForm);

      // Refresh categories list
      const categoriesResponse = await apiService.getCategories();
      setCategories(categoriesResponse || []);

      // Auto-select the new category
      const newSelectedCategories = [...selectedCategories, newCategory];
      setSelectedCategories(newSelectedCategories);
      setForm(prev => ({
        ...prev,
        category_ids: newSelectedCategories.map(c => c.category_id)
      }));

      showToast('Category created successfully!', 'success');
      closeCategoryModal();
    } catch (error) {
      console.error('Error creating category:', error);
      showToast('Failed to create category', 'error');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // Tải lên ảnh bìa (hỗ trợ tối đa 3 ảnh: image, image2, image3)
  const uploadImages = async (bookId) => {
    if (!selectedImages.length) return;

    setIsUploadingImage(true);
    try {
      if (selectedImages[0]) {
        await apiService.uploadBookImage(bookId, selectedImages[0]);
        showToast('Tải ảnh bìa 1 thành công!', 'success');
      }
      if (selectedImages[1] && apiService.uploadBookImage2) {
        await apiService.uploadBookImage2(bookId, selectedImages[1]);
        showToast('Tải ảnh bìa 2 thành công!', 'success');
      }

      if (selectedImages[2] && apiService.uploadBookImage3) {
        await apiService.uploadBookImage3(bookId, selectedImages[2]);
        showToast('Tải ảnh bìa 3 thành công!', 'success');
      }
      if (selectedImages.length > 2) {
        showToast('Hiện hỗ trợ tối đa 3 ảnh bìa. Ảnh dư sẽ bỏ qua.', 'warning');
      }
    } catch (error) {
      console.error('Lỗi tải ảnh bìa:', error);
      showToast('Tải ảnh bìa thất bại. Bạn có thể thêm sau.', 'warning');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Upload read sample images to server
  const uploadReadSampleImages = async (bookId) => {
    if (!selectedReadSampleImages.length) return;

    setIsUploadingReadSample(true);
    try {
      await apiService.uploadReadSampleImages(bookId, selectedReadSampleImages);
      showToast('Read sample images uploaded successfully!', 'success');
    } catch (error) {
      console.error('Error uploading read sample images:', error);
      showToast('Failed to upload read sample images. You can add them later.', 'warning');
    } finally {
      setIsUploadingReadSample(false);
    }
  };

  // Upload audio sample to server
  const uploadAudioSample = async (bookId) => {
    if (!selectedAudioSample) return;

    setIsUploadingAudioSample(true);
    try {
      await apiService.uploadAudioSample(bookId, selectedAudioSample);
      showToast('Audio sample uploaded successfully!', 'success');
    } catch (error) {
      console.error('Error uploading audio sample:', error);
      showToast('Failed to upload audio sample. You can add it later.', 'warning');
    } finally {
      setIsUploadingAudioSample(false);
    }
  };

  // Validate form
  const sanitizeIsbn = (raw) => (raw || '').replace(/[^0-9Xx]/g, '').toUpperCase();

  const validateForm = () => {
    const errors = [];
    if (!form.title.trim()) errors.push('Tiêu đề là bắt buộc');
    if (!form.price || parseFloat(form.price) <= 0) errors.push('Giá hợp lệ là bắt buộc');
    if (!form.stock_quantity || parseInt(form.stock_quantity) < 0) errors.push('Số lượng tồn hợp lệ là bắt buộc');

    // ISBN: nếu có nhập, chỉ chấp nhận 10 hoặc 13 ký tự số (cho phép X ở ISBN-10)
    if (form.isbn && form.isbn.trim()) {
      const cleaned = sanitizeIsbn(form.isbn);
      if (!(cleaned.length === 10 || cleaned.length === 13)) {
        errors.push('ISBN phải có 10 hoặc 13 ký tự (bỏ dấu gạch)');
      }
    }
    return errors;
  };

  // Handle form submission
  const handleSubmit = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      showToast(errors.join(', '), 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // Chuẩn hoá ISBN theo yêu cầu DB (VARCHAR(13)), bỏ dấu gạch và khoảng trắng
      const cleanedIsbn = sanitizeIsbn(form.isbn);

      // Chuẩn bị dữ liệu theo BookCreate schema (backend)
      const bookData = {
        title: form.title.trim(),
        slug: form.slug?.trim() || null,
        isbn: cleanedIsbn ? cleanedIsbn : null,
        brief_description: form.short_description?.trim() || null,
        full_description: form.description?.trim() || null,
        price: parseFloat(form.price),
        stock_quantity: parseInt(form.stock_quantity),
        publication_date: form.publication_date || null,
        is_active: form.is_active,
        is_free_ship: form.is_free_ship,
        author_ids: form.author_ids,
        category_ids: form.category_ids,
        // Dimensions & weight
        height: form.height ? parseFloat(form.height) : null,
        width: form.width ? parseFloat(form.width) : null,
        length: form.length ? parseFloat(form.length) : null,
        weight: form.weight ? parseFloat(form.weight) : null
      };

      // Create the book
      const createdBook = await apiService.createBook(bookData);

      // Upload images if selected
      if (selectedImages.length > 0) {
        await uploadImages(createdBook.book_id);
      }

      // Upload read sample images if selected
      if (selectedReadSampleImages.length > 0) {
        await uploadReadSampleImages(createdBook.book_id);
      }

      // Upload audio sample if selected
      if (selectedAudioSample) {
        await uploadAudioSample(createdBook.book_id);
      }

      showToast(`Tạo sách "${createdBook.title}" thành công!`, 'success');

      // Reset form
      setForm({
        title: '',
        slug: '',
        isbn: '',
        short_description: '',
        description: '',
        price: '',
        stock_quantity: '',
        publication_date: '',
        is_active: true,
        is_free_ship: false,
        author_ids: [],
        category_ids: [],
        height: '',
        width: '',
        length: '',
        weight: ''
      });
      setSelectedAuthors([]);
      setSelectedCategories([]);
      setSelectedImages([]);
      setImagePreviews([]);
      setActiveImageIndex(0);
      setSelectedReadSampleImages([]);
      setSelectedAudioSample(null);

    } catch (error) {
      console.error('Error creating book:', error);
      const errorMessage = error.message || 'Tạo sách thất bại. Vui lòng thử lại.';
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-book">
      <h1 className="title">Tạo sách mới</h1>

      {loading && (
        <div className="loading-indicator" style={{
          padding: '20px',
          textAlign: 'center',
          background: '#f5f5f5',
          borderRadius: '8px',
          margin: '20px 0'
        }}>
          Đang tải danh sách tác giả và thể loại...
        </div>
      )}

      <div className="grid">
        {/* Left: Product Images */}
        <div className="left-col">
          <div className="image-card">
            <div className="main-image">
              {imagePreviews.length > 0 ? (
                <img
                  src={imagePreviews[activeImageIndex]}
                  alt="Ảnh bìa xem trước"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '8px'
                  }}
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
                id="image-upload"
                accept="image/*"
                multiple
                onChange={handleImagesSelect}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="upload-button"
                onClick={() => document.getElementById('image-upload').click()}
              >
                {selectedImages.length > 0 ? 'Thay đổi ảnh' : 'Chọn ảnh'}
              </button>
              {selectedImages.length > 0 && (
                <div className="image-info">
                  <p>Đã chọn: {selectedImages.length} ảnh</p>
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
                </div>
              )}
            </div>
          </div>

          {/* Read Sample Images Upload */}
          <div className="subsection">
            <h3>Ảnh đọc thử</h3>
            <div className="image-upload-section">
              <input
                type="file"
                id="read-sample-upload"
                accept="image/*"
                multiple
                onChange={handleReadSampleImagesSelect}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="upload-button"
                onClick={() => document.getElementById('read-sample-upload').click()}
              >
                {selectedReadSampleImages.length > 0 ? 'Thay đổi ảnh' : 'Chọn ảnh đọc thử'}
              </button>
              {selectedReadSampleImages.length > 0 && (
                <div className="image-info">
                  <p>Đã chọn: {selectedReadSampleImages.length} ảnh</p>
                  <div className="selected-files">
                    {selectedReadSampleImages.map((file, index) => (
                      <p key={index}>• {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Audio Sample Upload */}
          <div className="subsection">
            <h3>Âm thanh mẫu</h3>
            <div className="image-upload-section">
              <input
                type="file"
                id="audio-sample-upload"
                accept="audio/*"
                onChange={handleAudioSampleSelect}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="upload-button"
                onClick={() => document.getElementById('audio-sample-upload').click()}
              >
                {selectedAudioSample ? 'Thay đổi âm thanh' : 'Chọn âm thanh mẫu'}
              </button>
              {selectedAudioSample && (
                <div className="image-info">
                  <p>Đã chọn: {selectedAudioSample.name}</p>
                  <p>Kích thước: {(selectedAudioSample.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              )}
            </div>
          </div>

          <div className="subsection">
            <h3>Mô tả</h3>
            <div className="desc-actions">
              <div className="desc-note">Sửa riêng từng mô tả trong hộp thoại lớn.</div>
              <div className="desc-btns">
                <Button variant="outline" size="small" onClick={() => setShowShortDescriptionModal(true)}>Mô tả ngắn</Button>
                <Button variant="primary" size="small" onClick={() => setShowFullDescriptionModal(true)}>Mô tả chi tiết</Button>
              </div>
            </div>
          </div>

          {/* Mô tả chi tiết được chỉnh sửa trong hộp thoại */}
        </div>

        {/* Right: Form fields */}
        <div className="right-col">
          <div className="form-grid">
            <div className="field full">
              <label>Tiêu đề sách *</label>
              <Input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Ví dụ: Dế Mèn Phiêu Lưu Ký"
                required
              />
            </div>
            <div className="field full">
              <label>Slug</label>
              <Input
                name="slug"
                value={form.slug}
                onChange={handleChange}
                placeholder="tua-sach-than-thien-seo"
              />
            </div>

            <div className="field">
              <label>ISBN</label>
              <Input
                name="isbn"
                value={form.isbn}
                onChange={handleChange}
                placeholder="Mã ISBN (nếu có)"
              />
            </div>

            <div className="field">
              <label>Giá *</label>
              <Input
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={handleChange}
                placeholder="200000"
                required
              />
            </div>

            <div className="field">
              <label>Số lượng tồn *</label>
              <Input
                name="stock_quantity"
                type="number"
                min="0"
                value={form.stock_quantity}
                onChange={handleChange}
                placeholder="100"
                required
              />
            </div>

            <div className="field">
              <label>Ngày phát hành</label>
              <Input
                type="date"
                name="publication_date"
                value={form.publication_date}
                onChange={handleChange}
              />
            </div>

            {/* Dimensions & Weight */}
            <div className="field full">
              <label>Kích thước & Khối lượng</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '8px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#666' }}>Chiều cao (cm)</label>
                  <Input name="height" type="number" step="0.01" min="0" value={form.height} onChange={handleChange} placeholder="0" />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666' }}>Chiều rộng (cm)</label>
                  <Input name="width" type="number" step="0.01" min="0" value={form.width} onChange={handleChange} placeholder="0" />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666' }}>Chiều dài (cm)</label>
                  <Input name="length" type="number" step="0.01" min="0" value={form.length} onChange={handleChange} placeholder="0" />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#666' }}>Khối lượng (gram)</label>
                  <Input name="weight" type="number" step="0.01" min="0" value={form.weight} onChange={handleChange} placeholder="0" />
                </div>
              </div>
            </div>

            <div className="field">
              <label>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                  style={{ marginRight: '8px' }}
                />
                Kích hoạt (hiển thị với khách hàng)
              </label>
            </div>

            <div className="field">
              <label style={{ background: '#e6f7e6', padding: '8px 12px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  name="is_free_ship"
                  checked={form.is_free_ship}
                  onChange={handleChange}
                  style={{ marginRight: '8px' }}
                />
                🚚 Miễn phí vận chuyển
              </label>
            </div>

            {/* Authors Selection */}
            <div className="field full">
              <label>Tác giả</label>
              <div className="dropdown-with-add">
                <select onChange={handleAuthorSelect} defaultValue="">
                  <option value="">Chọn tác giả</option>
                  {authors.map(author => (
                    <option key={author.author_id} value={author.author_id}>
                      {author.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="add-new-btn"
                  onClick={openAuthorModal}
                >
                  Thêm mới
                </button>
              </div>
              {selectedAuthors.length > 0 && (
                <div className="selected-items">
                  {selectedAuthors.map(author => (
                    <span key={author.author_id} className="selected-item">
                      {author.name}
                      <button
                        type="button"
                        onClick={() => removeAuthor(author.author_id)}
                        className="remove-btn"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Categories Selection */}
            <div className="field full">
              <label>Thể loại</label>
              <div className="dropdown-with-add">
                <select onChange={handleCategorySelect} defaultValue="">
                  <option value="">Chọn thể loại</option>
                  {categories.map(category => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="add-new-btn"
                  onClick={openCategoryModal}
                >
                  Thêm mới
                </button>
              </div>
              {selectedCategories.length > 0 && (
                <div className="selected-items">
                  {selectedCategories.map(category => (
                    <span key={category.category_id} className="selected-item">
                      {category.name}
                      <button
                        type="button"
                        onClick={() => removeCategory(category.category_id)}
                        className="remove-btn"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="actions">
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting || loading || isUploadingImage || isUploadingReadSample || isUploadingAudioSample}
            >
              {isSubmitting ? 'Đang tạo sách...' :
                isUploadingImage ? 'Đang tải ảnh bìa...' :
                  isUploadingReadSample ? 'Đang tải ảnh đọc thử...' :
                    isUploadingAudioSample ? 'Đang tải âm thanh mẫu...' :
                      'Tạo sách'}
            </Button>
          </div>
        </div>
      </div>

      {/* Author Modal */}
      {showAuthorModal && (
        <div className="modal-overlay" onClick={closeAuthorModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Thêm tác giả mới</h2>
              <button className="modal-close" onClick={closeAuthorModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="author-name">Tên *</label>
                <input
                  type="text"
                  id="author-name"
                  name="name"
                  value={authorForm.name}
                  onChange={handleAuthorFormChange}
                  placeholder="Nhập tên tác giả"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="author-bio">Tiểu sử</label>
                <textarea
                  id="author-bio"
                  name="bio"
                  value={authorForm.bio}
                  onChange={handleAuthorFormChange}
                  placeholder="Nhập tiểu sử tác giả (không bắt buộc)"
                  rows="4"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeAuthorModal}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={createAuthor}
                disabled={isCreatingAuthor || !authorForm.name.trim()}
              >
                {isCreatingAuthor ? 'Đang tạo...' : 'Tạo tác giả'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="modal-overlay" onClick={closeCategoryModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Thêm thể loại mới</h2>
              <button className="modal-close" onClick={closeCategoryModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="category-name">Tên *</label>
                <input
                  type="text"
                  id="category-name"
                  name="name"
                  value={categoryForm.name}
                  onChange={handleCategoryFormChange}
                  placeholder="Nhập tên thể loại"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="category-description">Mô tả</label>
                <textarea
                  id="category-description"
                  name="description"
                  value={categoryForm.description}
                  onChange={handleCategoryFormChange}
                  placeholder="Nhập mô tả thể loại (không bắt buộc)"
                  rows="4"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeCategoryModal}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={createCategory}
                disabled={isCreatingCategory || !categoryForm.name.trim()}
              >
                {isCreatingCategory ? 'Đang tạo...' : 'Tạo thể loại'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Short Description Modal */}
      <DescriptionEditorModal
        isOpen={showShortDescriptionModal}
        onClose={() => setShowShortDescriptionModal(false)}
        shortValue={form.short_description}
        fullValue={form.description}
        mode="short"
        title="Chỉnh sửa mô tả ngắn"
        onSave={({ short }) => {
          setForm(prev => ({ ...prev, short_description: short }));
          showToast('Đã cập nhật mô tả ngắn', 'success');
        }}
      />

      {/* Full Description Modal */}
      <DescriptionEditorModal
        isOpen={showFullDescriptionModal}
        onClose={() => setShowFullDescriptionModal(false)}
        shortValue={form.short_description}
        fullValue={form.description}
        mode="full"
        title="Chỉnh sửa mô tả chi tiết"
        onSave={({ full }) => {
          setForm(prev => ({ ...prev, description: full }));
          showToast('Đã cập nhật mô tả chi tiết', 'success');
        }}
      />
    </div>
  );
};

export default CreateBook;
