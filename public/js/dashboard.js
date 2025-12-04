/**
 * DashboardManager - Central dashboard management system.
 * Coordinates pet and task management, filtering, session handling, and UI updates.
 */
class DashboardManager {
    constructor() {
        this.filterSystem = null;
        this.itemType = '';
        this.itemId = '';
        this.init();
    }

    /**
     * Initializes the dashboard manager.
     * Sets up session timeout, filter system, event bindings, and UI formatting.
     */
    init() {
        this.initializeSessionTimeout();
        this.initializeFilterSystem();
        this.bindEvents();
        this.formatDueDates();
        // console.log('🚀 Dashboard Manager initialized');
    }

    /**
     * Initializes session timeout management if available.
     */
    initializeSessionTimeout() {
        if (typeof SessionTimeout !== 'undefined') {
            window.sessionTimeout = new SessionTimeout();
        }
    }

    /**
     * Initializes the pet filter system.
     */
    initializeFilterSystem() {
        this.filterSystem = new PetFilterSystem();
    }

    /**
     * Binds all event listeners for dashboard functionality.
     */
    bindEvents() {
        this.setupRemoveButtons();
        this.setupSessionTimerReset();
        this.setupTaskDescriptionToggle();
        this.setupPetEditSystem();
        this.setupTaskEditSystem();
    }

    /**
     * Sets up remove button functionality with confirmation modal.
     * Uses event delegation for dynamically loaded content.
     */
    setupRemoveButtons() {
        document.addEventListener('click', (event) => {
            if (event.target.closest('.remove-btn')) {
                const button = event.target.closest('.remove-btn');
                this.itemType = button.getAttribute('data-type');
                this.itemId = button.getAttribute('data-id');
                const itemName = button.getAttribute('data-name');
                
                const message = `Are you sure you want to remove ${this.itemType === 'pet' ? 'pet' : 'task'} "${itemName}"? This action cannot be undone.`;
                document.getElementById('confirmationMessage').textContent = message;
                
                const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
                modal.show();
            }
        });
        
        document.getElementById('confirmRemoveBtn').addEventListener('click', () => {
            this.handleRemoveConfirmation();
        });
    }

