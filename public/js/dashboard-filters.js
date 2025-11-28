// Dashboard Filtering System
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

    init() {
        this.bindEvents();
        // console.log('🎯 Pet Filter System initialized');
    }

    bindEvents() {
        // Apply filters
        document.getElementById('applyFilters')?.addEventListener('click', () => {
            this.updateCurrentFilters();
            this.applyFilters();
            this.updateActiveFiltersDisplay();
        });

        // Clear filters
        document.getElementById('clearFilters')?.addEventListener('click', () => {
            this.clearFilters();
        });
    }

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

            // Apply all filters
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

            // Show/hide card
            card.style.display = isVisible ? 'flex' : 'none';
            if (isVisible) visibleCount++;
        });

        this.updateResultsCounter(visibleCount, petCards.length);
        this.handleNoResults(visibleCount, petCards.length, petsListContainer);
    }

    updateResultsCounter(visible, total) {
        const filterResults = document.getElementById('filterResults');
        if (filterResults) {
            filterResults.textContent = `Showing ${visible} of ${total} pets`;
        }
    }

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

    capitalizeFirst(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}