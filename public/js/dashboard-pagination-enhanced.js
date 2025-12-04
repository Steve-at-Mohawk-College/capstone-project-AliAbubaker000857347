/**
 * DashboardPaginationEnhanced - AJAX-based pagination system for dashboard content.
 * Provides seamless pagination for pets and tasks with filter state persistence,
 * smooth transitions, and error handling.
 */
class DashboardPaginationEnhanced {
    constructor() {
        this.currentPetPage = 1;
        this.currentTaskPage = 1;
        this.activeFilters = {};
        this.init();
    }

    /**
     * Initializes the pagination system.
     * Binds event listeners and loads saved filter state.
     */
    init() {
        this.bindEvents();
        this.loadFilterState();
        // console.log('🔄 Enhanced Pagination initialized');
    }

    /**
     * Binds event listeners for pagination links and filter changes.
     * Uses event delegation for dynamically loaded content.
     */
    bindEvents() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.pagination-pet')) {
                e.preventDefault();
                const link = e.target.closest('.pagination-pet');
                const page = parseInt(link.getAttribute('data-page'));
                this.loadPetsPage(page);
            }

            if (e.target.closest('.pagination-task')) {
                e.preventDefault();
                const link = e.target.closest('.pagination-task');
                const page = parseInt(link.getAttribute('data-page'));
                this.loadTasksPage(page);
            }
        });

        const filterElements = document.querySelectorAll('#filterSpecies, #filterGender, #filterAgeMin, #filterAgeMax, #filterPriority, #filterTaskType, #filterDueDateFrom, #filterDueDateTo');
        filterElements.forEach(filter => {
            filter.addEventListener('change', () => {
                this.saveFilterState();
            });
        });

        document.getElementById('clearAllFilters')?.addEventListener('click', () => {
            setTimeout(() => {
                this.saveFilterState();
            }, 100);
        });
    }

    /**
     * Saves current filter state to localStorage.
     * Persists filter selections across page reloads and browser sessions.
     */
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

    /**
     * Loads saved filter state from localStorage.
     * Applies previously selected filters to form elements on page load.
     */
    loadFilterState() {
        const savedFilters = localStorage.getItem('dashboardFilters');
        if (savedFilters) {
            this.activeFilters = JSON.parse(savedFilters);
            
            Object.keys(this.activeFilters).forEach(key => {
                const element = document.getElementById(`filter${key.charAt(0).toUpperCase() + key.slice(1)}`);
                if (element && this.activeFilters[key]) {
                    element.value = this.activeFilters[key];
                }
            });
        }
    }

    /**
     * Builds query parameters for API requests.
     * Includes current pagination and filter states.
     * 
     * @returns {URLSearchParams} URL parameters for the request
     */
    getQueryParams() {
        const params = new URLSearchParams();
        
        params.append('petPage', this.currentPetPage);
        params.append('taskPage', this.currentTaskPage);
        
        Object.keys(this.activeFilters).forEach(key => {
            if (this.activeFilters[key]) {
                params.append(key, this.activeFilters[key]);
            }
        });
        
        return params;
    }

    /**
     * Loads a specific page of pet data via AJAX.
     * Updates only the pets section of the dashboard without full page reload.
     * 
     * @param {number} page - Page number to load
     */
    async loadPetsPage(page) {
        try {
            this.showLoading('pets');
            this.currentPetPage = page;

            const params = this.getQueryParams();
            
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
            } else {
                throw new Error('Pets container not found in response');
            }

        } catch (error) {
            // console.error('❌ Error loading pets page:', error);
            this.showError('pets', 'Failed to load pets. Please try again.');
            setTimeout(() => {
                const params = this.getQueryParams();
                window.location.href = `/dashboard?${params}`;
            }, 2000);
        }
    }

    /**
     * Loads a specific page of task data via AJAX.
     * Updates only the tasks section of the dashboard without full page reload.
     * 
     * @param {number} page - Page number to load
     */
    async loadTasksPage(page) {
        try {
            this.showLoading('tasks');
            this.currentTaskPage = page;

            const params = this.getQueryParams();
            
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
            } else {
                throw new Error('Tasks section not found in response');
            }

        } catch (error) {
            // console.error('❌ Error loading tasks page:', error);
            this.showError('tasks', 'Failed to load tasks. Please try again.');
            setTimeout(() => {
                const params = this.getQueryParams();
                window.location.href = `/dashboard?${params}`;
            }, 2000);
        }
    }

    /**
     * Shows loading indicator during AJAX requests.
     * Preserves original content for potential restoration on error.
     * 
     * @param {string} type - Content type ('pets' or 'tasks')
     */
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

    /**
     * Shows error message when AJAX request fails.
     * Provides user with reload option to recover from error state.
     * 
     * @param {string} type - Content type ('pets' or 'tasks')
     * @param {string} message - Error message to display
     */
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

    /**
     * Updates browser URL without page reload.
     * Maintains browser history and allows bookmarking of filtered/paged states.
     * 
     * @param {URLSearchParams} params - URL parameters to update
     */
    updateURL(params) {
        const newUrl = `${window.location.pathname}?${params}`;
        window.history.pushState({}, '', newUrl);
    }

    /**
     * Restores scroll position after content update.
     * Provides smooth user experience by maintaining viewport position.
     * 
     * @param {string} type - Content type ('pets' or 'tasks')
     */
    restoreScrollPosition(type) {
        const section = type === 'pets' 
            ? document.querySelector('.section-card:first-child')
            : document.querySelector('.section-card:nth-child(2)');
        
        if (section) {
            setTimeout(() => {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }

    /**
     * Reinitializes event handlers after content replacement.
     * Ensures interactive elements continue to work after AJAX updates.
     */
    reinitializeEventHandlers() {
        if (window.enhancedDashboard) {
            window.enhancedDashboard.testEditButtons();
        }
    }
}

/**
 * Initializes the enhanced pagination system when the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardPagination = new DashboardPaginationEnhanced();
});