    /**
     * Handles confirmation of item removal.
     * Sends DELETE request to server and handles response.
     */
    handleRemoveConfirmation() {
        if (this.itemType && this.itemId) {
            const removeBtn = document.getElementById('confirmRemoveBtn');
            const originalText = removeBtn.innerHTML;
            removeBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Removing...';
            removeBtn.disabled = true;
            
            fetch(`/${this.itemType}s/${this.itemId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            })
            .then(response => {
                if (response.ok) {
                    this.showSuccessMessage(`${this.itemType === 'pet' ? 'Pet' : 'Task'} has been removed successfully.`);
                    
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    this.showAlert('Error removing item. Please try again.', 'danger');
                    this.resetRemoveButton(removeBtn, originalText);
                }
            })
            .catch(error => {
                this.showAlert('Error removing item. Please try again.', 'danger');
                this.resetRemoveButton(removeBtn, originalText);
            });
        }
    }

    /**
     * Resets remove button to original state after operation.
     * 
     * @param {HTMLElement} button - Button element to reset
     * @param {string} originalText - Original button text content
     */
    resetRemoveButton(button, originalText) {
        button.innerHTML = originalText;
        button.disabled = false;
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirmationModal'));
        modal.hide();
    }

    /**
     * Sets up session timer reset on user interactions.
     * Prevents session timeout during active dashboard usage.
     */
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

    /**
     * Formats due dates for display throughout the dashboard.
     * Converts ISO date strings to localized readable format.
     */
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

    /**
     * Sets up task description toggle functionality.
     * Allows users to expand/collapse task descriptions.
     */
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

    /**
     * Toggles visibility of an element with icon animation.
     * 
     * @param {HTMLElement} element - Element to toggle visibility
     * @param {HTMLElement} icon - Icon element to animate
     * @param {string} closedClass - CSS class for closed state icon
     * @param {string} openClass - CSS class for open state icon
     */
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

    /**
     * Sets up pet edit system with event listeners.
     */
    setupPetEditSystem() {
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const petId = e.currentTarget.getAttribute('data-pet-id');
                this.toggleEditForm(petId, 'edit-form');
            });
        });

        document.querySelectorAll('.cancel-edit-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const petId = e.currentTarget.getAttribute('data-pet-id');
                this.hideEditForm(petId, 'edit-form');
            });
        });

        document.querySelectorAll('.save-edit-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const petId = e.currentTarget.getAttribute('data-pet-id');
                this.savePetEdit(petId, e.currentTarget);
            });
        });
    }

    /**
     * Sets up task edit system with event listeners.
     */
    setupTaskEditSystem() {
        document.querySelectorAll('.edit-task-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const taskId = e.currentTarget.getAttribute('data-task-id');
                this.toggleEditForm(taskId, 'edit-task-form');
            });
        });

        document.querySelectorAll('.cancel-task-edit-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const taskId = e.currentTarget.getAttribute('data-task-id');
                this.hideEditForm(taskId, 'edit-task-form');
            });
        });

        document.querySelectorAll('.save-task-edit-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const taskId = e.currentTarget.getAttribute('data-task-id');
                this.saveTaskEdit(taskId, e.currentTarget);
            });
        });
    }

    /**
     * Toggles visibility of an edit form.
     * 
     * @param {string} itemId - ID of the item being edited
     * @param {string} formPrefix - Form element ID prefix
     */
    toggleEditForm(itemId, formPrefix) {
        const editForm = document.getElementById(`${formPrefix}-${itemId}`);
        
        document.querySelectorAll(`[id^="${formPrefix}-"]`).forEach(form => {
            if (form.id !== `${formPrefix}-${itemId}`) {
                form.style.display = 'none';
            }
        });
        
        editForm.style.display = editForm.style.display === 'block' ? 'none' : 'block';
    }

    /**
     * Hides a specific edit form.
     * 
     * @param {string} itemId - ID of the item being edited
     * @param {string} formPrefix - Form element ID prefix
     */
    hideEditForm(itemId, formPrefix) {
        const editForm = document.getElementById(`${formPrefix}-${itemId}`);
        editForm.style.display = 'none';
    }

    /**
     * Saves pet edit changes to the server.
     * Validates input, sends PUT request, and updates UI on success.
     * 
     * @param {string} petId - ID of the pet to update
     * @param {HTMLElement} buttonElement - Save button element for loading state
     */
    async savePetEdit(petId, buttonElement) {
        const ageInput = document.getElementById(`edit-age-${petId}`);
        const weightInput = document.getElementById(`edit-weight-${petId}`);
        
        const newAge = parseFloat(ageInput.value);
        const newWeight = parseFloat(weightInput.value);
        
        if (isNaN(newAge) || newAge <= 0) {
            this.showAlert('Age must be greater than 0', 'danger');
            return;
        }
        
        if (isNaN(newWeight) || newWeight < 0) {
            this.showAlert('Weight cannot be negative', 'danger');
            return;
        }
        
        this.setButtonLoading(buttonElement, true);
        
        try {
            const response = await fetch(`/pets/${petId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ age: newAge, weight: newWeight })
            });
            
            const data = await response.json();
            
