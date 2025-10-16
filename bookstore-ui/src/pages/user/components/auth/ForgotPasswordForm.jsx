import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../../../service/api.js';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await forgotPassword(email);

      // Request successful
      setSuccess(true);
      setEmail('');
    } catch (error) {
      console.error('Password reset request error:', error);
      
      // Handle different error types
      if (error.message.includes('User not found') || error.message.includes('Email not found')) {
        setError('Không tìm thấy tài khoản với email này.');
      } else if (error.message.includes('Invalid email')) {
        setError('Email không hợp lệ. Vui lòng kiểm tra lại.');
      } else {
        setError('Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {success ? (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          <p>Nếu tài khoản tồn tại với email này, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.</p>
          <p className="mt-2">Vui lòng kiểm tra hộp thư đến và thư mục spam của bạn.</p>
          <div className="mt-4 text-center">
            <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
              Quay lại đăng nhập
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập email của bạn"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}
          </button>
          
          <div className="text-center">
            <Link to="/login" className="text-blue-600 hover:text-blue-800 text-sm">
              Quay lại đăng nhập
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}