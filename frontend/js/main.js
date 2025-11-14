// Main Application Controller
class StarMediaApp {
    constructor() {
        this.currentPage = 'home';
        this.services = [];
        this.featuredCourses = [];
        this.testimonials = [];
        this.init();
    }

    async init() {
        await this.initializeApp();
        this.initializeParticles();
        this.initializeNavigation();
        this.initializeScrollEffects();
        this.initializeAnimations();
        this.initializeServiceCards();
        this.initializeFeaturedCourses();
        this.initializeTestimonials();
        this.initializeCounters();
        this.initializeAOS();
        this.initializePageRouting();
    }

    async initializeApp() {
        // Load initial data from API
        try {
            await this.loadHomePageData();
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }

    async loadHomePageData() {
        try {
            // Load featured courses
            const coursesResponse = await apiClient.courses.getFeatured();
            this.featuredCourses = coursesResponse.data.courses;

            // Load services
            const servicesResponse = await apiClient.services.getAll();
            this.services = servicesResponse.data.services;

            // Update UI with real data
            this.updateServiceCards();
            this.updateFeaturedCourses();
        } catch (error) {
            console.error('Error loading home page data:', error);
            // Fallback to mock data
            this.loadMockData();
        }
    }

    loadMockData() {
        this.services = [
            {
                icon: 'fas fa-laptop-code',
                title: 'Web Development',
                description: 'Custom websites and web applications built with modern technologies and best practices.',
                features: ['Responsive Design', 'SEO Optimization', 'Fast Loading', 'Modern Frameworks']
            },
            {
                icon: 'fas fa-palette',
                title: 'Graphic Design',
                description: 'Creative visual designs that capture your brand essence and engage your audience.',
                features: ['Brand Identity', 'UI/UX Design', 'Print Design', 'Social Media Graphics']
            },
            {
                icon: 'fas fa-database',
                title: 'Data Solutions',
                description: 'Comprehensive data bundle services and database management solutions.',
                features: ['Data Analytics', 'Cloud Storage', 'API Integration', 'Data Security']
            },
            {
                icon: 'fas fa-window-restore',
                title: 'Windows Solutions',
                description: 'Complete Windows formatting, updating, and troubleshooting services.',
                features: ['OS Installation', 'Driver Updates', 'System Optimization', 'Virus Removal']
            },
            {
                icon: 'fas fa-cogs',
                title: 'IT Solutions',
                description: 'Complete IT infrastructure setup, maintenance, and troubleshooting services.',
                features: ['Network Setup', 'Security', '24/7 Support', 'Hardware Maintenance']
            },
            {
                icon: 'fas fa-graduation-cap',
                title: 'Tech Education',
                description: 'Professional courses in Photoshop, web development, and cutting-edge technologies.',
                features: ['Expert Instructors', 'Hands-on Projects', 'Certification', 'Career Support']
            }
        ];

        this.featuredCourses = [
            {
                _id: '1',
                title: 'Advanced Web Development',
                category: 'web-development',
                level: 'advanced',
                instructor: { firstName: 'Sarah', lastName: 'Johnson' },
                price: 199,
                discountedPrice: 149,
                ratings: { average: 4.8 },
                studentsEnrolled: 1250,
                thumbnail: { url: 'assets/images/courses/web-dev.jpg' }
            },
            {
                _id: '2',
                title: 'Photoshop Masterclass',
                category: 'graphic-design',
                level: 'intermediate',
                instructor: { firstName: 'Mike', lastName: 'Chen' },
                price: 149,
                discountedPrice: 99,
                ratings: { average: 4.9 },
                studentsEnrolled: 890,
                thumbnail: { url: 'assets/images/courses/photoshop.jpg' }
            },
            {
                _id: '3',
                title: 'Data Science Fundamentals',
                category: 'data-science',
                level: 'beginner',
                instructor: { firstName: 'Dr. Emily', lastName: 'Roberts' },
                price: 179,
                discountedPrice: 129,
                ratings: { average: 4.7 },
                studentsEnrolled: 670,
                thumbnail: { url: 'assets/images/courses/data-science.jpg' }
            }
        ];

        this.testimonials = [
            {
                content: "Star Media Tech transformed our online presence completely. Their web development team delivered beyond our expectations!",
                author: "Jennifer Smith",
                position: "CEO, TechInnovate",
                avatar: "JS"
            },
            {
                content: "The Photoshop course was incredibly comprehensive. I went from beginner to professional level in just 3 months!",
                author: "Alex Rodriguez",
                position: "Freelance Designer",
                avatar: "AR"
            },
            {
                content: "Their IT support team saved our business during a critical system failure. Professional and efficient service!",
                author: "Michael Brown",
                position: "Operations Manager",
                avatar: "MB"
            }
        ];
    }

    // Particles.js Background
    initializeParticles() {
        if (typeof particlesJS !== 'undefined') {
            particlesJS('particles-js', {
                particles: {
                    number: { 
                        value: 100, 
                        density: { 
                            enable: true, 
                            value_area: 800 
                        } 
                    },
                    color: { 
                        value: "#ffffff" 
                    },
                    shape: { 
                        type: "circle" 
                    },
                    opacity: { 
                        value: 0.5, 
                        random: true 
                    },
                    size: { 
                        value: 3, 
                        random: true 
                    },
                    line_linked: {
                        enable: true,
                        distance: 150,
                        color: "#ffffff",
                        opacity: 0.4,
                        width: 1
                    },
                    move: {
                        enable: true,
                        speed: 2,
                        direction: "none",
                        random: true,
                        straight: false,
                        out_mode: "out",
                        bounce: false
                    }
                },
                interactivity: {
                    detect_on: "canvas",
                    events: {
                        onhover: { 
                            enable: true, 
                            mode: "repulse" 
                        },
                        onclick: { 
                            enable: true, 
                            mode: "push" 
                        },
                        resize: true
                    }
                },
                retina_detect: true
            });
        }
    }

    // Navigation Controller
    initializeNavigation() {
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        const navLinks = document.querySelectorAll('.nav-link');

        // Hamburger toggle
        if (hamburger) {
            hamburger.addEventListener('click', () => {
                hamburger.classList.toggle('active');
                navMenu.classList.toggle('active');
            });
        }

        // Close menu on link click and enable SPA navigation
        navLinks.forEach(link => {
            // Use arrow function to preserve `this` (StarMediaApp instance)
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href') || '';

                // If external, hash, or empty, let the browser handle it
                if (href.startsWith('http') || href.startsWith('#') || href === '') {
                    if (hamburger) hamburger.classList.remove('active');
                    if (navMenu) navMenu.classList.remove('active');
                    return;
                }

                // Prevent full page reload and use SPA router
                e.preventDefault();
                let page = 'home';
                if (href === 'index.html' || href === '/' ) {
                    page = 'home';
                } else {
                    page = href.split('/').pop().replace('.html', '');
                }

                this.navigateTo(page).catch(err => console.error('Navigation error:', err));

                // Close hamburger menu if open
                if (hamburger) hamburger.classList.remove('active');
                if (navMenu) navMenu.classList.remove('active');
            });
        });

