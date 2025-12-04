/**
 * Detail View Handler - Provides detailed view functionality for pet and task items.
 * Shows comprehensive information in modal dialogs when items are clicked.
 * Excludes action buttons (edit, delete, etc.) from triggering detail views.
 */
document.addEventListener('DOMContentLoaded', function() {
    const detailModalElement = document.getElementById('detailModal');
    if (!detailModalElement) {
        // console.error('❌ Detail modal not found!');
        return;
    }
    
    const detailModal = new bootstrap.Modal(detailModalElement);
    const detailModalTitle = document.getElementById('detailModalTitle');
    const detailModalBody = document.getElementById('detailModalBody');
    const detailEditBtn = document.getElementById('detailEditBtn');

    // Modal accessibility event handlers
    detailModalElement.addEventListener('show.bs.modal', function () {
        // console.log('📱 Modal opening - setting up accessibility');
    });

    detailModalElement.addEventListener('hidden.bs.modal', function () {
        // console.log('📱 Modal closed - cleaning up');
        detailModalBody.innerHTML = '';
        detailModalTitle.innerHTML = '';
    });

    /**
     * Event delegation for clickable items, excluding action buttons.
     * Identifies clicks on main item areas and shows appropriate detail view.
     */
    document.addEventListener('click', function(e) {
        // Skip action buttons to prevent detail view from opening
        if (e.target.closest('.edit-btn') || 
            e.target.closest('.remove-btn') || 
            e.target.closest('.edit-task-btn') ||
            e.target.closest('.save-edit-btn') ||
            e.target.closest('.cancel-edit-btn') ||
            e.target.closest('.save-task-edit-btn') ||
            e.target.closest('.cancel-task-edit-btn')) {
            return; // Don't show detail view for action buttons
        }

        // Check if click is on the main item (not the action buttons)
        const item = e.target.closest('.clickable-item');
        if (item) {
            e.preventDefault();
            e.stopPropagation();
            
            const type = item.dataset.type;
            const id = item.dataset.id;
            
            if (type === 'pet') {
                showSimplePetDetails(item);
            } else if (type === 'task') {
                showSimpleTaskDetails(item);
            }
        }
    });

    /**
     * Displays detailed pet information in modal.
     * Shows basic information, statistics, and quick action buttons.
     * 
     * @param {HTMLElement} item - The pet item element that was clicked
     */
    function showSimplePetDetails(item) {
        const petName = item.querySelector('.pet-name').textContent;
        const petDetails = item.querySelector('.pet-details').textContent;
        const petGender = item.querySelector('.badge').textContent;
        
        detailModalTitle.innerHTML = `
            <i class="bi bi-heart-fill text-danger me-2"></i>
            ${petName} - Details
        `;
        
        detailModalBody.innerHTML = `
            <div class="row">
                <div class="col-md-4 text-center mb-3">
                    <div class="pet-avatar-large mx-auto mb-3">
                        <i class="bi bi-${getPetIcon(item.dataset.species)}-fill"></i>
                    </div>
                    <h4 class="mb-1">${petName}</h4>
                    <span class="badge bg-primary" style="font-size: 3rem; padding: 0.6rem 1.2rem; background: var(--accent); color: white;">${item.dataset.species}</span>
                </div>
                <div class="col-md-8">
                    <div class="detail-section">
                        <h6 class="section-title">Basic Information</h6>
                        <div class="row g-3">
                            <div class="col-12">
                                <label class="detail-label">Details</label>
                                <p class="detail-value">${petDetails}</p>
                            </div>
                            <div class="col-6">
                                <label class="detail-label">Gender</label>
                                <p class="detail-value">${petGender}</p>
                            </div>
                            <div class="col-6">
                                <label class="detail-label">Age</label>
                                <p class="detail-value">${item.dataset.age || 'Not specified'} years</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section mt-4">
                        <h6 class="section-title">Quick Actions</h6>
                        <div class="d-grid gap-2">
                            <button type="button" class="btn btn-outline-primary btn-sm" onclick="window.editPet(${item.dataset.id})">
                                <i class="bi bi-pencil me-1"></i>Edit Pet
                            </button>
                            <button type="button" class="btn btn-outline-success btn-sm" onclick="window.scheduleTaskForPet(${item.dataset.id})">
                                <i class="bi bi-calendar-plus me-1"></i>Schedule Task
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        detailEditBtn.style.display = 'none';
        
        setTimeout(() => {
            detailModal.show();
        }, 50);
    }

    /**
     * Displays detailed task information in modal.
     * Shows task details, due date, priority, and quick action buttons.
     * 
     * @param {HTMLElement} item - The task item element that was clicked
     */
    function showSimpleTaskDetails(item) {
        const taskTitle = item.querySelector('.task-title').textContent;
        const taskDetails = item.querySelector('.task-details');
        const taskPriority = item.dataset.priority;
        
        let petName = 'Unknown';
        let startTime = '';
        let taskDetailsText = '';
        
        if (taskDetails) {
            const detailsHtml = taskDetails.innerHTML;
            const petMatch = detailsHtml.match(/For:\s*<strong>(.*?)<\/strong>/);
            petName = petMatch ? petMatch[1] : 'Unknown';
            
            const timeMatch = detailsHtml.match(/Starts:\s*<strong>(.*?)<\/strong>/);
            startTime = timeMatch ? timeMatch[1] : new Date(item.dataset.dueDate).toLocaleString();
            
            taskDetailsText = `For: ${petName} • Starts: ${startTime}`;
        } else {
            taskDetailsText = taskDetails ? taskDetails.textContent : '';
        }
        
        const dueDate = new Date(item.dataset.dueDate);
        const isOverdue = dueDate < new Date();
        
        detailModalTitle.innerHTML = `
            <i class="bi bi-calendar-check text-warning me-2"></i>
            ${taskTitle} - Details
        `;
        
        detailModalBody.innerHTML = `
            <div class="row">
                <div class="col-md-8">
                    <div class="detail-section">
                        <h6 class="section-title">Task Information</h6>
                        <div class="row g-3">
                            <div class="col-12">
                                <label class="detail-label">Details</label>
                                <p class="detail-value">${taskDetailsText}</p>
                            </div>
                            <div class="col-6">
                                <label class="detail-label">Due Date</label>
                                <p class="detail-value ${isOverdue ? 'text-danger' : ''}">
                                    ${dueDate.toLocaleDateString()} at ${dueDate.toLocaleTimeString()}
                                    ${isOverdue ? ' (Overdue)' : ''}
                                </p>
                            </div>
                            <div class="col-6">
                                <label class="detail-label">Priority</label>
                                <p class="detail-value">
                                    <span class="badge badge-${taskPriority === 'high' ? 'danger' : taskPriority === 'medium' ? 'warning' : 'success'}">
                                        ${taskPriority}
                                    </span>
                                </p>
                            </div>
                            <div class="col-6">
                                <label class="detail-label">Type</label>
                                <p class="detail-value text-capitalize">${(item.dataset.taskType || '').replace('_', ' ')}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section mt-4">
                        <h6 class="section-title">Quick Actions</h6>
                        <div class="d-grid gap-2">
                            <button type="button" class="btn btn-outline-primary btn-sm" onclick="window.editTask(${item.dataset.id})">
                                <i class="bi bi-pencil me-1"></i>Edit Task
                            </button>
                            <button type="button" class="btn btn-outline-success btn-sm" onclick="window.completeTask(${item.dataset.id})">
                                <i class="bi bi-check-circle me-1"></i>Mark Complete
                            </button>
                        </div>
                    </div>
                </div>
                <div class="col-md-4 text-center">
                    <div class="task-icon-large mx-auto mb-3 ${isOverdue ? 'overdue' : ''}">
                        <i class="bi bi-${getTaskIcon(item.dataset.taskType)}"></i>
                    </div>
                    <div class="time-remaining">
                        <h6>Due Date</h6>
                        <p class="countdown ${isOverdue ? 'text-danger' : ''}">
                            ${isOverdue ? 'Overdue' : dueDate.toLocaleDateString()}
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        detailEditBtn.style.display = 'none';
        
        setTimeout(() => {
            detailModal.show();
        }, 50);
    }

    /**
     * Returns appropriate Bootstrap icon class for pet species.
     * 
     * @param {string} species - Pet species (dog, cat, bird, rabbit, other)
     * @returns {string} Bootstrap icon class name
     */
    function getPetIcon(species) {
        const icons = {
            'dog': 'heart',
            'cat': 'star',
            'bird': 'twitter',
            'rabbit': 'egg',
            'other': 'circle'
        };
        return icons[species] || 'circle';
    }

    /**
     * Returns appropriate Bootstrap icon class for task type.
     * 
     * @param {string} taskType - Task type (feeding, cleaning, vaccination, etc.)
     * @returns {string} Bootstrap icon class name
     */
    function getTaskIcon(taskType) {
        const icons = {
            'feeding': 'cup-straw',
            'cleaning': 'droplet',
            'vaccination': 'syringe',
            'medication': 'capsule',
            'grooming': 'scissors',
            'vet_visit': 'hospital',
            'exercise': 'activity',
            'other': 'list-check'
        };
        return icons[taskType] || 'list-check';
    }
});

