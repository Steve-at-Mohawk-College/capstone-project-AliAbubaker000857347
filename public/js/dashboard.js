// Dashboard Main Functionality
class DashboardManager {
    constructor() {
        this.filterSystem = null;
        this.itemType = '';
        this.itemId = '';
        this.init();
    }

    init() {
        this.initializeSessionTimeout();
        this.initializeFilterSystem();
        this.bindEvents();
        this.formatDueDates();
        console.log('🚀 Dashboard Manager initialized');
    }

    initializeSessionTimeout() {
        if (typeof SessionTimeout !== 'undefined') {
            window.sessionTimeout = new SessionTimeout();
        }
    }

    initializeFilterSystem() {
        this.filterSystem = new PetFilterSystem();
    }

    bindEvents() {
        // Remove button functionality
        this.setupRemoveButtons();
        
        // Reset session timer on interactions
        this.setupSessionTimerReset();
        
        // Task descriptions toggle
        this.setupTaskDescriptionToggle();
        
        // Pet edit functionality
        this.setupPetEditSystem();
        
        // Task edit functionality
        this.setupTaskEditSystem();
    }

    setupRemoveButtons() {
        // Add event listeners to all remove buttons using event delegation
        document.addEventListener('click', (event) => {
            if (event.target.closest('.remove-btn')) {
                const button = event.target.closest('.remove-btn');
                this.itemType = button.getAttribute('data-type');
                this.itemId = button.getAttribute('data-id');
                const itemName = button.getAttribute('data-name');
                
                console.log('Remove button clicked:', this.itemType, this.itemId, itemName);
                
                const message = `Are you sure you want to remove ${this.itemType === 'pet' ? 'pet' : 'task'} "${itemName}"? This action cannot be undone.`;
                document.getElementById('confirmationMessage').textContent = message;
                
                const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
                modal.show();
            }
        });
        
        // Confirm remove button handler
        document.getElementById('confirmRemoveBtn').addEventListener('click', () => {
            this.handleRemoveConfirmation();
        });
    }

