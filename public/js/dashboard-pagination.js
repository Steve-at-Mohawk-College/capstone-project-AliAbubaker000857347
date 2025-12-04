/**
 * DashboardPagination - AJAX-based pagination system for dashboard content.
 * Provides seamless pagination navigation without full page reloads.
 * Enhances user experience by loading content dynamically.
 */
class DashboardPagination {
  constructor() {
    this.init();
  }

  /**
   * Initializes the pagination system.
   * Binds event listeners for pagination controls.
   */
  init() {
    this.bindEvents();
    // console.log('🔄 Pagination system initialized');
  }

  /**
   * Binds event listeners using event delegation.
   * Handles clicks on pagination links to load content via AJAX.
   */
  bindEvents() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('.pagination-controls a')) {
        e.preventDefault();
        const link = e.target.closest('.pagination-controls a');
        const url = link.href;
        
        // Determine content type based on URL parameters
        if (url.includes('petPage')) {
          this.loadPetsPage(url);
        } else {
          this.loadTasksPage(url);
        }
      }
    });
  }

  /**
   * Loads pet content for a specific page via AJAX.
   * Updates only the pets section of the dashboard without full page reload.
   * Falls back to regular navigation if AJAX fails.
   * 
   * @param {string} url - URL to fetch pet data from
   */
  async loadPetsPage(url) {
    try {
      this.showLoading('pets');
      
      const response = await fetch(url);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newPetsContainer = doc.getElementById('petsListContainer');
      
      if (newPetsContainer) {
        document.getElementById('petsListContainer').innerHTML = newPetsContainer.innerHTML;
        this.updateURL(url);
        this.showSuccess('Pets page updated');
      }
    } catch (error) {
      // console.error('Error loading pets page:', error);
      // Fallback to regular navigation on error
      window.location.href = url;
    }
  }

  /**
   * Loads task content for a specific page via AJAX.
   * Updates only the tasks section of the dashboard without full page reload.
   * Falls back to regular navigation if AJAX fails.
   * 
   * @param {string} url - URL to fetch task data from
   */
  async loadTasksPage(url) {
    try {
      this.showLoading('tasks');
      
      const response = await fetch(url);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const tasksCard = doc.querySelector('.card-body');
      
      if (tasksCard) {
        document.querySelector('.col-lg-6:last-child .card-body').innerHTML = tasksCard.innerHTML;
        this.updateURL(url);
        this.showSuccess('Tasks page updated');
      }
    } catch (error) {
      // console.error('Error loading tasks page:', error);
      // Fallback to regular navigation on error
      window.location.href = url;
    }
  }

  /**
   * Shows loading indicator during AJAX content loading.
   * Provides visual feedback to users during content transitions.
   * 
   * @param {string} type - Content type ('pets' or 'tasks')
   */
  showLoading(type) {
    const container = type === 'pets' 
      ? document.getElementById('petsListContainer')
      : document.querySelector('.col-lg-6:last-child .card-body');
    
    if (container) {
      container.innerHTML = `
        <div class="text-center py-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-2 text-muted">Loading ${type}...</p>
        </div>
      `;
    }
  }

  /**
   * Logs success message after content update.
   * Can be extended to show user notifications if needed.
   * 
   * @param {string} message - Success message to log
   */
  showSuccess(message) {
    // console.log('✅', message);
  }

  /**
   * Updates browser URL without page reload.
   * Maintains browser history for back/forward navigation.
   * 
   * @param {string} url - New URL to update browser history
   */
  updateURL(url) {
    window.history.pushState({}, '', url);
  }
}

/**
 * Initializes the DashboardPagination system when the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  window.dashboardPagination = new DashboardPagination();
});