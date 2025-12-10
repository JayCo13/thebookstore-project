'use client';

import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import Link from '../../compat/Link';
import Image from '../../compat/Image';
import { getSlideBooks, getSlideStationery, getSlideContents, getBookCoverUrl, getBook, getStationeryItem } from '../../../../service/api.js';

export default function HeroSection() {
  const containerRef = useRef(null);
  const threeMountRef = useRef(null);
  const threeRef = useRef(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 3;
  const [slides, setSlides] = useState([
    { title: 'Khám phá thế giới', description: 'Bộ sưu tập sách chọn lọc cho độc giả hiện đại.', images: [], titleColor: '#111827', bodyColor: '#6b7280', primaryBtnBg: '#008080', primaryBtnText: '#ffffff', secondaryBtnBg: '#ffffff', secondaryBtnText: '#374151', primaryBtnHref: '/categories', secondaryBtnHref: '/new-arrivals', primaryBtnLabel: 'Explore Books', secondaryBtnLabel: 'New Arrivals', titleFontSize: '32px', bodyFontSize: '18px', titleFontFamily: 'serif', bodyFontFamily: 'serif', imageWidth: 'auto', imageHeight: 'auto' },
    { title: 'Phát hành mới tháng này', description: 'Khám phá các đầu sách vừa cập nhật.', images: [], titleColor: '#111827', bodyColor: '#6b7280', primaryBtnBg: '#E57A44', primaryBtnText: '#ffffff', secondaryBtnBg: '#ffffff', secondaryBtnText: '#374151', primaryBtnHref: '/categories', secondaryBtnHref: '/new-arrivals', primaryBtnLabel: 'Explore Books', secondaryBtnLabel: 'New Arrivals', titleFontSize: '32px', bodyFontSize: '18px', titleFontFamily: 'serif', bodyFontFamily: 'serif', imageWidth: 'auto', imageHeight: 'auto' },
    { title: 'Sách bán chạy vừa về', description: 'Những cuốn sách được mong đợi nhất mùa này.', images: [], titleColor: '#111827', bodyColor: '#6b7280', primaryBtnBg: '#008080', primaryBtnText: '#ffffff', secondaryBtnBg: '#ffffff', secondaryBtnText: '#374151', primaryBtnHref: '/categories', secondaryBtnHref: '/new-arrivals', primaryBtnLabel: 'Explore Books', secondaryBtnLabel: 'New Arrivals', titleFontSize: '32px', bodyFontSize: '18px', titleFontFamily: 'serif', bodyFontFamily: 'serif', imageWidth: 'auto', imageHeight: 'auto' }
  ]);

  // Fetch slide contents and items (books + stationery)
  useEffect(() => {
    const loadSlides = async () => {
      try {
        // Load textual content
        const contents = await getSlideContents();
        const contentByNumber = {};
        (contents || []).forEach((c) => { contentByNumber[c.slide_number] = c; });

        // For each slide number, fetch items
        const numbers = [1, 2, 3];
        const updated = [...slides];

        for (let i = 0; i < numbers.length; i++) {
          const n = numbers[i];
          const content = contentByNumber[n];
          let imgUrls = [];
          // If admin selected a specific item, use its image
          if (content?.selected_item_type && content?.selected_item_id) {
            try {
              if (content.selected_item_type === 'book') {
                const b = await getBook(content.selected_item_id);
                const urls = [b?.image_url, b?.image2_url, b?.image3_url]
                  .filter(Boolean)
                  .slice(0, 3)
                  .map((u) => getBookCoverUrl(u));
                imgUrls = urls;
              } else if (content.selected_item_type === 'stationery') {
                const s = await getStationeryItem(content.selected_item_id);
                const urls = [s?.image_url, s?.image2_url, s?.image3_url]
                  .filter(Boolean)
                  .slice(0, 3)
                  .map((u) => getBookCoverUrl(u));
                imgUrls = urls;
              }
            } catch { }
          }
          // Fallback: use flagged slide items if no selection or missing image
          if (imgUrls.length === 0) {
            const [books, stationery] = await Promise.all([
              getSlideBooks(n, 6).catch(() => []),
              getSlideStationery(n, 6).catch(() => [])
            ]);
            const items = [...(books || []), ...(stationery || [])];
            imgUrls = items
              .map((it) => it.image_url || it.image2_url || it.image3_url)
              .filter(Boolean)
              .slice(0, 3)
              .map((u) => getBookCoverUrl(u));
          }
          // responsive typography sizes
          const titlePx = content?.title_font_size ? parseInt(content.title_font_size) : 120;
          const bodyPx = content?.body_font_size ? parseInt(content.body_font_size) : 48;
          const titleMobilePx = Math.max(Math.round(titlePx * 0.62), 26);
          const bodyMobilePx = Math.max(Math.round(bodyPx * 0.8), 15);
          const titleClamp = `clamp(${titleMobilePx}px, 7vw, ${titlePx}px)`;
          const bodyClamp = `clamp(${bodyMobilePx}px, 4.75vw, ${bodyPx}px)`;

          updated[i] = {
            title: content?.title || updated[i].title,
            description: content?.body || updated[i].description,
            images: imgUrls,
            titleColor: content?.title_color || updated[i].titleColor,
            bodyColor: content?.body_color || updated[i].bodyColor,
            primaryBtnBg: content?.primary_button_bg_color || updated[i].primaryBtnBg,
            primaryBtnText: content?.primary_button_text_color || updated[i].primaryBtnText,
            secondaryBtnBg: content?.secondary_button_bg_color || updated[i].secondaryBtnBg,
            secondaryBtnText: content?.secondary_button_text_color || updated[i].secondaryBtnText,
            primaryBtnHref: content?.primary_button_url || updated[i].primaryBtnHref,
            secondaryBtnHref: content?.secondary_button_url || updated[i].secondaryBtnHref,
            primaryBtnLabel: content?.primary_button_label || updated[i].primaryBtnLabel,
            secondaryBtnLabel: content?.secondary_button_label || updated[i].secondaryBtnLabel,
            // Font properties
            titleFontSize: content?.title_font_size ? `${content.title_font_size}px` : '120px',
            bodyFontSize: content?.body_font_size ? `${content.body_font_size}px` : '48px',
            titleSizeClamp: titleClamp,
            bodySizeClamp: bodyClamp,
            // Debug logging
            _rawTitleFontSize: content?.title_font_size,
            _rawBodyFontSize: content?.body_font_size,
            titleFontFamily: content?.title_font_family || 'serif',
            bodyFontFamily: content?.body_font_family || 'serif',
            // Image dimensions
            imageWidth: content?.image_width || 'auto',
            imageHeight: content?.image_height || 'auto',
          };
        }

        setSlides(updated);
        console.log('Updated slides with font sizes:', updated.map(s => ({
          title: s.title,
          titleFontSize: s.titleFontSize,
          bodyFontSize: s.bodyFontSize,
          _rawTitleFontSize: s._rawTitleFontSize,
          _rawBodyFontSize: s._rawBodyFontSize
        })));

        // Additional debug: log the first slide's font sizes in detail
        if (updated.length > 0) {
          console.log('First slide font size details:', {
            title: updated[0].title,
            titleFontSize: updated[0].titleFontSize,
            bodyFontSize: updated[0].bodyFontSize,
            titleColor: updated[0].titleColor,
            bodyColor: updated[0].bodyColor
          });
        }
      } catch (err) {
        // Silently keep defaults on error
        // console.warn('Failed to load hero slides:', err);
      }
    };

    loadSlides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Three.js background setup
  useEffect(() => {
    const mount = threeMountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;
    const isMobile = window.innerWidth < 768;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.75));
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.zIndex = '0';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b1020, 0.12);
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    camera.position.set(0, 0.25, 3);

    // Lighting for proper depth perception
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(3, 4, 2);
    dirLight.castShadow = false;
    scene.add(ambient);
    scene.add(dirLight);

    const group = new THREE.Group();
    scene.add(group);

    // Sprite texture for round stars
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = 64; spriteCanvas.height = 64;
    const sctx = spriteCanvas.getContext('2d');
    const grad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0.0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 64, 64);
    const starTex = new THREE.CanvasTexture(spriteCanvas);
    starTex.anisotropy = 4;

    const galaxyGroup = new THREE.Group();
    group.add(galaxyGroup);

    const makePoints = (positions, colors, size) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
      const mat = new THREE.PointsMaterial({
        size,
        map: starTex,
        transparent: true,
        opacity: 0.95,
        blending: THREE.NormalBlending,
        depthWrite: false,
        vertexColors: true,
        sizeAttenuation: true
      });
      return { mesh: new THREE.Points(geo, mat), geo, mat };
    };

    const arms = 3;
    const starCount = isMobile ? 1000 : 2200;
    const positions = [];
    const colors = [];
    for (let i = 0; i < starCount; i++) {
      const armIndex = i % arms;
      const armAngle = (armIndex / arms) * Math.PI * 2;
      const r = Math.random() * 2.6 + 0.4;
      const swirl = r * 1.6; // logarithmic-ish spiral
      const theta = armAngle + swirl + (Math.random() - 0.5) * 0.35;
      const x = Math.cos(theta) * r;
      const y = (Math.random() - 0.5) * 0.25; // thin disc
      const z = Math.sin(theta) * r * 0.7;
      positions.push(x, y, z);
      const hue = 0.6 + (Math.random() * 0.1 - 0.05); // blue-purple
      const sat = 0.35 + Math.random() * 0.25;
      const lig = 0.2 + Math.random() * 0.15; // darker for white bg
      const col = new THREE.Color().setHSL(hue, sat, lig);
      colors.push(col.r, col.g, col.b);
    }
    const spiralLayer = makePoints(positions, colors, isMobile ? 0.018 : 0.015);
    galaxyGroup.add(spiralLayer.mesh);

    // Background scatter
    const bgPositions = [];
    const bgColors = [];
    const bgCount = isMobile ? 600 : 1200;
    for (let i = 0; i < bgCount; i++) {
      const x = (Math.random() - 0.5) * 8;
      const y = (Math.random() - 0.5) * 2.2;
      const z = (Math.random() - 0.5) * 6;
      bgPositions.push(x, y, z);
      const col = new THREE.Color().setHSL(0.62 + Math.random() * 0.05, 0.3, 0.22);
      bgColors.push(col.r, col.g, col.b);
    }
    const bgLayer = makePoints(bgPositions, bgColors, isMobile ? 0.012 : 0.01);
    galaxyGroup.add(bgLayer.mesh);

    // Foreground bright stars
    const fgPositions = [];
    const fgColors = [];
    const fgCount = isMobile ? 80 : 160;
    for (let i = 0; i < fgCount; i++) {
      const x = (Math.random() - 0.5) * 4;
      const y = (Math.random() - 0.5) * 1.2;
      const z = (Math.random() - 0.5) * 1.4;
      fgPositions.push(x, y, z);
      const col = new THREE.Color().setHSL(0.58 + Math.random() * 0.08, 0.45, 0.35);
      fgColors.push(col.r, col.g, col.b);
    }
    const fgLayer = makePoints(fgPositions, fgColors, isMobile ? 0.022 : 0.02);
    galaxyGroup.add(fgLayer.mesh);

    // Nebula glow plane
    const nebCanvas = document.createElement('canvas');
    nebCanvas.width = 256; nebCanvas.height = 256;
    const nctx = nebCanvas.getContext('2d');
    const ngrad = nctx.createRadialGradient(128, 128, 20, 128, 128, 128);
    ngrad.addColorStop(0, 'rgba(96,80,160,0.35)');
    ngrad.addColorStop(0.6, 'rgba(64,60,140,0.15)');
    ngrad.addColorStop(1, 'rgba(16,20,40,0.0)');
    nctx.fillStyle = ngrad;
    nctx.fillRect(0, 0, 256, 256);
    const nebTex = new THREE.CanvasTexture(nebCanvas);
    const nebulaMat = new THREE.MeshBasicMaterial({ map: nebTex, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false });
    const nebula = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), nebulaMat);
    nebula.position.set(0, -0.05, -2.2);
    nebula.rotation.x = -0.08;
    group.add(nebula);

    threeRef.current = {
      renderer,
      scene,
      camera,
      group,
      galaxyGroup,
      spiralLayer,
      bgLayer,
      fgLayer,
      nebula,
      starTex,
      raf: null,
      targetX: 0,
      mouse: { x: 0, y: 0 }
    };

    const onResize = () => {
      if (!threeRef.current) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.75));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    const onMouseMove = (e) => {
      const rect = mount.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      if (threeRef.current) {
        threeRef.current.mouse.x = x;
        threeRef.current.mouse.y = y;
      }
    };
    if (!isMobile) document.addEventListener('mousemove', onMouseMove);

    const animate = () => {
      const state = threeRef.current;
      if (!state) return;
      const { renderer, scene, camera, group, galaxyGroup, spiralLayer, bgLayer, fgLayer, mouse } = state;
      // subtle background motion
      galaxyGroup.rotation.z += 0.0006;
      spiralLayer.mesh.rotation.z += 0.0004;
      bgLayer.mesh.rotation.z -= 0.0002;
      fgLayer.mesh.rotation.z += 0.0003;
      const targetRotX = mouse.y * 0.06;
      const targetRotY = mouse.x * 0.08;
      camera.position.x += (state.targetX - camera.position.x) * 0.06;
      camera.rotation.x += (targetRotX - camera.rotation.x) * 0.04;
      camera.rotation.y += (targetRotY - camera.rotation.y) * 0.04;
      renderer.render(scene, camera);
      state.raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (threeRef.current?.raf) cancelAnimationFrame(threeRef.current.raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousemove', onMouseMove);
      // dispose geometries/materials
      spiralLayer.geo.dispose();
      spiralLayer.mat.dispose();
      bgLayer.geo.dispose();
      bgLayer.mat.dispose();
      fgLayer.geo.dispose();
      fgLayer.mat.dispose();
      nebula.geometry.dispose();
      nebula.material.dispose();
      starTex.dispose();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Smoothly move camera across slides to keep perspective consistent
  useEffect(() => {
    const centers = [-0.8, 0.0, 0.9];
    if (threeRef.current) {
      threeRef.current.targetX = centers[currentSlide] || 0;
    }
  }, [currentSlide]);

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


  const renderVisual = (images = [], index, slide) => {
    // Unique layout per slide (counts, positions, and fixed sizes)
    const containerSizes = [
      'h-[220px] sm:h-[340px] md:h-[420px] w-[220px] sm:w-[340px] md:w-[420px]',
      'h-[240px] sm:h-[360px] md:h-[460px] w-[240px] sm:w-[360px] md:w-[460px]',
      'h-[260px] sm:h-[380px] md:h-[520px] w-[260px] sm:w-[380px] md:w-[520px]'
    ];

    const layouts = [
      {
        sizes: [
          { w: 340, h: 460 },
          { w: 300, h: 420 }
        ],
        positions: [
          { cls: 'top-0 left-0', speed: 2, rot: '-6deg' },
          { cls: 'top-12 sm:top-16 left-16 sm:left-24', speed: 1.6, rot: '9deg' }
        ],
        container: containerSizes[0]
      },
      {
        sizes: [
          { w: 340, h: 460 },
          { w: 320, h: 440 },
          { w: 280, h: 400 }
        ],
        positions: [
          { cls: 'top-0 left-0', speed: 1.8, rot: '-4deg' },
          { cls: 'top-12 sm:top-16 left-16 sm:left-24', speed: 1.4, rot: '8deg' },
          { cls: 'top-28 sm:top-32 left-10 sm:left-14', speed: 2.2, rot: '-12deg' }
        ],
        container: containerSizes[1]
      },
      {
        sizes: [
          { w: 380, h: 520 }
        ],
        positions: [
          { cls: 'top-6 sm:top-10 left-10 sm:left-12', speed: 2.0, rot: '-2deg' }
        ],
        container: containerSizes[2]
      }
    ];

    const layout = layouts[index] || layouts[1];
    const count = Math.min(layout.sizes.length, images.length);
    const effectiveImages = images.slice(0, count);

    if (effectiveImages.length === 1) {
      const w = slide.imageWidth !== 'auto' ? parseInt(slide.imageWidth) : (layout.sizes[0]?.w || 520);
      const h = slide.imageHeight !== 'auto' ? parseInt(slide.imageHeight) : (layout.sizes[0]?.h || 700);
      return (
        <div className={`flex items-center justify-center ${layout.container} max-w-full mx-auto`}>
          <div
            className="parallax-element"
            data-speed={layout.positions[0]?.speed || 1.5}
            style={{
              width: `clamp(180px, 58vw, ${w}px)`,
              aspectRatio: `${w} / ${h}`
            }}
          >
            <Image
              src={effectiveImages[0]}
              alt={`slide-${index + 1}-item-1`}
              width={w}
              height={h}
              className="rounded-md object-contain"
              style={{ objectFit: 'contain' }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className={`relative ${layout.container} max-w-full mx-auto`}>
        {effectiveImages.map((src, i) => (
          <div
            key={i}
            className={`parallax-element absolute ${layout.positions[i]?.cls || 'top-0 left-0'}`}
            data-speed={layout.positions[i]?.speed || 1.5}
            style={{
              width: `clamp(160px, 55vw, ${(slide.imageWidth !== 'auto' ? parseInt(slide.imageWidth) : (layout.sizes[i]?.w || 520))}px)`,
              aspectRatio: `${slide.imageWidth !== 'auto' ? parseInt(slide.imageWidth) : (layout.sizes[i]?.w || 520)} / ${slide.imageHeight !== 'auto' ? parseInt(slide.imageHeight) : (layout.sizes[i]?.h || 700)}`
            }}
          >
            <Image
              src={src}
              alt={`slide-${index + 1}-item-${i + 1}`}
              width={slide.imageWidth && slide.imageWidth !== 'auto' ? parseInt(slide.imageWidth) : (layout.sizes[i]?.w || 520)}
              height={slide.imageHeight && slide.imageHeight !== 'auto' ? parseInt(slide.imageHeight) : (layout.sizes[i]?.h || 700)}
              className={`rounded-md transform rotate-[${layout.positions[i]?.rot || '0deg'}] object-contain`}
              style={{ objectFit: 'contain' }}
            />
          </div>
        ))}
        {index === 2 && (
          <div className="parallax-element absolute bottom-20 left-10" data-speed={2} style={{ zIndex: 1 }}>
            <div className="w-40 h-40 rounded-full bg-[#4A6FA5] opacity-5"></div>
          </div>
        )}
      </div>
    );
  };

  // Always render client content; effects handle interactivity post-hydration

  // Client-side content
  return (
    <section
      ref={containerRef}
      className="relative min-h-[100vh] sm:min-h-[95vh] md:min-h-[90vh] lg:min-h-[90vh] overflow-hidden bg-gradient-to-r from-[#f9f9f9] to-[#f0f0f0] flex items-center py-4 sm:py-7 md:py-10 mt-20"
    >
      {/* 3D Background Canvas */}
      <div ref={threeMountRef} className="absolute inset-0 pointer-events-none" />

      {/* Slider container */}
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 relative z-10 w-full">
        {/* Slides */}
        <div className="relative overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {slides.map((slide, index) => (
              <div key={index} className="min-w-full flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8 py-4">
                {/* Text content */}
                <div className="w-full lg:w-1/2 mb-8 lg:mb-0 text-center lg:text-left">
                  <h1
                    className="hero-title tracking-tight"
                    style={{
                      color: slide.titleColor,
                      fontFamily: slide.titleFontFamily,
                      fontWeight: 'bold',
                      lineHeight: 1.2,
                      '--hero-title-size': slide.titleSizeClamp,
                      margin: '0 0 12px 0',
                      padding: 0
                    }}
                  >
                    {slide.title}
                  </h1>
                  <p
                    className="mb-5 sm:mb-8 max-w-xl hero-body mx-auto lg:mx-0"
                    style={{
                      color: slide.bodyColor,
                      fontFamily: slide.bodyFontFamily,
                      '--hero-body-size': slide.bodySizeClamp
                    }}
                  >
                    {slide.description}
                  </p>
                  <div className="flex flex-wrap gap-3 sm:gap-4 justify-center lg:justify-start">
                    <Link
                      href={slide.primaryBtnHref || '/categories'}
                      className="px-6 sm:px-8 py-2.5 sm:py-3 font-medium rounded-md transition-colors duration-300 text-sm sm:text-base"
                      style={{ backgroundColor: slide.primaryBtnBg, color: slide.primaryBtnText }}
                    >
                      {slide.primaryBtnLabel || 'Explore Books'}
                    </Link>
                    <Link
                      href={slide.secondaryBtnHref || '/new-arrivals'}
                      className="px-6 sm:px-8 py-2.5 sm:py-3 font-medium rounded-md transition-colors duration-300 text-sm sm:text-base border"
                      style={{ backgroundColor: slide.secondaryBtnBg, color: slide.secondaryBtnText, borderColor: slide.secondaryBtnText || '#d1d5db' }}
                    >
                      {slide.secondaryBtnLabel || 'New Arrivals'}
                    </Link>
                  </div>
                </div>

                {/* Visual elements */}
                <div className="w-full lg:w-1/2 relative flex justify-center">
                  {renderVisual(slide.images, index, slide)}
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
