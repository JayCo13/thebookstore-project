#!/usr/bin/env python3
import requests
import json

# Test image upload functionality
def test_image_upload():
    # First, create a test book
    book_data = {
        "title": "Test Book for Image Upload",
        "author_id": 1,
        "category_id": 1,
        "description": "A test book for testing image upload functionality",
        "price": 19.99,
        "stock_quantity": 10,
        "isbn": "9781234567890"
    }
    
    # Login as admin to get token
    login_data = {
        "email": "admin@bookstore.com",
        "password": "admin123"
    }
    
    print("Logging in as admin...")
    login_response = requests.post("http://localhost:8000/api/v1/auth/login", json=login_data)
    
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.status_code} - {login_response.text}")
        return
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print("Creating test book...")
    book_response = requests.post("http://localhost:8000/api/v1/books/", json=book_data, headers=headers)
    
    if book_response.status_code != 200:
        print(f"Book creation failed: {book_response.status_code} - {book_response.text}")
        return
    
    book_id = book_response.json()["id"]
    print(f"Created book with ID: {book_id}")
    
    # Create a simple test image
    test_image_content = '''<svg width="200" height="300" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="300" fill="#4A90E2"/>
  <text x="100" y="150" text-anchor="middle" fill="white" font-family="Arial" font-size="24">Test Book</text>
</svg>'''
    
    # Test image upload
    print(f"Testing image upload for book {book_id}...")
    files = {'image': ('test_book.svg', test_image_content, 'image/svg+xml')}
    
    upload_response = requests.post(
        f"http://localhost:8000/api/v1/books/{book_id}/image",
        files=files,
        headers=headers
    )
    
    print(f"Upload response: {upload_response.status_code}")
    print(f"Response body: {upload_response.text}")
    
    if upload_response.status_code == 200:
        print("✅ Image upload successful!")
        
        # Verify the book now has an image URL
        book_detail_response = requests.get(f"http://localhost:8000/api/v1/books/{book_id}")
        if book_detail_response.status_code == 200:
            book_detail = book_detail_response.json()
            if book_detail.get("image_url"):
                print(f"✅ Book image URL updated: {book_detail['image_url']}")
            else:
                print("❌ Book image URL not updated")
        
    else:
        print(f"❌ Image upload failed: {upload_response.status_code} - {upload_response.text}")

if __name__ == "__main__":
    test_image_upload()