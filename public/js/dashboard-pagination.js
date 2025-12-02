// Enhanced pagination with AJAX
class DashboardPagination {
  constructor() {
    this.init();
  }

  init() {
    this.bindEvents();
    // console.log('🔄 Pagination system initialized');
  }

  bindEvents() {
    // Pets pagination
    document.addEventListener('click', (e) => {
      if (e.target.closest('.pagination-controls a')) {
        e.preventDefault();
        const link = e.target.closest('.pagination-controls a');
        const url = link.href;
        
        // Determine if it's pets or tasks pagination
        if (url.includes('petPage')) {
          this.loadPetsPage(url);
        } else {
          this.loadTasksPage(url);
        }
      }
    });
  }

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
      // Fallback to regular navigation
      window.location.href = url;
    }
  }

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
      // Fallback to regular navigation
      window.location.href = url;
    }
  }

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

  showSuccess(message) {
    // Optional: Show a small success message
    // console.log('✅', message);
  }

  updateURL(url) {
    window.history.pushState({}, '', url);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.dashboardPagination = new DashboardPagination();
});