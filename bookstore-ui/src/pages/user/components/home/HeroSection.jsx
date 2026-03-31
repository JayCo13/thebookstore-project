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
                            // .slice(0, 3) // Don't limit here too strictly, let the UI decide
                            .map((u) => getBookCoverUrl(u));
                    }

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
                        titleFontFamily: content?.title_font_family || 'serif',
                        bodyFontFamily: content?.body_font_family || 'serif',
                    };
                }

                setSlides(updated);
            } catch (err) {
                // Silently keep defaults on error
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
                // Use relative units (%) or smaller pixels for smoother, safer movement
                const xOffset = (xPercent - 0.5) * speed * 20;
                const yOffset = (yPercent - 0.5) * speed * 20;

                el.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
            });
        };

        // Only add mousemove event on desktop devices
        const isMobile = window.innerWidth < 768;
        if (!isMobile) {
            document.addEventListener('mousemove', handleMouseMove);
        }

        return () => {
            // Clean up previous event listener
            if (!isMobile) {
                document.removeEventListener('mousemove', handleMouseMove);
            }
        };
    }, []);

    // Three.js background setup
    useEffect(() => {
        const mount = threeMountRef.current;
        if (!mount) return;

        // Use resize observer or window resize to keep size correct
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

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
        dirLight.position.set(3, 4, 2);
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
            const swirl = r * 1.6;
            const theta = armAngle + swirl + (Math.random() - 0.5) * 0.35;
            const x = Math.cos(theta) * r;
            const y = (Math.random() - 0.5) * 0.25;
            const z = Math.sin(theta) * r * 0.7;
            positions.push(x, y, z);
            const hue = 0.6 + (Math.random() * 0.1 - 0.05); // blue-purple
            const sat = 0.35 + Math.random() * 0.25;
            const lig = 0.2 + Math.random() * 0.15;
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
            renderer, scene, camera, group, galaxyGroup, spiralLayer, bgLayer, fgLayer, nebula, starTex,
            raf: null, targetX: 0, mouse: { x: 0, y: 0 }
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
            const { renderer, scene, camera, galaxyGroup, spiralLayer, bgLayer, fgLayer, mouse } = state;
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
            spiralLayer.geo.dispose(); spiralLayer.mat.dispose();
            bgLayer.geo.dispose(); bgLayer.mat.dispose();
            fgLayer.geo.dispose(); fgLayer.mat.dispose();
            nebula.geometry.dispose(); nebula.material.dispose();
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

    // Auto-slide functionality
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % totalSlides);
        }, 6000); // 6s instead of 5s for better readability

        return () => clearInterval(interval);
    }, []);

    // --- Smart Composition Renderers ---

    const renderSingleImage = (src, index) => (
        <div className="relative w-full h-[45vh] sm:h-[500px] flex items-center justify-center">
            <div
                className="parallax-element relative z-10 w-[70%] max-w-[400px] aspect-[2/3] transition-all duration-700 ease-out transform"
                data-speed="1.2"
            >
                <div className="absolute inset-0 bg-white/5 rounded-2xl blur-xl transform scale-105" />
                <Image
                    src={src}
                    alt={`hero-item-${index}`}
                    className="w-full h-full object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                    width={500}
                    height={750}
                />
            </div>
            {/* Decorative circle behind */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-gradient-to-tr from-white/5 to-transparent rounded-full blur-3xl -z-10 animate-pulse-slow"></div>
        </div>
    );

    const renderTwoImages = (images, index) => (
        <div className="relative w-full h-[45vh] sm:h-[500px] flex items-center justify-center">
            {/* Back Image (Secondary) */}
            <div
                className="parallax-element absolute top-6 sm:top-12 left-[15%] w-[55%] max-w-[320px] aspect-[2/3] opacity-80 mix-blend-overlay sm:mix-blend-normal z-0 transform rotate-[-8deg] transition-all duration-700"
                data-speed="0.8"
            >
                <Image
                    src={images[1]}
                    alt={`hero-item-back-${index}`}
                    className="w-full h-full object-contain drop-shadow-lg grayscale-[30%] hover:grayscale-0 transition-all duration-500"
                    width={400}
                    height={600}
                />
            </div>
            {/* Front Image (Primary) */}
            <div
                className="parallax-element relative z-10 w-[60%] max-w-[360px] aspect-[2/3] transform rotate-[4deg] translate-x-8 sm:translate-x-12 hover:rotate-[2deg] transition-all duration-700"
                data-speed="1.4"
            >
                <Image
                    src={images[0]}
                    alt={`hero-item-front-${index}`}
                    className="w-full h-full object-contain drop-shadow-2xl"
                    width={450}
                    height={680}
                />
            </div>
        </div>
    );

    const renderThreeImages = (images, index) => (
        <div className="relative w-full h-[45vh] sm:h-[550px] flex items-center justify-center perspective-1000">
            {/* Left */}
            <div
                className="parallax-element absolute top-10 sm:top-16 left-[5%] sm:left-[10%] w-[45%] max-w-[280px] aspect-[2/3] z-0 transform -rotate-[15deg] origin-bottom-right transition-all duration-700 hover:-rotate-[10deg] hover:z-20"
                data-speed="1.1"
            >
                <Image src={images[1]} alt="left" width={300} height={450} className="w-full h-full object-contain drop-shadow-xl" />
            </div>

            {/* Right */}
            <div
                className="parallax-element absolute top-10 sm:top-16 right-[5%] sm:right-[10%] w-[45%] max-w-[280px] aspect-[2/3] z-0 transform rotate-[15deg] origin-bottom-left transition-all duration-700 hover:rotate-[10deg] hover:z-20"
                data-speed="1.1"
            >
                <Image src={images[2]} alt="right" width={300} height={450} className="w-full h-full object-contain drop-shadow-xl" />
            </div>

            {/* Center - Main */}
            <div
                className="parallax-element relative z-10 top-0 w-[55%] max-w-[340px] aspect-[2/3] transform hover:scale-105 transition-all duration-500"
                data-speed="1.5"
            >
                <div className="absolute -inset-4 bg-white/10 rounded-full blur-2xl -z-10"></div>
                <Image src={images[0]} alt="center" width={400} height={600} className="w-full h-full object-contain drop-shadow-2xl" />
            </div>
        </div>
    );

    const renderVisual = (images = [], index) => {
        // If no images, return transparent spacer
        if (!images || images.length === 0) return <div className="h-[30vh] md:h-[300px] w-full" />;

        if (images.length === 1) return renderSingleImage(images[0], index);
        if (images.length === 2) return renderTwoImages(images, index);
        return renderThreeImages(images.slice(0, 3), index);
    };

    return (
        <section
            ref={containerRef}
            className="relative min-h-[100dvh] sm:min-h-[850px] overflow-hidden bg-gradient-to-r from-[#f9f9f9] to-[#f0f0f0] flex items-center pt-20 pb-12 sm:py-0"
        >
            {/* 3D Background Canvas */}
            <div ref={threeMountRef} className="absolute inset-0 pointer-events-none z-0" />

            <div className="container mx-auto px-4 sm:px-6 lg:px-12 relative z-10 w-full h-full flex flex-col justify-center">
                <div className="relative w-full h-full flex items-center">
                    {/* Slide Container */}
                    <div className="w-full h-full relative">
                        {slides.map((slide, index) => {
                            // Only render current slide properly to avoid heavy DOM, or keep all hidden?
                            // Best for transition is to map all but control opacity/visiblity
                            const isActive = index === currentSlide;

                            return (
                                <div
                                    key={index}
                                    className={`
                                absolute inset-0 w-full h-full flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-16 items-center justify-center transition-all duration-1000 ease-in-out
                                ${isActive ? 'opacity-100 pointer-events-auto translate-x-0' : 'opacity-0 pointer-events-none translate-x-[20px]'}
                            `}
                                    style={{ position: isActive ? 'relative' : 'absolute' }}
                                >
                                    {/* Text Content */}
                                    <div className={`
                                order-2 lg:order-1 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6 max-w-2xl mx-auto lg:mx-0
                                transition-all duration-1000 delay-300 transform
                                ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}
                            `}>
                                        <h1
                                            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]"
                                            style={{
                                                color: slide.titleColor,
                                                fontFamily: slide.titleFontFamily,
                                            }}
                                        >
                                            {slide.title}
                                        </h1>
                                        <p
                                            className="text-lg sm:text-xl md:text-2xl opacity-90 leading-relaxed max-w-lg"
                                            style={{
                                                color: slide.bodyColor,
                                                fontFamily: slide.bodyFontFamily,
                                            }}
                                        >
                                            {slide.description}
                                        </p>

                                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-4">
                                            <Link
                                                href={slide.primaryBtnHref || '/categories'}
                                                className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 min-w-[220px]"
                                                style={{ backgroundColor: slide.primaryBtnBg, color: slide.primaryBtnText }}
                                            >
                                                {slide.primaryBtnLabel || 'Explore Books'}
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Visual Content */}
                                    <div className={`
                                order-1 lg:order-2 w-full flex items-center justify-center perspective-1000
                                transition-all duration-1000 delay-500 transform
                                ${isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
                            `}>
                                        {renderVisual(slide.images, index)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
