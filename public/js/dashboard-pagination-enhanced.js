// Enhanced AJAX Pagination for Dashboard
class DashboardPaginationEnhanced {
    constructor() {
        this.currentPetPage = 1;
        this.currentTaskPage = 1;
        this.activeFilters = {};
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadFilterState();
        // console.log('🔄 Enhanced Pagination initialized');
    }

    bindEvents() {
        // Pet pagination
        document.addEventListener('click', (e) => {
            if (e.target.closest('.pagination-pet')) {
                e.preventDefault();
                const link = e.target.closest('.pagination-pet');
                const page = parseInt(link.getAttribute('data-page'));
                // console.log('🐕 Loading pets page:', page);
                this.loadPetsPage(page);
            }

            if (e.target.closest('.pagination-task')) {
                e.preventDefault();
                const link = e.target.closest('.pagination-task');
                const page = parseInt(link.getAttribute('data-page'));
                // console.log('📝 Loading tasks page:', page);
                this.loadTasksPage(page);
            }
        });

        // Save filters when they change
        const filterElements = document.querySelectorAll('#filterSpecies, #filterGender, #filterAgeMin, #filterAgeMax, #filterPriority, #filterTaskType, #filterDueDateFrom, #filterDueDateTo');
        filterElements.forEach(filter => {
            filter.addEventListener('change', () => {
                this.saveFilterState();
            });
        });

        // Clear filters button
        document.getElementById('clearAllFilters')?.addEventListener('click', () => {
            setTimeout(() => {
                this.saveFilterState();
            }, 100);
        });
    }

    saveFilterState() {
        this.activeFilters = {
            species: document.getElementById('filterSpecies')?.value || '',
            gender: document.getElementById('filterGender')?.value || '',
            ageMin: document.getElementById('filterAgeMin')?.value || '',
            ageMax: document.getElementById('filterAgeMax')?.value || '',
            priority: document.getElementById('filterPriority')?.value || '',
            taskType: document.getElementById('filterTaskType')?.value || '',
            dueDateFrom: document.getElementById('filterDueDateFrom')?.value || '',
            dueDateTo: document.getElementById('filterDueDateTo')?.value || ''
        };
        localStorage.setItem('dashboardFilters', JSON.stringify(this.activeFilters));
    }

    loadFilterState() {
        const savedFilters = localStorage.getItem('dashboardFilters');
        if (savedFilters) {
            this.activeFilters = JSON.parse(savedFilters);
            
            // Apply saved filters to form
            Object.keys(this.activeFilters).forEach(key => {
                const element = document.getElementById(`filter${key.charAt(0).toUpperCase() + key.slice(1)}`);
                if (element && this.activeFilters[key]) {
                    element.value = this.activeFilters[key];
                }
            });
        }
    }

    getQueryParams() {
        const params = new URLSearchParams();
        
        // Add pagination
        params.append('petPage', this.currentPetPage);
        params.append('taskPage', this.currentTaskPage);
        
        // Add filters
        Object.keys(this.activeFilters).forEach(key => {
            if (this.activeFilters[key]) {
                params.append(key, this.activeFilters[key]);
            }
        });
        
        return params;
    }

    async loadPetsPage(page) {
        try {
            this.showLoading('pets');
            this.currentPetPage = page;

            const params = this.getQueryParams();
            
            // console.log('📤 Fetching pets with params:', params.toString());

            const response = await fetch(`/dashboard?${params}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newPetsContainer = doc.getElementById('petsListContainer');
            
            if (newPetsContainer) {
                document.getElementById('petsListContainer').innerHTML = newPetsContainer.innerHTML;
                this.updateURL(params);
                this.restoreScrollPosition('pets');
                this.reinitializeEventHandlers();
                // console.log('✅ Pets page loaded successfully');
            } else {
                throw new Error('Pets container not found in response');
            }

        } catch (error) {
            // console.error('❌ Error loading pets page:', error);
            this.showError('pets', 'Failed to load pets. Please try again.');
            // Fallback to regular navigation
            setTimeout(() => {
                const params = this.getQueryParams();
                window.location.href = `/dashboard?${params}`;
            }, 2000);
        }
    }

    async loadTasksPage(page) {
        try {
            this.showLoading('tasks');
            this.currentTaskPage = page;

            const params = this.getQueryParams();
            
            // console.log('📤 Fetching tasks with params:', params.toString());

            const response = await fetch(`/dashboard?${params}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const tasksSection = doc.querySelector('.section-card:nth-child(2)');
            
            if (tasksSection) {
                const currentTasksSection = document.querySelector('.section-card:nth-child(2)');
                currentTasksSection.innerHTML = tasksSection.innerHTML;
                this.updateURL(params);
                this.restoreScrollPosition('tasks');
                this.reinitializeEventHandlers();
                // console.log('✅ Tasks page loaded successfully');
            } else {
                throw new Error('Tasks section not found in response');
            }

        } catch (error) {
            // console.error('❌ Error loading tasks page:', error);
            this.showError('tasks', 'Failed to load tasks. Please try again.');
            // Fallback to regular navigation
            setTimeout(() => {
                const params = this.getQueryParams();
                window.location.href = `/dashboard?${params}`;
            }, 2000);
        }
    }

    showLoading(type) {
        const container = type === 'pets' 
            ? document.getElementById('petsListContainer')
            : document.querySelector('.section-card:nth-child(2)');

        if (container) {
            const originalContent = container.innerHTML;
            container.setAttribute('data-original-content', originalContent);
            
            container.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading ${type}...</span>
                    </div>
                    <p class="mt-2 text-muted">Loading ${type}...</p>
                </div>
            `;
        }
    }

    showError(type, message) {
        const container = type === 'pets' 
            ? document.getElementById('petsListContainer')
            : document.querySelector('.section-card:nth-child(2)');

        if (container) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle"></i> ${message}
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="window.location.reload()">
                        Reload Page
                    </button>
                </div>
            `;
        }
    }

    updateURL(params) {
        const newUrl = `${window.location.pathname}?${params}`;
        window.history.pushState({}, '', newUrl);
    }

    restoreScrollPosition(type) {
        // Maintain scroll position for better UX
        const section = type === 'pets' 
            ? document.querySelector('.section-card:first-child')
            : document.querySelector('.section-card:nth-child(2)');
        
        if (section) {
            setTimeout(() => {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }

    reinitializeEventHandlers() {
        // Reinitialize any event handlers that might be lost during content replacement
        if (window.enhancedDashboard) {
            window.enhancedDashboard.testEditButtons();
        }
        
        // Reinitialize filters
        if (window.modernFilterSystem) {
            // The filter system should handle its own event delegation
            // console.log('🔄 Reinitializing event handlers');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardPagination = new DashboardPaginationEnhanced();
    // console.log('🎯 Pagination system ready - Next/Previous buttons should work now');
});