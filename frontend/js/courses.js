// Courses Management
class CourseManager {
    constructor() {
        this.courses = [];
        this.filteredCourses = [];
        this.currentPage = 1;
        this.itemsPerPage = 9;
        this.filters = {
            category: [],
            level: [],
            maxPrice: 500,
            search: '',
            sortBy: 'newest'
        };
    }

    async init() {
        await this.loadCourses();
        this.initializeFilters();
        this.initializeEventListeners();
        this.renderCourses();
        this.renderPagination();
    }

    async loadCourses() {
        try {
            const response = await apiClient.courses.getAll();
            this.courses = response.data.courses;
            this.filteredCourses = [...this.courses];
        } catch (error) {
            console.error('Error loading courses:', error);
            AppUtils.showNotification('Failed to load courses', 'error');
        }
    }

    initializeFilters() {
        this.renderCategoryFilters();
        this.renderLevelFilters();
    }

    renderCategoryFilters() {
        const categories = [...new Set(this.courses.map(course => course.category))];
        const container = document.getElementById('category-filters');
        
        if (container) {
            container.innerHTML = categories.map(category => `
                <label class="filter-checkbox">
                    <input type="checkbox" value="${category}" data-filter="category">
                    <span class="checkmark"></span>
                    ${this.formatCategoryName(category)}
                </label>
            `).join('');
        }
    }

    renderLevelFilters() {
        const levels = ['beginner', 'intermediate', 'advanced'];
        const container = document.getElementById('level-filters');
        
        if (container) {
            container.innerHTML = levels.map(level => `
                <label class="filter-checkbox">
                    <input type="checkbox" value="${level}" data-filter="level">
                    <span class="checkmark"></span>
                    ${this.formatLevelName(level)}
                </label>
            `).join('');
        }
    }

    initializeEventListeners() {
        // Category and level filters
        document.querySelectorAll('input[data-filter]').forEach(input => {
            input.addEventListener('change', () => this.applyFilters());
        });

        // Price range
        const priceRange = document.getElementById('price-range');
        if (priceRange) {
            priceRange.addEventListener('input', (e) => {
                this.filters.maxPrice = parseInt(e.target.value);
                document.getElementById('max-price').textContent = `$${e.target.value}`;
                this.applyFilters();
            });
        }

        // Search
        const searchInput = document.getElementById('course-search');
        if (searchInput) {
            searchInput.addEventListener('input', AppUtils.debounce((e) => {
                this.filters.search = e.target.value;
                this.applyFilters();
            }, 300));
        }

        // Sort
        const sortSelect = document.getElementById('sort-courses');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.filters.sortBy = e.target.value;
                this.applyFilters();
            });
        }
    }

    applyFilters() {
        this.filteredCourses = this.courses.filter(course => {
            // Category filter
            if (this.filters.category.length > 0 && !this.filters.category.includes(course.category)) {
                return false;
            }

            // Level filter
            if (this.filters.level.length > 0 && !this.filters.level.includes(course.level)) {
                return false;
            }

            // Price filter
            const price = course.discountedPrice || course.price;
            if (price > this.filters.maxPrice) {
                return false;
            }

            // Search filter
            if (this.filters.search && !this.matchesSearch(course, this.filters.search)) {
                return false;
            }

            return true;
        });

        this.sortCourses();
        this.currentPage = 1;
        this.renderCourses();
        this.renderPagination();
    }

    matchesSearch(course, searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
            course.title.toLowerCase().includes(term) ||
            course.description.toLowerCase().includes(term) ||
            course.category.toLowerCase().includes(term) ||
            `${course.instructor.firstName} ${course.instructor.lastName}`.toLowerCase().includes(term)
        );
    }

    sortCourses() {
        switch (this.filters.sortBy) {
            case 'newest':
                this.filteredCourses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'popular':
                this.filteredCourses.sort((a, b) => b.studentsEnrolled - a.studentsEnrolled);
                break;
            case 'price-low':
                this.filteredCourses.sort((a, b) => (a.discountedPrice || a.price) - (b.discountedPrice || b.price));
                break;
            case 'price-high':
                this.filteredCourses.sort((a, b) => (b.discountedPrice || b.price) - (a.discountedPrice || a.price));
                break;
            case 'rating':
                this.filteredCourses.sort((a, b) => b.ratings.average - a.ratings.average);
                break;
        }
    }

    renderCourses() {
        const container = document.getElementById('courses-grid');
        if (!container) return;

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const coursesToShow = this.filteredCourses.slice(startIndex, endIndex);

        if (coursesToShow.length === 0) {
            container.innerHTML = `
                <div class="no-courses">
                    <i class="fas fa-search"></i>
                    <h3>No courses found</h3>
                    <p>Try adjusting your filters or search terms</p>
                </div>
            `;
            return;
        }

        container.innerHTML = coursesToShow.map(course => `
            <div class="course-card" data-aos="fade-up">
                <div class="course-thumbnail">
                    <img src="${course.thumbnail?.url || '../assets/images/courses/default.jpg'}" alt="${course.title}">
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
                    <p class="course-description">${course.shortDescription || course.description.substring(0, 100)}...</p>
                    
                    <div class="course-meta">
                        <div class="course-instructor">
                            <img src="${course.instructor.avatar?.url || '../assets/images/default-avatar.png'}" alt="${course.instructor.firstName}">
                            <span>${course.instructor.firstName} ${course.instructor.lastName}</span>
                        </div>
                        <div class="course-stats">
                            <div class="stat">
                                <i class="fas fa-users"></i>
                                <span>${course.studentsEnrolled}</span>
                            </div>
                            <div class="stat">
                                <i class="fas fa-star"></i>
                                <span>${course.ratings.average}</span>
                            </div>
                        </div>
                    </div>

                    <div class="course-footer">
                        <div class="course-price">
                            ${course.discountedPrice ? 
                                `<span class="original-price">$${course.price}</span>
                                 <span class="current-price">$${course.discountedPrice}</span>` :
                                `<span class="current-price">$${course.price}</span>`
                            }
                        </div>
                        <a href="course-detail.html?id=${course._id}" class="btn btn-primary">
                            View Course
                        </a>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderPagination() {
        const container = document.getElementById('pagination');
        if (!container) return;

        const totalPages = Math.ceil(this.filteredCourses.length / this.itemsPerPage);
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <button class="pagination-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
                    onclick="courseManager.goToPage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
                paginationHTML += `
                    <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                            onclick="courseManager.goToPage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        // Next button
        paginationHTML += `
            <button class="pagination-btn ${this.currentPage === totalPages ? 'disabled' : ''}" 
                    onclick="courseManager.goToPage(${this.currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        container.innerHTML = paginationHTML;
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredCourses.length / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;

        this.currentPage = page;
        this.renderCourses();
        this.renderPagination();
        
        // Scroll to courses section
        const coursesSection = document.querySelector('.courses-section');
        if (coursesSection) {
            coursesSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    formatCategoryName(category) {
        return category.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    formatLevelName(level) {
        return level.charAt(0).toUpperCase() + level.slice(1);
    }
}

// Initialize course manager when page loads
let courseManager;
document.addEventListener('DOMContentLoaded', async () => {
    courseManager = new CourseManager();
    await courseManager.init();
});