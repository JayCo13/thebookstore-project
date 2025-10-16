import React, { useState } from 'react';
import { Button, Input } from '../../components';
import './CreateBook.css';

const CreateBook = () => {
  const [form, setForm] = useState({
    title: '',
    author: '',
    publisher: '',
    category: 'Fiction',
    regularPrice: '',
    salePrice: '',
    scheduleStart: '',
    scheduleEnd: '',
    publicationDate: '',
    format: 'Hardcover',
    stockStatus: 'In Stock',
    isbn: '',
    quantity: '',
    units: 'Copies',
    language: 'English',
    pages: '',
    dimensions: '',
    weight: '',
    description: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="create-book">
      <h1 className="title">Product Editing</h1>

      <div className="grid">
        {/* Left: Product Images */}
        <div className="left-col">
          <div className="image-card">
            <div className="main-image placeholder">
              <span>Browse Image</span>
            </div>
            <div className="thumbs">
              <div className="thumb placeholder"><span>Browse Image</span></div>
              <div className="thumb placeholder"><span>Browse Image</span></div>
            </div>
          </div>

          <div className="subsection">
            <h3>More Gallery Options</h3>
            <p>Optionally upload additional images, author photos, or inside pages.</p>
          </div>

          <div className="subsection">
            <h3>Attachment files</h3>
            <div className="row">
              <label>Edition</label>
              <select name="edition" onChange={handleChange}>
                <option>Standard</option>
                <option>Collector's</option>
              </select>
            </div>
            <div className="row">
              <label>Dimensions (L × W × H)</label>
              <Input name="dimensions" value={form.dimensions} onChange={handleChange} placeholder="8.5 x 5.5 x 1.2 in" />
            </div>
            <div className="row">
              <label>Weight (kg)</label>
              <Input name="weight" value={form.weight} onChange={handleChange} placeholder="0.450" />
            </div>
          </div>

          <div className="subsection">
            <h3>Description</h3>
            <textarea name="description" value={form.description} onChange={handleChange} rows={6} placeholder="Book synopsis, highlights, and notes..."></textarea>
          </div>
        </div>

        {/* Right: Form fields */}
        <div className="right-col">
          <div className="form-grid">
            <div className="field full">
              <label>Product Name</label>
              <Input name="title" value={form.title} onChange={handleChange} placeholder="e.g., The Great Gatsby" />
            </div>

            <div className="field">
              <label>Author</label>
              <Input name="author" value={form.author} onChange={handleChange} placeholder="F. Scott Fitzgerald" />
            </div>
            <div className="field">
              <label>Publisher</label>
              <Input name="publisher" value={form.publisher} onChange={handleChange} placeholder="Scribner" />
            </div>

            <div className="field">
              <label>Regular Price</label>
              <Input name="regularPrice" value={form.regularPrice} onChange={handleChange} placeholder="$20.00" />
            </div>
            <div className="field">
              <label>Sale Price</label>
              <Input name="salePrice" value={form.salePrice} onChange={handleChange} placeholder="$14.99" />
            </div>

            <div className="field">
              <label>Schedule</label>
              <div className="inline">
                <Input type="date" name="scheduleStart" value={form.scheduleStart} onChange={handleChange} />
                <span className="sep">–</span>
                <Input type="date" name="scheduleEnd" value={form.scheduleEnd} onChange={handleChange} />
              </div>
            </div>
            <div className="field">
              <label>Publication Date</label>
              <Input type="date" name="publicationDate" value={form.publicationDate} onChange={handleChange} />
            </div>

            <div className="field">
              <label>Category</label>
              <select name="category" value={form.category} onChange={handleChange}>
                <option>Fiction</option>
                <option>Non‑Fiction</option>
                <option>Science</option>
                <option>Children</option>
                <option>Business</option>
                <option>Self‑Help</option>
              </select>
            </div>
            <div className="field">
              <label>Format</label>
              <select name="format" value={form.format} onChange={handleChange}>
                <option>Hardcover</option>
                <option>Paperback</option>
                <option>Ebook</option>
              </select>
            </div>

            <div className="field">
              <label>Stock status</label>
              <select name="stockStatus" value={form.stockStatus} onChange={handleChange}>
                <option>In Stock</option>
                <option>Out of Stock</option>
                <option>Preorder</option>
              </select>
            </div>
            <div className="field">
              <label>ISBN</label>
              <Input name="isbn" value={form.isbn} onChange={handleChange} placeholder="9780743273565" />
            </div>

            <div className="field">
              <label>Quantity in stock</label>
              <Input name="quantity" value={form.quantity} onChange={handleChange} placeholder="1234" />
            </div>
            <div className="field">
              <label>Units</label>
              <select name="units" value={form.units} onChange={handleChange}>
                <option>Copies</option>
                <option>Boxes</option>
              </select>
            </div>

            <div className="field">
              <label>Language</label>
              <select name="language" value={form.language} onChange={handleChange}>
                <option>English</option>
                <option>Vietnamese</option>
                <option>French</option>
                <option>Spanish</option>
              </select>
            </div>
            <div className="field">
              <label>Pages</label>
              <Input name="pages" value={form.pages} onChange={handleChange} placeholder="320" />
            </div>
          </div>

          {/* Payment methods preview */}
          <div className="payment-methods">
            <span className="pm pm-red"></span>
            <span className="pm pm-yellow"></span>
            <span className="pm pm-gray"></span>
            <span className="pm pm-black"></span>
            <span className="pm pm-blue"></span>
          </div>

          {/* Actions */}
          <div className="actions">
            <Button variant="outline">Save to Drafts</Button>
            <Button variant="primary">Edit Product</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateBook;