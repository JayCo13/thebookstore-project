import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal.jsx';
import RichEditor from './RichEditor.jsx';
import Button from './ui/Button.jsx';

export default function DescriptionEditorModal({
  isOpen,
  onClose,
  shortValue = '',
  fullValue = '',
  onSave,
  title = 'Chỉnh sửa mô tả',
  mode = 'both', // 'both' | 'short' | 'full'
}) {
  const [shortDesc, setShortDesc] = useState(shortValue || '');
  const [fullDesc, setFullDesc] = useState(fullValue || '');

  useEffect(() => {
    setShortDesc(shortValue || '');
  }, [shortValue]);

  useEffect(() => {
    setFullDesc(fullValue || '');
  }, [fullValue]);

  const handleSave = () => {
    // Always return both values so callers can update accordingly
    if (mode === 'short') {
      onSave && onSave({ short: shortDesc, full: fullValue });
    } else if (mode === 'full') {
      onSave && onSave({ short: shortValue, full: fullDesc });
    } else {
      onSave && onSave({ short: shortDesc, full: fullDesc });
    }
    onClose && onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="large">
      <div style={{ display: 'grid', gap: 16 }}>
        {(mode === 'both' || mode === 'short') && (
          <div>
            <h3 style={{ marginBottom: 8 }}>Mô tả ngắn</h3>
            <RichEditor
              value={shortDesc}
              onChange={setShortDesc}
              placeholder="Tóm tắt ngắn gọn về nội dung sách..."
              minHeight={140}
            />
          </div>
        )}
        {(mode === 'both' || mode === 'full') && (
          <div>
            <h3 style={{ margin: '12px 0 8px' }}>Mô tả chi tiết</h3>
            <RichEditor
              value={fullDesc}
              onChange={setFullDesc}
              placeholder="Tóm tắt chi tiết, điểm nổi bật, ghi chú..."
              minHeight={220}
            />
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
          <Button variant="secondary" onClick={onClose}>Hủy</Button>
          <Button variant="primary" onClick={handleSave}>Lưu</Button>
        </div>
      </div>
    </Modal>
  );
}