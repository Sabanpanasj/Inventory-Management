class InventoryApp {
    constructor() {
        this.apiBase = '/api'; // same origin: the Flask server serves this page too
        this.currentPage = 'dashboard';
        this.products = [];
        this.charts = {};
        this.chartData = {};
        this.lastUpdateTime = null;
        this.isUpdating = false;
        this.updateProgress = {
            current: 0,
            total: 0,
            step: ''
        };

        // Pagination and sorting state
        this.pagination = {
            products: {
                page: 1,
                per_page: 10,
                total: 0,
                pages: 0,
                sort_by: 'name',
                sort_order: 'asc'
            },
            sales: {
                page: 1,
                per_page: 10,
                total: 0,
                pages: 0
            },
            low_stock: {
                page: 1,
                per_page: 10,
                total: 0,
                pages: 0,
                sort_by: 'quantity',
                sort_order: 'asc'
            },
            search: {
                page: 1,
                per_page: 10,
                total: 0,
                pages: 0,
                term: '',
                by: 'name',
                sort_by: 'name',
                sort_order: 'asc'
            }
        };

        // Auto-refresh interval for charts (2 minutes)
        this.chartRefreshInterval = 2 * 60 * 1000;
        this.chartRefreshTimer = null;

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadDashboard();
        this.showPage('dashboard');
        this.checkBackendConnection();
        this.startChartAutoRefresh();
        this.updateLastUpdateTime();
        this.initMobileMenu();
    }

    initMobileMenu() {
        // Initialize menu state based on screen size
        const navLinks = document.getElementById('nav-links');

        if (window.innerWidth >= 768) {
            navLinks.classList.add('active');
        }
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.closest('[data-page]').dataset.page;
                this.showPage(page);

                // Close mobile menu if open
                if (window.innerWidth < 768) {
                    this.closeMobileMenu();
                }
            });
        });

        // Mobile menu toggle
        const menuToggle = document.getElementById('menu-toggle');
        const navLinks = document.getElementById('nav-links');

        if (menuToggle && navLinks) {
            menuToggle.addEventListener('click', (e) => {
                e.preventDefault();
                const toggleIcon = menuToggle.querySelector('i');

                navLinks.classList.toggle('active');

                // Change icon based on state
                if (navLinks.classList.contains('active')) {
                    toggleIcon.classList.remove('fa-bars');
                    toggleIcon.classList.add('fa-times');
                } else {
                    toggleIcon.classList.remove('fa-times');
                    toggleIcon.classList.add('fa-bars');
                }
            });

            // Close menu when clicking outside on mobile
            document.addEventListener('click', (e) => {
                if (window.innerWidth < 768 &&
                    !e.target.closest('.nav-links') &&
                    !e.target.closest('.menu-toggle')) {
                    this.closeMobileMenu();
                }
            });
        }

        // Handle window resize
        window.addEventListener('resize', () => {
            const navLinks = document.getElementById('nav-links');
            const menuToggle = document.getElementById('menu-toggle');

            if (!navLinks || !menuToggle) return;

            if (window.innerWidth >= 768) {
                // On desktop, ensure menu is open
                navLinks.classList.add('active');
                navLinks.style.maxHeight = '';
                const toggleIcon = menuToggle.querySelector('i');
                toggleIcon.classList.remove('fa-times');
                toggleIcon.classList.add('fa-bars');
            } else {
                // On mobile, reset menu state
                navLinks.classList.remove('active');
                const toggleIcon = menuToggle.querySelector('i');
                toggleIcon.classList.remove('fa-times');
                toggleIcon.classList.add('fa-bars');
            }
        });

        // Product Management
        document.getElementById('add-product-btn').addEventListener('click', () => {
            this.showProductModal();
        });

        document.getElementById('product-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });

        document.getElementById('quick-sale-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.processSale();
        });

        document.getElementById('stock-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateStock();
        });

        // Search
        document.getElementById('search-btn').addEventListener('click', () => {
            this.searchProducts(1);
        });

        document.getElementById('clear-search').addEventListener('click', () => {
            document.getElementById('search-input').value = '';
            this.pagination.search.term = '';
            this.loadProducts();
        });

        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchProducts(1);
            }
        });

        // Pagination
        document.addEventListener('click', (e) => {
            if (e.target.closest('.pagination-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.pagination-btn');
                const action = btn.dataset.action;
                const type = btn.dataset.type;
                this.handlePagination(action, type);
            }
        });

        // Items per page change
        document.getElementById('per-page-select').addEventListener('change', (e) => {
            let perPage = parseInt(e.target.value);
            perPage = Math.max(1, Math.min(100, perPage));

            this.pagination.products.per_page = perPage;
            this.pagination.sales.per_page = perPage;
            this.pagination.low_stock.per_page = perPage;
            this.pagination.search.per_page = perPage;

            if (this.currentPage === 'products') {
                this.loadProducts();
            } else if (this.currentPage === 'sales') {
                this.loadSalesData();
            } else if (this.currentPage === 'dashboard') {
                this.updateLowStockAlerts();
            }
        });

        // Sort by change
        document.getElementById('sort-by-select').addEventListener('change', (e) => {
            this.pagination.products.sort_by = e.target.value;
            this.loadProducts();
        });

        // Sort order change
        document.getElementById('sort-order-select').addEventListener('change', (e) => {
            this.pagination.products.sort_order = e.target.value;
            this.loadProducts();
        });

        // Refresh buttons
        document.getElementById('refresh-dashboard-btn')?.addEventListener('click', () => {
            this.refreshDashboard();
        });

        document.getElementById('refresh-sales-btn')?.addEventListener('click', () => {
            this.refreshSales();
        });

        document.getElementById('refresh-analytics-btn')?.addEventListener('click', () => {
            this.refreshAnalytics();
        });

        // Modal close events
        document.querySelectorAll('.close, .btn-secondary').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModals();
            });
        });

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });
    }

    closeMobileMenu() {
        const navLinks = document.getElementById('nav-links');
        const menuToggle = document.getElementById('menu-toggle');

        if (!navLinks || !menuToggle) return;

        navLinks.classList.remove('active');
        const toggleIcon = menuToggle.querySelector('i');
        toggleIcon.classList.remove('fa-times');
        toggleIcon.classList.add('fa-bars');
    }

    startChartAutoRefresh() {
        if (this.chartRefreshTimer) {
            clearInterval(this.chartRefreshTimer);
        }

        this.chartRefreshTimer = setInterval(() => {
            if (this.currentPage === 'dashboard' || this.currentPage === 'analytics') {
                console.log('Auto-refreshing charts...');
                this.refreshCharts();
            }
        }, this.chartRefreshInterval);
    }

    stopChartAutoRefresh() {
        if (this.chartRefreshTimer) {
            clearInterval(this.chartRefreshTimer);
            this.chartRefreshTimer = null;
        }
    }

    async refreshCharts() {
        try {
            if (this.currentPage === 'dashboard') {
                await this.loadDashboardCharts();
            } else if (this.currentPage === 'analytics') {
                await this.loadAnalyticsCharts();
            }
            this.updateLastUpdateTime();
        } catch (error) {
            console.error('Failed to refresh charts:', error);
        }
    }

    updateLastUpdateTime() {
        this.lastUpdateTime = new Date();
        const timeString = this.lastUpdateTime.toLocaleTimeString();

        const dashboardElement = document.getElementById('dashboard-last-updated');
        const salesElement = document.getElementById('sales-last-updated');
        const analyticsElement = document.getElementById('analytics-last-updated');

        if (dashboardElement) {
            dashboardElement.textContent = `Last updated: ${timeString}`;
        }
        if (salesElement) {
            salesElement.textContent = `Last updated: ${timeString}`;
        }
        if (analyticsElement) {
            analyticsElement.textContent = `Last updated: ${timeString}`;
        }
    }

    setUpdateProgress(current, total, step = '') {
        this.updateProgress = { current, total, step };
        this.updateProgressDisplay();
    }

    updateProgressDisplay() {
        const { current, total, step } = this.updateProgress;
        const progress = total > 0 ? (current / total) * 100 : 0;

        // Update progress bars
        document.querySelectorAll('.progress-fill').forEach(fill => {
            fill.style.width = `${progress}%`;
        });

        // Update progress text
        document.querySelectorAll('.progress-text').forEach(text => {
            text.textContent = step || `Loading... ${current}/${total}`;
        });

        // Update loading steps
        document.querySelectorAll('.loading-step').forEach((stepEl, index) => {
            if (index < current) {
                stepEl.classList.add('completed');
                stepEl.classList.remove('active');
            } else if (index === current) {
                stepEl.classList.add('active');
                stepEl.classList.remove('completed');
            } else {
                stepEl.classList.remove('active', 'completed');
            }
        });
    }

    handlePagination(action, type) {
        const pagination = this.pagination[type];

        switch (action) {
            case 'first':
                pagination.page = 1;
                break;
            case 'prev':
                if (pagination.page > 1) pagination.page--;
                break;
            case 'next':
                if (pagination.page < pagination.pages) pagination.page++;
                break;
            case 'last':
                pagination.page = pagination.pages;
                break;
        }

        switch (type) {
            case 'products':
                if (this.pagination.search.term) {
                    this.searchProducts();
                } else {
                    this.loadProducts();
                }
                break;
            case 'sales':
                this.loadSalesData();
                break;
            case 'low_stock':
                this.updateLowStockAlerts();
                break;
        }
    }

    showPage(page) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelectorAll(`[data-page="${page}"]`).forEach(link => {
            link.classList.add('active');
        });

        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        document.getElementById(`${page}-page`).classList.add('active');

        this.currentPage = page;

        if (page === 'dashboard' || page === 'analytics') {
            this.refreshCharts();
        }

        switch (page) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'products':
                this.loadProducts();
                break;
            case 'sales':
                this.loadSalesData();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
        }
    }

    async apiCall(endpoint, options = {}) {
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            };

            if (config.body && typeof config.body === 'object') {
                config.body = JSON.stringify(config.body);
            }

            const response = await fetch(`${this.apiBase}${endpoint}`, config);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API call failed:', error);
            this.showNotification('Error: ' + error.message, 'error');
            throw error;
        }
    }

    showNotification(message, type = 'info') {
        document.querySelectorAll('.notification').forEach(notif => notif.remove());

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // Dashboard Methods
    async loadDashboard() {
        try {
            this.isUpdating = true;
            this.showRealtimeLoading('dashboard');

            // Simulate progressive loading for better UX
            this.setUpdateProgress(1, 4, 'Loading dashboard metrics...');
            await this.delay(300);

            this.setUpdateProgress(2, 4, 'Loading stock alerts...');
            const data = await this.apiCall('/analytics/dashboard');
            this.updateDashboardStats(data.data);

            this.setUpdateProgress(3, 4, 'Loading top sellers...');
            this.updateLowStockAlerts();
            this.updateTopSellers(data.data.top_sellers);

            this.setUpdateProgress(4, 4, 'Loading charts...');
            await this.loadDashboardCharts();

            this.isUpdating = false;
            this.hideRealtimeLoading('dashboard');
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            this.showError('dashboard', 'Failed to load dashboard data');
            this.isUpdating = false;
            this.hideRealtimeLoading('dashboard');
        }
    }

    async refreshDashboard() {
        const btn = document.getElementById('refresh-dashboard-btn');
        if (btn) {
            btn.classList.add('updating');
            btn.disabled = true;
        }

        try {
            await this.loadDashboard();
            this.showNotification('Dashboard refreshed successfully!', 'success');
        } catch (error) {
            console.error('Failed to refresh dashboard:', error);
        } finally {
            if (btn) {
                btn.classList.remove('updating');
                btn.disabled = false;
            }
        }
    }

    updateDashboardStats(data) {
        const statsContainer = document.getElementById('stats-cards');
        if (!statsContainer) return;

        const growthIcon = data.sales_growth >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
        const growthColor = data.sales_growth >= 0 ? 'success' : 'danger';
        const growthText = data.sales_growth >= 0 ? 'increase' : 'decrease';

        statsContainer.innerHTML = `
            <div class="stat-card data-updating">
                <div class="stat-label">Total Products</div>
                <div class="stat-value">${data.total_products}</div>
                <div class="stat-desc"><i class="fas fa-boxes"></i> In inventory</div>
            </div>
            <div class="stat-card success data-updating">
                <div class="stat-label">Inventory Value</div>
                <div class="stat-value">$${data.inventory_value.toFixed(2)}</div>
                <div class="stat-desc"><i class="fas fa-dollar-sign"></i> Total worth</div>
            </div>
            <div class="stat-card warning data-updating">
                <div class="stat-label">Units Sold</div>
                <div class="stat-value">${data.total_sold}</div>
                <div class="stat-desc"><i class="fas fa-shopping-cart"></i> All time</div>
            </div>
            <div class="stat-card data-updating">
                <div class="stat-label">Sales Revenue</div>
                <div class="stat-value">$${data.sales_revenue.toFixed(2)}</div>
                <div class="stat-desc"><i class="fas fa-chart-line"></i> Total revenue</div>
            </div>
            <div class="stat-card ${data.low_stock_count > 0 ? 'danger' : 'success'} data-updating">
                <div class="stat-label">Low Stock Items</div>
                <div class="stat-value">${data.low_stock_count}</div>
                <div class="stat-desc"><i class="fas fa-exclamation-triangle"></i> Need attention</div>
            </div>
            <div class="stat-card ${growthColor} data-updating">
                <div class="stat-label">Sales Growth</div>
                <div class="stat-value">${Math.abs(data.sales_growth).toFixed(1)}%</div>
                <div class="stat-desc">
                    <i class="fas ${growthIcon}"></i> ${growthText} this week
                </div>
            </div>
        `;

        // Remove animation class after animation completes
        setTimeout(() => {
            document.querySelectorAll('.data-updating').forEach(el => {
                el.classList.remove('data-updating');
            });
        }, 1000);
    }

    async updateLowStockAlerts() {
        const alertsContainer = document.getElementById('low-stock-alerts');
        if (!alertsContainer) return;

        try {
            const pagination = this.pagination.low_stock;
            const validatedPerPage = Math.max(1, Math.min(100, pagination.per_page));

            const data = await this.apiCall(
                `/analytics/low-stock?page=${pagination.page}&per_page=${validatedPerPage}&sort_by=${pagination.sort_by}&sort_order=${pagination.sort_order}`
            );

            this.pagination.low_stock = {
                ...this.pagination.low_stock,
                ...data.data.pagination
            };

            if (data.data.products.length === 0) {
                alertsContainer.innerHTML = `
                    <div class="alert-card success data-updating">
                        <i class="fas fa-check-circle" style="color: var(--success); margin-right: 0.5rem;"></i>
                        <span>All products are well stocked! 🎉</span>
                    </div>
                `;
            } else {
                alertsContainer.innerHTML = data.data.products.map(product => `
                    <div class="alert-card ${product.quantity === 0 ? 'danger' : ''} data-updating">
                        <div>
                            <strong>${product.name}</strong> (${product.id})
                            <div style="font-size: 0.9rem; color: #666;">
                                Stock: ${product.quantity} | Reorder at: ${product.reorder_level}
                                ${product.quantity === 0 ? ' - OUT OF STOCK!' : ''}
                            </div>
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="app.restockProduct('${product.id}')">
                            <i class="fas fa-plus"></i> Restock
                        </button>
                    </div>
                `).join('') + this.renderPagination('low_stock');
            }

            // Remove animation class after animation completes
            setTimeout(() => {
                document.querySelectorAll('.data-updating').forEach(el => {
                    el.classList.remove('data-updating');
                });
            }, 1000);
        } catch (error) {
            alertsContainer.innerHTML = `
                <div class="alert-card danger">
                    <i class="fas fa-exclamation-triangle" style="margin-right: 0.5rem;"></i>
                    <span>Failed to load stock alerts</span>
                </div>
            `;
        }
    }

    updateTopSellers(topSellers) {
        const container = document.getElementById('top-sellers');
        if (!container) return;

        if (!topSellers || topSellers.length === 0) {
            container.innerHTML = `
                <div class="alert-card data-updating">
                    <i class="fas fa-info-circle" style="margin-right: 0.5rem;"></i>
                    <span>No sales data available yet.</span>
                </div>
            `;
        } else {
            container.innerHTML = topSellers.map((product, index) => `
                <div class="alert-card data-updating" style="background: #f8f9fa;">
                    <div style="display: flex; align-items: center; gap: 1rem; width: 100%;">
                        <div style="font-size: 1.2rem; font-weight: bold; color: #666;">
                            ${index + 1}
                        </div>
                        <div style="flex: 1;">
                            <strong>${product.name}</strong>
                            <div style="font-size: 0.9rem; color: #666;">
                                ${product.total_sold} units sold | Revenue: $${(product.total_sold * product.price).toFixed(2)}
                            </div>
                        </div>
                        <div class="status-badge status-in-stock">
                            $${product.price}
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // Remove animation class after animation completes
        setTimeout(() => {
            document.querySelectorAll('.data-updating').forEach(el => {
                el.classList.remove('data-updating');
            });
        }, 1000);
    }

    async loadDashboardCharts() {
        try {
            await Promise.all([
                this.createStockChart(),
                this.createSalesChart()
            ]);
        } catch (error) {
            console.error('Failed to load dashboard charts:', error);
        }
    }

    async createStockChart() {
        const ctx = document.getElementById('stockChart');
        if (!ctx) return;

        try {
            this.showChartLoading('stockChart');
            const data = await this.apiCall('/analytics/category-stats');
            this.chartData.categories = data.data;

            const categories = data.data.map(item => item.category);
            const productCounts = data.data.map(item => item.product_count);

            if (this.charts.stockChart) {
                this.charts.stockChart.destroy();
            }

            this.charts.stockChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: categories,
                    datasets: [{
                        data: productCounts,
                        backgroundColor: [
                            '#3498db', '#2ecc71', '#e74c3c', '#f39c12',
                            '#9b59b6', '#1abc9c', '#34495e', '#d35400'
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Products by Category',
                            font: {
                                size: 16
                            }
                        },
                        legend: {
                            position: 'bottom',
                            labels: {
                                boxWidth: 12,
                                font: {
                                    size: 12
                                }
                            }
                        }
                    }
                }
            });
            this.hideChartLoading('stockChart');
        } catch (error) {
            console.error('Failed to create stock chart:', error);
            this.showChartError('stockChart', 'Failed to load category data');
        }
    }

    async createSalesChart() {
        const ctx = document.getElementById('salesChart');
        if (!ctx) return;

        try {
            this.showChartLoading('salesChart');
            const data = await this.apiCall('/analytics/daily-sales?days=30');
            this.chartData.dailySales = data.data;

            if (!data.data || data.data.length === 0) {
                this.showChartError('salesChart', 'No sales data available for the selected period');
                return;
            }

            const dates = data.data.map(item => {
                const dateStr = item.date.split('T')[0];
                return new Date(dateStr).toLocaleDateString();
            });

            const quantities = data.data.map(item => item.units_sold);

            if (this.charts.salesChart) {
                this.charts.salesChart.destroy();
            }

            this.charts.salesChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Units Sold',
                        data: quantities,
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(39, 174, 96, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointBackgroundColor: '#27ae60',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Sales Trend (Last 30 Days)',
                            font: {
                                size: 16
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function(context) {
                                    return `Units Sold: ${context.parsed.y}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Units Sold'
                            },
                            ticks: {
                                stepSize: 1
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Date'
                            },
                            ticks: {
                                maxTicksLimit: 10,
                                callback: function(value, index, values) {
                                    if (index % Math.ceil(values.length / 8) === 0) {
                                        return this.getLabelForValue(value);
                                    }
                                    return '';
                                }
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'nearest'
                    }
                }
            });
            this.hideChartLoading('salesChart');
        } catch (error) {
            console.error('Failed to create sales chart:', error);
            this.showChartError('salesChart', 'Failed to load sales data: ' + error.message);
        }
    }

    // Product Management Methods
    async loadProducts() {
        try {
            this.isUpdating = true;
            this.showRealtimeLoading('products');
            this.setUpdateProgress(1, 3, 'Loading products...');

            const pagination = this.pagination.products;
            const validatedPerPage = Math.max(1, Math.min(100, pagination.per_page));

            this.setUpdateProgress(2, 3, 'Processing data...');
            const data = await this.apiCall(
                `/products?page=${pagination.page}&per_page=${validatedPerPage}&sort_by=${pagination.sort_by}&sort_order=${pagination.sort_order}`
            );

            this.products = data.data.products;
            this.pagination.products = {
                ...this.pagination.products,
                ...data.data.pagination
            };

            this.setUpdateProgress(3, 3, 'Rendering table...');
            this.renderProductsTable(this.products);
            this.populateSaleProductSelect(this.products);
            this.updateSortSelectors();

            this.isUpdating = false;
            this.hideRealtimeLoading('products');
        } catch (error) {
            console.error('Failed to load products:', error);
            this.showError('products', 'Failed to load products');
            this.isUpdating = false;
            this.hideRealtimeLoading('products');
        }
    }

    renderProductsTable(products) {
        const tbody = document.getElementById('products-tbody');
        if (!tbody) return;

        if (products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem;">
                        <i class="fas fa-box-open" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                        <p>No products found. Add your first product to get started!</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = products.map((product, index) => `
            <tr class="data-updating" style="animation-delay: ${index * 0.1}s">
                <td><strong>${product.id}</strong></td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>$${product.price.toFixed(2)}</td>
                <td>
                    <span class="status-badge ${
                        product.quantity === 0 ? 'status-out-of-stock' :
                        product.quantity <= product.reorder_level ? 'status-low-stock' :
                        'status-in-stock'
                    }">
                        ${product.quantity}
                    </span>
                </td>
                <td>${product.total_sold}</td>
                <td>
                    ${product.quantity === 0 ?
                        '<span class="status-badge status-out-of-stock">Out of Stock</span>' :
                        product.quantity <= product.reorder_level ?
                        '<span class="status-badge status-low-stock">Low Stock</span>' :
                        '<span class="status-badge status-in-stock">In Stock</span>'
                    }
                </td>
                <td>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button class="btn btn-primary btn-sm" onclick="app.updateStockModal('${product.id}')" title="Update Stock">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="app.deleteProduct('${product.id}')" title="Delete Product">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        const paginationContainer = document.getElementById('products-pagination');
        if (paginationContainer) {
            paginationContainer.innerHTML = this.renderPagination('products');
        }

        // Remove animation class after animation completes
        setTimeout(() => {
            document.querySelectorAll('.data-updating').forEach(el => {
                el.classList.remove('data-updating');
            });
        }, 1000);
    }

    updateSortSelectors() {
        const sortBySelect = document.getElementById('sort-by-select');
        const sortOrderSelect = document.getElementById('sort-order-select');

        if (sortBySelect) {
            sortBySelect.value = this.pagination.products.sort_by;
        }
        if (sortOrderSelect) {
            sortOrderSelect.value = this.pagination.products.sort_order;
        }
    }

    populateSaleProductSelect(products) {
        const select = document.getElementById('sale-product');
        const inStockProducts = products.filter(p => p.quantity > 0);

        const options = inStockProducts.length === 0 ?
            '<option value="">No products in stock</option>' :
            '<option value="">Select Product</option>' +
            inStockProducts.map(product => `
                <option value="${product.id}" data-stock="${product.quantity}">
                    ${product.name} (Stock: ${product.quantity}) - $${product.price.toFixed(2)}
                </option>
            `).join('');

        if (select) select.innerHTML = options;
    }

    async searchProducts(page = 1) {
        const searchTerm = document.getElementById('search-input').value;
        const searchBy = document.getElementById('search-by').value;

        if (!searchTerm.trim()) {
            this.loadProducts();
            return;
        }

        try {
            this.isUpdating = true;
            this.showRealtimeLoading('products');
            this.setUpdateProgress(1, 2, 'Searching products...');

            this.pagination.search.page = page;
            this.pagination.search.term = searchTerm;
            this.pagination.search.by = searchBy;

            const validatedPerPage = Math.max(1, Math.min(100, this.pagination.search.per_page));

            this.setUpdateProgress(2, 2, 'Displaying results...');
            const data = await this.apiCall(
                `/products/search?q=${encodeURIComponent(searchTerm)}&by=${searchBy}&sort_by=${this.pagination.search.sort_by}&sort_order=${this.pagination.search.sort_order}&page=${page}&per_page=${validatedPerPage}`
            );

            this.products = data.data.products;
            this.pagination.search = {
                ...this.pagination.search,
                ...data.data.pagination
            };

            this.renderProductsTable(this.products);

            const paginationContainer = document.getElementById('products-pagination');
            if (paginationContainer) {
                paginationContainer.innerHTML = this.renderPagination('search');
            }

            this.isUpdating = false;
            this.hideRealtimeLoading('products');
        } catch (error) {
            console.error('Search failed:', error);
            this.showNotification('Search failed: ' + error.message, 'error');
            this.isUpdating = false;
            this.hideRealtimeLoading('products');
        }
    }

    // Sales Methods
    async loadSalesData() {
        try {
            this.isUpdating = true;
            this.showRealtimeLoading('sales');
            this.setUpdateProgress(1, 3, 'Loading sales history...');

            const pagination = this.pagination.sales;
            const validatedPerPage = Math.max(1, Math.min(100, pagination.per_page));

            this.setUpdateProgress(2, 3, 'Processing transactions...');
            const data = await this.apiCall(`/analytics/sales-history?days=30&page=${pagination.page}&per_page=${validatedPerPage}`);

            this.pagination.sales = {
                ...this.pagination.sales,
                ...data.data.pagination
            };

            this.setUpdateProgress(3, 3, 'Updating display...');
            this.renderSalesTable(data.data.sales);
            this.loadProducts(); // Refresh products for sale form

            this.isUpdating = false;
            this.hideRealtimeLoading('sales');
        } catch (error) {
            console.error('Failed to load sales data:', error);
            this.showError('sales', 'Failed to load sales data');
            this.isUpdating = false;
            this.hideRealtimeLoading('sales');
        }
    }

    async refreshSales() {
        const btn = document.getElementById('refresh-sales-btn');
        if (btn) {
            btn.classList.add('updating');
            btn.disabled = true;
        }

        try {
            await this.loadSalesData();
            this.showNotification('Sales data refreshed successfully!', 'success');
        } catch (error) {
            console.error('Failed to refresh sales:', error);
        } finally {
            if (btn) {
                btn.classList.remove('updating');
                btn.disabled = false;
            }
        }
    }

    renderSalesTable(sales) {
        const tbody = document.getElementById('sales-tbody');
        if (!tbody) return;

        if (sales.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem;">
                        <i class="fas fa-receipt" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                        <p>No sales recorded in the last 30 days.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = sales.map((sale, index) => `
            <tr class="data-updating" style="animation-delay: ${index * 0.05}s">
                <td>${new Date(sale.sale_date).toLocaleDateString()}</td>
                <td>${sale.product_name} (${sale.product_id})</td>
                <td>${sale.quantity_sold}</td>
                <td>$${sale.sale_price.toFixed(2)}</td>
                <td><strong>$${sale.total_amount.toFixed(2)}</strong></td>
            </tr>
        `).join('');

        const paginationContainer = document.getElementById('sales-pagination');
        if (paginationContainer) {
            paginationContainer.innerHTML = this.renderPagination('sales');
        }

        // Remove animation class after animation completes
        setTimeout(() => {
            document.querySelectorAll('.data-updating').forEach(el => {
                el.classList.remove('data-updating');
            });
        }, 1000);
    }

    renderPagination(type) {
        const pagination = this.pagination[type];
        const isSearch = type === 'search';

        if (pagination.pages <= 1) return '';

        return `
            <div class="pagination">
                <div class="pagination-info">
                    Showing ${((pagination.page - 1) * pagination.per_page) + 1} to
                    ${Math.min(pagination.page * pagination.per_page, pagination.total)} of
                    ${pagination.total} ${isSearch ? 'results' : 'items'}
                    ${isSearch ? ` for "${this.pagination.search.term}"` : ''}
                </div>
                <div class="pagination-controls">
                    <button class="pagination-btn ${pagination.page === 1 ? 'disabled' : ''}"
                            data-action="first" data-type="${type}" ${pagination.page === 1 ? 'disabled' : ''}>
                        <i class="fas fa-angle-double-left"></i>
                    </button>
                    <button class="pagination-btn ${pagination.page === 1 ? 'disabled' : ''}"
                            data-action="prev" data-type="${type}" ${pagination.page === 1 ? 'disabled' : ''}>
                        <i class="fas fa-angle-left"></i>
                    </button>

                    <span class="pagination-page">Page ${pagination.page} of ${pagination.pages}</span>

                    <button class="pagination-btn ${pagination.page === pagination.pages ? 'disabled' : ''}"
                            data-action="next" data-type="${type}" ${pagination.page === pagination.pages ? 'disabled' : ''}>
                        <i class="fas fa-angle-right"></i>
                    </button>
                    <button class="pagination-btn ${pagination.page === pagination.pages ? 'disabled' : ''}"
                            data-action="last" data-type="${type}" ${pagination.page === pagination.pages ? 'disabled' : ''}>
                        <i class="fas fa-angle-double-right"></i>
                    </button>
                </div>
            </div>
        `;
    }

    showProductModal(product = null) {
        const modal = document.getElementById('product-modal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('product-form');

        if (product) {
            title.textContent = 'Edit Product';
            document.getElementById('product-id').value = product.id;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-category').value = product.category;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-quantity').value = product.quantity;
            document.getElementById('product-reorder').value = product.reorder_level;
            document.getElementById('custom-id').value = product.id;
            document.getElementById('custom-id').disabled = true;
        } else {
            title.textContent = 'Add Product';
            form.reset();
            document.getElementById('product-id').value = '';
            document.getElementById('custom-id').disabled = false;
            document.getElementById('product-reorder').value = 5;
        }

        modal.style.display = 'block';
    }

    async saveProduct() {
        const form = document.getElementById('product-form');
        const saveBtn = document.getElementById('save-btn');
        const productId = document.getElementById('product-id').value;
        const isEdit = !!productId;

        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;

        const productData = {
            name: document.getElementById('product-name').value,
            category: document.getElementById('product-category').value,
            price: parseFloat(document.getElementById('product-price').value),
            quantity: parseInt(document.getElementById('product-quantity').value),
            reorder_level: parseInt(document.getElementById('product-reorder').value)
        };

        const customId = document.getElementById('custom-id').value.trim();
        if (customId && !isEdit) {
            productData.product_id = customId;
        }

        try {
            if (isEdit) {
                // For edit, update existing product
                await this.apiCall(`/products/${productId}/stock`, {
                    method: 'PUT',
                    body: {
                        quantity_change: productData.quantity - this.products.find(p => p.id === productId).quantity
                    }
                });

                // You might want to implement a proper update endpoint in your backend
                // For now, we'll delete and recreate
                await this.apiCall(`/products/${productId}`, {
                    method: 'DELETE'
                });

                await this.apiCall('/products', {
                    method: 'POST',
                    body: {
                        ...productData,
                        product_id: productId
                    }
                });
            } else {
                await this.apiCall('/products', {
                    method: 'POST',
                    body: productData
                });
            }

            this.showNotification(
                `Product ${isEdit ? 'updated' : 'added'} successfully!`,
                'success'
            );
            this.closeModals();

            await this.refreshAfterDataChange();
        } catch (error) {
            this.showNotification('Failed to save product: ' + error.message, 'error');
        } finally {
            saveBtn.innerHTML = 'Save Product';
            saveBtn.disabled = false;
        }
    }

    updateStockModal(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const modal = document.getElementById('stock-modal');
        document.getElementById('stock-product-id').value = product.id;
        document.getElementById('stock-product-name').textContent = `${product.name} (${product.id})`;
        document.getElementById('current-stock').textContent = product.quantity;
        document.getElementById('stock-quantity').value = 1;

        modal.style.display = 'block';
    }

    async updateStock() {
        const productId = document.getElementById('stock-product-id').value;
        const action = document.getElementById('stock-action').value;
        const quantity = parseInt(document.getElementById('stock-quantity').value);

        let quantityChange = quantity;
        if (action === 'sale') {
            quantityChange = -quantity;
        } else if (action === 'adjust') {
            const currentProduct = this.products.find(p => p.id === productId);
            quantityChange = quantity - currentProduct.quantity;
        }

        try {
            await this.apiCall(`/products/${productId}/stock`, {
                method: 'PUT',
                body: {
                    quantity_change: quantityChange
                }
            });

            this.showNotification('Stock updated successfully!', 'success');
            this.closeModals();

            await this.refreshAfterDataChange();
        } catch (error) {
            this.showNotification('Failed to update stock: ' + error.message, 'error');
        }
    }

    async deleteProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        if (!confirm(`Are you sure you want to delete "${product.name}"?\n\nThis action cannot be undone and will also delete all sales history for this product.`)) {
            return;
        }

        try {
            await this.apiCall(`/products/${productId}`, {
                method: 'DELETE'
            });

            this.showNotification('Product deleted successfully!', 'success');

            await this.refreshAfterDataChange();
        } catch (error) {
            this.showNotification('Failed to delete product: ' + error.message, 'error');
        }
    }

    async processSale() {
        const productId = document.getElementById('sale-product').value;
        const quantity = parseInt(document.getElementById('sale-quantity').value);

        if (!productId || !quantity) {
            this.showNotification('Please select a product and quantity', 'error');
            return;
        }

        const product = this.products.find(p => p.id === productId);
        if (quantity > product.quantity) {
            this.showNotification(`Cannot sell ${quantity} units. Only ${product.quantity} available.`, 'error');
            return;
        }

        try {
            await this.apiCall(`/products/${productId}/stock`, {
                method: 'PUT',
                body: {
                    quantity_change: -quantity
                }
            });

            this.showNotification(`Sale processed successfully! Sold ${quantity} units of ${product.name}.`, 'success');
            document.getElementById('quick-sale-form').reset();
            document.getElementById('sale-quantity').value = 1;

            await this.refreshAfterDataChange();
        } catch (error) {
            this.showNotification('Failed to process sale: ' + error.message, 'error');
        }
    }

    async restockProduct(productId) {
        const quantity = prompt('Enter quantity to restock:');
        if (!quantity || isNaN(quantity) || quantity <= 0) {
            return;
        }

        try {
            await this.apiCall(`/products/${productId}/stock`, {
                method: 'PUT',
                body: {
                    quantity_change: parseInt(quantity)
                }
            });

            this.showNotification(`Restocked ${quantity} units successfully!`, 'success');
            await this.refreshAfterDataChange();
        } catch (error) {
            this.showNotification('Failed to restock product: ' + error.message, 'error');
        }
    }

    async refreshAfterDataChange() {
        switch (this.currentPage) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'products':
                await this.loadProducts();
                break;
            case 'sales':
                await this.loadSalesData();
                break;
            case 'analytics':
                await this.loadAnalytics();
                break;
        }

        this.updateLowStockAlerts();

        if (this.currentPage === 'dashboard' || this.currentPage === 'analytics') {
            await this.refreshCharts();
        }
    }

    // Analytics Methods
    async loadAnalytics() {
        try {
            this.isUpdating = true;
            this.showRealtimeLoading('analytics');
            this.setUpdateProgress(1, 5, 'Loading analytics data...');

            await this.delay(300);
            this.setUpdateProgress(2, 5, 'Loading category statistics...');
            await this.delay(300);
            this.setUpdateProgress(3, 5, 'Processing sales trends...');
            await this.delay(300);
            this.setUpdateProgress(4, 5, 'Analyzing stock distribution...');
            await this.delay(300);
            this.setUpdateProgress(5, 5, 'Generating revenue reports...');

            await this.loadAnalyticsCharts();

            this.isUpdating = false;
            this.hideRealtimeLoading('analytics');
        } catch (error) {
            console.error('Failed to load analytics:', error);
            this.showError('analytics', 'Failed to load analytics data');
            this.isUpdating = false;
            this.hideRealtimeLoading('analytics');
        }
    }

    async refreshAnalytics() {
        const btn = document.getElementById('refresh-analytics-btn');
        if (btn) {
            btn.classList.add('updating');
            btn.disabled = true;
        }

        try {
            await this.loadAnalytics();
            this.showNotification('Analytics refreshed successfully!', 'success');
        } catch (error) {
            console.error('Failed to refresh analytics:', error);
        } finally {
            if (btn) {
                btn.classList.remove('updating');
                btn.disabled = false;
            }
        }
    }

    async loadAnalyticsCharts() {
        try {
            await Promise.all([
                this.createCategoryValueChart(),
                this.createSalesTrendChart(),
                this.createStockDistributionChart(),
                this.createRevenueChart()
            ]);
            this.updateLastUpdateTime();
        } catch (error) {
            console.error('Failed to load analytics charts:', error);
        }
    }

    async createCategoryValueChart() {
        const ctx = document.getElementById('categoryValueChart');
        if (!ctx) return;

        try {
            this.showChartLoading('categoryValueChart');
            const data = await this.apiCall('/analytics/category-stats');

            const categories = data.data.map(item => item.category);
            const values = data.data.map(item => item.total_value);

            if (this.charts.categoryValueChart) {
                this.charts.categoryValueChart.destroy();
            }

            this.charts.categoryValueChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: categories,
                    datasets: [{
                        label: 'Inventory Value ($)',
                        data: values,
                        backgroundColor: '#3498db',
                        borderColor: '#2980b9',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Inventory Value by Category',
                            font: {
                                size: 16
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
            this.hideChartLoading('categoryValueChart');
        } catch (error) {
            console.error('Failed to create category value chart:', error);
            this.showChartError('categoryValueChart', 'Failed to load category value data');
        }
    }

    async createSalesTrendChart() {
        const ctx = document.getElementById('salesTrendChart');
        if (!ctx) return;

        try {
            this.showChartLoading('salesTrendChart');
            const data = await this.apiCall('/analytics/daily-sales?days=30');

            if (!data.data || data.data.length === 0) {
                this.showChartError('salesTrendChart', 'No revenue data available for the selected period');
                return;
            }

            const dates = data.data.map(item => {
                const dateStr = item.date.split('T')[0];
                return new Date(dateStr).toLocaleDateString();
            });

            const revenues = data.data.map(item => item.revenue);

            if (this.charts.salesTrendChart) {
                this.charts.salesTrendChart.destroy();
            }

            this.charts.salesTrendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Daily Revenue ($)',
                        data: revenues,
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(39, 174, 96, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointBackgroundColor: '#27ae60',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Revenue Trend (Last 30 Days)',
                            font: {
                                size: 16
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function(context) {
                                    return `Revenue: $${context.parsed.y.toFixed(2)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Revenue ($)'
                            },
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Date'
                            },
                            ticks: {
                                maxTicksLimit: 10,
                                callback: function(value, index, values) {
                                    if (index % Math.ceil(values.length / 8) === 0) {
                                        return this.getLabelForValue(value);
                                    }
                                    return '';
                                }
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'nearest'
                    }
                }
            });
            this.hideChartLoading('salesTrendChart');
        } catch (error) {
            console.error('Failed to create sales trend chart:', error);
            this.showChartError('salesTrendChart', 'Failed to load sales trend data: ' + error.message);
        }
    }

    async createStockDistributionChart() {
        const ctx = document.getElementById('stockDistributionChart');
        if (!ctx) return;

        try {
            this.showChartLoading('stockDistributionChart');
            const data = await this.apiCall('/analytics/stock-distribution');

            const labels = ['Out of Stock', 'Low Stock', 'In Stock'];
            const values = [data.data.out_of_stock, data.data.low_stock, data.data.in_stock];

            if (this.charts.stockDistributionChart) {
                this.charts.stockDistributionChart.destroy();
            }

            this.charts.stockDistributionChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: ['#e74c3c', '#f39c12', '#27ae60'],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Stock Distribution',
                            font: {
                                size: 16
                            }
                        },
                        legend: {
                            position: 'bottom',
                            labels: {
                                boxWidth: 12,
                                font: {
                                    size: 12
                                }
                            }
                        }
                    }
                }
            });
            this.hideChartLoading('stockDistributionChart');
        } catch (error) {
            console.error('Failed to create stock distribution chart:', error);
            this.showChartError('stockDistributionChart', 'Failed to load stock distribution data');
        }
    }

    async createRevenueChart() {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;

        try {
            this.showChartLoading('revenueChart');
            const data = await this.apiCall('/analytics/top-products-revenue?limit=8');

            if (data.data.length === 0) {
                this.showChartError('revenueChart', 'No revenue data available');
                return;
            }

            const productNames = data.data.map(p => p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name);
            const revenues = data.data.map(p => p.revenue);

            if (this.charts.revenueChart) {
                this.charts.revenueChart.destroy();
            }

            this.charts.revenueChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: productNames,
                    datasets: [{
                        label: 'Revenue ($)',
                        data: revenues,
                        backgroundColor: '#9b59b6',
                        borderColor: '#8e44ad',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Top Products by Revenue',
                            font: {
                                size: 16
                            }
                        }
                    },
                    indexAxis: 'y',
                    scales: {
                        x: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
            this.hideChartLoading('revenueChart');
        } catch (error) {
            console.error('Failed to create revenue chart:', error);
            this.showChartError('revenueChart', 'Failed to load revenue data');
        }
    }

    showChartLoading(chartId) {
        const loadingElement = document.getElementById(`${chartId}-loading`);
        if (loadingElement) {
            loadingElement.style.display = 'flex';
        }
    }

    hideChartLoading(chartId) {
        const loadingElement = document.getElementById(`${chartId}-loading`);
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }

    showRealtimeLoading(page) {
        const containers = {
            'dashboard': ['stats-cards', 'low-stock-alerts', 'top-sellers'],
            'products': ['products-tbody'],
            'sales': ['sales-tbody'],
            'analytics': ['categoryValueChart', 'salesTrendChart', 'stockDistributionChart', 'revenueChart'],
            'low-stock': ['low-stock-alerts']
        };

        containers[page]?.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                if (page === 'dashboard') {
                    container.innerHTML = `
                        <div class="progress-loading">
                            <i class="fas fa-sync-alt fa-spin" style="font-size: 2rem; margin-bottom: 1rem; color: var(--primary);"></i>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: 0%"></div>
                            </div>
                            <div class="progress-text">Initializing...</div>
                        </div>
                    `;
                } else if (page === 'analytics') {
                    container.innerHTML = `
                        <div class="loading-steps">
                            <div class="loading-step">
                                <div class="loading-step-icon">1</div>
                                <div class="loading-step-text">Loading analytics data</div>
                                <div class="loading-step-progress">
                                    <div class="loading-step-progress-fill" style="width: 0%"></div>
                                </div>
                            </div>
                            <div class="loading-step">
                                <div class="loading-step-icon">2</div>
                                <div class="loading-step-text">Processing sales trends</div>
                                <div class="loading-step-progress">
                                    <div class="loading-step-progress-fill" style="width: 0%"></div>
                                </div>
                            </div>
                            <div class="loading-step">
                                <div class="loading-step-icon">3</div>
                                <div class="loading-step-text">Analyzing stock distribution</div>
                                <div class="loading-step-progress">
                                    <div class="loading-step-progress-fill" style="width: 0%"></div>
                                </div>
                            </div>
                            <div class="loading-step">
                                <div class="loading-step-icon">4</div>
                                <div class="loading-step-text">Generating revenue reports</div>
                                <div class="loading-step-progress">
                                    <div class="loading-step-progress-fill" style="width: 0%"></div>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    container.innerHTML = `
                        <div class="loading-placeholder">
                            <i class="fas fa-spinner fa-spin"></i>
                            <span>Loading...</span>
                        </div>
                    `;
                }
            }
        });

        // Show real-time indicator
        this.showRealtimeIndicator(true);
    }

    hideRealtimeLoading(page) {
        const containers = {
            'dashboard': ['stats-cards', 'low-stock-alerts', 'top-sellers'],
            'products': ['products-tbody'],
            'sales': ['sales-tbody'],
            'analytics': ['categoryValueChart', 'salesTrendChart', 'stockDistributionChart', 'revenueChart'],
            'low-stock': ['low-stock-alerts']
        };

        // Hide real-time indicator
        this.showRealtimeIndicator(false);
    }

    showRealtimeIndicator(show) {
        let indicator = document.getElementById('realtime-indicator');

        if (show && !indicator) {
            indicator = document.createElement('div');
            indicator.id = 'realtime-indicator';
            indicator.className = 'real-time-indicator updating';
            indicator.innerHTML = `
                <div class="pulse-dot"></div>
                <span>Updating...</span>
            `;

            const header = document.querySelector('.page-header');
            if (header) {
                header.appendChild(indicator);
            }
        } else if (!show && indicator) {
            indicator.remove();
        }
    }

    showChartError(chartId, message) {
        const container = document.getElementById(chartId)?.parentElement;
        if (container) {
            container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--danger);">
                    <div style="text-align: center;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                        <p>${message}</p>
                    </div>
                </div>
            `;
        }
    }

    showLoading(page) {
        this.showRealtimeLoading(page);
    }

    showError(page, message) {
        const containers = {
            'dashboard': ['stats-cards', 'low-stock-alerts', 'top-sellers'],
            'products': ['products-tbody'],
            'sales': ['sales-tbody'],
            'analytics': ['categoryValueChart', 'salesTrendChart', 'stockDistributionChart', 'revenueChart']
        };

        containers[page]?.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--danger);">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                        <p>${message}</p>
                    </div>
                `;
            }
        });
    }

    async checkBackendConnection() {
        try {
            const response = await this.apiCall('/health');
            console.log('✅ Backend connection successful');
        } catch (error) {
            console.error('Backend connection failed:', error);
            this.showNotification('⚠️ Backend connection failed. Make sure the server is running (python run.py)', 'warning');
        }
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    // Utility function for delays
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    destroy() {
        this.stopChartAutoRefresh();

        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.app = new InventoryApp();
});

// Clean up when leaving the page
window.addEventListener('beforeunload', function() {
    if (window.app) {
        window.app.destroy();
    }
});
