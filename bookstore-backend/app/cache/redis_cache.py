import json
import pickle
from typing import Any, Optional, List
from redis import Redis
from app.database import get_redis
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class RedisCache:
    def __init__(self, redis_client: Redis = None):
        self.redis = redis_client or get_redis()
        self.default_ttl = 3600  # 1 hour default TTL
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        try:
            value = self.redis.get(key)
            if value:
                return pickle.loads(value)
            return None
        except Exception as e:
            logger.error(f"Redis get error: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: int = None) -> bool:
        """Set value in cache."""
        try:
            ttl = ttl or self.default_ttl
            serialized_value = pickle.dumps(value)
            return self.redis.setex(key, ttl, serialized_value)
        except Exception as e:
            logger.error(f"Redis set error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        try:
            return bool(self.redis.delete(key))
        except Exception as e:
            logger.error(f"Redis delete error: {e}")
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern."""
        try:
            keys = self.redis.keys(pattern)
            if keys:
                return self.redis.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Redis delete pattern error: {e}")
            return 0
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        try:
            return bool(self.redis.exists(key))
        except Exception as e:
            logger.error(f"Redis exists error: {e}")
            return False
    
    async def increment(self, key: str, amount: int = 1) -> int:
        """Increment a counter."""
        try:
            return self.redis.incr(key, amount)
        except Exception as e:
            logger.error(f"Redis increment error: {e}")
            return 0
    
    async def set_list(self, key: str, values: List[Any], ttl: int = None) -> bool:
        """Set a list in cache."""
        try:
            ttl = ttl or self.default_ttl
            serialized_values = [pickle.dumps(value) for value in values]
            pipe = self.redis.pipeline()
            pipe.delete(key)
            if serialized_values:
                pipe.lpush(key, *serialized_values)
            pipe.expire(key, ttl)
            pipe.execute()
            return True
        except Exception as e:
            logger.error(f"Redis set list error: {e}")
            return False
    
    async def get_list(self, key: str) -> List[Any]:
        """Get a list from cache."""
        try:
            values = self.redis.lrange(key, 0, -1)
            return [pickle.loads(value) for value in values]
        except Exception as e:
            logger.error(f"Redis get list error: {e}")
            return []


# Cache instance
cache = RedisCache()

# Cache key generators
class CacheKeys:
    @staticmethod
    def book(book_id: int) -> str:
        return f"book:{book_id}"
    
    @staticmethod
    def book_detail(book_id: int) -> str:
        return f"book:{book_id}:detail"
    
    @staticmethod
    def books_list(skip: int, limit: int, category_id: int = None, author_id: int = None, search: str = None) -> str:
        key = f"books:skip:{skip}:limit:{limit}"
        if category_id:
            key += f":category:{category_id}"
        if author_id:
            key += f":author:{author_id}"
        if search:
            key += f":search:{search}"
        return key
    
    @staticmethod
    def user(user_id: int) -> str:
        return f"user:{user_id}"
    
    @staticmethod
    def user_orders(user_id: int, skip: int = 0, limit: int = 10, status_filter: str = None) -> str:
        """Cache key for user orders with pagination and filtering."""
        status_part = f":status:{status_filter}" if status_filter else ""
        return f"orders:user:{user_id}:skip:{skip}:limit:{limit}{status_part}"
    
    @staticmethod
    def user_wishlist(user_id: int) -> str:
        return f"user:{user_id}:wishlist"
    
    @staticmethod
    def categories() -> str:
        return "categories:all"
    
    @staticmethod
    def authors() -> str:
        return "authors:all"
    
    @staticmethod
    def book_stock(book_id: int) -> str:
        return f"book:{book_id}:stock"
    
    @staticmethod
    def popular_books(limit: int = 10) -> str:
        return f"books:popular:limit:{limit}"
    
    @staticmethod
    def featured_books() -> str:
        return "books:featured"

    # Chat memory keys
    @staticmethod
    def chat_history(session_id: str) -> str:
        return f"chat:session:{session_id}:history"

    @staticmethod
    def chat_context(session_id: str) -> str:
        return f"chat:session:{session_id}:context"

    @staticmethod
    def chat_shipping(session_id: str) -> str:
        return f"chat:session:{session_id}:shipping"


# Cache decorators and utilities
def cache_result(key_func, ttl: int = 3600):
    """Decorator to cache function results."""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = key_func(*args, **kwargs)
            
            # Try to get from cache
            cached_result = await cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            if result is not None:
                await cache.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator


async def invalidate_book_cache(book_id: int):
    """Invalidate all cache entries related to a book."""
    await cache.delete(CacheKeys.book(book_id))
    await cache.delete_pattern("books:page:*")
    await cache.delete_pattern("books:popular")
    await cache.delete_pattern("books:featured")


async def invalidate_user_cache(user_id: int):
    """Invalidate all cache entries related to a user."""
    await cache.delete(CacheKeys.user(user_id))
    await cache.delete(CacheKeys.user_orders(user_id))
    await cache.delete(CacheKeys.user_wishlist(user_id))


async def invalidate_category_cache():
    """Invalidate category cache."""
    await cache.delete(CacheKeys.categories())
    await cache.delete_pattern("books:page:*")


async def invalidate_author_cache():
    """Invalidate author cache."""
    await cache.delete(CacheKeys.authors())


# Cache warming functions
async def warm_popular_books_cache(books_data: List[Any]):
    """Warm the popular books cache."""
    await cache.set(CacheKeys.popular_books(), books_data, ttl=7200)  # 2 hours


async def warm_categories_cache(categories_data: List[Any]):
    """Warm the categories cache."""
    await cache.set(CacheKeys.categories(), categories_data, ttl=86400)  # 24 hours


async def warm_authors_cache(authors_data: List[Any]):
    """Warm the authors cache."""
    await cache.set(CacheKeys.authors(), authors_data, ttl=86400)  # 24 hours