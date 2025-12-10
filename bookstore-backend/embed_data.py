"""
One-time script to populate ChromaDB with book embeddings from MySQL via SQLAlchemy.

Usage:
    python embed_data.py
"""

import chromadb
from sentence_transformers import SentenceTransformer

from app.database import SessionLocal
from app.models.models import Book
from app.config import settings


def main():
    print("Connecting to database...")
    db = SessionLocal()
    try:
        print("Loading books from database...")
        books = db.query(Book).filter(getattr(Book, "is_active", True) == True).all()
        print(f"Found {len(books)} books")

        print("Initializing ChromaDB client...")
        client = chromadb.PersistentClient(path=settings.chroma_db_path)

        try:
            # Prefer getting existing collection; create if missing
            collection = client.get_collection(name="books")
        except Exception:
            collection = client.create_collection(name="books")

        print("Loading embedding model...")
        model = SentenceTransformer("dangvantuan/vietnamese-embedding")

        print("Embedding and storing books...")
        added = 0
        for b in books:
            book_id = str(getattr(b, "book_id", getattr(b, "id", None)))
            if not book_id:
                continue

            title = getattr(b, "title", "")
            description = getattr(b, "description", "")
            price = getattr(b, "price", None)
            discounted_price = getattr(b, "discounted_price", None)
            discount_percentage = getattr(b, "discount_percentage", None)
            is_discount = getattr(b, "is_discount", False)
            stock = getattr(b, "stock_quantity", None)

            discount_text = "có" if is_discount else "không"
            content = (
                f"Tên sách: {title}. Mô tả: {description}. "
                f"Giảm giá: {discount_text}. Giá gốc: {price}. "
                f"Giá giảm: {discounted_price}. Phần trăm giảm: {discount_percentage}. "
                f"Tồn kho: {stock}."
            )

            try:
                existing = collection.get(ids=[book_id])
                embedding = model.encode(content).tolist()
                if existing.get("ids"):
                    # Update existing vector with enriched content
                    collection.update(
                        ids=[book_id],
                        embeddings=[embedding],
                        documents=[content],
                        metadatas=[{"book_id": getattr(b, "book_id", getattr(b, "id", None))}],
                    )
                else:
                    collection.add(
                        embeddings=[embedding],
                        documents=[content],
                        metadatas=[{"book_id": getattr(b, "book_id", getattr(b, "id", None))}],
                        ids=[book_id],
                    )
                    added += 1
            except Exception as e:
                print(f"Failed to embed book {book_id}: {e}")

        print(f"Embedding complete. Added {added} new vectors.")
    finally:
        db.close()


if __name__ == "__main__":
    main()