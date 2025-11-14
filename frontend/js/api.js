// API Configuration
class APIClient {
    constructor() {
        // Use relative API base so frontend works regardless of host/port
        this.baseURL = '/api';
        this.token = localStorage.getItem('authToken');
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    }

    // Remove token (logout)
    removeToken() {
        this.token = null;
        localStorage.removeItem('authToken');
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add authorization header if token exists
        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // Authentication API calls
    auth = {
        register: async (userData) => {
            return await this.request('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
        },

        login: async (credentials) => {
            return await this.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });
        },

        getProfile: async () => {
            return await this.request('/auth/me');
        },

        updateProfile: async (profileData) => {
            return await this.request('/auth/profile', {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });
        },

        changePassword: async (passwordData) => {
            return await this.request('/auth/change-password', {
                method: 'PUT',
                body: JSON.stringify(passwordData)
            });
        },

        forgotPassword: async (email) => {
            return await this.request('/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email })
            });
        },

        resetPassword: async (token, newPassword) => {
            return await this.request(`/auth/reset-password/${token}`, {
                method: 'PUT',
                body: JSON.stringify({ password: newPassword })
            });
        }
    };

    // Courses API calls
    courses = {
        getAll: async (filters = {}) => {
            const queryParams = new URLSearchParams(filters).toString();
            return await this.request(`/courses?${queryParams}`);
        },

        getFeatured: async () => {
            return await this.request('/courses/featured');
        },

        getById: async (id) => {
            return await this.request(`/courses/${id}`);
        },

        getCategories: async () => {
            return await this.request('/courses/categories');
        },

        enroll: async (courseId) => {
            return await this.request(`/courses/${courseId}/enroll`, {
                method: 'POST'
            });
        },

        create: async (courseData) => {
            return await this.request('/courses', {
                method: 'POST',
                body: JSON.stringify(courseData)
            });
        },

        update: async (id, courseData) => {
            return await this.request(`/courses/${id}`, {
                method: 'PUT',
                body: JSON.stringify(courseData)
            });
        }
    };

    // Consultations API calls
    consultations = {
        getAll: async (filters = {}) => {
            const queryParams = new URLSearchParams(filters).toString();
            return await this.request(`/consultations?${queryParams}`);
        },

        getById: async (id) => {
            return await this.request(`/consultations/${id}`);
        },

        create: async (consultationData) => {
            return await this.request('/consultations', {
                method: 'POST',
                body: JSON.stringify(consultationData)
            });
        },

        update: async (id, consultationData) => {
            return await this.request(`/consultations/${id}`, {
                method: 'PUT',
                body: JSON.stringify(consultationData)
            });
        },

        cancel: async (id, reason) => {
            return await this.request(`/consultations/${id}/cancel`, {
                method: 'PUT',
                body: JSON.stringify({ reason })
            });
        },

        getAvailability: async (consultantId, date) => {
            return await this.request(`/consultations/availability/${consultantId}?date=${date}`);
        }
    };

    // Services API calls
    services = {
        getAll: async () => {
            return await this.request('/services');
        },

        getById: async (id) => {
            return await this.request(`/services/${id}`);
        }
    };

    // User Management API calls
    users = {
        getEnrollments: async () => {
            return await this.request('/users/enrollments');
        },

        getConsultations: async () => {
            return await this.request('/users/consultations');
        },

        updateProgress: async (enrollmentId, progress) => {
            return await this.request(`/users/enrollments/${enrollmentId}/progress`, {
                method: 'PUT',
                body: JSON.stringify({ progress })
            });
        }
    };

    // Admin API calls
    admin = {
        getDashboard: async () => {
            return await this.request('/admin/dashboard');
        },

        getUsers: async (filters = {}) => {
            const queryParams = new URLSearchParams(filters).toString();
            return await this.request(`/admin/users?${queryParams}`);
        },

        getCourses: async (filters = {}) => {
            const queryParams = new URLSearchParams(filters).toString();
            return await this.request(`/admin/courses?${queryParams}`);
        },

        getConsultations: async (filters = {}) => {
            const queryParams = new URLSearchParams(filters).toString();
            return await this.request(`/admin/consultations?${queryParams}`);
        },

        updateUser: async (userId, userData) => {
            return await this.request(`/admin/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(userData)
            });
        },

        getAnalytics: async (period = 'monthly') => {
            return await this.request(`/admin/analytics?period=${period}`);
        }
    };
}

// Create global API client instance
const apiClient = new APIClient();

// Authentication state management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.init();
    }

    async init() {
        const token = localStorage.getItem('authToken');
        if (token) {
            apiClient.setToken(token);
            await this.loadCurrentUser();
        }
    }

    async loadCurrentUser() {
        try {
            const response = await apiClient.auth.getProfile();
            this.currentUser = response.data.user;
            this.isAuthenticated = true;
            this.updateUI();
        } catch (error) {
            this.logout();
        }
    }

    async login(credentials) {
        try {
            const response = await apiClient.auth.login(credentials);
            apiClient.setToken(response.data.token);
            this.currentUser = response.data.user;
            this.isAuthenticated = true;
            this.updateUI();
            return response;
        } catch (error) {
            throw error;
        }
    }

    async register(userData) {
        try {
            const response = await apiClient.auth.register(userData);
            apiClient.setToken(response.data.token);
            this.currentUser = response.data.user;
            this.isAuthenticated = true;
            this.updateUI();
            return response;
        } catch (error) {
            throw error;
        }
    }

    logout() {
        this.currentUser = null;
        this.isAuthenticated = false;
        apiClient.removeToken();
        this.updateUI();
        window.location.href = 'index.html';
    }

    updateUI() {
        // Update navigation based on authentication state
        const navAuth = document.querySelector('.nav-auth');
        const userMenu = document.querySelector('.user-menu');
        
        if (navAuth) {
            if (this.isAuthenticated) {
                navAuth.innerHTML = `
                    <div class="user-dropdown">
                        <button class="user-avatar">
                            <img src="${this.currentUser.avatar?.url || 'assets/images/default-avatar.png'}" alt="${this.currentUser.firstName}">
                            <span>${this.currentUser.firstName}</span>
                            <i class="fas fa-chevron-down"></i>
                        </button>
                        <div class="dropdown-menu">
                            <a href="pages/profile.html" class="dropdown-item">
                                <i class="fas fa-user"></i> Profile
                            </a>
                            <a href="pages/courses.html" class="dropdown-item">
                                <i class="fas fa-book"></i> My Courses
                            </a>
                            <a href="pages/consultant.html" class="dropdown-item">
                                <i class="fas fa-calendar"></i> My Consultations
                            </a>
                            ${this.currentUser.role === 'admin' ? `
                                <a href="pages/admin-dashboard.html" class="dropdown-item">
                                    <i class="fas fa-cog"></i> Admin Dashboard
                                </a>
                            ` : ''}
                            <div class="dropdown-divider"></div>
                            <button class="dropdown-item logout-btn">
                                <i class="fas fa-sign-out-alt"></i> Logout
                            </button>
                        </div>
                    </div>
                `;

                // Add logout event listener
                const logoutBtn = navAuth.querySelector('.logout-btn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', () => this.logout());
                }

                // Add dropdown functionality
                const userAvatar = navAuth.querySelector('.user-avatar');
                const dropdownMenu = navAuth.querySelector('.dropdown-menu');
                
                userAvatar.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdownMenu.classList.toggle('show');
                });

                // Close dropdown when clicking outside
                document.addEventListener('click', () => {
                    dropdownMenu.classList.remove('show');
                });
            } else {
                navAuth.innerHTML = `
                    <a href="pages/login.html" class="nav-link login-btn">Login</a>
                    <a href="pages/register.html" class="nav-link register-btn">Register</a>
                `;
            }
        }
    }

    requireAuth(redirectTo = 'pages/login.html') {
        if (!this.isAuthenticated) {
            window.location.href = redirectTo;
            return false;
        }
        return true;
    }

    requireRole(role, redirectTo = 'index.html') {
        if (!this.isAuthenticated || this.currentUser.role !== role) {
            window.location.href = redirectTo;
            return false;
        }
        return true;
    }
}

// Create global auth manager instance
const authManager = new AuthManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { apiClient, authManager };
}