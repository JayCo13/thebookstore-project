import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import Image from "../compat/Image";

export default function OrdersPage() {
  const { user, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Mock data for demonstration
  useEffect(() => {
    if (isAuthenticated) {
      // Simulate API call
      setTimeout(() => {
        setOrders([
          {
            id: 'ORD-001',
            date: '2024-01-15',
            status: 'delivered',
            total: 299000,
            items: [
              {
                id: 1,
                title: 'The Great Gatsby',
                author: 'F. Scott Fitzgerald',
                price: 149000,
                quantity: 1,
                image: '/assets/book1.jpg'
              },
              {
                id: 2,
                title: 'To Kill a Mockingbird',
                author: 'Harper Lee',
                price: 150000,
                quantity: 1,
                image: '/assets/book2.jpg'
              }
            ]
          },
          {
            id: 'ORD-002',
            date: '2024-01-10',
            status: 'shipped',
            total: 199000,
            items: [
              {
                id: 3,
                title: '1984',
                author: 'George Orwell',
                price: 199000,
                quantity: 1,
                image: '/assets/book3.jpg'
              }
            ]
          },
          {
            id: 'ORD-003',
            date: '2024-01-05',
            status: 'processing',
            total: 450000,
            items: [
              {
                id: 4,
                title: 'Pride and Prejudice',
                author: 'Jane Austen',
                price: 150000,
                quantity: 2,
                image: '/assets/book4.jpg'
              },
              {
                id: 5,
                title: 'The Catcher in the Rye',
                author: 'J.D. Salinger',
                price: 150000,
                quantity: 1,
                image: '/assets/book5.jpg'
              }
            ]
          }
        ]);
        setLoading(false);
      }, 1000);
    }
  }, [isAuthenticated]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'delivered':
        return 'Delivered';
      case 'shipped':
        return 'Shipped';
      case 'processing':
        return 'Processing';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  if (!isAuthenticated) {
    return (
      <section className="min-h-[80vh] pt-40 pb-20 px-4 md:px-6 lg:px-8 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-semibold text-[#2D2D2D] mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-8">Please log in to view your orders.</p>
          <a href="/login" className="px-6 py-3 rounded-md bg-black text-white font-medium hover:bg-gray-800 transition">
            Go to Login
          </a>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="min-h-[80vh] pt-40 pb-20 px-4 md:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your orders...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[80vh] pt-40 pb-20 px-4 md:px-6 lg:px-8 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-semibold text-[#2D2D2D] tracking-tight mb-4">
            My Orders
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Track and manage your book orders
          </p>
        </div>

        {orders.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[#2D2D2D] mb-2">No Orders Yet</h3>
            <p className="text-gray-600 mb-8">You haven't placed any orders yet. Start shopping to see your orders here.</p>
            <a href="/books" className="px-6 py-3 rounded-md bg-black text-white font-medium hover:bg-gray-800 transition">
              Browse Books
            </a>
          </div>
        ) : (
          /* Orders List */
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Order Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-[#2D2D2D]">Order {order.id}</h3>
                        <p className="text-gray-600">Placed on {new Date(order.date).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-3 py-1 text-sm rounded-full font-medium w-fit ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-[#2D2D2D]">{formatPrice(order.total)}</p>
                      <button
                        onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
                        className="text-sm text-gray-600 hover:text-black transition"
                      >
                        {selectedOrder === order.id ? 'Hide Details' : 'View Details'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                {selectedOrder === order.id && (
                  <div className="p-6">
                    <h4 className="font-semibold text-[#2D2D2D] mb-4">Order Items</h4>
                    <div className="space-y-4">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                          <div className="w-16 h-20 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                            <Image 
                              src={item.image} 
                              alt={item.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-[#2D2D2D] truncate">{item.title}</h5>
                            <p className="text-sm text-gray-600">{item.author}</p>
                            <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-[#2D2D2D]">{formatPrice(item.price)}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order Actions */}
                    <div className="mt-6 flex flex-wrap gap-3">
                      {order.status === 'delivered' && (
                        <button className="px-4 py-2 rounded-md border border-black text-black font-medium hover:bg-black hover:text-white transition">
                          Leave Review
                        </button>
                      )}
                      {order.status === 'processing' && (
                        <button className="px-4 py-2 rounded-md border border-red-500 text-red-500 font-medium hover:bg-red-500 hover:text-white transition">
                          Cancel Order
                        </button>
                      )}
                      <button className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition">
                        Download Invoice
                      </button>
                      {(order.status === 'shipped' || order.status === 'delivered') && (
                        <button className="px-4 py-2 rounded-md border border-blue-500 text-blue-500 font-medium hover:bg-blue-500 hover:text-white transition">
                          Track Package
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Order Summary Stats */}
        {orders.length > 0 && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
              <div className="text-2xl font-bold text-[#2D2D2D] mb-2">{orders.length}</div>
              <div className="text-gray-600">Total Orders</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {orders.filter(order => order.status === 'delivered').length}
              </div>
              <div className="text-gray-600">Delivered</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
              <div className="text-2xl font-bold text-[#2D2D2D] mb-2">
                {formatPrice(orders.reduce((total, order) => total + order.total, 0))}
              </div>
              <div className="text-gray-600">Total Spent</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}