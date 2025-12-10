import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Input } from '../../components';
import RichEditor from '../../components/RichEditor';
import DescriptionEditorModal from '../../components/DescriptionEditorModal.jsx';
import apiService from '../../service/api';
import { getBookCoverUrl } from '../../service/api';
import { useToast } from '../../contexts/ToastContext';
import './CreateBook.css'; // Reusing the same styles

const EditBook = () => {
  const { id: bookId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    title: '',
    slug: '',
    isbn: '',
    short_description: '',
    description: '',
    price: '',
    stock_quantity: '',
    publication_date: '',
    is_active: true,
    author_ids: [],
    category_ids: [],
    // Position fields
    is_best_seller: false,
    is_new: false,
    is_discount: false,
    is_slide1: false,
    is_slide2: false,
    is_slide3: false,
    is_free_ship: false,
    // Discount fields
    discount_percentage: '',
    discount_amount: '',
    discounted_price: '',
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
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Image upload state
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Additional images state (for 2 more images, total 3)
  const [selectedImage2, setSelectedImage2] = useState(null);
  const [imagePreview2, setImagePreview2] = useState(null);
  const [currentImageUrl2, setCurrentImageUrl2] = useState(null);
  const [isUploadingImage2, setIsUploadingImage2] = useState(false);

  const [selectedImage3, setSelectedImage3] = useState(null);
  const [imagePreview3, setImagePreview3] = useState(null);
  const [currentImageUrl3, setCurrentImageUrl3] = useState(null);
  const [isUploadingImage3, setIsUploadingImage3] = useState(false);

  // Read sample images state
  const [selectedReadSampleImages, setSelectedReadSampleImages] = useState([]);
  const [isUploadingReadSample, setIsUploadingReadSample] = useState(false);

  // Audio sample state
  const [selectedAudioSample, setSelectedAudioSample] = useState(null);
  const [isUploadingAudioSample, setIsUploadingAudioSample] = useState(false);
  const [showShortDescriptionModal, setShowShortDescriptionModal] = useState(false);
  const [showFullDescriptionModal, setShowFullDescriptionModal] = useState(false);
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);
  const [fullScreenImageSrc, setFullScreenImageSrc] = useState(null);
  const [authorForm, setAuthorForm] = useState({ name: '', bio: '' });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [isCreatingAuthor, setIsCreatingAuthor] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Existing assets loaded from backend
  const [currentReadSampleUrls, setCurrentReadSampleUrls] = useState([]);
  const [currentAudioUrl, setCurrentAudioUrl] = useState(null);

  // Management dialogs state
  const [showManageImagesModal, setShowManageImagesModal] = useState(false);
  const [showManageReadSamplesModal, setShowManageReadSamplesModal] = useState(false);
  const [managedImages, setManagedImages] = useState([]); // array of full URLs in display order
  const [managedReadSamples, setManagedReadSamples] = useState([]); // array of full URLs in display order

  // Advanced audio player state
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioVolume, setAudioVolume] = useState(1);
  const [isDeletingAudioSample, setIsDeletingAudioSample] = useState(false);

  const formatTime = (sec) => {
    if (!isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleAudioLoaded = () => {
    const a = audioRef.current;
    if (!a) return;
    setAudioDuration(a.duration || 0);
  };

  const handleAudioTimeUpdate = () => {
    const a = audioRef.current;
    if (!a) return;
    setAudioTime(a.currentTime || 0);
  };

  const togglePlayPause = () => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) {
      a.pause();
      setIsPlaying(false);
    } else {
      a.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e) => {
    const a = audioRef.current;
    if (!a) return;
    const next = Number(e.target.value);
    a.currentTime = next;
    setAudioTime(next);
  };

  const handleVolume = (e) => {
    const a = audioRef.current;
    if (!a) return;
    const v = Number(e.target.value);
    a.volume = v;
    setAudioVolume(v);
  };

  const handleDeleteAudioSample = async () => {
    if (!bookId) return;
    try {
      setIsDeletingAudioSample(true);
      const a = audioRef.current;
      if (a) a.pause();
      await apiService.deleteAudioSample(bookId);
      setCurrentAudioUrl(null);
      setSelectedAudioSample(null);
      setAudioTime(0);
      setAudioDuration(0);
      setIsPlaying(false);
      showToast('Đã xóa âm thanh mẫu', 'success');
    } catch (err) {
      console.error('Delete audio sample failed:', err);
      showToast('Xóa âm thanh mẫu thất bại', 'error');
    } finally {
      setIsDeletingAudioSample(false);
    }
  };

  // Convert a full URL back to a relative server path, best-effort
  const toRelativePath = (url) => {
    if (!url) return null;
    try {
      const idx = url.indexOf('/uploads/');
      if (idx !== -1) return url.substring(idx);
      const u = new URL(url);
      return u.pathname || url;
    } catch (e) {
      const idx2 = url.lastIndexOf('/');
      return idx2 !== -1 ? url.substring(idx2) : url;
    }
  };

  // Open image management modal and initialize ordering
  const openManageImagesModal = () => {
    const imgs = [currentImageUrl, currentImageUrl2, currentImageUrl3].filter(Boolean);
    setManagedImages(imgs);
    setShowManageImagesModal(true);
  };

  const closeManageImagesModal = () => setShowManageImagesModal(false);

  const moveManagedImage = (index, direction) => {
    setManagedImages((prev) => {
      const arr = [...prev];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= arr.length) return arr;
      const [item] = arr.splice(index, 1);
      arr.splice(newIndex, 0, item);
      return arr;
    });
  };

  const removeManagedImage = (index) => {
    setManagedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload new thumbnail into the next available slot (limit 3)
  const [selectedManagedImageFile, setSelectedManagedImageFile] = useState(null);
  const [isUploadingManagedImage, setIsUploadingManagedImage] = useState(false);

  const getNextImageSlot = () => {
    if (!currentImageUrl) return 1;
    if (!currentImageUrl2) return 2;
    if (!currentImageUrl3) return 3;
    return null;
  };

  const handleManagedImageFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedManagedImageFile(file);
    await uploadManagedImage(file);
    // Reset file input value so selecting the same file again works
    e.target.value = '';
  };

  const uploadManagedImage = async (file) => {
    if (!file || !bookId) return;
    const slot = getNextImageSlot();
    if (!slot) {
      showToast('Đã đạt tối đa 3 ảnh thumbnail', 'warning');
      return;
    }
    setIsUploadingManagedImage(true);
    try {
      if (slot === 1) await apiService.uploadBookImage(bookId, file);
      else if (slot === 2) await apiService.uploadBookImage2(bookId, file);
      else await apiService.uploadBookImage3(bookId, file);
      await refreshAssets(bookId);
      const imgs = [currentImageUrl, currentImageUrl2, currentImageUrl3].filter(Boolean);
      setManagedImages(imgs);
      setSelectedManagedImageFile(null);
      showToast('Đã thêm ảnh thumbnail', 'success');
    } catch (err) {
      console.error('Upload managed image failed:', err);
      showToast('Tải ảnh thumbnail thất bại', 'error');
    } finally {
      setIsUploadingManagedImage(false);
    }
  };

  const saveManagedImages = async () => {
    const paths = managedImages.map(toRelativePath).filter(Boolean);
    const payload = {
      image_url: paths[0] || null,
      image2_url: paths[1] || null,
      image3_url: paths[2] || null,
    };
    try {
      await apiService.updateBook(bookId, payload);
      showToast('Images order updated', 'success');
      await refreshAssets(bookId);
      closeManageImagesModal();
    } catch (e) {
      console.error('Failed to save image ordering:', e);
      showToast('Failed to save image ordering', 'error');
    }
  };

  // Open read sample management modal and initialize ordering
  const openManageReadSamplesModal = () => {
    setManagedReadSamples(currentReadSampleUrls || []);
    setShowManageReadSamplesModal(true);
  };
  const closeManageReadSamplesModal = () => setShowManageReadSamplesModal(false);

  const moveManagedReadSample = (index, direction) => {
    setManagedReadSamples((prev) => {
      const arr = [...prev];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= arr.length) return arr;
      const [item] = arr.splice(index, 1);
      arr.splice(newIndex, 0, item);
      return arr;
    });
  };

  const removeManagedReadSample = (index) => {
    setManagedReadSamples((prev) => prev.filter((_, i) => i !== index));
  };

  const saveManagedReadSamples = async () => {
    const paths = managedReadSamples.map(toRelativePath).filter(Boolean);
    const payload = { read_sample: JSON.stringify(paths) };
    try {
      await apiService.updateBook(bookId, payload);
      showToast('Read samples updated', 'success');
      await refreshAssets(bookId);
      closeManageReadSamplesModal();
    } catch (e) {
      console.error('Failed to save read samples:', e);
      showToast('Failed to save read samples', 'error');
    }
  };

  // Discount calculation state
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'amount'

  // Load book data and existing authors/categories
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load book data
        const bookResponse = await apiService.getBook(bookId);
        const book = bookResponse;

        // Load authors and categories
        const [authorsResponse, categoriesResponse] = await Promise.all([
          apiService.getBooksAuthors(),
          apiService.getBooksCategories()
        ]);

        setAuthors(authorsResponse || []);
        setCategories(categoriesResponse || []);

        // Set form data
        setForm({
          title: book.title || '',
          slug: book.slug || '',
          isbn: book.isbn || '',
          short_description: book.brief_description || book.short_description || '',
          description: book.full_description || book.description || '',
          price: book.price?.toString() || '',
          stock_quantity: book.stock_quantity?.toString() || '',
          publication_date: book.publication_date || '',
          is_active: book.is_active ?? true,
          author_ids: book.authors?.map(a => a.author_id) || [],
          category_ids: book.categories?.map(c => c.category_id) || [],
          // Physical dimensions & weight
          height: book.height?.toString() || '',
          width: book.width?.toString() || '',
          length: book.length?.toString() || '',
          weight: book.weight?.toString() || '',
          // Position fields
          is_best_seller: book.is_best_seller || false,
          is_new: book.is_new || false,
          is_discount: book.is_discount || false,
          is_slide1: book.is_slide1 || false,
          is_slide2: book.is_slide2 || false,
          is_slide3: book.is_slide3 || false,
          is_free_ship: book.is_free_ship || false,
          // Discount fields
          discount_percentage: book.discount_percentage?.toString() || '',
          discount_amount: book.discount_amount?.toString() || '',
          discounted_price: book.discounted_price?.toString() || ''
        });

        // Set selected authors and categories
        setSelectedAuthors(book.authors || []);
        setSelectedCategories(book.categories || []);

        // Set current images/audio with proper URL construction
        if (book.image_url) {
          const imageUrl = getBookCoverUrl(book.image_url);
          setCurrentImageUrl(imageUrl);
        }
        if (book.image2_url) {
          const image2Url = getBookCoverUrl(book.image2_url);
          setCurrentImageUrl2(image2Url);
        }
        if (book.image3_url) {
          const image3Url = getBookCoverUrl(book.image3_url);
          setCurrentImageUrl3(image3Url);
        }

        // Read sample: may be a JSON string or array; normalize to array of URLs
        if (book.read_sample) {
          try {
            const raw = typeof book.read_sample === 'string' ? JSON.parse(book.read_sample) : book.read_sample;
            const arr = Array.isArray(raw) ? raw : [raw];
            setCurrentReadSampleUrls(arr.filter(Boolean).map((p) => getBookCoverUrl(p)));
          } catch (e) {
            // Fallback: treat as single path string
            setCurrentReadSampleUrls([getBookCoverUrl(book.read_sample)]);
          }
        } else {
          setCurrentReadSampleUrls([]);
        }

        if (book.audio_sample) {
          setCurrentAudioUrl(getBookCoverUrl(book.audio_sample));
        } else {
          setCurrentAudioUrl(null);
        }

        // Set discount type based on existing data
        if (book.discount_percentage) {
          setDiscountType('percentage');
        } else if (book.discount_amount) {
          setDiscountType('amount');
        }

      } catch (error) {
        console.error('Error loading data:', error);
        showToast('Failed to load book data', 'error');
        navigate('/admin/products');
      } finally {
        setLoading(false);
      }
    };

    if (bookId) {
      loadData();
    }
  }, [bookId, navigate, showToast]);

  // Handle form changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle discount calculation
  useEffect(() => {
    if (form.price && (form.discount_percentage || form.discount_amount)) {
      const price = parseFloat(form.price);
      let discountedPrice = price;

      if (discountType === 'percentage' && form.discount_percentage) {
        const percentage = parseFloat(form.discount_percentage);
        if (percentage >= 0 && percentage <= 100) {
          discountedPrice = price - (price * percentage / 100);
        }
      } else if (discountType === 'amount' && form.discount_amount) {
        const amount = parseFloat(form.discount_amount);
        if (amount >= 0 && amount <= price) {
          discountedPrice = price - amount;
        }
      }

      setForm(prev => ({
        ...prev,
        discounted_price: discountedPrice.toFixed(2)
      }));
    } else {
      setForm(prev => ({
        ...prev,
        discounted_price: ''
      }));
    }
  }, [form.price, form.discount_percentage, form.discount_amount, discountType]);

  // Handle discount type change
  const handleDiscountTypeChange = (type) => {
    setDiscountType(type);
    setForm(prev => ({
      ...prev,
      discount_percentage: type === 'percentage' ? prev.discount_percentage : '',
      discount_amount: type === 'amount' ? prev.discount_amount : ''
    }));
  };

  // Author selection
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

  // Category selection
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

  // Create new author
  const createAuthor = async () => {
    if (!authorForm.name.trim()) return;

    setIsCreatingAuthor(true);
    try {
      const newAuthor = await apiService.createAuthor(authorForm);
      setAuthors(prev => [...prev, newAuthor]);

      // Auto-select the new author
      const newSelectedAuthors = [...selectedAuthors, newAuthor];
      setSelectedAuthors(newSelectedAuthors);
      setForm(prev => ({
        ...prev,
        author_ids: newSelectedAuthors.map(a => a.author_id)
      }));

      showToast(`Author "${newAuthor.name}" created successfully!`, 'success');
      closeAuthorModal();
    } catch (error) {
      console.error('Error creating author:', error);
      showToast('Failed to create author', 'error');
    } finally {
      setIsCreatingAuthor(false);
    }
  };

  // Create new category
  const createCategory = async () => {
    if (!categoryForm.name.trim()) return;

    setIsCreatingCategory(true);
    try {
      const newCategory = await apiService.createCategory(categoryForm);
      setCategories(prev => [...prev, newCategory]);

      // Auto-select the new category
      const newSelectedCategories = [...selectedCategories, newCategory];
      setSelectedCategories(newSelectedCategories);
      setForm(prev => ({
        ...prev,
        category_ids: newSelectedCategories.map(c => c.category_id)
      }));

      showToast(`Category "${newCategory.name}" created successfully!`, 'success');
      closeCategoryModal();
    } catch (error) {
      console.error('Error creating category:', error);
      showToast('Failed to create category', 'error');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // Image handling
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (bookId) => {
    if (!selectedImage) return;

    setIsUploadingImage(true);
    try {
      await apiService.uploadBookImage(bookId, selectedImage);
      showToast('Book cover uploaded successfully!', 'success');
      await refreshAssets(bookId);
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast('Failed to upload book cover', 'error');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Additional image 2 handling
  const handleImage2Select = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage2(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview2(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage2 = async (bookId) => {
    if (!selectedImage2) return;

    setIsUploadingImage2(true);
    try {
      await apiService.uploadBookImage2(bookId, selectedImage2);
      showToast('Second book image uploaded successfully!', 'success');
      await refreshAssets(bookId);
    } catch (error) {
      console.error('Error uploading second image:', error);
      showToast('Failed to upload second book image', 'error');
    } finally {
      setIsUploadingImage2(false);
    }
  };

  // Additional image 3 handling
  const handleImage3Select = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage3(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview3(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage3 = async (bookId) => {
    if (!selectedImage3) return;

    setIsUploadingImage3(true);
    try {
      await apiService.uploadBookImage3(bookId, selectedImage3);
      showToast('Third book image uploaded successfully!', 'success');
      await refreshAssets(bookId);
    } catch (error) {
      console.error('Error uploading third image:', error);
      showToast('Failed to upload third book image', 'error');
    } finally {
      setIsUploadingImage3(false);
    }
  };

  // Read sample images handling
  const handleReadSampleImagesSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedReadSampleImages(files);
  };

  const uploadReadSampleImages = async (bookId) => {
    if (!selectedReadSampleImages.length) return;

    setIsUploadingReadSample(true);
    try {
      await apiService.uploadReadSampleImages(bookId, selectedReadSampleImages);
      showToast('Read sample images uploaded successfully!', 'success');
      await refreshAssets(bookId);
    } catch (error) {
      console.error('Error uploading read sample images:', error);
      showToast('Failed to upload read sample images', 'error');
    } finally {
      setIsUploadingReadSample(false);
    }
  };

  // Audio sample handling
  const handleAudioSampleSelect = (e) => {
    const file = e.target.files[0];
    setSelectedAudioSample(file);
  };

  const uploadAudioSample = async (bookId) => {
    if (!selectedAudioSample) return;

    setIsUploadingAudioSample(true);
    try {
      await apiService.uploadAudioSample(bookId, selectedAudioSample);
      showToast('Audio sample uploaded successfully!', 'success');
      await refreshAssets(bookId);
    } catch (error) {
      console.error('Error uploading audio sample:', error);
      showToast('Failed to upload audio sample', 'error');
    } finally {
      setIsUploadingAudioSample(false);
    }
  };

  // Refresh assets from backend after uploads to reflect latest URLs
  const refreshAssets = async (bookId) => {
    try {
      const book = await apiService.getBook(bookId);
      if (book.image_url) setCurrentImageUrl(getBookCoverUrl(book.image_url));
      if (book.image2_url) setCurrentImageUrl2(getBookCoverUrl(book.image2_url));
      if (book.image3_url) setCurrentImageUrl3(getBookCoverUrl(book.image3_url));

      if (book.read_sample) {
        try {
          const raw = typeof book.read_sample === 'string' ? JSON.parse(book.read_sample) : book.read_sample;
          const arr = Array.isArray(raw) ? raw : [raw];
          setCurrentReadSampleUrls(arr.filter(Boolean).map((p) => getBookCoverUrl(p)));
        } catch (e) {
          setCurrentReadSampleUrls([getBookCoverUrl(book.read_sample)]);
        }
      } else {
        setCurrentReadSampleUrls([]);
      }

      setCurrentAudioUrl(book.audio_sample ? getBookCoverUrl(book.audio_sample) : null);
    } catch (e) {
      console.error('Failed to refresh assets:', e);
    }
  };

  // Form validation
  const validateForm = () => {
    const errors = [];

    if (!form.title.trim()) errors.push('Title is required');
    if (!form.price || parseFloat(form.price) <= 0) errors.push('Valid price is required');
    if (!form.stock_quantity || parseInt(form.stock_quantity) < 0) errors.push('Valid stock quantity is required');

    // Validate discount fields
    if (form.discount_percentage && (parseFloat(form.discount_percentage) < 0 || parseFloat(form.discount_percentage) > 100)) {
      errors.push('Discount percentage must be between 0 and 100');
    }
    if (form.discount_amount && parseFloat(form.discount_amount) < 0) {
      errors.push('Discount amount must be positive');
    }
    if (form.discount_amount && form.price && parseFloat(form.discount_amount) > parseFloat(form.price)) {
      errors.push('Discount amount cannot exceed the original price');
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
      // Prepare book data according to BookUpdate schema
      const sanitizeIsbn = (raw) => (raw || '').replace(/[^0-9Xx]/g, '').toUpperCase();

      const bookData = {
        title: form.title.trim(),
        slug: form.slug?.trim() || null,
        isbn: sanitizeIsbn(form.isbn) || null,
        brief_description: form.short_description || null,
        full_description: form.description || null,
        price: parseFloat(form.price),
        stock_quantity: parseInt(form.stock_quantity),
        publication_date: form.publication_date || null,
        is_active: form.is_active,
        author_ids: form.author_ids,
        category_ids: form.category_ids,
        // Dimensions & weight
        height: form.height ? parseFloat(form.height) : null,
        width: form.width ? parseFloat(form.width) : null,
        length: form.length ? parseFloat(form.length) : null,
        weight: form.weight ? parseFloat(form.weight) : null,
        // Position fields
        is_best_seller: form.is_best_seller,
        is_new: form.is_new,
        is_discount: form.is_discount,
        is_slide1: form.is_slide1,
        is_slide2: form.is_slide2,
        is_slide3: form.is_slide3,
        is_free_ship: form.is_free_ship,
        // Discount fields
        discount_percentage: form.discount_percentage ? parseFloat(form.discount_percentage) : null,
        discount_amount: form.discount_amount ? parseFloat(form.discount_amount) : null,
        discounted_price: form.discounted_price ? parseFloat(form.discounted_price) : null
      };

      // Update the book
      const updatedBook = await apiService.updateBook(bookId, bookData);

      // Upload images if selected
      if (selectedImage) {
        await uploadImage(bookId);
      }

      if (selectedImage2) {
        await uploadImage2(bookId);
      }

      if (selectedImage3) {
        await uploadImage3(bookId);
      }

      // Upload read sample images if selected
      if (selectedReadSampleImages.length > 0) {
        await uploadReadSampleImages(bookId);
      }

      // Upload audio sample if selected
      if (selectedAudioSample) {
        await uploadAudioSample(bookId);
      }

      showToast(`Book "${updatedBook.title}" updated successfully!`, 'success');
      navigate('/admin/products');

    } catch (error) {
      console.error('Error updating book:', error);
      const errorMessage = error.message || 'Failed to update book. Please try again.';
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="create-book">
        <div className="loading-indicator" style={{
          padding: '40px',
          textAlign: 'center',
          background: '#f5f5f5',
          borderRadius: '8px',
          margin: '20px 0'
        }}>
          Loading book data...
        </div>
      </div>
    );
  }

  return (
    <div className="create-book">
      <h1 className="title">Chỉnh sửa sách</h1>

      <div className="grid">
        {/* Left: Product Images */}
        <div className="left-col">
          <div className="image-card">
            <div className="main-image" onClick={() => {
              // Open manage images dialog on cover click
              openManageImagesModal();
            }}>
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Ảnh bìa xem trước"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                />
              ) : currentImageUrl ? (
                <img
                  src={currentImageUrl}
                  alt="Ảnh bìa hiện tại"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                />
              ) : (
                <div className="placeholder">
                  <span>Chọn ảnh</span>
                </div>
              )}
            </div>
            {/* Đã bỏ nút Đổi ảnh theo yêu cầu */}
          </div>

          {/* Additional images 2 & 3 removed to conserve space; use Manage Images dialog */}

          {/* Manage Images Button */}
          <div className="image-card" style={{ padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Quản lý tất cả ảnh thumbnail</h3>
              <Button variant="outline" onClick={openManageImagesModal}>Quản lí ảnh thumbnail</Button>
            </div>
            <div style={{ marginTop: '6px', fontSize: '15px', color: '#666' }}>
              {[
                currentImageUrl,
                currentImageUrl2,
                currentImageUrl3,
              ].filter(Boolean).length} ảnh thumbnail đã được thêm vào sách
            </div>
          </div>

          {/* Read Sample Images */}
          <div className="image-card mt-4">
            <h3 className="font-bold">Ảnh đọc thử</h3>
            <div className="image-upload-section">
              <input
                type="file"
                id="read-sample-upload"
                accept="image/*"
                multiple
                onChange={handleReadSampleImagesSelect}
                style={{ display: 'none' }}
              />
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="upload-button"
                  onClick={() => document.getElementById('read-sample-upload').click()}
                  disabled={isUploadingReadSample}
                >
                  {isUploadingReadSample ? 'Đang tải...' : selectedReadSampleImages.length > 0 ? 'Đổi ảnh' : 'Thêm ảnh'}
                </button>
                <Button variant="outline" onClick={openManageReadSamplesModal}>
                  Quản lý ảnh đọc thử
                </Button>
              </div>
              {selectedReadSampleImages.length > 0 && (
                <div className="file-info" style={{ marginTop: '8px' }}>
                  <p>Đã chọn: {selectedReadSampleImages.length} ảnh</p>
                </div>
              )}
              <div style={{ marginTop: '8px', fontSize: '15px', color: '#666' }}>
                Có {currentReadSampleUrls?.length || 0} ảnh đọc thử. Nhấn "Quản lý" để xem.
              </div>
            </div>
          </div>

          {/* Audio Sample */}
          <div className="image-card mt-5">
            <h3 className="font-bold">Âm thanh mẫu</h3>
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
                disabled={isUploadingAudioSample}
              >
                {isUploadingAudioSample ? 'Đang tải...' : selectedAudioSample ? 'Đổi âm thanh' : 'Chọn âm thanh mẫu'}
              </button>
              {selectedAudioSample && (
                <div className="file-info">
                  <p>Đã chọn: {selectedAudioSample.name}</p>
                  <p>Kích thước: {(selectedAudioSample.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              )}
              {currentAudioUrl && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>Âm thanh mẫu hiện tại</div>
                  {/* Hidden native audio element; controlled via custom player */}
                  <audio
                    ref={audioRef}
                    src={currentAudioUrl}
                    onLoadedMetadata={handleAudioLoaded}
                    onTimeUpdate={handleAudioTimeUpdate}
                    style={{ display: 'none' }}
                  />
                  {/* Professional audio control bar */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '40px 1fr 180px 110px', alignItems: 'center', gap: '12px',
                    background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '10px'
                  }}>
                    <button
                      type="button"
                      onClick={togglePlayPause}
                      style={{
                        width: 36, height: 36, borderRadius: '50%', border: '1px solid #e5e7eb',
                        background: isPlaying ? '#e3f2fd' : '#fff', cursor: 'pointer'
                      }}
                      aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
                    >
                      {isPlaying ? '❚❚' : '▶'}
                    </button>
                    <div style={{ width: '100%' }}>
                      <input
                        type="range"
                        min={0}
                        max={Math.max(1, audioDuration)}
                        step={0.1}
                        value={audioTime}
                        onChange={handleSeek}
                        className="w-full audio-slider progress-slider"
                        style={{ ['--progress']: `${audioDuration ? (audioTime / audioDuration) * 100 : 0}%` }}
                        aria-label="Tiến trình"
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' }}>
                        <span>{formatTime(audioTime)}</span>
                        <span>{formatTime(audioDuration)}</span>
                      </div>
                    </div>
                    <div style={{ width: 180, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>Âm lượng</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={audioVolume}
                        onChange={handleVolume}
                        className="w-full audio-slider volume-slider"
                        style={{ ['--volume']: `${audioVolume * 100}%` }}
                        aria-label="Âm lượng"
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <a
                        href={currentAudioUrl}
                        download
                        style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none' }}
                      >
                        Tải xuống
                      </a>
                      <button
                        type="button"
                        onClick={handleDeleteAudioSample}
                        disabled={isDeletingAudioSample}
                        style={{ fontSize: 12, color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}
                      >
                        {isDeletingAudioSample ? 'Đang xóa…' : 'Xóa âm thanh'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Descriptions via separate modals */}
          <div className="subsection">
            <h3>Mô tả</h3>
            <span className='text-sm text-gray-500'>Bấm vào nút để chỉnh sửa mô tả ngắn hoặc chi tiết.</span>
            <div className="desc-actions mt-3">
              <div className="desc-btns">
                <Button variant="outline" size="small" onClick={() => setShowShortDescriptionModal(true)}>Mô tả ngắn</Button>
                <Button variant="primary" size="small" onClick={() => setShowFullDescriptionModal(true)}>Mô tả chi tiết</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Form fields */}
        <div className="right-col">
          <div className="form-grid">
            <div className="field full">
              <label>Tựa sách *</label>
              <Input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g., The Great Gatsby"
                required
              />
            </div>
            <div className="field full">
              <label>Slug</label>
              <Input
                name="slug"
                value={form.slug}
                onChange={handleChange}
                placeholder="the-great-gatsby"
              />
            </div>

            <div className="field">
              <label>ISBN</label>
              <Input
                name="isbn"
                value={form.isbn}
                onChange={handleChange}
                placeholder="9780743273565"
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
                placeholder="20.00"
                required
              />
            </div>

            <div className="field">
              <label>Số lượng tồn kho *</label>
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
                Trạng thái (hiển thị cho khách hàng)
              </label>
            </div>

            {/* Display Position Section */}
            <div className="field full">
              <label>Display Positions</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    name="is_best_seller"
                    checked={form.is_best_seller}
                    onChange={handleChange}
                    style={{ marginRight: '6px' }}
                  />
                  Best Seller
                </label>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    name="is_new"
                    checked={form.is_new}
                    onChange={handleChange}
                    style={{ marginRight: '6px' }}
                  />
                  New Release
                </label>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    name="is_discount"
                    checked={form.is_discount}
                    onChange={handleChange}
                    style={{ marginRight: '6px' }}
                  />
                  Discount
                </label>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    name="is_slide1"
                    checked={form.is_slide1}
                    onChange={handleChange}
                    style={{ marginRight: '6px' }}
                  />
                  Slide 1
                </label>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    name="is_slide2"
                    checked={form.is_slide2}
                    onChange={handleChange}
                    style={{ marginRight: '6px' }}
                  />
                  Slide 2
                </label>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    name="is_slide3"
                    checked={form.is_slide3}
                    onChange={handleChange}
                    style={{ marginRight: '6px' }}
                  />
                  Slide 3
                </label>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', background: '#e6f7e6', padding: '4px 8px', borderRadius: '4px' }}>
                  <input
                    type="checkbox"
                    name="is_free_ship"
                    checked={form.is_free_ship}
                    onChange={handleChange}
                    style={{ marginRight: '6px' }}
                  />
                  🚚 Miễn phí vận chuyển
                </label>
              </div>
            </div>

            {/* Discount Section */}
            <div className="field full">
              <label>Settings giảm giá</label>
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                    <input
                      type="radio"
                      name="discountType"
                      value="percentage"
                      checked={discountType === 'percentage'}
                      onChange={() => handleDiscountTypeChange('percentage')}
                      style={{ marginRight: '6px' }}
                    />
                    % Giảm giá
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                    <input
                      type="radio"
                      name="discountType"
                      value="amount"
                      checked={discountType === 'amount'}
                      onChange={() => handleDiscountTypeChange('amount')}
                      style={{ marginRight: '6px' }}
                    />
                    Số tiền giảm giá
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  {discountType === 'percentage' ? (
                    <div>
                      <label style={{ fontSize: '12px', color: '#666' }}>% Giảm giá</label>
                      <Input
                        name="discount_percentage"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={form.discount_percentage}
                        onChange={handleChange}
                        placeholder="10.00"
                      />
                    </div>
                  ) : (
                    <div>
                      <label style={{ fontSize: '12px', color: '#666' }}>Số tiền giảm giá</label>
                      <Input
                        name="discount_amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.discount_amount}
                        onChange={handleChange}
                        placeholder="5.00"
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: '12px', color: '#666' }}>Giá gốc</label>
                    <Input
                      value={form.price}
                      disabled
                      style={{ backgroundColor: '#f8f9fa' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: '#666' }}>Giá sau khi giảm</label>
                    <Input
                      value={form.discounted_price || form.price}
                      disabled
                      style={{ backgroundColor: '#e8f5e8', fontWeight: 'bold' }}
                    />
                  </div>
                </div>
              </div>
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
              <label>Danh mục</label>
              <div className="dropdown-with-add">
                <select onChange={handleCategorySelect} defaultValue="">
                  <option value="">Chọn danh mục</option>
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
              variant="secondary"
              onClick={() => navigate('/admin/products')}
              style={{ marginRight: '10px' }}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting || loading || isUploadingImage || isUploadingImage2 || isUploadingImage3 || isUploadingReadSample || isUploadingAudioSample}
            >
              {isSubmitting ? 'Đang cập nhật...' :
                isUploadingImage ? 'Đang tải ảnh...' :
                  isUploadingImage2 ? 'Đang tải ảnh 2...' :
                    isUploadingImage3 ? 'Đang tải ảnh 3...' :
                      isUploadingReadSample ? 'Đang tải ảnh đọc thử...' :
                        isUploadingAudioSample ? 'Đang tải âm thanh mẫu...' :
                          'Cập nhật sách'}
            </Button>
          </div>
        </div>
      </div>

      {/* Hộp thoại Quản lý ảnh */}
      {showManageImagesModal && (
        <div className="modal-overlay" onClick={closeManageImagesModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '95%' }}>
            <div className="modal-header">
              <h2 className="modal-title">Quản lý ảnh</h2>
              <button className="modal-close" onClick={closeManageImagesModal}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '10px', color: '#555' }}>
                Sắp xếp ảnh (ảnh đầu tiên là ảnh bìa). Xóa ảnh không cần thiết.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                {managedImages.length === 0 && (
                  <div style={{ color: '#777' }}>Không có ảnh để quản lý.</div>
                )}
                {managedImages.map((url, idx) => (
                  <div key={idx} style={{ position: 'relative', border: '1px solid #e5e7eb', borderRadius: '12px', background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                    <div style={{ width: '100%', height: 240, overflow: 'hidden', borderRadius: '12px' }}>
                      <img src={url} alt={`Ảnh ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: '#f5f5f5' }} />
                    </div>
                    {/* Centered overlay controls */}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', gap: 10, background: 'rgba(255,255,255,0.88)', border: '1px solid #e5e7eb', borderRadius: 999, padding: '6px 10px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => moveManagedImage(idx, -1)} disabled={idx === 0}>↑</button>
                        <button type="button" className="btn btn-secondary" onClick={() => moveManagedImage(idx, 1)} disabled={idx === managedImages.length - 1}>↓</button>
                        <button type="button" className="btn btn-danger bg-red-500 text-white" onClick={() => removeManagedImage(idx)}>Xóa</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Add new thumbnail image (limit 3) */}
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="file"
                  id="managed-image-upload"
                  accept="image/*"
                  onChange={handleManagedImageFileSelect}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="btn btn-outline bg-black text-white"
                  onClick={() => document.getElementById('managed-image-upload').click()}
                  disabled={isUploadingManagedImage || managedImages.length >= 3}
                >
                  {isUploadingManagedImage ? 'Đang tải ảnh…' : 'Thêm ảnh'}
                </button>
                <span style={{ fontSize: 12, color: '#666' }}>
                  {managedImages.length}/3 ảnh. Ảnh mới sẽ thêm vào vị trí trống tiếp theo.
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeManageImagesModal}>Hủy</button>
              <button type="button" className="btn btn-primary" onClick={saveManagedImages}>Lưu thay đổi</button>
            </div>
          </div>
        </div>
      )}

      {/* Hộp thoại Quản lý ảnh đọc thử */}
      {showManageReadSamplesModal && (
        <div className="modal-overlay" onClick={closeManageReadSamplesModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '95%' }}>
            <div className="modal-header">
              <h2 className="modal-title">Quản lý ảnh đọc thử</h2>
              <button className="modal-close" onClick={closeManageReadSamplesModal}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '10px', color: '#555' }}>
                Sắp xếp ảnh và xóa ảnh không cần thiết. Việc này sẽ cập nhật thứ tự ảnh đọc thử của sách.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                {managedReadSamples.length === 0 && (
                  <div style={{ color: '#777' }}>Không có ảnh đọc thử để quản lý.</div>
                )}
                {managedReadSamples.map((url, idx) => (
                  <div key={idx} style={{ position: 'relative', border: '1px solid #e5e7eb', borderRadius: '12px', background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                    <div style={{ width: '100%', height: 240, overflow: 'hidden', borderRadius: '12px' }}>
                      <img src={url} alt={`Ảnh đọc thử ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: '#f5f5f5' }} />
                    </div>
                    {/* Centered overlay controls */}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', gap: 10, background: 'rgba(255,255,255,0.88)', border: '1px solid #e5e7eb', borderRadius: 999, padding: '6px 10px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => moveManagedReadSample(idx, -1)} disabled={idx === 0}>↑</button>
                        <button type="button" className="btn btn-secondary" onClick={() => moveManagedReadSample(idx, 1)} disabled={idx === managedReadSamples.length - 1}>↓</button>
                        <button type="button" className="btn btn-danger bg-red-500 text-white" onClick={() => removeManagedReadSample(idx)}>Xóa</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeManageReadSamplesModal}>Hủy</button>
              <button type="button" className="btn btn-primary" onClick={saveManagedReadSamples}>Lưu thay đổi</button>
            </div>
          </div>
        </div>
      )}

      {/* Author Modal */}
      {showAuthorModal && (
        <div className="modal-overlay" onClick={closeAuthorModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add New Author</h2>
              <button className="modal-close" onClick={closeAuthorModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="author-name">Name *</label>
                <input
                  type="text"
                  id="author-name"
                  name="name"
                  value={authorForm.name}
                  onChange={handleAuthorFormChange}
                  placeholder="Enter author name"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="author-bio">Biography</label>
                <textarea
                  id="author-bio"
                  name="bio"
                  value={authorForm.bio}
                  onChange={handleAuthorFormChange}
                  placeholder="Enter author biography (optional)"
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
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={createAuthor}
                disabled={isCreatingAuthor || !authorForm.name.trim()}
              >
                {isCreatingAuthor ? 'Creating...' : 'Create Author'}
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
              <h2 className="modal-title">Add New Category</h2>
              <button className="modal-close" onClick={closeCategoryModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="category-name">Name *</label>
                <input
                  type="text"
                  id="category-name"
                  name="name"
                  value={categoryForm.name}
                  onChange={handleCategoryFormChange}
                  placeholder="Enter category name"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="category-description">Description</label>
                <textarea
                  id="category-description"
                  name="description"
                  value={categoryForm.description}
                  onChange={handleCategoryFormChange}
                  placeholder="Enter category description (optional)"
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
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={createCategory}
                disabled={isCreatingCategory || !categoryForm.name.trim()}
              >
                {isCreatingCategory ? 'Creating...' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Image Modal */}
      {showFullScreenImage && fullScreenImageSrc && (
        <div className="fullscreen-image-modal" onClick={() => setShowFullScreenImage(false)}>
          <div className="fullscreen-image-container">
            <button
              className="fullscreen-close-btn"
              onClick={() => setShowFullScreenImage(false)}
              aria-label="Close full-screen view"
            >
              ×
            </button>
            <img
              src={fullScreenImageSrc}
              alt="Book cover full-screen view"
              className="fullscreen-image"
              onClick={(e) => e.stopPropagation()}
            />
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
        title="Edit Short Description"
        onSave={({ short }) => {
          setForm(prev => ({ ...prev, short_description: short }));
          showToast('Short description updated', 'success');
        }}
      />

      {/* Full Description Modal */}
      <DescriptionEditorModal
        isOpen={showFullDescriptionModal}
        onClose={() => setShowFullDescriptionModal(false)}
        shortValue={form.short_description}
        fullValue={form.description}
        mode="full"
        title="Edit Full Description"
        onSave={({ full }) => {
          setForm(prev => ({ ...prev, description: full }));
          showToast('Full description updated', 'success');
        }}
      />
    </div>
  );
};

export default EditBook;