            if (response.ok && data.ok) {
                this.updatePetDisplay(petId, newAge, newWeight);
                this.hideEditForm(petId, 'edit-form');
                this.showAlert('Pet details updated successfully!', 'success');
                
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
                
            } else {
                throw new Error(data.error || 'Unknown error from server');
            }
        } catch (error) {
            // console.error('❌ Error updating pet:', error);
            this.showAlert('Error updating pet details: ' + error.message, 'danger');
        } finally {
            this.setButtonLoading(buttonElement, false);
        }
    }

    /**
     * Saves task edit changes to the server.
     * Validates input, sends PUT request, and updates UI on success.
     * 
     * @param {string} taskId - ID of the task to update
     * @param {HTMLElement} buttonElement - Save button element for loading state
     */
    async saveTaskEdit(taskId, buttonElement) {
        const titleInput = document.getElementById(`edit-task-title-${taskId}`);
        const descriptionInput = document.getElementById(`edit-task-description-${taskId}`);
        const dueDateInput = document.getElementById(`edit-task-due-date-${taskId}`);
        const prioritySelect = document.getElementById(`edit-task-priority-${taskId}`);
        
        if (!titleInput || !dueDateInput || !prioritySelect) {
            this.showAlert('Error: Form elements not found', 'danger');
            return;
        }
        
        const newTitle = titleInput.value.trim();
        const newDescription = descriptionInput ? descriptionInput.value.trim() : '';
        const newDueDate = dueDateInput.value;
        const newPriority = prioritySelect.value;
        
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
            // console.error('❌ Error updating task:', error);
            this.showAlert('Error updating task: ' + error.message, 'danger');
        } finally {
            this.setButtonLoading(buttonElement, false);
        }
    }

    /**
     * Sets loading state for a button.
     * 
     * @param {HTMLElement} button - Button element to update
     * @param {boolean} isLoading - Whether button should show loading state
     */
    setButtonLoading(button, isLoading) {
        if (isLoading) {
            button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
            button.disabled = true;
        } else {
            button.innerHTML = '<i class="bi bi-check"></i> Save';
            button.disabled = false;
        }
    }

    /**
     * Updates pet information in the UI after successful edit.
     * Formats age display and updates weight display.
     * 
     * @param {string} petId - ID of the updated pet
     * @param {number} newAge - Updated age value
     * @param {number} newWeight - Updated weight value
     */
    updatePetDisplay(petId, newAge, newWeight) {
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
            
            const ageElement = document.getElementById(`age-display-${petId}`);
            if (ageElement) {
                ageElement.textContent = ageDisplay;
            }
            
            const weightElement = document.getElementById(`weight-display-${petId}`);
            if (weightElement) {
                weightElement.textContent = newWeight + ' kg';
            }
            
        } catch (error) {
            // console.error('❌ Error updating pet display:', error);
        }
    }

    /**
     * Updates task information in the UI after successful edit.
     * Updates title, priority badge, due date, and description display.
     * 
     * @param {string} taskId - ID of the updated task
     * @param {string} newTitle - Updated task title
     * @param {string} newDescription - Updated task description
     * @param {string} newDueDate - Updated due date
     * @param {string} newPriority - Updated priority level
     */
    updateTaskDisplay(taskId, newTitle, newDescription, newDueDate, newPriority) {
        try {
            let taskElement = document.querySelector(`[data-task-id="${taskId}"]`) ||
                             document.querySelector(`.list-group-item:has([data-task-id="${taskId}"])`) ||
                             document.querySelector(`.task-item[data-task-id="${taskId}"]`);
            
            if (!taskElement) {
                return;
            }

            const titleElement = taskElement.querySelector('h5.mb-1');
            if (titleElement) {
                const textNode = titleElement.firstChild;
                if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                    textNode.textContent = newTitle;
                } else {
                    titleElement.textContent = newTitle;
                }
            }

            const priorityBadge = taskElement.querySelector('.badge.bg-danger, .badge.bg-warning, .badge.bg-info');
            if (priorityBadge) {
                priorityBadge.classList.remove('bg-danger', 'bg-warning', 'bg-info', 'bg-secondary');
                
                const priorityClass = {
                    'high': 'bg-danger',
                    'medium': 'bg-warning', 
                    'low': 'bg-info'
                }[newPriority] || 'bg-secondary';
                
                priorityBadge.classList.add(priorityClass);
                priorityBadge.textContent = newPriority;
            }

            const dueDateSpan = taskElement.querySelector('.due-date');
            if (dueDateSpan) {
                const formattedDate = new Date(newDueDate).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                dueDateSpan.textContent = formattedDate;
            }

            if (newDescription) {
                const descriptionElement = taskElement.querySelector('.task-description');
                if (descriptionElement) {
                    const descriptionText = descriptionElement.querySelector('p');
                    if (descriptionText) {
                        descriptionText.textContent = newDescription;
                    }
                }
            }

        } catch (error) {
            // console.error('❌ Error updating task display:', error);
        }
    }

    /**
     * Shows a temporary alert message.
     * 
     * @param {string} message - Alert message content
     * @param {string} type - Bootstrap alert type (success, danger, warning, info)
     */
    showAlert(message, type) {
        document.querySelectorAll('.alert-dashboard').forEach(alert => alert.remove());
        
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dashboard alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 1050; min-width: 300px;';
        alertDiv.innerHTML = `
            <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => alertDiv.remove(), 5000);
    }

    /**
     * Shows a success message alert.
     * 
     * @param {string} message - Success message content
     */
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

/**
 * Initializes the DashboardManager when the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', function() {
    window.dashboardManager = new DashboardManager();
});