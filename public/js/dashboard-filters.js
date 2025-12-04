/**
 * PetFilterSystem - Advanced filtering system for pet management dashboard.
 * Provides comprehensive filtering by species, age, weight, and gender with
 * visual feedback, active filter display, and no-results handling.
 */
class PetFilterSystem {
    constructor() {
        this.currentFilters = {
            species: '',
            ageMin: '',
            ageMax: '',
            weightMin: '',
            weightMax: '',
            gender: ''
        };
        this.init();
    }

    /**
     * Initializes the filter system.
     * Binds event listeners and logs initialization.
     */
    init() {
        this.bindEvents();
        // console.log('🎯 Pet Filter System initialized');
    }

    /**
     * Binds event listeners to filter controls.
     * Handles apply and clear filter actions.
     */
    bindEvents() {
        document.getElementById('applyFilters')?.addEventListener('click', () => {
            this.updateCurrentFilters();
            this.applyFilters();
            this.updateActiveFiltersDisplay();
        });

        document.getElementById('clearFilters')?.addEventListener('click', () => {
            this.clearFilters();
        });
    }

    /**
     * Updates current filter values from form inputs.
     * Reads values from all filter form fields.
     */
    updateCurrentFilters() {
        this.currentFilters = {
            species: document.getElementById('filterSpecies').value,
            ageMin: document.getElementById('filterAgeMin').value,
            ageMax: document.getElementById('filterAgeMax').value,
            weightMin: document.getElementById('filterWeightMin').value,
            weightMax: document.getElementById('filterWeightMax').value,
            gender: document.getElementById('filterGender').value
        };
    }

    /**
     * Applies current filters to pet cards.
     * Evaluates each pet card against filter criteria and updates visibility.
     * Handles results counting and no-results messaging.
     */
    applyFilters() {
        const petsList = document.getElementById('petsList');
        const petsListContainer = document.getElementById('petsListContainer');
        
        if (!petsList) return;

        const petCards = petsList.querySelectorAll('.pet-card');
        let visibleCount = 0;

        petCards.forEach(card => {
            const species = card.getAttribute('data-species').toLowerCase();
            const age = parseFloat(card.getAttribute('data-age')) || 0;
            const weight = parseFloat(card.getAttribute('data-weight')) || 0;
            const gender = card.getAttribute('data-gender').toLowerCase();

            let isVisible = true;

            if (this.currentFilters.species && species !== this.currentFilters.species.toLowerCase()) {
                isVisible = false;
            }
            if (this.currentFilters.ageMin && age < parseFloat(this.currentFilters.ageMin)) {
                isVisible = false;
            }
            if (this.currentFilters.ageMax && age > parseFloat(this.currentFilters.ageMax)) {
                isVisible = false;
            }
            if (this.currentFilters.weightMin && weight < parseFloat(this.currentFilters.weightMin)) {
                isVisible = false;
            }
            if (this.currentFilters.weightMax && weight > parseFloat(this.currentFilters.weightMax)) {
                isVisible = false;
            }
            if (this.currentFilters.gender && gender !== this.currentFilters.gender.toLowerCase()) {
                isVisible = false;
            }

            card.style.display = isVisible ? 'flex' : 'none';
            if (isVisible) visibleCount++;
        });

        this.updateResultsCounter(visibleCount, petCards.length);
        this.handleNoResults(visibleCount, petCards.length, petsListContainer);
    }

    /**
     * Updates the results counter display.
     * Shows count of visible pets versus total pets.
     * 
     * @param {number} visible - Number of currently visible pets
     * @param {number} total - Total number of pets
     */
    updateResultsCounter(visible, total) {
        const filterResults = document.getElementById('filterResults');
        if (filterResults) {
            filterResults.textContent = `Showing ${visible} of ${total} pets`;
        }
    }

