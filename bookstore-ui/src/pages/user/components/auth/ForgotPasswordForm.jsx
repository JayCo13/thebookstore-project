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
      setSuccess(true);
      setEmail('');
    } catch (error) {
      console.error('Password reset request error:', error);

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
    <div className="w-full max-w-md mx-auto">
      {/* Logo */}
      <div className="text-center mb-6">
        <img
          src="/assets/logo-left.png"
          alt="Tâm Nguồn Book"
          className="h-14 mx-auto mb-4 object-contain"
        />
        <h2 className="text-2xl font-bold text-[#2D2D2D]">Quên mật khẩu?</h2>
        <p className="text-gray-500 text-sm mt-1">
          Nhập email của bạn để nhận liên kết đặt lại mật khẩu
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success ? (
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#008080]/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-[#008080]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="p-4 bg-[#008080]/5 border border-[#008080]/20 text-[#2D2D2D] rounded-xl">
            <p className="font-medium">Email đã được gửi!</p>
            <p className="mt-2 text-sm text-gray-600">Nếu tài khoản tồn tại với email này, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.</p>
            <p className="mt-1 text-sm text-gray-600">Vui lòng kiểm tra hộp thư đến và thư mục spam của bạn.</p>
          </div>
          <div className="mt-6">
            <Link to="/login" className="inline-flex items-center text-[#008080] hover:text-[#006666] font-medium transition-colors">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Quay lại đăng nhập
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080] peer pt-6 transition-all duration-200 bg-gray-50 focus:bg-white"
              placeholder=" "
            />
            <label
              htmlFor="email"
              className="absolute text-sm text-gray-500 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0.5 peer-focus:scale-75 peer-focus:-translate-y-3 peer-focus:text-[#008080]"
            >
              Email
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-[#008080] hover:bg-[#006666] text-white font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008080]/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-[#008080]/25"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang gửi...
              </div>
            ) : 'Gửi liên kết đặt lại'}
          </button>

          <div className="text-center">
            <Link to="/login" className="inline-flex items-center text-[#008080] hover:text-[#006666] text-sm font-medium transition-colors">
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Quay lại đăng nhập
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}