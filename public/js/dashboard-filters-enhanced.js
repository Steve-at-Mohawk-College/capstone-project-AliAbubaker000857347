// dashboard-filters-enhanced.js
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
    
    // All filter elements
    const filterElements = [
        filterSpecies, filterGender, filterAgeMin, filterAgeMax,
        filterPriority, filterTaskType, filterDueDateFrom, filterDueDateTo
    ];
    
    // Add event listeners to all filters
    filterElements.forEach(filter => {
        if (filter) {
            filter.addEventListener('change', applyFilters);
            if (filter.type === 'number' || filter.type === 'date') {
                filter.addEventListener('input', applyFilters);
            }
        }
    });
    
    // Clear all filters
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
    
    function applyFilters() {
        const petItems = document.querySelectorAll('.pet-item');
        const taskItems = document.querySelectorAll('.task-item');
        
        let visiblePets = 0;
        let visibleTasks = 0;
        
        // Filter pets
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
        
        // Filter tasks
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
        
        // Update active filters display
        updateActiveFilters();
        
        // Update results counter
        updateResultsCounter(visiblePets, visibleTasks);
    }
    
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
        
        // Add event listeners to remove buttons
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
    
    // Initialize filters
    applyFilters();
});