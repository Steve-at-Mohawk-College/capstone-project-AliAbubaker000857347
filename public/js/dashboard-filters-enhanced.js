// Modern Filter System for Dashboard
class ModernFilterSystem {
  constructor() {
    this.filters = {
      pets: {
        species: '',
        gender: '',
        ageMin: '',
        ageMax: ''
      },
      tasks: {
        priority: '',
        taskType: '',
        dueDateFrom: '',
        dueDateTo: ''
      }
    };
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadSavedFilters();
    console.log('🎯 Modern Filter System initialized');
  }

  bindEvents() {
    // Pet filter events
    document.getElementById('filterSpecies')?.addEventListener('change', () => this.applyFilters());
    document.getElementById('filterGender')?.addEventListener('change', () => this.applyFilters());
    document.getElementById('filterAgeMin')?.addEventListener('input', () => this.applyFilters());
    document.getElementById('filterAgeMax')?.addEventListener('input', () => this.applyFilters());

    // Task filter events
    document.getElementById('filterPriority')?.addEventListener('change', () => this.applyFilters());
    document.getElementById('filterTaskType')?.addEventListener('change', () => this.applyFilters());
    document.getElementById('filterDueDateFrom')?.addEventListener('change', () => this.applyFilters());
    document.getElementById('filterDueDateTo')?.addEventListener('change', () => this.applyFilters());

    // Clear all filters
    document.getElementById('clearAllFilters')?.addEventListener('click', () => this.clearAllFilters());
  }

  updateFilters() {
    this.filters.pets = {
      species: document.getElementById('filterSpecies').value,
      gender: document.getElementById('filterGender').value,
      ageMin: document.getElementById('filterAgeMin').value,
      ageMax: document.getElementById('filterAgeMax').value
    };

    this.filters.tasks = {
      priority: document.getElementById('filterPriority').value,
      taskType: document.getElementById('filterTaskType').value,
      dueDateFrom: document.getElementById('filterDueDateFrom').value,
      dueDateTo: document.getElementById('filterDueDateTo').value
    };

    this.saveFilters();
  }

  applyFilters() {
    this.updateFilters();
    this.filterPets();
    this.filterTasks();
    this.updateResultsCounter();
    this.updateActiveFiltersDisplay();
  }

  filterPets() {
    const petItems = document.querySelectorAll('.pet-item-dark');
    let visiblePets = 0;

    petItems.forEach(pet => {
      const species = pet.getAttribute('data-species') || '';
      const gender = pet.getAttribute('data-gender') || '';
      const age = parseFloat(pet.getAttribute('data-age')) || 0;

      let isVisible = true;

      // Apply pet filters
      if (this.filters.pets.species && species !== this.filters.pets.species) {
        isVisible = false;
      }
      if (this.filters.pets.gender && gender !== this.filters.pets.gender) {
        isVisible = false;
      }
      if (this.filters.pets.ageMin && age < parseFloat(this.filters.pets.ageMin)) {
        isVisible = false;
      }
      if (this.filters.pets.ageMax && age > parseFloat(this.filters.pets.ageMax)) {
        isVisible = false;
      }

      pet.style.display = isVisible ? 'flex' : 'none';
      if (isVisible) visiblePets++;
    });

    this.handleNoResults('pets', visiblePets, petItems.length);
    return visiblePets;
  }

