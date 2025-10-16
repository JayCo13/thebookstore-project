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
    <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="px-6 py-8">
        <h2 className="text-2xl font-bold text-center text-gray-800">
          {activeTab === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}
        </h2>
      </div>

      {/* Social Login Buttons */}
      <div className="px-6 pb-6">
        <OAuthButtons />

        {/* Separator */}
        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500 font-medium">HOẶC</span>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 py-4 px-4 text-center font-medium text-sm focus:outline-none transition-colors duration-200 ${activeTab === 'login' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => handleTabChange('login')}
        >
          Đăng nhập
        </button>
        <button
          className={`flex-1 py-4 px-4 text-center font-medium text-sm focus:outline-none transition-colors duration-200 ${activeTab === 'register' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
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