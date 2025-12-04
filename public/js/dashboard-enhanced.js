/**
 * EnhancedDashboard - Provides advanced dashboard functionality for managing pets and tasks.
 * Features include in-line editing, deletion with confirmation, and real-time updates.
 */
class EnhancedDashboard {
    constructor() {
        this.itemType = null;
        this.itemId = null;
        this.init();
    }

    /**
     * Initializes the dashboard.
     * Binds event listeners, initializes filter system, and tests edit button functionality.
     */
    init() {
        this.bindEvents();
        this.initializeFilterSystem();
        this.testEditButtons();
    }

    /**
     * Binds event listeners using event delegation for dynamic elements.
     * Handles clicks for edit, save, cancel, and remove operations.
     */
    bindEvents() {
        document.addEventListener('click', (e) => {
            // Edit pet buttons
            if (e.target.closest('.edit-btn')) {
                const button = e.target.closest('.edit-btn');
                const petId = button.getAttribute('data-pet-id');
                this.togglePetEditForm(petId);
            }

            // Save pet edit buttons
            if (e.target.closest('.save-edit-btn')) {
                const button = e.target.closest('.save-edit-btn');
                const petId = button.getAttribute('data-pet-id');
                this.savePetEdit(petId, button);
            }

            // Cancel pet edit buttons
            if (e.target.closest('.cancel-edit-btn')) {
                const button = e.target.closest('.cancel-edit-btn');
                const petId = button.getAttribute('data-pet-id');
                this.hidePetEditForm(petId);
            }

            // Edit task buttons
            if (e.target.closest('.edit-task-btn')) {
                const button = e.target.closest('.edit-task-btn');
                const taskId = button.getAttribute('data-task-id');
                this.toggleTaskEditForm(taskId);
            }

            // Save task edit buttons
            if (e.target.closest('.save-task-edit-btn')) {
                const button = e.target.closest('.save-task-edit-btn');
                const taskId = button.getAttribute('data-task-id');
                this.saveTaskEdit(taskId, button);
            }

            // Cancel task edit buttons
            if (e.target.closest('.cancel-task-edit-btn')) {
                const button = e.target.closest('.cancel-task-edit-btn');
                const taskId = button.getAttribute('data-task-id');
                this.hideTaskEditForm(taskId);
            }

            // Remove buttons
            if (e.target.closest('.remove-btn')) {
                const button = e.target.closest('.remove-btn');
                this.handleRemoveClick(button);
            }
        });

        // Confirm remove button
        document.getElementById('confirmRemoveBtn')?.addEventListener('click', () => {
            this.handleRemoveConfirmation();
        });
    }

    /**
     * Tests edit button functionality and logs diagnostic information.
     * Useful for debugging button visibility and functionality issues.
     */
    testEditButtons() {
        const petEditButtons = document.querySelectorAll('.edit-btn');
        const taskEditButtons = document.querySelectorAll('.edit-task-btn');
        const taskEditForms = document.querySelectorAll('[id^="edit-task-form-"]');
        
        // console.log(`Found ${petEditButtons.length} pet edit buttons, ${taskEditButtons.length} task edit buttons, ${taskEditForms.length} task edit forms`);
    }

