// Enhanced Dashboard Functionality
class EnhancedDashboard {
    constructor() {
        this.init();
    }

    init() {
        // console.log('🚀 Enhanced Dashboard initialized');
        this.bindEvents();
        this.initializeFilterSystem();
        this.testEditButtons();
    }

    bindEvents() {
        // console.log('🔗 Binding events...');
        
        // Use event delegation for dynamic elements
        document.addEventListener('click', (e) => {
            // console.log('🎯 Click event on:', e.target);
            
            // Edit pet buttons
            if (e.target.closest('.edit-btn')) {
                const button = e.target.closest('.edit-btn');
                const petId = button.getAttribute('data-pet-id');
                // console.log('✏️ Edit pet button clicked:', petId);
                this.togglePetEditForm(petId);
            }

            // Save pet edit buttons
            if (e.target.closest('.save-edit-btn')) {
                const button = e.target.closest('.save-edit-btn');
                const petId = button.getAttribute('data-pet-id');
                // console.log('💾 Save pet edit button clicked:', petId);
                this.savePetEdit(petId, button);
            }

            // Cancel pet edit buttons
            if (e.target.closest('.cancel-edit-btn')) {
                const button = e.target.closest('.cancel-edit-btn');
                const petId = button.getAttribute('data-pet-id');
                // console.log('❌ Cancel pet edit button clicked:', petId);
                this.hidePetEditForm(petId);
            }

            // Edit task buttons - MORE SPECIFIC SELECTOR
            if (e.target.closest('.edit-task-btn')) {
                const button = e.target.closest('.edit-task-btn');
                const taskId = button.getAttribute('data-task-id');
                // console.log('✏️ Edit task button clicked:', taskId);
                // console.log('🔍 Button details:', {
                //     className: button.className,
                //     dataset: button.dataset,
                //     parentElement: button.parentElement?.className
                // });
                this.toggleTaskEditForm(taskId);
            }

            // Save task edit buttons
            if (e.target.closest('.save-task-edit-btn')) {
                const button = e.target.closest('.save-task-edit-btn');
                const taskId = button.getAttribute('data-task-id');
                console.log('💾 Save task edit button clicked:', taskId);
                this.saveTaskEdit(taskId, button);
            }

            // Cancel task edit buttons
            if (e.target.closest('.cancel-task-edit-btn')) {
                const button = e.target.closest('.cancel-task-edit-btn');
                const taskId = button.getAttribute('data-task-id');
                console.log('❌ Cancel task edit button clicked:', taskId);
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

    testEditButtons() {
        // console.log('🧪 Testing edit buttons...');
        
        // Test pet edit buttons
        const petEditButtons = document.querySelectorAll('.edit-btn');
        // console.log(`🐕 Found ${petEditButtons.length} pet edit buttons`);
        petEditButtons.forEach((btn, index) => {
            // console.log(`Pet Edit Button ${index + 1}:`, {
            //     class: btn.className,
            //     'data-pet-id': btn.getAttribute('data-pet-id'),
            //     exists: !!btn
            // });
        });

        // Test task edit buttons
        const taskEditButtons = document.querySelectorAll('.edit-task-btn');
        // console.log(`📝 Found ${taskEditButtons.length} task edit buttons`);
        taskEditButtons.forEach((btn, index) => {
            // console.log(`Task Edit Button ${index + 1}:`, {
            //     class: btn.className,
            //     'data-task-id': btn.getAttribute('data-task-id'),
            //     exists: !!btn,
            //     parent: btn.parentElement?.className,
            //     isVisible: btn.offsetParent !== null
            // });
        });

        // Test if task edit forms exist
        const taskEditForms = document.querySelectorAll('[id^="edit-task-form-"]');
        // console.log(`📋 Found ${taskEditForms.length} task edit forms`);
        taskEditForms.forEach((form, index) => {
            // console.log(`Task Edit Form ${index + 1}:`, {
            //     id: form.id,
            //     style: form.style.display,
            //     exists: !!form
            // });
        });
    }

    togglePetEditForm(petId) {
        // console.log('🔄 Toggling pet edit form for:', petId);
        const editForm = document.getElementById(`edit-form-${petId}`);
        
        if (!editForm) {
            console.error('❌ Edit form not found for pet:', petId);
            return;
        }

        // Hide all other pet edit forms
        document.querySelectorAll('[id^="edit-form-"]').forEach(form => {
            if (form.id !== `edit-form-${petId}`) {
                form.style.display = 'none';
            }
        });

        // Toggle current form
        if (editForm.style.display === 'block') {
            editForm.style.display = 'none';
            console.log('👻 Hid pet edit form');
        } else {
            editForm.style.display = 'block';
            console.log('👁️ Showed pet edit form');
            // Scroll to form
            editForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    hidePetEditForm(petId) {
        const editForm = document.getElementById(`edit-form-${petId}`);
        if (editForm) {
            editForm.style.display = 'none';
        }
    }

    toggleTaskEditForm(taskId) {
        console.log('🔄 Toggling task edit form for:', taskId);
        const editForm = document.getElementById(`edit-task-form-${taskId}`);
        
        if (!editForm) {
            console.error('❌ Edit form not found for task:', taskId);
            console.log('🔍 Available task edit forms:');
            document.querySelectorAll('[id^="edit-task-form-"]').forEach(form => {
                console.log(`- ${form.id}: display="${form.style.display}"`);
            });
            return;
        }

        console.log('📋 Task edit form found:', {
            id: editForm.id,
            currentDisplay: editForm.style.display,
            computedStyle: window.getComputedStyle(editForm).display
        });

        // Hide all other task edit forms
        document.querySelectorAll('[id^="edit-task-form-"]').forEach(form => {
            if (form.id !== `edit-task-form-${taskId}`) {
                form.style.display = 'none';
                console.log(`👻 Hid other form: ${form.id}`);
            }
        });

        // Toggle current form
        const isCurrentlyVisible = editForm.style.display === 'block';
        
        if (isCurrentlyVisible) {
            editForm.style.display = 'none';
            console.log('👻 Hid task edit form');
        } else {
            editForm.style.display = 'block';
            console.log('👁️ Showed task edit form');
            // Scroll to form
            editForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Double check the display property
        setTimeout(() => {
            console.log('✅ Final form state:', {
                id: editForm.id,
                display: editForm.style.display,
                computed: window.getComputedStyle(editForm).display
            });
        }, 100);
    }

    hideTaskEditForm(taskId) {
        const editForm = document.getElementById(`edit-task-form-${taskId}`);
        if (editForm) {
            editForm.style.display = 'none';
        }
    }

    async savePetEdit(petId, buttonElement) {
        console.log('💾 Saving pet edit for ID:', petId);
        
        const ageInput = document.getElementById(`edit-age-${petId}`);
        const weightInput = document.getElementById(`edit-weight-${petId}`);
        
        if (!ageInput || !weightInput) {
            this.showAlert('Error: Form elements not found', 'danger');
            return;
        }
        
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
                this.hidePetEditForm(petId);
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
        
        console.log('📥 Response status:', response.status);
        const data = await response.json();
        console.log('📦 Response data:', data);
        
        if (response.ok && data.ok) {
            this.updateTaskDisplay(taskId, newTitle, newDescription, newDueDate, newPriority);
            this.hideTaskEditForm(taskId);
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
            
            // Update age display
            const ageElement = document.getElementById(`age-display-${petId}`);
            if (ageElement) {
                ageElement.textContent = ageDisplay;
                console.log('✅ Updated age display:', ageDisplay);
            }
            
            // Update weight display
            const weightElement = document.getElementById(`weight-display-${petId}`);
            if (weightElement) {
                weightElement.textContent = newWeight + ' kg';
                console.log('✅ Updated weight display:', newWeight + ' kg');
            }
            
        } catch (error) {
            console.error('❌ Error updating pet display:', error);
        }
    }

    updateTaskDisplay(taskId, newTitle, newDescription, newDueDate, newPriority) {
    console.log('🔄 Updating task display for task:', taskId);
    
    try {
        // Find the task element - use a more specific selector
        let taskElement = document.querySelector(`.task-item-dark[data-task-id="${taskId}"]`) ||
                         document.querySelector(`.task-item-dark:has(button[data-task-id="${taskId}"])`) ||
                         document.querySelector(`.task-item-dark:has(.edit-task-btn[data-task-id="${taskId}"])`);
        
        if (!taskElement) {
            console.warn('❌ Task element not found for ID:', taskId);
            console.log('🔍 Available task elements:');
            document.querySelectorAll('.task-item-dark').forEach((task, index) => {
                const taskIdAttr = task.getAttribute('data-task-id');
                console.log(`Task ${index + 1}: data-task-id="${taskIdAttr}"`);
            });
            return;
        }

        console.log('✅ Found task element:', taskElement);

        // Update title
        const titleElement = taskElement.querySelector('.task-title-dark');
        if (titleElement) {
            titleElement.textContent = newTitle;
            console.log('✅ Updated title:', newTitle);
        } else {
            console.warn('❌ Title element not found');
        }

        // Update priority badge - fix the class names
        const priorityBadge = taskElement.querySelector('.badge-dark');
        if (priorityBadge) {
            // Remove all existing priority classes
            priorityBadge.className = 'badge-dark me-2'; // Reset to base classes
            
            // Add correct priority class based on the new priority
            const priorityClassMap = {
                'high': 'badge-danger',
                'medium': 'badge-warning', 
                'low': 'badge-success'
            };
            
            const newPriorityClass = priorityClassMap[newPriority];
            if (newPriorityClass) {
                priorityBadge.classList.add(newPriorityClass);
            }
            
            priorityBadge.textContent = newPriority;
            console.log('✅ Updated priority:', newPriority);
        } else {
            console.warn('❌ Priority badge not found');
        }

        // Update due date
        const dueDateSpan = taskElement.querySelector('.due-date');
        if (dueDateSpan) {
            const formattedDate = new Date(newDueDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            dueDateSpan.textContent = formattedDate;
            // Also update the data attribute if it exists
            dueDateSpan.setAttribute('data-due-date', newDueDate);
            console.log('✅ Updated due date:', formattedDate);
        } else {
            console.warn('❌ Due date span not found');
        }

        // Update description if it exists
        if (newDescription) {
            let descriptionElement = taskElement.querySelector('.task-description');
            if (!descriptionElement) {
                // If description element doesn't exist, create it
                const taskDetails = taskElement.querySelector('.task-details-dark');
                if (taskDetails) {
                    descriptionElement = document.createElement('small');
                    descriptionElement.className = 'task-description text-muted d-block mt-1';
                    taskDetails.appendChild(descriptionElement);
                }
            }
            if (descriptionElement) {
                descriptionElement.textContent = newDescription;
                console.log('✅ Updated description');
            }
        } else {
            // Remove description if it was cleared
            const descriptionElement = taskElement.querySelector('.task-description');
            if (descriptionElement) {
                descriptionElement.remove();
            }
        }

        console.log('✅ Task display updated successfully');

    } catch (error) {
        console.error('❌ Error updating task display:', error);
    }
}

    handleRemoveClick(button) {
        this.itemType = button.getAttribute('data-type');
        this.itemId = button.getAttribute('data-id');
        const itemName = button.getAttribute('data-name');
        
        console.log('Remove button clicked:', this.itemType, this.itemId, itemName);
        
        const message = `Are you sure you want to remove ${this.itemType === 'pet' ? 'pet' : 'task'} "${itemName}"? This action cannot be undone.`;
        document.getElementById('confirmationMessage').textContent = message;
        
        const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
        modal.show();
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

    initializeFilterSystem() {
        // Initialize the modern filter system
        if (typeof ModernFilterSystem !== 'undefined') {
            window.modernFilterSystem = new ModernFilterSystem();
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // console.log('📄 DOM fully loaded, initializing Enhanced Dashboard...');
    window.enhancedDashboard = new EnhancedDashboard();
});