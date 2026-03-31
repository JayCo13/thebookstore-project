import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpTrayIcon, DocumentArrowDownIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import './ImportBooks.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function ImportBooks() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setSelectedFile(file);
      setError(null);
      setResult(null);
    } else {
      setError('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setSelectedFile(file);
      setError(null);
      setResult(null);
    } else {
      setError('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const token = localStorage.getItem('authToken') || (() => {
        try { return JSON.parse(localStorage.getItem('user'))?.access_token; } catch { return null; }
      })();
      const response = await fetch(`${API_BASE}/api/v1/books/import-xlsx`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Đã xảy ra lỗi khi import');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="import-books-page">
      <div className="import-header">
        <h1>📥 Import Sách từ Excel</h1>
        <p className="import-subtitle">
          Upload file XLSX để tạo nhiều sách cùng lúc. Các trường thiếu sẽ để trống để admin chỉnh sửa sau.
        </p>
      </div>

      {/* Expected Format Info */}
      <div className="format-info">
        <h3>📋 Cấu trúc file XLSX yêu cầu:</h3>
        <div className="format-table-wrapper">
          <table className="format-table">
            <thead>
              <tr>
                <th>Cột</th>
                <th>Mô tả</th>
                <th>Bắt buộc</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>ISBN</code></td><td>Mã ISBN sách</td><td>Không</td></tr>
              <tr><td><code>Product name</code></td><td>Tên sách</td><td className="required">Có ✓</td></tr>
              <tr><td><code>Category</code></td><td>Danh mục (phân cách bằng ///)</td><td>Không</td></tr>
              <tr><td><code>Price</code></td><td>Giá bán (VNĐ)</td><td>Không</td></tr>
              <tr><td><code>Weight</code></td><td>Cân nặng (gram)</td><td>Không</td></tr>
              <tr><td><code>Features</code></td><td>Tác giả, NXB, số trang, kích thước</td><td>Không</td></tr>
              <tr><td><code>List price</code></td><td>Giá niêm yết</td><td>Không</td></tr>
              <tr><td><code>Mô tả</code></td><td>Mô tả chi tiết sách</td><td>Không</td></tr>
            </tbody>
          </table>
        </div>
        <p className="format-note">
          💡 Sách trùng ISBN sẽ được bỏ qua. Tác giả và danh mục mới sẽ tự động tạo.
        </p>
      </div>

      {/* Upload Area */}
      {!result && (
        <div
          className={`upload-area ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'has-file' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !selectedFile && fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".xlsx,.xls"
            hidden
          />
          
          {selectedFile ? (
            <div className="selected-file-info">
              <DocumentArrowDownIcon className="file-icon" />
              <div className="file-details">
                <span className="file-name">{selectedFile.name}</span>
                <span className="file-size">{(selectedFile.size / 1024).toFixed(1)} KB</span>
              </div>
              <button className="change-file-btn" onClick={(e) => { e.stopPropagation(); handleReset(); }}>
                Đổi file
              </button>
            </div>
          ) : (
            <div className="upload-prompt">
              <ArrowUpTrayIcon className="upload-icon" />
              <p className="upload-text">Kéo thả file XLSX vào đây</p>
              <p className="upload-or">hoặc</p>
              <button className="browse-btn">Chọn file</button>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="import-error">
          <XCircleIcon className="error-icon" />
          <span>{error}</span>
        </div>
      )}

      {/* Import Button */}
      {selectedFile && !result && (
        <div className="import-actions">
          <button
            className="import-btn"
            onClick={handleImport}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <div className="spinner" />
                Đang import... Vui lòng đợi
              </>
            ) : (
              <>
                <ArrowUpTrayIcon className="btn-icon" />
                Bắt đầu Import
              </>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="import-results">
          <div className="results-header">
            <CheckCircleIcon className="success-icon" />
            <h2>Import hoàn tất!</h2>
          </div>
          
          <div className="results-stats">
            <div className="stat-card created">
              <span className="stat-number">{result.created}</span>
              <span className="stat-label">Sách đã tạo</span>
            </div>
            <div className="stat-card skipped">
              <span className="stat-number">{result.skipped}</span>
              <span className="stat-label">Bỏ qua (trùng)</span>
            </div>
            <div className="stat-card errors">
              <span className="stat-number">{result.total_errors}</span>
              <span className="stat-label">Lỗi</span>
            </div>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div className="error-list">
              <h3>
                <ExclamationTriangleIcon className="warning-icon" />
                Chi tiết lỗi:
              </h3>
              <ul>
                {result.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="results-actions">
            <button className="btn-primary" onClick={() => navigate('/admin/products')}>
              Xem danh sách sách
            </button>
            <button className="btn-secondary" onClick={handleReset}>
              Import thêm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