    /**
     * Toggles the visibility of a pet edit form.
     * Hides all other pet edit forms when showing one.
     * 
     * @param {string} petId - ID of the pet whose edit form to toggle
     */
    togglePetEditForm(petId) {
        const editForm = document.getElementById(`edit-form-${petId}`);
        
        if (!editForm) {
            // console.error('❌ Edit form not found for pet:', petId);
            return;
        }

        document.querySelectorAll('[id^="edit-form-"]').forEach(form => {
            if (form.id !== `edit-form-${petId}`) {
                form.style.display = 'none';
            }
        });

        if (editForm.style.display === 'block') {
            editForm.style.display = 'none';
        } else {
            editForm.style.display = 'block';
            editForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /**
     * Hides a specific pet edit form.
     * 
     * @param {string} petId - ID of the pet whose edit form to hide
     */
    hidePetEditForm(petId) {
        const editForm = document.getElementById(`edit-form-${petId}`);
        if (editForm) {
            editForm.style.display = 'none';
        }
    }

    /**
     * Toggles the visibility of a task edit form.
     * Hides all other task edit forms when showing one.
     * 
     * @param {string} taskId - ID of the task whose edit form to toggle
     */
    toggleTaskEditForm(taskId) {
        const editForm = document.getElementById(`edit-task-form-${taskId}`);
        
        if (!editForm) {
            // console.error('❌ Edit form not found for task:', taskId);
            return;
        }

        document.querySelectorAll('[id^="edit-task-form-"]').forEach(form => {
            if (form.id !== `edit-task-form-${taskId}`) {
                form.style.display = 'none';
            }
        });

        const isCurrentlyVisible = editForm.style.display === 'block';
        
        if (isCurrentlyVisible) {
            editForm.style.display = 'none';
        } else {
            editForm.style.display = 'block';
            editForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /**
     * Hides a specific task edit form.
     * 
     * @param {string} taskId - ID of the task whose edit form to hide
     */
    hideTaskEditForm(taskId) {
        const editForm = document.getElementById(`edit-task-form-${taskId}`);
        if (editForm) {
            editForm.style.display = 'none';
        }
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
        
        if (!ageInput || !weightInput) {
            this.showAlert('Error: Form elements not found', 'danger');
            return;
        }
        
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
                this.hidePetEditForm(petId);
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
     * Handles click on remove button.
     * Shows confirmation modal with item-specific message.
     * 
     * @param {HTMLElement} button - Remove button that was clicked
     */
    handleRemoveClick(button) {
        this.itemType = button.getAttribute('data-type');
        this.itemId = button.getAttribute('data-id');
        const itemName = button.getAttribute('data-name');
        
        const message = `Are you sure you want to remove ${this.itemType === 'pet' ? 'pet' : 'task'} "${itemName}"? This action cannot be undone.`;
        document.getElementById('confirmationMessage').textContent = message;
        
        const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
        modal.show();
    }

    /**
     * Saves task edit changes to the server.
     * Validates input (including future date requirement), sends PUT request, and updates UI.
     * 
     * @param {string} taskId - ID of the task to update
     * @param {HTMLElement} buttonElement - Save button element for loading state
     */
    async saveTaskEdit(taskId, buttonElement) {
        const titleInput = document.getElementById(`edit-task-title-${taskId}`);
        const descriptionInput = document.getElementById(`edit-task-description-${taskId}`);
        const startTimeInput = document.getElementById(`edit-task-start-time-${taskId}`);
        const prioritySelect = document.getElementById(`edit-task-priority-${taskId}`);
        
        if (!titleInput || !startTimeInput || !prioritySelect) {
            this.showAlert('Error: Form elements not found', 'danger');
            return;
        }
        
        const newTitle = titleInput.value.trim();
        const newDescription = descriptionInput ? descriptionInput.value.trim() : '';
        const newStartTime = startTimeInput.value;
        const newPriority = prioritySelect.value;
        
        if (!newTitle) {
            this.showAlert('Title is required', 'danger');
            return;
        }
        
        if (!newStartTime) {
            this.showAlert('Start time is required', 'danger');
            return;
        }
        
        const selectedDate = new Date(newStartTime);
        const now = new Date();
        const bufferMinutes = 15;
        const bufferMs = bufferMinutes * 60 * 1000;
        
        if (selectedDate.getTime() <= (now.getTime() - bufferMs)) {
            startTimeInput.classList.add('is-invalid');
            const feedback = document.getElementById(`start-time-feedback-${taskId}`);
            if (feedback) {
                feedback.style.display = 'block';
            }
            return;
        }
        
        this.setButtonLoading(buttonElement, true);
        
        try {
            const response = await fetch(`/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    title: newTitle,
                    description: newDescription,
                    due_date: newStartTime,
                    priority: newPriority
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.ok) {
                this.showAlert('Task updated successfully!', 'success');
                this.hideTaskEditForm(taskId);
                this.updateTaskDisplay(taskId, newTitle, newDescription, newStartTime, newPriority);
                this.refreshNotificationSystem();
            } else {
                const errorMsg = data.error || `Server error: ${response.status}`;
                throw new Error(errorMsg);
            }
        } catch (error) {
            let errorMessage = 'Error updating task. Please try again.';
            
            if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = 'Network error. Please check your connection.';
            } else if (error.message.includes('validation')) {
                errorMessage = 'Validation error: ' + error.message;
            } else if (error.message.includes('permission') || error.message.includes('access')) {
                errorMessage = 'You do not have permission to edit this task.';
            } else {
                errorMessage = error.message || errorMessage;
            }
            
            this.showAlert(errorMessage, 'danger');
        } finally {
            this.setButtonLoading(buttonElement, false);
        }
    }

    /**
     * Refreshes the notification system and updates notification badge.
     * Triggers immediate notification check and updates UI badge count.
     */
    refreshNotificationSystem() {
        if (typeof window.notificationWorker !== 'undefined') {
            window.notificationWorker.checkNow();
        }
        this.updateNotificationBadge();
    }

    /**
     * Updates the notification badge count by fetching from server.
     * Hides badge if there are no unread notifications.
     */
    async updateNotificationBadge() {
        try {
            const response = await fetch('/notifications/unread-count');
            if (response.ok) {
                const data = await response.json();
                const badge = document.querySelector('.notification-count');
                if (badge && data.count > 0) {
                    badge.textContent = data.count;
                    badge.style.display = 'inline-block';
                } else if (badge) {
                    badge.style.display = 'none';
                }
            }
        } catch (error) {
            // console.error('Error updating notification badge:', error);
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
            let taskElement = document.querySelector(`.task-item[data-id="${taskId}"]`) ||
                             document.querySelector(`.task-item-dark[data-task-id="${taskId}"]`) ||
                             document.querySelector(`.task-item:has(button[data-task-id="${taskId}"])`);
            
            if (!taskElement) {
                return;
            }

            taskElement.setAttribute('data-due-date', newDueDate);
            taskElement.setAttribute('data-priority', newPriority);
            
            const titleElement = taskElement.querySelector('.task-title, .task-title-dark');
            if (titleElement) {
                titleElement.textContent = newTitle;
            }

            const priorityBadge = taskElement.querySelector('.badge, .badge-dark');
            if (priorityBadge) {
                priorityBadge.className = 'badge me-2';
                
                const priorityClasses = {
                    'high': 'badge-danger',
                    'medium': 'badge-warning',
                    'low': 'badge-success'
                };
                
                if (priorityClasses[newPriority]) {
                    priorityBadge.classList.add(priorityClasses[newPriority]);
                }
                
                priorityBadge.textContent = newPriority.charAt(0).toUpperCase() + newPriority.slice(1);
            }

            const dueDateSpan = taskElement.querySelector('.due-date');
            if (dueDateSpan) {
                try {
                    const formattedDate = new Date(newDueDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    dueDateSpan.textContent = formattedDate;
                    dueDateSpan.setAttribute('data-due-date', newDueDate);
                } catch (dateError) {
                    dueDateSpan.textContent = newDueDate;
                }
            }

            const taskDetails = taskElement.querySelector('.task-details, .task-details-dark');
            if (taskDetails) {
                let petName = 'Unknown';
                const currentText = taskDetails.textContent;
                const forIndex = currentText.indexOf('For:');
                const petEndIndex = currentText.indexOf('•');
                
                if (forIndex !== -1 && petEndIndex !== -1) {
                    petName = currentText.substring(forIndex + 4, petEndIndex).trim();
                }
                
                const formattedDate = new Date(newDueDate).toLocaleString();
                taskDetails.textContent = `For: ${petName} • Starts: ${formattedDate}`;
                
                if (newDescription) {
                    let descriptionElement = taskElement.querySelector('.task-description');
                    if (!descriptionElement) {
                        descriptionElement = document.createElement('small');
                        descriptionElement.className = 'task-description text-muted d-block mt-1';
                        taskDetails.parentNode.insertBefore(descriptionElement, taskDetails.nextSibling);
                    }
                    descriptionElement.textContent = newDescription;
                } else {
                    const descriptionElement = taskElement.querySelector('.task-description');
                    if (descriptionElement) {
                        descriptionElement.remove();
                    }
                }
            }

            taskElement.style.display = 'none';
            taskElement.offsetHeight;
            taskElement.style.display = 'flex';

        } catch (error) {
            // console.error('❌ Error updating task display:', error);
        }
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
            if (button.classList.contains('save-edit-btn')) {
                button.innerHTML = '<i class="bi bi-check"></i> Save';
            } else if (button.classList.contains('save-task-edit-btn')) {
                button.innerHTML = '<i class="bi bi-check"></i> Save';
            }
            button.disabled = false;
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

    /**
     * Initializes the modern filter system if available.
     */
    initializeFilterSystem() {
        if (typeof ModernFilterSystem !== 'undefined') {
            window.modernFilterSystem = new ModernFilterSystem();
        }
    }
}

/**
 * Initializes the Enhanced Dashboard when the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', function() {
    window.enhancedDashboard = new EnhancedDashboard();
});