  filterTasks() {
    const taskItems = document.querySelectorAll('.task-item-dark');
    let visibleTasks = 0;

    taskItems.forEach(task => {
      const priority = task.getAttribute('data-priority') || '';
      const taskType = task.getAttribute('data-task-type') || '';
      const dueDate = new Date(task.getAttribute('data-due-date'));

      let isVisible = true;

      // Apply task filters
      if (this.filters.tasks.priority && priority !== this.filters.tasks.priority) {
        isVisible = false;
      }
      if (this.filters.tasks.taskType && taskType !== this.filters.tasks.taskType) {
        isVisible = false;
      }
      if (this.filters.tasks.dueDateFrom) {
        const fromDate = new Date(this.filters.tasks.dueDateFrom);
        if (dueDate < fromDate) isVisible = false;
      }
      if (this.filters.tasks.dueDateTo) {
        const toDate = new Date(this.filters.tasks.dueDateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        if (dueDate > toDate) isVisible = false;
      }

      task.style.display = isVisible ? 'flex' : 'none';
      if (isVisible) visibleTasks++;
    });

    this.handleNoResults('tasks', visibleTasks, taskItems.length);
    return visibleTasks;
  }

  handleNoResults(type, visible, total) {
    const container = type === 'pets' 
      ? document.getElementById('petsListContainer')
      : document.querySelector('.section-card-dark:has(.task-item-dark)');

    let message = document.getElementById(`no${type.charAt(0).toUpperCase() + type.slice(1)}Results`);

    if (visible === 0 && total > 0) {
      if (!message) {
        message = document.createElement('div');
        message.id = `no${type.charAt(0).toUpperCase() + type.slice(1)}Results`;
        message.className = 'empty-state-dark';
        message.innerHTML = `
          <div class="empty-icon-dark">
            <i class="bi bi-search"></i>
          </div>
          <h4>No ${type} match your filters</h4>
          <p class="mb-3">Try adjusting your filter criteria</p>
          <button class="btn btn-dark btn-sm-dark clear-type-filters" data-type="${type}">
            Clear ${type} filters
          </button>
        `;
        container.appendChild(message);

        // Add event listener to clear specific filters
        message.querySelector('.clear-type-filters').addEventListener('click', (e) => {
          this.clearTypeFilters(e.target.dataset.type);
        });
      }
    } else if (message) {
      message.remove();
    }
  }

  clearTypeFilters(type) {
    if (type === 'pets') {
      document.getElementById('filterSpecies').value = '';
      document.getElementById('filterGender').value = '';
      document.getElementById('filterAgeMin').value = '';
      document.getElementById('filterAgeMax').value = '';
    } else {
      document.getElementById('filterPriority').value = '';
      document.getElementById('filterTaskType').value = '';
      document.getElementById('filterDueDateFrom').value = '';
      document.getElementById('filterDueDateTo').value = '';
    }
    this.applyFilters();
  }

  updateResultsCounter() {
    const petItems = document.querySelectorAll('.pet-item-dark');
    const taskItems = document.querySelectorAll('.task-item-dark');
    
    const visiblePets = Array.from(petItems).filter(pet => pet.style.display !== 'none').length;
    const visibleTasks = Array.from(taskItems).filter(task => task.style.display !== 'none').length;

    const counter = document.getElementById('resultsCounter');
    if (counter) {
      counter.textContent = `Showing ${visiblePets} of ${petItems.length} pets • ${visibleTasks} of ${taskItems.length} tasks`;
    }
  }

  updateActiveFiltersDisplay() {
    const activeFiltersContainer = document.getElementById('activeFiltersContainer');
    const activeFiltersElement = document.getElementById('activeFilters');

    if (!activeFiltersContainer || !activeFiltersElement) return;

    const allFilters = { ...this.filters.pets, ...this.filters.tasks };
    const activeFilters = Object.entries(allFilters).filter(([key, value]) => value !== '');

    activeFiltersElement.innerHTML = '';

    if (activeFilters.length === 0) {
      activeFiltersContainer.style.display = 'none';
      return;
    }

    activeFiltersContainer.style.display = 'block';

    activeFilters.forEach(([key, value]) => {
      const { displayText, badgeClass } = this.getFilterDisplayInfo(key, value);
      const badge = this.createFilterBadge(displayText, badgeClass, key);
      activeFiltersElement.appendChild(badge);
    });
  }

  getFilterDisplayInfo(key, value) {
    const config = {
      species: { text: `Species: ${this.capitalizeFirst(value)}`, class: 'badge-success' },
      gender: { text: `Gender: ${this.capitalizeFirst(value)}`, class: 'badge-secondary' },
      ageMin: { text: `Min Age: ${value}`, class: 'badge-info' },
      ageMax: { text: `Max Age: ${value}`, class: 'badge-info' },
      priority: { text: `Priority: ${this.capitalizeFirst(value)}`, class: 'badge-danger' },
      taskType: { text: `Type: ${this.capitalizeFirst(value.replace('_', ' '))}`, class: 'badge-warning' },
      dueDateFrom: { text: `From: ${new Date(value).toLocaleDateString()}`, class: 'badge-dark' },
      dueDateTo: { text: `To: ${new Date(value).toLocaleDateString()}`, class: 'badge-dark' }
    };

    return {
      displayText: config[key]?.text || `${key}: ${value}`,
      badgeClass: config[key]?.class || 'badge-primary'
    };
  }

  createFilterBadge(displayText, badgeClass, filterKey) {
    const badge = document.createElement('span');
    badge.className = `badge ${badgeClass} filter-badge`;
    badge.innerHTML = `${displayText} <i class="bi bi-x-circle ms-1" style="cursor: pointer;"></i>`;
    
    badge.querySelector('i').addEventListener('click', () => {
      this.clearSingleFilter(filterKey);
    });

    return badge;
  }

  clearSingleFilter(filterKey) {
    const elementMap = {
      species: 'filterSpecies',
      gender: 'filterGender',
      ageMin: 'filterAgeMin',
      ageMax: 'filterAgeMax',
      priority: 'filterPriority',
      taskType: 'filterTaskType',
      dueDateFrom: 'filterDueDateFrom',
      dueDateTo: 'filterDueDateTo'
    };

    const elementId = elementMap[filterKey];
    if (elementId) {
      document.getElementById(elementId).value = '';
      this.applyFilters();
    }
  }

  clearAllFilters() {
    document.querySelectorAll('#petFilterForm input, #petFilterForm select').forEach(element => {
      if (element.type !== 'button') element.value = '';
    });
    
    document.getElementById('filterPriority').value = '';
    document.getElementById('filterTaskType').value = '';
    document.getElementById('filterDueDateFrom').value = '';
    document.getElementById('filterDueDateTo').value = '';

    this.applyFilters();
  }

  saveFilters() {
    localStorage.setItem('dashboardFilters', JSON.stringify(this.filters));
  }

  loadSavedFilters() {
    const saved = localStorage.getItem('dashboardFilters');
    if (saved) {
      this.filters = JSON.parse(saved);
      this.applySavedFilters();
    }
  }

  applySavedFilters() {
    // Apply saved values to form elements
    Object.entries(this.filters.pets).forEach(([key, value]) => {
      const element = document.getElementById(`filter${key.charAt(0).toUpperCase() + key.slice(1)}`);
      if (element && value) element.value = value;
    });

    Object.entries(this.filters.tasks).forEach(([key, value]) => {
      const elementId = `filter${key.charAt(0).toUpperCase() + key.slice(1)}`;
      const element = document.getElementById(elementId);
      if (element && value) element.value = value;
    });

    this.applyFilters();
  }

  capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.modernFilterSystem = new ModernFilterSystem();
});