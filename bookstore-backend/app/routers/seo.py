from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Book, Stationery
from typing import List
from datetime import datetime

router = APIRouter(
    prefix="",
    tags=["SEO"]
)

BASE_URL = "https://tamnguon.com"

@router.get("/sitemap.xml", response_class=Response)
async def get_sitemap(db: Session = Depends(get_db)):
    """Generate sitemap.xml dynamically."""
    
    # 1. Static Routes
    static_routes = [
        {"loc": "/", "priority": "1.0", "changefreq": "daily"},
        {"loc": "/books", "priority": "0.9", "changefreq": "daily"},
        {"loc": "/stationery", "priority": "0.9", "changefreq": "daily"},
        {"loc": "/about", "priority": "0.5", "changefreq": "monthly"},
        {"loc": "/contact", "priority": "0.5", "changefreq": "monthly"},
    ]
    
    urls = []
    
    # Add static routes
    for route in static_routes:
        urls.append(f"""
    <url>
        <loc>{BASE_URL}{route['loc']}</loc>
        <changefreq>{route['changefreq']}</changefreq>
        <priority>{route['priority']}</priority>
    </url>""")
    
    # 2. Dynamic Routes: Books
    books = db.query(Book.slug, Book.created_at).filter(Book.is_active == True).all()
    for book in books:
        slug = book.slug
        if not slug: continue
        # Use created_at as lastmod, or fallback to now
        lastmod = book.created_at.strftime("%Y-%m-%d") if book.created_at else datetime.now().strftime("%Y-%m-%d")
        urls.append(f"""
    <url>
        <loc>{BASE_URL}/book/{slug}</loc>
        <lastmod>{lastmod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>""")

    # 3. Dynamic Routes: Stationery
    items = db.query(Stationery.slug, Stationery.created_at).filter(Stationery.is_active == True).all()
    for item in items:
        slug = item.slug
        if not slug: continue
        lastmod = item.created_at.strftime("%Y-%m-%d") if item.created_at else datetime.now().strftime("%Y-%m-%d")
        urls.append(f"""
    <url>
        <loc>{BASE_URL}/stationery/{slug}</loc>
        <lastmod>{lastmod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>""")

    # Build XML
    xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{''.join(urls)}
</urlset>"""

    return Response(content=xml_content, media_type="application/xml")