    /**
     * Handles no-results scenario by displaying a helpful message.
     * Creates or removes no-results message based on filter results.
     * 
     * @param {number} visibleCount - Number of visible pets
     * @param {number} totalCount - Total number of pets
     * @param {HTMLElement} container - Container element for pets list
     */
    handleNoResults(visibleCount, totalCount, container) {
        const existingMessage = document.getElementById('noResultsMessage');
        
        if (visibleCount === 0 && totalCount > 0) {
            if (!existingMessage) {
                const noResults = document.createElement('div');
                noResults.id = 'noResultsMessage';
                noResults.className = 'text-center py-4 no-pets-message';
                noResults.innerHTML = `
                    <div class="bg-light rounded-circle p-4 d-inline-block mb-3">
                        <i class="bi bi-search text-muted" style="font-size: 2rem;"></i>
                    </div>
                    <h5 class="text-muted">No pets match your filters</h5>
                    <p class="text-muted mb-3">Try adjusting your filter criteria</p>
                    <button class="btn btn-custom" id="clearFiltersFromMessage">Clear Filters</button>
                `;
                container.appendChild(noResults);

                document.getElementById('clearFiltersFromMessage').addEventListener('click', () => {
                    this.clearFilters();
                });
            }
        } else if (existingMessage) {
            existingMessage.remove();
        }
    }

    /**
     * Updates the active filters display area.
     * Creates visual badges for each active filter with remove functionality.
     */
    updateActiveFiltersDisplay() {
        const activeFiltersContainer = document.getElementById('activeFilters');
        if (!activeFiltersContainer) return;

        activeFiltersContainer.innerHTML = '';
        const activeFilters = Object.entries(this.currentFilters).filter(([key, value]) => value !== '');

        if (activeFilters.length === 0) return;

        activeFilters.forEach(([key, value]) => {
            const { displayText, badgeClass } = this.getFilterDisplayInfo(key, value);
            const badge = this.createFilterBadge(displayText, badgeClass, key);
            activeFiltersContainer.appendChild(badge);
        });
    }

    /**
     * Generates display information for a specific filter.
     * Provides formatted text and Bootstrap badge class for visual representation.
     * 
     * @param {string} key - Filter key (species, ageMin, etc.)
     * @param {string} value - Filter value
     * @returns {Object} Display text and badge class
     */
    getFilterDisplayInfo(key, value) {
        const config = {
            species: { text: `Species: ${this.capitalizeFirst(value)}`, class: 'bg-success' },
            ageMin: { text: `Min Age: ${value} years`, class: 'bg-info' },
            ageMax: { text: `Max Age: ${value} years`, class: 'bg-info' },
            weightMin: { text: `Min Weight: ${value} kg`, class: 'bg-warning' },
            weightMax: { text: `Max Weight: ${value} kg`, class: 'bg-warning' },
            gender: { text: `Gender: ${this.capitalizeFirst(value)}`, class: 'bg-secondary' }
        };

        return {
            displayText: config[key]?.text || `${key}: ${value}`,
            badgeClass: config[key]?.class || 'bg-primary'
        };
    }

    /**
     * Creates a filter badge element with remove functionality.
     * 
     * @param {string} displayText - Text to display on badge
     * @param {string} badgeClass - Bootstrap badge class for styling
     * @param {string} filterKey - Key identifier for the filter
     * @returns {HTMLElement} Badge element with remove button
     */
    createFilterBadge(displayText, badgeClass, filterKey) {
        const badge = document.createElement('span');
        badge.className = `badge ${badgeClass} filter-badge`;
        badge.innerHTML = `${displayText} <i class="bi bi-x-circle ms-1" style="cursor: pointer;"></i>`;
        
        badge.querySelector('i').addEventListener('click', () => {
            this.clearSingleFilter(filterKey);
        });

        return badge;
    }

    /**
     * Clears a single filter and re-applies remaining filters.
     * 
     * @param {string} filterKey - Key of the filter to clear
     */
    clearSingleFilter(filterKey) {
        const elementMap = {
            species: 'filterSpecies',
            ageMin: 'filterAgeMin',
            ageMax: 'filterAgeMax',
            weightMin: 'filterWeightMin',
            weightMax: 'filterWeightMax',
            gender: 'filterGender'
        };

        const elementId = elementMap[filterKey];
        if (elementId) {
            document.getElementById(elementId).value = '';
        }

        this.currentFilters[filterKey] = '';
        this.applyFilters();
        this.updateActiveFiltersDisplay();
    }

    /**
     * Clears all filters and resets the filter form.
     */
    clearFilters() {
        document.getElementById('petFilterForm')?.reset();
        this.currentFilters = {
            species: '',
            ageMin: '',
            ageMax: '',
            weightMin: '',
            weightMax: '',
            gender: ''
        };
        this.applyFilters();
        this.updateActiveFiltersDisplay();
    }

    /**
     * Capitalizes the first letter of a string.
     * 
     * @param {string} string - String to capitalize
     * @returns {string} Capitalized string
     */
    capitalizeFirst(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}