'use client';

import { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import OAuthButtons from './OAuthButtons';

export default function AuthForm() {
  const [activeTab, setActiveTab] = useState('login');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
      {/* Logo & Header */}
      <div className="px-6 pt-8 pb-4 text-center">
        <img
          src="/assets/ghn.png"
          alt="Tâm Nguồn Book"
          className="h-16 mx-auto mb-4 object-contain"
        />
        <h2 className="text-2xl font-bold text-[#2D2D2D]">
          {activeTab === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          {activeTab === 'login' ? 'Đăng nhập để tiếp tục mua sắm' : 'Đăng ký để nhận ưu đãi đặc biệt'}
        </p>
      </div>

      {/* Social Login Buttons */}
      <div className="px-6 pb-4">
        <OAuthButtons />

        {/* Separator */}
        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-gray-400 font-medium">HOẶC</span>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-gray-200 mx-6">
        <button
          className={`flex-1 py-3 px-4 text-center font-semibold text-sm focus:outline-none transition-all duration-200 ${activeTab === 'login'
            ? 'text-[#008080] border-b-2 border-[#008080]'
            : 'text-gray-400 hover:text-gray-600'
            }`}
          onClick={() => handleTabChange('login')}
        >
          Đăng nhập
        </button>
        <button
          className={`flex-1 py-3 px-4 text-center font-semibold text-sm focus:outline-none transition-all duration-200 ${activeTab === 'register'
            ? 'text-[#008080] border-b-2 border-[#008080]'
            : 'text-gray-400 hover:text-gray-600'
            }`}
          onClick={() => handleTabChange('register')}
        >
          Đăng ký
        </button>
      </div>

      {/* Form Area */}
      <div className="px-6 py-6">
        {activeTab === 'login' ? <LoginForm /> : <RegisterForm />}
      </div>
    </div>
  );
}