/**
 * Global function to edit a pet from the detail view.
 * Triggers the edit button click for the specified pet.
 * 
 * @param {number} petId - ID of the pet to edit
 */
window.editPet = function(petId) {
    const editBtn = document.querySelector(`.edit-btn[data-pet-id="${petId}"]`);
    if (editBtn) {
        editBtn.click();
    }
    const modal = bootstrap.Modal.getInstance(document.getElementById('detailModal'));
    if (modal) modal.hide();
}

/**
 * Global function to schedule a task for a specific pet.
 * Navigates to the schedule task page with the pet ID pre-selected.
 * 
 * @param {number} petId - ID of the pet to schedule task for
 */
window.scheduleTaskForPet = function(petId) {
    window.location.href = `/schedule-task?petId=${petId}`;
}

/**
 * Global function to edit a task from the detail view.
 * Triggers the edit button click for the specified task.
 * 
 * @param {number} taskId - ID of the task to edit
 */
window.editTask = function(taskId) {
    const editBtn = document.querySelector(`.edit-task-btn[data-task-id="${taskId}"]`);
    if (editBtn) {
        editBtn.click();
    }
    const modal = bootstrap.Modal.getInstance(document.getElementById('detailModal'));
    if (modal) modal.hide();
}

/**
 * Global function to mark a task as complete.
 * Sends PUT request to server and updates UI with animation.
 * 
 * @param {number} taskId - ID of the task to mark as complete
 */
window.completeTask = function(taskId) {
    fetch(`/tasks/${taskId}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.ok) {
            const taskElement = document.querySelector(`.clickable-item[data-type="task"][data-id="${taskId}"]`);
            if (taskElement) {
                taskElement.style.opacity = '0';
                taskElement.style.transform = 'translateX(100px)';
                
                setTimeout(() => {
                    taskElement.remove();
                    
                    const remainingTasks = document.querySelectorAll('.task-item');
                    if (remainingTasks.length === 0) {
                        window.location.reload();
                    }
                }, 300);
            }
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('detailModal'));
            if (modal) modal.hide();
            
            alert('Task marked as complete and removed from dashboard!');
        } else {
            alert('Failed to mark task as complete');
        }
    })
    .catch(error => {
        // console.error('Error completing task:', error);
        alert('Failed to mark task as complete');
    });
}