    handleRemoveConfirmation() {
        console.log('Confirm remove button clicked');
        if (this.itemType && this.itemId) {
            console.log(`Sending DELETE request to /${this.itemType}s/${this.itemId}`);
            
            // Show loading state
            const removeBtn = document.getElementById('confirmRemoveBtn');
            const originalText = removeBtn.innerHTML;
            removeBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Removing...';
            removeBtn.disabled = true;
            
            // Send delete request
            fetch(`/${this.itemType}s/${this.itemId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                console.log('Response received:', response.status, response.statusText);
                if (response.ok) {
                    console.log('Delete successful');
                    this.showSuccessMessage(`${this.itemType === 'pet' ? 'Pet' : 'Task'} has been removed successfully.`);
                    
                    // Reload the page after a short delay
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    console.error('Delete failed:', response.status);
                    this.showAlert('Error removing item. Please try again.', 'danger');
                    this.resetRemoveButton(removeBtn, originalText);
                }
            })
            .catch(error => {
                console.error('Fetch error:', error);
                this.showAlert('Error removing item. Please try again.', 'danger');
                this.resetRemoveButton(removeBtn, originalText);
            });
        } else {
            console.error('Missing itemType or itemId');
        }
    }

    resetRemoveButton(button, originalText) {
        button.innerHTML = originalText;
        button.disabled = false;
        
        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirmationModal'));
        modal.hide();
    }

    setupSessionTimerReset() {
        const interactiveElements = document.querySelectorAll(
            '.edit-btn, .save-edit-btn, .remove-btn, .toggle-description, .edit-task-btn, .save-task-edit-btn'
        );
        
        interactiveElements.forEach(element => {
            element.addEventListener('click', () => {
                if (window.resetSessionTimer) {
                    window.resetSessionTimer();
                }
            });
        });
    }

    formatDueDates() {
        document.querySelectorAll('.due-date').forEach(element => {
            const dueDate = new Date(element.getAttribute('data-due-date'));
            element.textContent = dueDate.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        });
    }

    setupTaskDescriptionToggle() {
        document.querySelectorAll('.toggle-description').forEach(button => {
            button.addEventListener('click', (e) => {
                const taskId = e.currentTarget.getAttribute('data-task-id');
                const descriptionDiv = document.getElementById(`description-${taskId}`);
                const icon = e.currentTarget.querySelector('i');
                
                this.toggleElement(descriptionDiv, icon, 'bi-chevron-down', 'bi-chevron-up');
            });
        });
    }

    toggleElement(element, icon, closedClass, openClass) {
        if (element.style.display === 'none') {
            element.style.display = 'block';
            icon.classList.remove(closedClass);
            icon.classList.add(openClass);
        } else {
            element.style.display = 'none';
            icon.classList.remove(openClass);
            icon.classList.add(closedClass);
        }
    }

    setupPetEditSystem() {
        // Edit button functionality
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const petId = e.currentTarget.getAttribute('data-pet-id');
                this.toggleEditForm(petId, 'edit-form');
            });
        });

        // Cancel edit buttons
        document.querySelectorAll('.cancel-edit-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const petId = e.currentTarget.getAttribute('data-pet-id');
                this.hideEditForm(petId, 'edit-form');
            });
        });

        // Save edit buttons
        document.querySelectorAll('.save-edit-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const petId = e.currentTarget.getAttribute('data-pet-id');
                this.savePetEdit(petId, e.currentTarget);
            });
        });
    }

    setupTaskEditSystem() {
        // Task Edit button functionality
        document.querySelectorAll('.edit-task-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const taskId = e.currentTarget.getAttribute('data-task-id');
                this.toggleEditForm(taskId, 'edit-task-form');
            });
        });

        // Cancel task edit button
        document.querySelectorAll('.cancel-task-edit-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const taskId = e.currentTarget.getAttribute('data-task-id');
                this.hideEditForm(taskId, 'edit-task-form');
            });
        });

        // Save task edit button
        document.querySelectorAll('.save-task-edit-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const taskId = e.currentTarget.getAttribute('data-task-id');
                this.saveTaskEdit(taskId, e.currentTarget);
            });
        });
    }

    toggleEditForm(itemId, formPrefix) {
        const editForm = document.getElementById(`${formPrefix}-${itemId}`);
        
        // Hide all other forms of same type
        document.querySelectorAll(`[id^="${formPrefix}-"]`).forEach(form => {
            if (form.id !== `${formPrefix}-${itemId}`) {
                form.style.display = 'none';
            }
        });
        
        // Toggle current form
        editForm.style.display = editForm.style.display === 'block' ? 'none' : 'block';
    }

    hideEditForm(itemId, formPrefix) {
        const editForm = document.getElementById(`${formPrefix}-${itemId}`);
        editForm.style.display = 'none';
    }

    async savePetEdit(petId, buttonElement) {
    console.log('💾 Saving pet edit for ID:', petId);
    
    const ageInput = document.getElementById(`edit-age-${petId}`);
    const weightInput = document.getElementById(`edit-weight-${petId}`);
    
    const newAge = parseFloat(ageInput.value);
    const newWeight = parseFloat(weightInput.value);
    
    console.log('📊 New values:', { newAge, newWeight });
    
    // Validation
    if (isNaN(newAge) || newAge <= 0) {
        this.showAlert('Age must be greater than 0', 'danger');
        return;
    }
    
    if (isNaN(newWeight) || newWeight < 0) {
        this.showAlert('Weight cannot be negative', 'danger');
        return;
    }
    
    // Show loading state
    this.setButtonLoading(buttonElement, true);
    
    try {
        console.log('📤 Sending update request...');
        const response = await fetch(`/pets/${petId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ age: newAge, weight: newWeight })
        });
        
        console.log('📥 Response received, status:', response.status);
        const data = await response.json();
        console.log('📦 Response data:', data);
        
