// Advanced Animations Controller
class AnimationController {
    constructor() {
        this.observers = new Map();
        this.currentTestimonial = 0;
        this.currentCourse = 0;
        this.init();
    }

    init() {
        this.initializeLoadingScreen();
        this.initializeThemeToggle();
        this.initializeScrollAnimations();
        this.initializeIntersectionObserver();
        this.initializeHoverEffects();
        this.initializePageTransitions();
        this.initializeParallax();
        this.initializeCarousels();
        this.initializeBackToTop();
        this.initializeCounterAnimations();
    }

    // Loading Screen
    initializeLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');

        if (!loadingScreen) return;

        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                
                setTimeout(() => {
                    loadingScreen.classList.add('loaded');
                    setTimeout(() => {
                        loadingScreen.remove();
                    }, 500);
                }, 300);
            }
            
            if (progressFill) {
                progressFill.style.width = `${progress}%`;
            }
            if (progressText) {
                progressText.textContent = `Loading... ${Math.floor(progress)}%`;
            }
        }, 100);
    }

    // Theme Toggle
    initializeThemeToggle() {
        const themeSwitch = document.getElementById('theme-switch');
        if (!themeSwitch) return;

        // Check for saved theme preference or respect OS preference
        const savedTheme = localStorage.getItem('theme') || 
                          (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        
        if (savedTheme === 'dark') {
            themeSwitch.checked = true;
            document.documentElement.setAttribute('data-theme', 'dark');
        }

        themeSwitch.addEventListener('change', (e) => {
            const theme = e.target.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        });
    }

    // Back to Top Button
    initializeBackToTop() {
        const backToTop = document.getElementById('back-to-top');
        if (!backToTop) return;

        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        });

        backToTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // Counter Animations
    initializeCounterAnimations() {
        const counters = document.querySelectorAll('.stat-number');
        if (!counters.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counter = entry.target;
                    const target = parseInt(counter.getAttribute('data-count'));
                    this.animateCounter(counter, target, 2000);
                    observer.unobserve(counter);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(counter => observer.observe(counter));
    }

    animateCounter(element, target, duration) {
        let start = 0;
        const increment = target / (duration / 16);
        const timer = setInterval(() => {
            start += increment;
            if (start >= target) {
                element.textContent = target + (element.textContent.includes('%') ? '%' : '+');
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(start) + (element.textContent.includes('%') ? '%' : '+');
            }
        }, 16);
    }

    // Carousel Initialization
    initializeCarousels() {
        this.initializeCourseCarousel();
        this.initializeTestimonialCarousel();
    }

    // Course Carousel
    initializeCourseCarousel() {
        const courseSlider = document.querySelector('.course-slider');
        const prevBtn = document.querySelector('.carousel-prev');
        const nextBtn = document.querySelector('.carousel-next');

        if (!courseSlider || !prevBtn || !nextBtn) return;

        const courseCards = document.querySelectorAll('.course-card');
        const cardWidth = courseCards[0].offsetWidth + 40; // width + gap

        prevBtn.addEventListener('click', () => {
            courseSlider.scrollBy({ left: -cardWidth, behavior: 'smooth' });
        });

        nextBtn.addEventListener('click', () => {
            courseSlider.scrollBy({ left: cardWidth, behavior: 'smooth' });
        });

        // Add keyboard navigation
        courseSlider.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                courseSlider.scrollBy({ left: -cardWidth, behavior: 'smooth' });
            } else if (e.key === 'ArrowRight') {
                courseSlider.scrollBy({ left: cardWidth, behavior: 'smooth' });
            }
        });
    }

    // Testimonial Carousel
    initializeTestimonialCarousel() {
        const testimonialTrack = document.querySelector('.testimonial-track');
        const prevBtn = document.querySelector('.testimonial-prev');
        const nextBtn = document.querySelector('.testimonial-next');
        const testimonials = document.querySelectorAll('.testimonial-card');

        if (!testimonialTrack || !prevBtn || !nextBtn || !testimonials.length) return;

        const totalTestimonials = testimonials.length;

        prevBtn.addEventListener('click', () => {
            this.currentTestimonial = (this.currentTestimonial - 1 + totalTestimonials) % totalTestimonials;
            this.updateTestimonialPosition();
        });

        nextBtn.addEventListener('click', () => {
            this.currentTestimonial = (this.currentTestimonial + 1) % totalTestimonials;
            this.updateTestimonialPosition();
        });

        // Auto-advance testimonials
        setInterval(() => {
            this.currentTestimonial = (this.currentTestimonial + 1) % totalTestimonials;
            this.updateTestimonialPosition();
        }, 5000);
    }

    updateTestimonialPosition() {
        const testimonialTrack = document.querySelector('.testimonial-track');
        if (!testimonialTrack) return;

        testimonialTrack.style.transform = `translateX(-${this.currentTestimonial * 100}%)`;
    }

    // Scroll-based animations
    initializeScrollAnimations() {
        let ticking = false;

        const updateElements = () => {
            this.animateOnScroll();
            ticking = false;
        };

        const requestTick = () => {
            if (!ticking) {
                requestAnimationFrame(updateElements);
                ticking = true;
            }
        };

        window.addEventListener('scroll', requestTick, { passive: true });
    }

    animateOnScroll() {
        const animatedElements = document.querySelectorAll('[data-animate]');
        
        animatedElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            
            if (rect.top <= windowHeight * 0.8 && rect.bottom >= 0) {
                const animationType = element.getAttribute('data-animate');
                this.applyAnimation(element, animationType);
            }
        });
    }

    applyAnimation(element, animationType) {
        if (element.classList.contains('animated')) return;

        element.classList.add('animated');
        
        switch (animationType) {
            case 'fadeIn':
                element.style.animation = 'fadeIn 0.8s ease forwards';
                break;
            case 'slideUp':
                element.style.animation = 'slideUp 0.8s ease forwards';
                break;
            case 'slideLeft':
                element.style.animation = 'slideLeft 0.8s ease forwards';
                break;
            case 'slideRight':
                element.style.animation = 'slideRight 0.8s ease forwards';
                break;
            case 'zoomIn':
                element.style.animation = 'zoomIn 0.8s ease forwards';
                break;
            case 'bounceIn':
                element.style.animation = 'bounceIn 1s ease forwards';
                break;
        }
    }

    // Intersection Observer for advanced animations
    initializeIntersectionObserver() {
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.handleElementInViewport(entry.target);
                }
            });
        }, observerOptions);

        // Observe elements with data-observe attribute
        document.querySelectorAll('[data-observe]').forEach(element => {
            this.intersectionObserver.observe(element);
        });
    }

    handleElementInViewport(element) {
        const animation = element.getAttribute('data-observe');
        element.classList.add(animation);
        
        // Remove observer after animation
        this.intersectionObserver.unobserve(element);
    }

    // Hover effects
    initializeHoverEffects() {
        // Card hover effects
        document.querySelectorAll('.service-card, .course-card, .feature-card').forEach(card => {
            card.addEventListener('mouseenter', this.handleCardHover);
            card.addEventListener('mouseleave', this.handleCardLeave);
        });

        // Button hover effects
        document.querySelectorAll('.btn').forEach(button => {
            button.addEventListener('mouseenter', this.handleButtonHover);
            button.addEventListener('mouseleave', this.handleButtonLeave);
        });
    }

    handleCardHover(e) {
        const card = e.currentTarget;
        card.style.transform = 'translateY(-10px) scale(1.02)';
        card.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15)';
    }

    handleCardLeave(e) {
        const card = e.currentTarget;
        card.style.transform = 'translateY(0) scale(1)';
        card.style.boxShadow = '';
    }

    handleButtonHover(e) {
        const button = e.currentTarget;
        if (!button.classList.contains('btn-primary')) {
            button.style.transform = 'translateY(-2px)';
        }
    }

    handleButtonLeave(e) {
        const button = e.currentTarget;
        button.style.transform = 'translateY(0)';
    }

    // Page transitions
    initializePageTransitions() {
        // Add transition styles
        const style = document.createElement('style');
        style.textContent = `
            .page-transition-enter {
                opacity: 0;
                transform: translateY(20px);
            }
            
            .page-transition-enter-active {
                opacity: 1;
                transform: translateY(0);
                transition: all 0.5s ease;
            }
            
            .page-transition-exit {
                opacity: 1;
                transform: translateY(0);
            }
            
            .page-transition-exit-active {
                opacity: 0;
                transform: translateY(-20px);
                transition: all 0.5s ease;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideUp {
                from { 
                    opacity: 0;
                    transform: translateY(50px);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes slideLeft {
                from { 
                    opacity: 0;
                    transform: translateX(-50px);
                }
                to { 
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            @keyframes slideRight {
                from { 
                    opacity: 0;
                    transform: translateX(50px);
                }
                to { 
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            @keyframes zoomIn {
                from { 
                    opacity: 0;
                    transform: scale(0.8);
                }
                to { 
                    opacity: 1;
                    transform: scale(1);
                }
            }

            @keyframes bounceIn {
                0% { 
                    opacity: 0;
                    transform: scale(0.3);
                }
                50% { 
                    opacity: 1;
                    transform: scale(1.05);
                }
                70% { 
                    transform: scale(0.9);
                }
                100% { 
                    opacity: 1;
                    transform: scale(1);
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Parallax effect for elements
    initializeParallax() {
        const parallaxElements = document.querySelectorAll('[data-parallax]');
        
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            
            parallaxElements.forEach(element => {
                const rate = element.getAttribute('data-parallax-rate') || 0.5;
                const movement = -(scrolled * rate);
                element.style.transform = `translateY(${movement}px)`;
            });
        });
    }

    // Typing animation for text
    typeWriter(element, text, speed = 50) {
        let i = 0;
        element.innerHTML = '';

        const timer = setInterval(() => {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
            } else {
                clearInterval(timer);
            }
        }, speed);
    }

    // Stagger animation for multiple elements
    staggerAnimation(elements, animationClass, delay = 100) {
        elements.forEach((element, index) => {
            setTimeout(() => {
                element.classList.add(animationClass);
            }, index * delay);
        });
    }

    // Cleanup method
    destroy() {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        
        this.observers.forEach((observer, element) => {
            observer.unobserve(element);
        });
        this.observers.clear();
    }
}

// Initialize animations when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.animationController = new AnimationController();
});

// Initialize particles.js if available
document.addEventListener('DOMContentLoaded', function() {
    if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', {
            particles: {
                number: { value: 80, density: { enable: true, value_area: 800 } },
                color: { value: "#ffffff" },
                shape: { type: "circle" },
                opacity: { value: 0.5, random: true },
                size: { value: 3, random: true },
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
                    onhover: { enable: true, mode: "repulse" },
                    onclick: { enable: true, mode: "push" },
                    resize: true
                }
            },
            retina_detect: true
        });
    }
});

// Initialize AOS
document.addEventListener('DOMContentLoaded', function() {
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true,
            mirror: false
        });
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationController;
}