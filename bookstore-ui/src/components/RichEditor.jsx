import React, { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';

const RichEditor = ({ value = '', onChange, placeholder = '', minHeight = 160 }) => {
  const editor = useEditor({
    extensions: [
      Color,
      TextStyle,
      StarterKit,
      Underline,
      Highlight,
      Link.configure({ openOnClick: true, autolink: true })
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'rich-editor__content',
        style: `min-height:${minHeight}px; padding:12px; border:1px solid #ddd; border-radius:8px; background:#fff;`
      }
    },
    onUpdate({ editor }) {
      const html = editor.getHTML();
      onChange && onChange(html);
    }
  });

  useEffect(() => {
    if (editor && typeof value === 'string') {
      // Avoid infinite update loops: only set when different
      const current = editor.getHTML();
      if (current !== value) {
        editor.commands.setContent(value || '', false);
      }
    }
  }, [value, editor]);

  if (!editor) return null;

  const setLink = () => {
    const url = window.prompt('Nhập URL liên kết');
    if (url === null) return; // cancel
    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div className="rich-editor">
      <div className="rich-editor__toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'active' : ''}>B</button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'active' : ''}><i>I</i></button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? 'active' : ''}><u>U</u></button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'active' : ''}><s>S</s></button>
        <button type="button" onClick={() => editor.chain().focus().toggleHighlight().run()} className={editor.isActive('highlight') ? 'active' : ''}>HL</button>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12 }}>Màu</label>
          <input type="color" onChange={e => editor.chain().focus().setColor(e.target.value).run()} />
          <button type="button" onClick={() => editor.chain().focus().unsetColor().run()}>Xóa</button>
        </span>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'active' : ''}>H2</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive('heading', { level: 3 }) ? 'active' : ''}>H3</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'active' : ''}>• List</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'active' : ''}>1. List</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor.isActive('blockquote') ? 'active' : ''}>&ldquo; Quote</button>
        <button type="button" onClick={setLink} className={editor.isActive('link') ? 'active' : ''}>Link</button>
        <button type="button" onClick={() => editor.chain().focus().unsetLink().run()}>Unlink</button>
        <button type="button" onClick={() => editor.chain().focus().setParagraph().run()} className={editor.isActive('paragraph') ? 'active' : ''}>P</button>
        <button type="button" onClick={() => editor.chain().focus().clearNodes().run()}>Clear nodes</button>
        <button type="button" onClick={() => editor.chain().focus().unsetAllMarks().run()}>Clear marks</button>
      </div>

      {placeholder && !value && editor.getJSON().content?.length === 0 && (
        <div style={{ position: 'absolute', pointerEvents: 'none', color: '#999', margin: '12px' }}>{placeholder}</div>
      )}

      <EditorContent editor={editor} />

      <style>{`
        .rich-editor__toolbar button {
          padding: 6px 8px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: #f7f7f7;
          cursor: pointer;
        }
        .rich-editor__toolbar button.active {
          background: #e6f4ff;
          border-color: #1890ff;
        }
        .rich-editor__content {
          line-height: 1.6;
          font-size: 14px;
        }
        .rich-editor__content h2, .rich-editor__content h3 {
          margin: 12px 0 8px;
        }
        .rich-editor__content p { margin: 8px 0; }
        .rich-editor__content ul, .rich-editor__content ol { margin-left: 20px; }
        .rich-editor { position: relative; }
      `}</style>
    </div>
  );
};

export default RichEditor;