        if (response.ok && data.ok) {
            console.log('✅ Update successful, updating display...');
            this.updatePetDisplay(petId, newAge, newWeight);
            this.hideEditForm(petId, 'edit-form');
            this.showAlert('Pet details updated successfully!', 'success');
            
            // Optional: Reload the page to ensure all data is fresh
            setTimeout(() => {
                console.log('🔄 Reloading page to refresh data...');
                window.location.reload();
            }, 1000);
            
        } else {
            throw new Error(data.error || 'Unknown error from server');
        }
    } catch (error) {
        console.error('❌ Error updating pet:', error);
        this.showAlert('Error updating pet details: ' + error.message, 'danger');
    } finally {
        this.setButtonLoading(buttonElement, false);
    }
}

    async saveTaskEdit(taskId, buttonElement) {
        const titleInput = document.getElementById(`edit-task-title-${taskId}`);
        const descriptionInput = document.getElementById(`edit-task-description-${taskId}`);
        const dueDateInput = document.getElementById(`edit-task-due-date-${taskId}`);
        const prioritySelect = document.getElementById(`edit-task-priority-${taskId}`);
        
        const newTitle = titleInput.value.trim();
        const newDescription = descriptionInput.value.trim();
        const newDueDate = dueDateInput.value;
        const newPriority = prioritySelect.value;
        
        // Validation
        if (!newTitle) {
            alert('Title is required');
            return;
        }
        
        if (!newDueDate) {
            alert('Due date is required');
            return;
        }
        
        const dueDate = new Date(newDueDate);
        const now = new Date();
        
        if (dueDate < now) {
            alert('Due date cannot be in the past');
            return;
        }
        
        // Show loading state
        this.setButtonLoading(buttonElement, true);
        
        try {
            const response = await fetch(`/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newTitle,
                    description: newDescription,
                    due_date: newDueDate,
                    priority: newPriority
                })
            });
            
            const data = await response.json();
            
            if (data.ok) {
                this.updateTaskDisplay(taskId, newTitle, newDescription, newDueDate, newPriority);
                this.hideEditForm(taskId, 'edit-task-form');
                this.showAlert('Task updated successfully!', 'success');
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showAlert('Error updating task details', 'danger');
        } finally {
            this.setButtonLoading(buttonElement, false);
        }
    }

    setButtonLoading(button, isLoading) {
        if (isLoading) {
            button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
            button.disabled = true;
        } else {
            button.innerHTML = '<i class="bi bi-check"></i> Save';
            button.disabled = false;
        }
    }

    updatePetDisplay(petId, newAge, newWeight) {
    console.log('🔄 Updating pet display for pet ID:', petId);
    
    try {
        let ageDisplay;
        if (newAge < 1) {
            const months = Math.round(newAge * 12);
            ageDisplay = months + ' month' + (months !== 1 ? 's' : '');
        } else if (Number.isInteger(newAge)) {
            ageDisplay = newAge + ' years';
        } else {
            ageDisplay = newAge.toFixed(1) + ' years';
        }
        
        // Update age display - check if element exists first
        const ageElement = document.getElementById(`age-display-${petId}`);
        if (ageElement) {
            ageElement.textContent = ageDisplay;
            console.log('✅ Updated age display:', ageDisplay);
        } else {
            console.warn('⚠️ Age display element not found for pet ID:', petId);
        }
        
        // Update weight display - check if element exists first
        const weightElement = document.getElementById(`weight-display-${petId}`);
        if (weightElement) {
            weightElement.textContent = newWeight + ' kg';
            console.log('✅ Updated weight display:', newWeight + ' kg');
        } else {
            console.warn('⚠️ Weight display element not found for pet ID:', petId);
        }
        
    } catch (error) {
        console.error('❌ Error updating pet display:', error);
        // Don't throw the error, just log it
    }
}

    updateTaskDisplay(taskId, newTitle, newDescription, newDueDate, newPriority) {
    console.log('🔄 Updating task display for task:', taskId);
    
    try {
        // Find the task element using multiple selectors for better reliability
        let taskElement = document.querySelector(`[data-task-id="${taskId}"]`) ||
                         document.querySelector(`.list-group-item:has([data-task-id="${taskId}"])`) ||
                         document.querySelector(`.task-item[data-task-id="${taskId}"]`);
        
        if (!taskElement) {
            console.warn('❌ Task element not found for ID:', taskId);
            return;
        }

        // Update title - use more specific selector
        const titleElement = taskElement.querySelector('h5.mb-1');
        if (titleElement) {
            // Find the text node (first child) and update it
            const textNode = titleElement.firstChild;
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                textNode.textContent = newTitle;
            } else {
                // Fallback: update the entire content
                titleElement.textContent = newTitle;
            }
            console.log('✅ Updated title:', newTitle);
        }

        // Update priority badge - use more specific selector
        const priorityBadge = taskElement.querySelector('.badge.bg-danger, .badge.bg-warning, .badge.bg-info');
        if (priorityBadge) {
            // Remove all priority classes
            priorityBadge.classList.remove('bg-danger', 'bg-warning', 'bg-info', 'bg-secondary');
            
            // Add correct priority class
            const priorityClass = {
                'high': 'bg-danger',
                'medium': 'bg-warning', 
                'low': 'bg-info'
            }[newPriority] || 'bg-secondary';
            
            priorityBadge.classList.add(priorityClass);
            priorityBadge.textContent = newPriority;
            console.log('✅ Updated priority:', newPriority);
        }

        // Update due date - use more specific selector
        const dueDateSpan = taskElement.querySelector('.due-date');
        if (dueDateSpan) {
            // Remove data attribute approach and update text directly
            const formattedDate = new Date(newDueDate).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            dueDateSpan.textContent = formattedDate;
            console.log('✅ Updated due date:', formattedDate);
        }

        // Update description if it exists and there's a description element
        if (newDescription) {
            const descriptionElement = taskElement.querySelector('.task-description');
            if (descriptionElement) {
                const descriptionText = descriptionElement.querySelector('p');
                if (descriptionText) {
                    descriptionText.textContent = newDescription;
                    console.log('✅ Updated description');
                }
            }
        }

        console.log('✅ Task display updated successfully');

    } catch (error) {
        console.error('❌ Error updating task display:', error);
        // Don't throw the error, just log it and continue
    }
}

async saveTaskEdit(taskId, buttonElement) {
    console.log('💾 Saving task edit for:', taskId);
    
    const titleInput = document.getElementById(`edit-task-title-${taskId}`);
    const descriptionInput = document.getElementById(`edit-task-description-${taskId}`);
    const dueDateInput = document.getElementById(`edit-task-due-date-${taskId}`);
    const prioritySelect = document.getElementById(`edit-task-priority-${taskId}`);
    
    // Add null checks for inputs
    if (!titleInput || !dueDateInput || !prioritySelect) {
        this.showAlert('Error: Form elements not found', 'danger');
        return;
    }
    
    const newTitle = titleInput.value.trim();
    const newDescription = descriptionInput ? descriptionInput.value.trim() : '';
    const newDueDate = dueDateInput.value;
    const newPriority = prioritySelect.value;
    
    // Validation
    if (!newTitle) {
        this.showAlert('Title is required', 'danger');
        return;
    }
    
    if (!newDueDate) {
        this.showAlert('Due date is required', 'danger');
        return;
    }
    
    const dueDate = new Date(newDueDate);
    const now = new Date();
    
    if (dueDate < now) {
        this.showAlert('Due date cannot be in the past', 'danger');
        return;
    }
    
    // Show loading state
    this.setButtonLoading(buttonElement, true);
    
    try {
        const response = await fetch(`/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: newTitle,
                description: newDescription,
                due_date: newDueDate,
                priority: newPriority
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.ok) {
            this.updateTaskDisplay(taskId, newTitle, newDescription, newDueDate, newPriority);
            this.hideEditForm(taskId, 'edit-task-form');
            this.showAlert('Task updated successfully!', 'success');
        } else {
            throw new Error(data.error || 'Unknown error from server');
        }
    } catch (error) {
        console.error('❌ Error updating task:', error);
        this.showAlert('Error updating task: ' + error.message, 'danger');
    } finally {
        this.setButtonLoading(buttonElement, false);
    }
}

    showAlert(message, type) {
        // Remove existing alerts
        document.querySelectorAll('.alert-dashboard').forEach(alert => alert.remove());
        
        // Create new alert
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dashboard alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 1050; min-width: 300px;';
        alertDiv.innerHTML = `
            <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => alertDiv.remove(), 5000);
    }

    showSuccessMessage(message) {
        const successMessage = document.createElement('div');
        successMessage.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
        successMessage.style.zIndex = '1060';
        successMessage.innerHTML = `
            <strong>Success!</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        document.body.appendChild(successMessage);
    }
}


// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.dashboardManager = new DashboardManager();
});