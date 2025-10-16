'use client';

import { useState, useEffect, useRef } from 'react';
import Link from '../../compat/Link';
import Image from '../../compat/Image';

export default function HeroSection() {
  const containerRef = useRef(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 3;
  
  // Handle parallax effect - only on client
  useEffect(() => {
    // run only after mount on client
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      
      const { clientX, clientY } = e;
      const rect = containerRef.current.getBoundingClientRect();
      
      // Calculate mouse position relative to the container
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      
      // Calculate the percentage of the mouse position
      const xPercent = x / rect.width;
      const yPercent = y / rect.height;
      
      // Apply parallax effect to elements
      const elements = containerRef.current.querySelectorAll('.parallax-element');
      elements.forEach(el => {
        const speed = el.getAttribute('data-speed') || 1;
        const xOffset = (xPercent - 0.5) * speed * 30;
        const yOffset = (yPercent - 0.5) * speed * 30;
        
        el.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
      });
    };
    
    // Only add mousemove event on desktop devices
    const isMobile = window.innerWidth < 768;
    if (!isMobile) {
      document.addEventListener('mousemove', handleMouseMove);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  // Auto-slide functionality - only on client
  useEffect(() => {
    // run only after mount on client
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Handle manual navigation
  const goToSlide = (index) => {
    setCurrentSlide(index);
  };
  
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };
  
  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };
  
  // Slide content
  const slides = [
    // Slide 1 - Main slide
    {
      title: (
        <>
          Discover worlds <br />
          <span className="text-[#008080]">between pages</span>
        </>
      ),
      description: "Curated collections of thought-provoking literature for the modern reader.",
      visual: (
        <div className="relative h-[380px] sm:h-[460px] md:h-[560px] w-[380px] sm:w-[460px] md:w-[560px]">
          {/* Floating book cover images */}
          <div className="parallax-element absolute top-0 left-0" data-speed="2">
            <Image src="/assets/yoga_voighe.png" alt="La Thu Tay" width={420} height={560} className="rounded-md transform rotate-[-5deg] object-cover " />
          </div>
          
          <div className="parallax-element absolute top-16 sm:top-20 left-24 sm:left-32" data-speed="1.5">
            <Image src="/assets/yoga_voighe.png" alt="Yoasoi Sang" width={400} height={540} className="rounded-md transform rotate-[8deg] object-cover " />
          </div>
          
          <div className="parallax-element absolute top-32 sm:top-40 left-12 sm:left-16" data-speed="2.5">
            <Image src="/assets/yoga_voighe.png" alt="Yoga Voighe" width={360} height={520} className="rounded-md transform rotate-[-12deg] object-cover " />
          </div>
        </div>
      )
    },
    
    // Slide 2 - New releases
    {
      title: (
        <>
          New Releases <br />
          <span className="text-[#E57A44]">This Month</span>
        </>
      ),
      description: "Explore our latest additions to find your next favorite book.",
      visual: (
        <div className="relative h-[380px] sm:h-[460px] md:h-[560px] w-[380px] sm:w-[460px] md:w-[560px]">
          {/* Stacked covers */}
          <div className="parallax-element absolute top-8 left-8" data-speed="1.8">
            <Image src="/assets/yoga_voighe.png" alt="New Release" width={520} height={700} className="rounded-md object-cover " />
          </div>
          
          <div className="parallax-element absolute top-16 left-20" data-speed="1.2">
            <Image src="/assets/yoga_voighe.png" alt="Bestseller" width={520} height={700} className="rounded-md object-cover " />
          </div>
          
          <div className="parallax-element absolute top-24 left-32" data-speed="2.2">
            <Image src="/assets/yoga_voighe.png" alt="Coming Soon" width={520} height={700} className="rounded-md object-cover " />
          </div>
        </div>
      )
    },
    
    // Slide 3 - New Release 2
    {
      title: (
        <>
          Bestselling <br />
          <span className="text-[#008080]">New Arrivals</span>
        </>
      ),
      description: "The most anticipated books of the season, now available in our store.",
      visual: (
        <div className="relative h-[420px] sm:h-[520px] md:h-[620px] w-[420px] sm:w-[520px] md:w-[620px]">
          <div className="parallax-element absolute top-0 right-0 z-10" data-speed="1.5">
            <Image src="/assets/yoga_voighe.png" alt="Bestselling New Arrival" width={600} height={780} className="rounded-lg object-cover" />
          </div>
          
          {/* Decorative element (subtle) */}
          <div className="parallax-element absolute bottom-20 left-10" data-speed="2" style={{ zIndex: 1 }}>
            <div className="w-40 h-40 rounded-full bg-[#4A6FA5] opacity-5"></div>
          </div>
        </div>
      )
    }
  ];
  
  // Always render client content; effects handle interactivity post-hydration

  // Client-side content
  return (
    <section 
      ref={containerRef}
      className="relative min-h-[650px] md:min-h-[700px] lg:min-h-[750px] overflow-hidden bg-gradient-to-r from-[#f9f9f9] to-[#f0f0f0] flex items-center py-8 md:py-10"
    >
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="parallax-element absolute top-[10%] left-[5%] w-64 h-64 rounded-full bg-[#008080] opacity-5" data-speed="2"></div>
        <div className="parallax-element absolute bottom-[15%] right-[10%] w-80 h-80 rounded-full bg-[#008080] opacity-5" data-speed="1.5"></div>
        <div className="parallax-element absolute top-[40%] right-[20%] w-40 h-40 rounded-full bg-[#008080] opacity-5" data-speed="3"></div>
      </div>
      
      {/* Slider container */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        {/* Slides */}
        <div className="relative overflow-hidden">
          <div 
            className="flex transition-transform duration-500 ease-in-out" 
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {slides.map((slide, index) => (
              <div key={index} className="min-w-full flex flex-col lg:flex-row items-center justify-between gap-8 py-4">
                {/* Text content */}
                <div className="w-full lg:w-1/2 mb-8 lg:mb-0">
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold leading-tight mb-4 sm:mb-6 text-gray-900">
                    {slide.title}
                  </h1>
                  <p className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-6 sm:mb-8 max-w-xl">
                    {slide.description}
                  </p>
                  <div className="flex flex-wrap gap-3 sm:gap-4">
                    <Link 
                      href="/categories" 
                      className="px-6 sm:px-8 py-2.5 sm:py-3 bg-[#008080] text-white font-medium rounded-md hover:bg-[#006666] transition-colors duration-300 text-sm sm:text-base"
                    >
                      Explore Books
                    </Link>
                    <Link 
                      href="/new-arrivals" 
                      className="px-6 sm:px-8 py-2.5 sm:py-3 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors duration-300 text-sm sm:text-base"
                    >
                      New Arrivals
                    </Link>
                  </div>
                </div>
                
                {/* Visual elements */}
                <div className="w-full lg:w-1/2 relative flex justify-center">
                  {slide.visual}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* No navigation controls - automatic sliding only */}
      </div>
    </section>
  );
}