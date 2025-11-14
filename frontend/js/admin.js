/**
 * Star Media Tech - Enhanced Admin Dashboard JS
 * Fully functional, real-time, modular, and advanced version
 */

class AdminDashboard {
    constructor() {
        this.currentPage = 1;
        this.usersPerPage = 10;
        this.coursesPerPage = 10;
        this.servicesPerPage = 10;
        this.consultationsPerPage = 10;
        this.isLoading = false;
        this.socket = null;
        this.init();
    }

    async init() {
        try {
            this.initializeToastSystem();
            this.attachEventListeners();
            this.initializeSocket();
            await this.loadDashboardData();
            this.startAutoRefresh();
        } catch (err) {
            console.error('Dashboard init failed:', err);
            this.showToast('Failed to initialize dashboard', 'error');
        }
    }

    // ----- DOM Helpers -----
    qs(sel, ctx = document) { return ctx.querySelector(sel); }
    qsa(sel, ctx = document) { return Array.from((ctx || document).querySelectorAll(sel)); }

    // ----- Toast System -----
    initializeToastSystem() {
        if (!this.qs('#adminToastArea')) {
            const toastArea = document.createElement('div');
            toastArea.id = 'adminToastArea';
            Object.assign(toastArea.style, {
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                maxWidth: '400px'
            });
            document.body.appendChild(toastArea);
        }
    }

    showToast(msg, type = 'info', duration = 5000) {
        const toastArea = this.qs('#adminToastArea');
        const toast = document.createElement('div');
        toast.className = `admin-toast admin-toast-${type}`;
        toast.innerHTML = `<div>${this.escapeHtml(msg)}</div>`;
        Object.assign(toast.style, {
            background: this.getToastColor(type),
            color: '#fff',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            opacity: 0,
            transform: 'translateX(100%)',
            transition: 'all 0.3s ease'
        });
        toastArea.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = 1;
            toast.style.transform = 'translateX(0)';
        }, 10);
        setTimeout(() => toast.remove(), duration);
    }

    getToastColor(type) {
        return {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        }[type] || '#17a2b8';
    }

    // ----- API Helper -----
    async apiRequest(method, endpoint, data = null, options = {}) {
        const config = { method, credentials: 'include', headers: { 'Content-Type': 'application/json', ...options.headers } };
        if (data && method !== 'GET') config.body = JSON.stringify(data);
        try {
            const res = await fetch(`/api/admin${endpoint}`, config);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) return await res.json();
            return await res.text();
        } catch (err) {
            console.error('API Request Error:', err);
            throw err;
        }
    }

    setLoading(isLoading) {
        this.isLoading = isLoading;
        this.qsa('button, input, select').forEach(el => el.disabled = isLoading);
    }

    // ----- Dashboard Data -----
    async loadDashboardData() {
        await Promise.all([this.loadStats(), this.loadUsers(), this.loadCourses(), this.loadServices(), this.loadConsultations()]);
    }

    async loadStats() {
        try {
            const stats = await this.apiRequest('GET', '/stats');
            this.renderStats(stats);
        } catch (err) { this.showToast('Failed to load stats', 'error'); }
    }

    async loadUsers(page = 1) { await this.loadEntity('users', page, this.usersPerPage, '#adminUsersList'); }
    async loadCourses(page = 1) { await this.loadEntity('courses', page, this.coursesPerPage, '#adminCoursesList'); }
    async loadServices(page = 1) { await this.loadEntity('services', page, this.servicesPerPage, '#adminServicesList'); }
    async loadConsultations(page = 1) { await this.loadEntity('consultations', page, this.consultationsPerPage, '#adminConsultationsList'); }

    async loadEntity(entity, page, perPage, containerSelector) {
        try {
            const data = await this.apiRequest('GET', `/${entity}?page=${page}&limit=${perPage}`);
            const container = this.qs(containerSelector);
            if (!container) return;
            if (!data[entity]?.length) container.innerHTML = `<p>No ${entity} found.</p>`;
            else container.innerHTML = data[entity].map(item => `<div>${JSON.stringify(item)}</div>`).join('');
        } catch (err) { this.showToast(`Failed to load ${entity}`, 'error'); }
    }

    renderStats(stats) {
        const container = this.qs('#adminStats');
        if (!container) return;
        container.innerHTML = `
            <div class="stat-card">Users: ${stats.totalUsers || 0}</div>
            <div class="stat-card">Courses: ${stats.totalCourses || 0}</div>
            <div class="stat-card">Revenue Today: $${stats.revenueToday || 0}</div>
        `;
    }

    // ----- Socket.IO -----
    initializeSocket() {
        if (typeof io === 'undefined') return console.warn('Socket.IO not loaded');
        this.socket = io({ withCredentials: true });
        this.socket.on('connect', () => this.showToast('Connected to real-time updates', 'success', 3000));
        ['new-consultation', 'new-enrollment', 'user-registered'].forEach(event => {
            this.socket.on(event, () => this.loadDashboardData());
        });
    }

    // ----- Event Listeners -----
    attachEventListeners() {
        document.addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            const action = button.dataset.action;
            const id = button.dataset.id;
            if (!action) return;

            e.preventDefault();

            switch(action) {
                case 'refresh': await this.loadDashboardData(); break;
                case 'delete-user': if(id) await this.deleteEntity('users', id); break;
                case 'delete-course': if(id) await this.deleteEntity('courses', id); break;
                case 'delete-service': if(id) await this.deleteEntity('services', id); break;
                case 'delete-consultation': if(id) await this.deleteEntity('consultations', id); break;
            }
        });

        const searchInput = this.qs('#adminSearch');
        if(searchInput) searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    }

    async deleteEntity(entity, id) {
        if(!confirm(`Delete this ${entity.slice(0,-1)}?`)) return;
        try {
            await this.apiRequest('DELETE', `/${entity}/${id}`);
            this.showToast(`${entity.slice(0,-1)} deleted successfully`, 'success');
            await this.loadDashboardData();
        } catch(err) { this.showToast(`Failed to delete ${entity.slice(0,-1)}`, 'error'); }
    }

    handleSearch(query) {
        // Could filter the lists or call API with query
        console.log('Search query:', query);
    }

    // ----- Utilities -----
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    startAutoRefresh() {
        setInterval(() => this.loadStats(), 120000);
        setInterval(() => this.loadUsers(this.currentPage), 300000);
        setInterval(() => this.loadCourses(this.currentPage), 300000);
    }
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => { window.adminDashboard = new AdminDashboard(); });