        // Navbar background on scroll
        window.addEventListener('scroll', () => {
            const navbar = document.querySelector('.navbar');
            if (navbar) {
                if (window.scrollY > 100) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
            }
        });

        // Active link highlighting
        this.updateActiveNavLink();
    }

    updateActiveNavLink(pageName = null) {
        // Normalize current page name: 'home' for index/root, otherwise filename without .html
        let currentPage = pageName;
        if (!currentPage) {
            const p = (window.location.pathname.split('/').pop() || '');
            currentPage = p === '' ? 'home' : p.replace('.html', '');
        }

        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href') || '';
            const hrefPage = (href.split('/').pop() || '').replace('.html', '') || 'home';
            if (hrefPage === currentPage || (currentPage === 'home' && href === 'index.html')) {
                link.classList.add('active');
            }
        });
    }

    // Scroll Effects
    initializeScrollEffects() {
        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Parallax effect for hero section
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const hero = document.querySelector('.hero');
            if (hero) {
                hero.style.transform = `translateY(${scrolled * 0.5}px)`;
            }
        });
    }

    // Initialize AOS (Animate On Scroll)
    initializeAOS() {
        if (typeof AOS !== 'undefined') {
            AOS.init({
                duration: 1000,
                once: true,
                offset: 100
            });
        }
    }

    // Initialize Animations
    initializeAnimations() {
        // Add any additional animation initializations here
    }

    // Service Cards Initialization
    initializeServiceCards() {
        const servicesGrid = document.querySelector('.services-grid');
        if (!servicesGrid) return;

        // Services will be populated by updateServiceCards after data load
    }

    // Featured Courses Initialization
    initializeFeaturedCourses() {
        const coursesCarousel = document.querySelector('.courses-carousel');
        if (!coursesCarousel) return;

        // Courses will be populated by updateFeaturedCourses after data load
    }

    // Testimonials Slider
    initializeTestimonials() {
        const testimonialTrack = document.querySelector('.testimonial-track');
        if (!testimonialTrack) return;

        this.testimonials.forEach((testimonial, index) => {
            const testimonialCard = this.createTestimonialCard(testimonial, index);
            testimonialTrack.appendChild(testimonialCard);
        });

        this.initializeTestimonialSlider();
    }

    createTestimonialCard(testimonial, index) {
        const card = document.createElement('div');
        card.className = 'testimonial-card';
        card.setAttribute('data-aos', 'fade-up');
        
        card.innerHTML = `
            <div class="testimonial-content">
                ${testimonial.content}
            </div>
            <div class="testimonial-author">
                <div class="author-avatar">
                    ${testimonial.avatar}
                </div>
                <div class="author-info">
                    <h4>${testimonial.author}</h4>
                    <p>${testimonial.position}</p>
                </div>
            </div>
        `;

        return card;
    }

    initializeTestimonialSlider() {
        const track = document.querySelector('.testimonial-track');
        const cards = document.querySelectorAll('.testimonial-card');
        let currentIndex = 0;

        if (cards.length <= 1) return;

        // Auto-advance testimonials
        setInterval(() => {
            currentIndex = (currentIndex + 1) % cards.length;
            if (track) {
                track.style.transform = `translateX(-${currentIndex * 100}%)`;
            }
        }, 5000);
    }

    // Animated Counters
    initializeCounters() {
        const counters = document.querySelectorAll('.stat-number');
        if (!counters.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        });

        counters.forEach(counter => {
            observer.observe(counter);
        });
    }

    animateCounter(counter) {
        const target = parseInt(counter.getAttribute('data-count'));
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;

        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                counter.textContent = target;
                clearInterval(timer);
            } else {
                counter.textContent = Math.floor(current);
            }
        }, 16);
    }

    // Initialize Page Routing
    initializePageRouting() {
        // Handle internal navigation
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[data-page]');
            if (link) {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                this.navigateTo(page);
            }
        });

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            this.loadPage(window.location.pathname);
        });

        // Load current page
        this.loadPage(window.location.pathname);
    }

    async navigateTo(page) {
        const url = page === 'home' ? '/' : `/pages/${page}.html`;
        window.history.pushState({}, '', url);
        await this.loadPage(url);
    }

    async loadPage(url) {
        try {
            // Show loading indicator
            this.showLoading();

            let pageName = url === '/' ? 'home' : url.split('/').pop().replace('.html', '');
            let pageContent = '';

            if (pageName === 'home') {
                pageContent = await this.loadHomePage();
            } else {
                pageContent = await this.loadExternalPage(`pages/${pageName}.html`);
            }

            // Update main content
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.innerHTML = pageContent;
            }

            // Update active navigation
            this.updateActiveNavLink(pageName);

            // Initialize page-specific functionality
            await this.initializePageScripts(pageName);

            // Hide loading indicator
            this.hideLoading();

            // Scroll to top
            window.scrollTo(0, 0);

        } catch (error) {
            console.error('Error loading page:', error);
            this.showError('Failed to load page');
        }
    }

    async loadExternalPage(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Page not found');
        }
        return await response.text();
    }

    async loadHomePage() {
        // Return home page HTML structure
        return `
            <section id="home" class="hero">
                <div class="hero-background">
                    <div class="particles-container" id="particles-js"></div>
                    <div class="gradient-overlay"></div>
                    <div class="floating-elements">
                        <div class="floating-element el-1"><i class="fas fa-code"></i></div>
                        <div class="floating-element el-2"><i class="fas fa-palette"></i></div>
                        <div class="floating-element el-3"><i class="fas fa-database"></i></div>
                        <div class="floating-element el-4"><i class="fas fa-cloud"></i></div>
                    </div>
                </div>
                <div class="hero-content">
                    <div class="hero-badge">
                        <span>Innovation Meets Excellence</span>
                    </div>
                    <h1 class="hero-title" data-aos="fade-up">
                        <span class="title-word">Transform Your</span>
                        <span class="title-word gradient-text">Digital Presence</span>
                    </h1>
                    <p class="hero-subtitle" data-aos="fade-up" data-aos-delay="200">
                        Empowering businesses with cutting-edge web development, stunning designs, and comprehensive IT solutions
                    </p>
                    <div class="hero-buttons" data-aos="fade-up" data-aos-delay="400">
                        <a href="pages/services.html" class="btn btn-primary">
                            <span>Explore Services</span>
                            <i class="fas fa-arrow-right"></i>
                        </a>
                        <a href="pages/courses.html" class="btn btn-secondary">
                            <span>View Courses</span>
                            <i class="fas fa-graduation-cap"></i>
                        </a>
                    </div>
                    <div class="hero-stats" data-aos="fade-up" data-aos-delay="600">
                        <div class="stat">
                            <div class="stat-number" data-count="500">0</div>
                            <div class="stat-label">Projects Completed</div>
                        </div>
                        <div class="stat">
                            <div class="stat-number" data-count="2500">0</div>
                            <div class="stat-label">Students Trained</div>
                        </div>
                        <div class="stat">
                            <div class="stat-number" data-count="150">0</div>
                            <div class="stat-label">Expert Consultants</div>
                        </div>
                        <div class="stat">
                            <div class="stat-number" data-count="98">0</div>
                            <div class="stat-label">Success Rate</div>
                        </div>
                    </div>
                </div>
                <div class="scroll-indicator">
                    <div class="mouse">
                        <div class="wheel"></div>
                    </div>
                    <div class="arrow"></div>
                </div>
            </section>

            <!-- Services Preview Section -->
            <section id="services-preview" class="services-preview">
                <div class="container">
                    <div class="section-header" data-aos="fade-up">
                        <h2 class="section-title">Our Premium Services</h2>
                        <p class="section-subtitle">Comprehensive solutions to elevate your business to new heights</p>
                    </div>
                    <div class="services-grid" id="services-grid">
                        <!-- Services will be populated by JavaScript -->
                    </div>
                </div>
            </section>

            <!-- Featured Courses Section -->
            <section id="featured-courses" class="featured-courses">
                <div class="container">
                    <div class="section-header" data-aos="fade-up">
                        <h2 class="section-title">Featured Courses</h2>
                        <p class="section-subtitle">Learn from industry experts and advance your career</p>
                    </div>
                    <div class="courses-carousel" id="courses-carousel">
                        <!-- Courses will be populated by JavaScript -->
                    </div>
                    <div class="text-center" data-aos="fade-up" data-aos-delay="400">
                        <a href="pages/courses.html" class="btn btn-outline">
                            <span>View All Courses</span>
                            <i class="fas fa-arrow-right"></i>
                        </a>
                    </div>
                </div>
            </section>

            <!-- Why Choose Us Section -->
            <section id="why-choose-us" class="why-choose-us">
                <div class="container">
                    <div class="section-header" data-aos="fade-up">
                        <h2 class="section-title">Why Choose Star Media Tech?</h2>
                        <p class="section-subtitle">Experience the difference with our client-focused approach</p>
                    </div>
                    <div class="features-grid">
                        <div class="feature-card" data-aos="fade-up" data-aos-delay="100">
                            <div class="feature-icon">
                                <i class="fas fa-bolt"></i>
                            </div>
                            <h3>Lightning Fast</h3>
                            <p>Rapid development and deployment without compromising quality</p>
                        </div>
                        <div class="feature-card" data-aos="fade-up" data-aos-delay="200">
                            <div class="feature-icon">
                                <i class="fas fa-shield-alt"></i>
                            </div>
                            <h3>Secure & Reliable</h3>
                            <p>Enterprise-grade security and 99.9% uptime guarantee</p>
                        </div>
                        <div class="feature-card" data-aos="fade-up" data-aos-delay="300">
                            <div class="feature-icon">
                                <i class="fas fa-headset"></i>
                            </div>
                            <h3>24/7 Support</h3>
                            <p>Round-the-clock technical support and maintenance</p>
                        </div>
                        <div class="feature-card" data-aos="fade-up" data-aos-delay="400">
                            <div class="feature-icon">
                                <i class="fas fa-rocket"></i>
                            </div>
                            <h3>Scalable Solutions</h3>
                            <p>Future-proof technology that grows with your business</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Testimonials Section -->
            <section id="testimonials" class="testimonials">
                <div class="container">
                    <div class="section-header" data-aos="fade-up">
                        <h2 class="section-title">What Our Clients Say</h2>
                        <p class="section-subtitle">Join thousands of satisfied customers worldwide</p>
                    </div>
                    <div class="testimonials-slider" data-aos="fade-up" data-aos-delay="200">
                        <div class="testimonial-track" id="testimonial-track">
                            <!-- Testimonials will be populated by JavaScript -->
                        </div>
                    </div>
                </div>
            </section>

            <!-- CTA Section -->
            <section id="cta" class="cta">
                <div class="container">
                    <div class="cta-content" data-aos="fade-up">
                        <h2>Ready to Transform Your Business?</h2>
                        <p>Get started with our expert team today and take your digital presence to the next level</p>
                        <div class="cta-buttons">
                            <a href="pages/consultant.html" class="btn btn-primary">
                                <span>Book Consultation</span>
                                <i class="fas fa-calendar-check"></i>
                            </a>
                            <a href="pages/contact.html" class="btn btn-secondary">
                                <span>Contact Us</span>
                                <i class="fas fa-envelope"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    async initializePageScripts(pageName) {
        switch (pageName) {
            case 'home':
                this.initializeServiceCards();
                this.initializeFeaturedCourses();
                this.initializeTestimonials();
                this.initializeCounters();
                break;
            case 'courses':
                if (typeof CourseManager !== 'undefined') {
                    const courseManager = new CourseManager();
                    await courseManager.init();
                }
                break;
            case 'consultant':
                if (typeof ConsultationManager !== 'undefined') {
                    const consultationManager = new ConsultationManager();
                    await consultationManager.init();
                }
                break;
            case 'login':
            case 'register':
                if (typeof AuthController !== 'undefined') {
                    new AuthController();
                }
                break;
            case 'admin-dashboard':
                if (typeof AdminDashboard !== 'undefined') {
                    const adminDashboard = new AdminDashboard();
                    await adminDashboard.init();
                }
                break;
        }

        // Re-initialize AOS for new content
        if (typeof AOS !== 'undefined') {
            AOS.refresh();
        }
    }

    updateServiceCards() {
        const servicesGrid = document.getElementById('services-grid');
        if (!servicesGrid || !this.services) return;

        servicesGrid.innerHTML = this.services.map(service => `
            <div class="service-card" data-aos="fade-up">
                <div class="service-icon">
                    <i class="${service.icon}"></i>
                </div>
                <h3 class="service-title">${service.title}</h3>
                <p class="service-description">${service.description}</p>
                <div class="service-features">
                    ${service.features.map(feature => `<span class="feature-tag">${feature}</span>`).join('')}
                </div>
                <a href="pages/services.html" class="service-cta">
                    Learn More
                    <i class="fas fa-arrow-right"></i>
                </a>
            </div>
        `).join('');
    }

    updateFeaturedCourses() {
        const coursesCarousel = document.getElementById('courses-carousel');
        if (!coursesCarousel || !this.featuredCourses) return;

        coursesCarousel.innerHTML = this.featuredCourses.map(course => `
            <div class="course-card" data-aos="fade-up">
                <div class="course-thumbnail">
                    <img src="${course.thumbnail?.url || 'assets/images/courses/default.jpg'}" alt="${course.title}" onerror="this.src='assets/images/courses/default.jpg'">
                    <div class="course-level ${course.level}">${course.level}</div>
                    ${course.discountedPrice ? 
                        `<div class="course-discount">
                            ${Math.round(((course.price - course.discountedPrice) / course.price) * 100)}% OFF
                        </div>` : ''
                    }
                </div>
                <div class="course-content">
                    <div class="course-category">${this.formatCategoryName(course.category)}</div>
                    <h3 class="course-title">${course.title}</h3>
                    <div class="course-meta">
                        <div class="course-instructor">
                            <i class="fas fa-user"></i>
                            ${course.instructor.firstName} ${course.instructor.lastName}
                        </div>
                        <div class="course-rating">
                            <i class="fas fa-star"></i>
                            ${course.ratings.average}
                        </div>
                    </div>
                    <div class="course-price-section">
                        ${course.discountedPrice ? 
                            `<span class="course-price original">$${course.price}</span>
                             <span class="course-price">$${course.discountedPrice}</span>` :
                            `<span class="course-price">$${course.price}</span>`
                        }
                    </div>
                    <a href="pages/course-detail.html?id=${course._id}" class="btn btn-outline" style="width: 100%; margin-top: 1rem;">
                        View Course
                    </a>
                </div>
            </div>
        `).join('');
    }

    formatCategoryName(category) {
        return category.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    showLoading() {
        // Create loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            backdrop-filter: blur(5px);
        `;
        
        loadingOverlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading...</p>
            </div>
        `;

        // Add spinner styles
        const spinnerStyles = document.createElement('style');
        spinnerStyles.textContent = `
            .loading-spinner {
                text-align: center;
            }
            .spinner {
                width: 50px;
                height: 50px;
                border: 5px solid #f3f3f3;
                border-top: 5px solid var(--secondary);
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 1rem;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(spinnerStyles);

        document.body.appendChild(loadingOverlay);
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }

    showError(message) {
        AppUtils.showNotification(message, 'error');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.starMediaApp = new StarMediaApp();
});

// Utility Functions
class AppUtils {
    static formatPrice(price) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(price);
    }

    static debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    static showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotification = document.querySelector('.app-notification');
        if (existingNotification) existingNotification.remove();

        const notification = document.createElement('div');
        notification.className = `app-notification ${type}`;
        notification.textContent = message;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        `;

        // Set background based on type
        const backgrounds = {
            success: 'linear-gradient(135deg, #2ecc71, #27ae60)',
            error: 'linear-gradient(135deg, #e74c3c, #c0392b)',
            info: 'linear-gradient(135deg, #3498db, #2980b9)',
            warning: 'linear-gradient(135deg, #f39c12, #e67e22)'
        };

        notification.style.background = backgrounds[type] || backgrounds.info;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StarMediaApp, AppUtils };
}