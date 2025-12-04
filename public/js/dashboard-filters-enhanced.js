/**
 * Dashboard Filters Enhanced - Advanced filtering system for pet care dashboard.
 * Provides species, gender, age, priority, task type, and date range filtering
 * with active filter display and results counting.
 */
document.addEventListener('DOMContentLoaded', function() {
    // Filter elements
    const filterSpecies = document.getElementById('filterSpecies');
    const filterGender = document.getElementById('filterGender');
    const filterAgeMin = document.getElementById('filterAgeMin');
    const filterAgeMax = document.getElementById('filterAgeMax');
    const filterPriority = document.getElementById('filterPriority');
    const filterTaskType = document.getElementById('filterTaskType');
    const filterDueDateFrom = document.getElementById('filterDueDateFrom');
    const filterDueDateTo = document.getElementById('filterDueDateTo');
    const clearAllFilters = document.getElementById('clearAllFilters');
    const activeFiltersContainer = document.getElementById('activeFiltersContainer');
    const activeFilters = document.getElementById('activeFilters');
    const resultsCounter = document.getElementById('resultsCounter');
    
    // All filter elements in an array for easier management
    const filterElements = [
        filterSpecies, filterGender, filterAgeMin, filterAgeMax,
        filterPriority, filterTaskType, filterDueDateFrom, filterDueDateTo
    ];
    
    /**
     * Applies event listeners to all filter elements.
     * Uses 'change' for select elements and 'input' for number/date inputs.
     */
    filterElements.forEach(filter => {
        if (filter) {
            filter.addEventListener('change', applyFilters);
            if (filter.type === 'number' || filter.type === 'date') {
                filter.addEventListener('input', applyFilters);
            }
        }
    });
    
    /**
     * Clears all filter selections when the clear button is clicked.
     * Resets select elements to first option and clears input values.
     */
    if (clearAllFilters) {
        clearAllFilters.addEventListener('click', function() {
            filterElements.forEach(filter => {
                if (filter) {
                    if (filter.type === 'select-one') {
                        filter.selectedIndex = 0;
                    } else {
                        filter.value = '';
                    }
                }
            });
            applyFilters();
        });
    }
    
    /**
     * Applies all active filters to pet and task items.
     * Evaluates each item against filter criteria and updates visibility.
     * Counts visible items and updates UI accordingly.
     */
    function applyFilters() {
        const petItems = document.querySelectorAll('.pet-item');
        const taskItems = document.querySelectorAll('.task-item');
        
        let visiblePets = 0;
        let visibleTasks = 0;
        
        /**
         * Filters pet items based on species, gender, and age range.
         * Uses data attributes from pet item elements for comparison.
         */
        petItems.forEach(item => {
            const species = item.getAttribute('data-species');
            const gender = item.getAttribute('data-gender');
            const age = parseFloat(item.getAttribute('data-age')) || 0;
            
            const speciesMatch = !filterSpecies.value || species === filterSpecies.value;
            const genderMatch = !filterGender.value || gender === filterGender.value;
            const ageMinMatch = !filterAgeMin.value || age >= parseFloat(filterAgeMin.value);
            const ageMaxMatch = !filterAgeMax.value || age <= parseFloat(filterAgeMax.value);
            
            const isVisible = speciesMatch && genderMatch && ageMinMatch && ageMaxMatch;
            
            item.style.display = isVisible ? 'flex' : 'none';
            if (isVisible) visiblePets++;
        });
        
        /**
         * Filters task items based on priority, type, and due date range.
         * Parses date strings for accurate date comparisons.
         */
        taskItems.forEach(item => {
            const priority = item.getAttribute('data-priority');
            const taskType = item.getAttribute('data-task-type');
            const dueDate = new Date(item.getAttribute('data-due-date'));
            
            const priorityMatch = !filterPriority.value || priority === filterPriority.value;
            const taskTypeMatch = !filterTaskType.value || taskType === filterTaskType.value;
            const dueDateFromMatch = !filterDueDateFrom.value || dueDate >= new Date(filterDueDateFrom.value);
            const dueDateToMatch = !filterDueDateTo.value || dueDate <= new Date(filterDueDateTo.value + 'T23:59:59');
            
            const isVisible = priorityMatch && taskTypeMatch && dueDateFromMatch && dueDateToMatch;
            
            item.style.display = isVisible ? 'flex' : 'none';
            if (isVisible) visibleTasks++;
        });
        
        updateActiveFilters();
        updateResultsCounter(visiblePets, visibleTasks);
    }
    
    /**
     * Updates the active filters display area.
     * Creates visual tags for each active filter with remove buttons.
     * Shows/hides the active filters container based on filter activity.
     */
    function updateActiveFilters() {
        activeFilters.innerHTML = '';
        let hasActiveFilters = false;
        
        const filters = [
            { id: 'filterSpecies', label: 'Species', value: filterSpecies.value },
            { id: 'filterGender', label: 'Gender', value: filterGender.value },
            { id: 'filterPriority', label: 'Priority', value: filterPriority.value },
            { id: 'filterTaskType', label: 'Task Type', value: filterTaskType.value },
            { id: 'filterAgeMin', label: 'Min Age', value: filterAgeMin.value },
            { id: 'filterAgeMax', label: 'Max Age', value: filterAgeMax.value },
            { id: 'filterDueDateFrom', label: 'From', value: filterDueDateFrom.value },
            { id: 'filterDueDateTo', label: 'To', value: filterDueDateTo.value }
        ];
        
        filters.forEach(filter => {
            if (filter.value) {
                hasActiveFilters = true;
                const filterTag = document.createElement('span');
                filterTag.className = 'active-filter-tag';
                filterTag.innerHTML = `
                    ${filter.label}: ${filter.value}
                    <button class="remove-filter" data-filter="${filter.id}">×</button>
                `;
                activeFilters.appendChild(filterTag);
            }
        });
        
        activeFiltersContainer.style.display = hasActiveFilters ? 'block' : 'none';
        
        /**
         * Adds event listeners to remove buttons on filter tags.
         * Clears the corresponding filter when remove button is clicked.
         */
        document.querySelectorAll('.remove-filter').forEach(button => {
            button.addEventListener('click', function() {
                const filterId = this.getAttribute('data-filter');
                const filterElement = document.getElementById(filterId);
                if (filterElement) {
                    if (filterElement.type === 'select-one') {
                        filterElement.selectedIndex = 0;
                    } else {
                        filterElement.value = '';
                    }
                    applyFilters();
                }
            });
        });
    }
    
    /**
     * Updates the results counter with current filter results.
     * Shows counts of visible items versus total items for both pets and tasks.
     * 
     * @param {number} visiblePets - Number of visible pet items
     * @param {number} visibleTasks - Number of visible task items
     */
    function updateResultsCounter(visiblePets, visibleTasks) {
        if (resultsCounter) {
            const totalPets = document.querySelectorAll('.pet-item').length;
            const totalTasks = document.querySelectorAll('.task-item').length;
            
            if (visiblePets === totalPets && visibleTasks === totalTasks) {
                resultsCounter.textContent = 'Showing all pets and tasks';
            } else {
                resultsCounter.textContent = 
                    `Showing ${visiblePets} of ${totalPets} pets and ${visibleTasks} of ${totalTasks} tasks`;
            }
        }
    }
    
    // Initialize filters on page load
    applyFilters();
});