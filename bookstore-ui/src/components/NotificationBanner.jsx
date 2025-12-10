import React, { useState, useEffect } from 'react';
import { getActiveNotification, dismissNotification, isNotificationDismissed } from '../service/api';

export default function NotificationBanner() {
    const [notification, setNotification] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(true); // Start as dismissed until loaded
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Check screen size
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const fetchNotification = async () => {
            try {
                const data = await getActiveNotification();
                if (data && data.is_active) {
                    const dismissed = isNotificationDismissed(data.notification_id);
                    setIsDismissed(dismissed);
                    setNotification(data);

                    if (!dismissed) {
                        // Small delay for animation
                        setTimeout(() => setIsVisible(true), 100);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch notification:', error);
            }
        };

        fetchNotification();

        // Poll every minute to check for updates
        const interval = setInterval(fetchNotification, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleDismiss = () => {
        if (notification) {
            setIsVisible(false);
            // Wait for animation to finish before removing from DOM
            setTimeout(() => {
                dismissNotification(notification.notification_id);
                setIsDismissed(true);
            }, 500);
        }
    };

    if (!notification || isDismissed) return null;

    // Mobile Overlay Layout
    if (isMobile && notification.mobile_image_url) {
        return (
            <div
                className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-500 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
            >
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={handleDismiss}
                ></div>

                {/* Content */}
                <div
                    className={`relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-500 ${isVisible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-10'
                        }`}
                    style={{
                        backgroundColor: notification.background_color || '#ffffff',
                    }}
                >
                    {/* Close Button */}
                    <button
                        onClick={handleDismiss}
                        className="absolute top-2 right-2 z-20 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors backdrop-blur-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Image */}
                    <img
                        src={notification.mobile_image_url}
                        alt="Notification"
                        className="w-full h-auto object-contain block"
                    />

                    {/* Message (Optional, usually text is in image for mobile popup) */}
                    {notification.message && (
                        <div
                            className="p-4 text-center"
                            style={{
                                color: notification.text_color || '#000000',
                                textAlign: notification.text_align || 'center',
                                fontWeight: notification.font_weight || 'normal',
                            }}
                        >
                            {notification.message}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Desktop Banner Layout
    return (
        <div
            className={`fixed bottom-0 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ease-out ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-full opacity-0 scale-95'
                }`}
            style={{
                maxWidth: '900px',
                width: '100%',
                marginBottom: isVisible ? '1.5rem' : '0',
            }}
        >
            <div
                className={`relative rounded-lg shadow-2xl flex items-center justify-between transition-all duration-500 overflow-hidden ${isVisible ? 'animate-popup' : ''
                    }`}
                style={{
                    backgroundColor: notification.image_url ? 'transparent' : (notification.background_color || '#008080'),
                    color: notification.text_color || '#FFFFFF',
                    minHeight: notification.image_url ? '200px' : 'auto',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)',
                }}
            >
                {/* Background Image Layer - Full Coverage */}
                {notification.image_url && (
                    <div
                        className="absolute inset-0 z-0"
                        style={{
                            backgroundImage: `url(${notification.image_url})`,
                            backgroundSize: 'cover', // Use cover to fill space, or contain if preferred but cover avoids blank space
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                        }}
                    ></div>
                )}

                {/* Close button - top right corner */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-3 right-3 z-20 group transition-all duration-300 hover:scale-110 hover:rotate-90 p-2 rounded-full bg-yellow-500/50 hover:bg-yellow-500/75 backdrop-blur-sm animate-pulse-slow"
                    aria-label="Dismiss notification"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-white transition-transform duration-300 group-hover:rotate-180"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        style={{
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
                        }}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>

                {/* Content Layer */}
                <div
                    className="relative z-10 flex-1 px-8 py-6 pr-16 w-full h-full flex items-center"
                    style={{
                        textAlign: notification.text_align || 'center',
                        fontWeight: notification.font_weight || 'normal',
                        textShadow: notification.image_url ? '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)' : 'none',
                        justifyContent: notification.text_align === 'left' ? 'flex-start' : notification.text_align === 'right' ? 'flex-end' : 'center'
                    }}
                >
                    {/* Message */}
                    {notification.message && (
                        <p className="text-base md:text-lg leading-relaxed">
                            {notification.message}
                        </p>
                    )}
                </div>
            </div>

            {/* Custom CSS for animations */}
            <style jsx>{`
        @keyframes popup {
          0% {
            transform: scale(0.8) translateY(20px);
            opacity: 0;
          }
          50% {
            transform: scale(1.05) translateY(-5px);
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        
        .animate-popup {
          animation: popup 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
        </div>
    );
}
