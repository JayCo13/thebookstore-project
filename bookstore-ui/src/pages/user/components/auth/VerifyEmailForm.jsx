import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';

export default function VerifyEmailForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoVerified, setAutoVerified] = useState(false);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      verifyEmail(tokenFromUrl);
      setAutoVerified(true);
    }
  }, [searchParams]);

  const verifyEmail = async (verificationToken) => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`/api/auth/verify-email/${verificationToken}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Không thể xác minh email');
      }

      setSuccess(true);

      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      setError(error.message);
      console.error('Email verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await verifyEmail(token);
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
        <h2 className="text-2xl font-bold text-[#2D2D2D]">Xác minh Email</h2>
        <p className="text-gray-500 text-sm mt-1">
          Xác minh địa chỉ email để kích hoạt tài khoản
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
          <div className="flex items-start">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mr-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="font-semibold">{error}</p>
              <p className="mt-1 text-sm">Liên kết xác minh có thể đã hết hạn hoặc không hợp lệ.</p>
              <p className="text-sm">Vui lòng thử đăng ký lại hoặc liên hệ hỗ trợ.</p>
            </div>
          </div>
        </div>
      )}

      {success ? (
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#008080]/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-[#008080]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="p-4 bg-[#008080]/5 border border-[#008080]/20 text-[#2D2D2D] rounded-xl">
            <p className="font-semibold">Email của bạn đã được xác minh thành công!</p>
            <p className="mt-2 text-sm text-gray-600">Đang chuyển hướng đến trang đăng nhập...</p>
          </div>
        </div>
      ) : (
        <>
          {!autoVerified && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080] peer pt-6 transition-all duration-200 bg-gray-50 focus:bg-white"
                  placeholder=" "
                />
                <label
                  htmlFor="token"
                  className="absolute text-sm text-gray-500 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0.5 peer-focus:scale-75 peer-focus:-translate-y-3 peer-focus:text-[#008080]"
                >
                  Mã xác minh
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
                    Đang xác minh...
                  </div>
                ) : 'Xác minh Email'}
              </button>
            </form>
          )}

          {autoVerified && loading && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-[#008080]/20 border-t-[#008080] animate-spin"></div>
              <p className="text-gray-700 font-medium">Đang xác minh email của bạn...</p>
              <p className="mt-2 text-sm text-gray-500">Vui lòng đợi trong giây lát</p>
            </div>
          )}
        </>
      )}

      <div className="mt-6 text-center">
        <Link to="/login" className="inline-flex items-center text-[#008080] hover:text-[#006666] text-sm font-medium transition-colors">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Quay lại đăng nhập
        </Link>
      </div>
    </div>
  );
}