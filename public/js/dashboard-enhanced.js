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
                // console.log('💾 Save task edit button clicked:', taskId);
                this.saveTaskEdit(taskId, button);
            }

            // Cancel task edit buttons
            if (e.target.closest('.cancel-task-edit-btn')) {
                const button = e.target.closest('.cancel-task-edit-btn');
                const taskId = button.getAttribute('data-task-id');
                // console.log('❌ Cancel task edit button clicked:', taskId);
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
            // console.error('❌ Edit form not found for pet:', petId);
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
            // console.log('👻 Hid pet edit form');
        } else {
            editForm.style.display = 'block';
            // console.log('👁️ Showed pet edit form');
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
        // console.log('🔄 Toggling task edit form for:', taskId);
        const editForm = document.getElementById(`edit-task-form-${taskId}`);
        
        if (!editForm) {
            // console.error('❌ Edit form not found for task:', taskId);
            // console.log('🔍 Available task edit forms:');
            document.querySelectorAll('[id^="edit-task-form-"]').forEach(form => {
                // console.log(`- ${form.id}: display="${form.style.display}"`);
            });
            return;
        }

        // console.log('📋 Task edit form found:', {
        //     id: editForm.id,
        //     currentDisplay: editForm.style.display,
        //     computedStyle: window.getComputedStyle(editForm).display
        // });

        // Hide all other task edit forms
        document.querySelectorAll('[id^="edit-task-form-"]').forEach(form => {
            if (form.id !== `edit-task-form-${taskId}`) {
                form.style.display = 'none';
                // console.log(`👻 Hid other form: ${form.id}`);
            }
        });

        // Toggle current form
        const isCurrentlyVisible = editForm.style.display === 'block';
        
        if (isCurrentlyVisible) {
            editForm.style.display = 'none';
            // console.log('👻 Hid task edit form');
        } else {
            editForm.style.display = 'block';
            // console.log('👁️ Showed task edit form');
            // Scroll to form
            editForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Double check the display property
        setTimeout(() => {
            // console.log('✅ Final form state:', {
            //     id: editForm.id,
            //     display: editForm.style.display,
            //     computed: window.getComputedStyle(editForm).display
            // });
        }, 100);
    }

    hideTaskEditForm(taskId) {
        const editForm = document.getElementById(`edit-task-form-${taskId}`);
        if (editForm) {
            editForm.style.display = 'none';
        }
    }

    async savePetEdit(petId, buttonElement) {
        // console.log('💾 Saving pet edit for ID:', petId);
        
        const ageInput = document.getElementById(`edit-age-${petId}`);
        const weightInput = document.getElementById(`edit-weight-${petId}`);
        
        if (!ageInput || !weightInput) {
            this.showAlert('Error: Form elements not found', 'danger');
            return;
        }
        
        const newAge = parseFloat(ageInput.value);
        const newWeight = parseFloat(weightInput.value);
        
        // console.log('📊 New values:', { newAge, newWeight });
        
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
            // console.log('📤 Sending update request...');
            const response = await fetch(`/pets/${petId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ age: newAge, weight: newWeight })
            });
            
            // console.log('📥 Response received, status:', response.status);
            const data = await response.json();
            // console.log('📦 Response data:', data);
            
            if (response.ok && data.ok) {
                // console.log('✅ Update successful, updating display...');
                this.updatePetDisplay(petId, newAge, newWeight);
                this.hidePetEditForm(petId);
                this.showAlert('Pet details updated successfully!', 'success');
                
                // Optional: Reload the page to ensure all data is fresh
                setTimeout(() => {
                    // console.log('🔄 Reloading page to refresh data...');
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


    updatePetDisplay(petId, newAge, newWeight) {
        // console.log('🔄 Updating pet display for pet ID:', petId);
        
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
                // console.log('✅ Updated age display:', ageDisplay);
            }
            
            // Update weight display
            const weightElement = document.getElementById(`weight-display-${petId}`);
            if (weightElement) {
                weightElement.textContent = newWeight + ' kg';
                // console.log('✅ Updated weight display:', newWeight + ' kg');
            }
            
        } catch (error) {
            // console.error('❌ Error updating pet display:', error);
        }
    }

  

    handleRemoveClick(button) {
        this.itemType = button.getAttribute('data-type');
        this.itemId = button.getAttribute('data-id');
        const itemName = button.getAttribute('data-name');
        
        // console.log('Remove button clicked:', this.itemType, this.itemId, itemName);
        
        const message = `Are you sure you want to remove ${this.itemType === 'pet' ? 'pet' : 'task'} "${itemName}"? This action cannot be undone.`;
        document.getElementById('confirmationMessage').textContent = message;
        
        const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
        modal.show();
    }



















  // In dashboard-enhanced.js, update the saveTaskEdit function:

async saveTaskEdit(taskId, buttonElement) {
  // console.log('💾 Saving task edit for task ID:', taskId);
  
  // Get form elements
  const titleInput = document.getElementById(`edit-task-title-${taskId}`);
  const descriptionInput = document.getElementById(`edit-task-description-${taskId}`);
  const startTimeInput = document.getElementById(`edit-task-start-time-${taskId}`); // Changed from due_date
  const prioritySelect = document.getElementById(`edit-task-priority-${taskId}`);
  
  // Validate form elements exist
  if (!titleInput || !startTimeInput || !prioritySelect) {
    this.showAlert('Error: Form elements not found', 'danger');
    return;
  }
  
  // Get values
  const newTitle = titleInput.value.trim();
  const newDescription = descriptionInput ? descriptionInput.value.trim() : '';
  const newStartTime = startTimeInput.value; // Changed from due_date
  const newPriority = prioritySelect.value;
  
  // Basic validation
  if (!newTitle) {
    this.showAlert('Title is required', 'danger');
    return;
  }
  
  if (!newStartTime) {
    this.showAlert('Start time is required', 'danger');
    return;
  }
  
  // ADD VALIDATION: Start time must be in the future
  const selectedDate = new Date(newStartTime);
  const now = new Date();
  
  // Add 15 minute buffer for any timezone/server differences
  const bufferMinutes = 15;
  const bufferMs = bufferMinutes * 60 * 1000;
  
  // Check if selected date is in the future (with buffer)
  if (selectedDate.getTime() <= (now.getTime() - bufferMs)) {
    // this.showAlert(`Start time must be in the future (allowing ${bufferMinutes} minutes for timezone differences)`, 'danger');
    
    // Show feedback on the input field
    startTimeInput.classList.add('is-invalid');
    const feedback = document.getElementById(`start-time-feedback-${taskId}`);
    if (feedback) {
      feedback.style.display = 'block';
    }
    return;
  }
  
  // Show loading state
  this.setButtonLoading(buttonElement, true);
  
  try {
    // console.log('📤 Sending task update to server...');
    // console.log('📝 Task data:', { 
    //   taskId, 
    //   title: newTitle, 
    //   start_time: newStartTime, // Changed from due_date
    //   priority: newPriority 
    // });
    
    const response = await fetch(`/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        title: newTitle,
        description: newDescription,
        due_date: newStartTime, // Using start_time as due_date
        priority: newPriority
      })
    });
    

        
        // console.log('📥 Response status:', response.status);
        const data = await response.json();
        // console.log('📦 Response data:', data);
        
     if (response.ok && data.ok) {
    // Success - update UI immediately
    this.showAlert('Task updated successfully!', 'success');
    
    // Hide the edit form
    this.hideTaskEditForm(taskId);
    
    // Update the UI with the new data - using newStartTime (which is the due_date)
    this.updateTaskDisplay(taskId, newTitle, newDescription, newStartTime, newPriority);
    
    // Optional: Fetch fresh data from server to ensure consistency
    // You can enable this if you want to double-check with server
    // await this.verifyTaskWithServer(taskId, newTitle, newDescription, newStartTime, newPriority);
    
    // Refresh notifications immediately
    this.refreshNotificationSystem();
    
} else {
    // Server returned an error
    const errorMsg = data.error || `Server error: ${response.status}`;
    throw new Error(errorMsg);
}
        
    } catch (error) {
        // console.error('❌ Error updating task:', error);
        
        let errorMessage = 'Error updating task. Please try again.';
        
        // Handle specific error cases
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
        
        // Keep the edit form open so user can fix the issue
        // Don't hide it on error
        
    } finally {
        // Always reset button state
        this.setButtonLoading(buttonElement, false);
    }
}




refreshNotificationSystem() {
    // Trigger notification check
    if (typeof window.notificationWorker !== 'undefined') {
        window.notificationWorker.checkNow();
    }
    
    // Update notification badge if exists
    this.updateNotificationBadge();
}

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

// Also update your updateTaskDisplay method to ensure it updates the task-details correctly:
updateTaskDisplay(taskId, newTitle, newDescription, newDueDate, newPriority) {
    // console.log('🔄 Updating task display for task:', taskId);
    
    try {
        // Find the task element
        let taskElement = document.querySelector(`.task-item[data-id="${taskId}"]`) ||
                         document.querySelector(`.task-item-dark[data-task-id="${taskId}"]`) ||
                         document.querySelector(`.task-item:has(button[data-task-id="${taskId}"])`);
        
        if (!taskElement) {
            // console.warn('❌ Task element not found for ID:', taskId);
            return;
        }

        // console.log('✅ Found task element:', taskElement);

        // Update data attributes for detail view
        taskElement.setAttribute('data-due-date', newDueDate);
        taskElement.setAttribute('data-priority', newPriority);
        
        // Update title
        const titleElement = taskElement.querySelector('.task-title, .task-title-dark');
        if (titleElement) {
            titleElement.textContent = newTitle;
        }

        // Update priority badge
        const priorityBadge = taskElement.querySelector('.badge, .badge-dark');
        if (priorityBadge) {
            // Reset classes
            priorityBadge.className = 'badge me-2';
            
            // Add appropriate class
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

        // Update due date in the display
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
                
                // Update data attribute
                dueDateSpan.setAttribute('data-due-date', newDueDate);
            } catch (dateError) {
                dueDateSpan.textContent = newDueDate;
            }
        }

        // Update task details section - THIS IS CRITICAL
        const taskDetails = taskElement.querySelector('.task-details, .task-details-dark');
        if (taskDetails) {
            // Extract pet name from existing details or use data attribute
            let petName = 'Unknown';
            
            // Try to get pet name from the existing HTML
            const currentText = taskDetails.textContent;
            const forIndex = currentText.indexOf('For:');
            const petEndIndex = currentText.indexOf('•');
            
            if (forIndex !== -1 && petEndIndex !== -1) {
                petName = currentText.substring(forIndex + 4, petEndIndex).trim();
            }
            
            // Format the new date
            const formattedDate = new Date(newDueDate).toLocaleString();
            
            // Update the text content - this is what the detail view reads
            taskDetails.textContent = `For: ${petName} • Starts: ${formattedDate}`;
            
            // Update description
            if (newDescription) {
                let descriptionElement = taskElement.querySelector('.task-description');
                if (!descriptionElement) {
                    descriptionElement = document.createElement('small');
                    descriptionElement.className = 'task-description text-muted d-block mt-1';
                    // Insert after task-details
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

        // console.log('✅ Task display updated successfully');
        
        // Force a style update to ensure changes are visible
        taskElement.style.display = 'none';
        taskElement.offsetHeight; // Trigger reflow
        taskElement.style.display = 'flex';

    } catch (error) {
        // console.error('❌ Error updating task display:', error);
    }
}

    handleRemoveConfirmation() {
        // console.log('Confirm remove button clicked');
        if (this.itemType && this.itemId) {
            // console.log(`Sending DELETE request to /${this.itemType}s/${this.itemId}`);
            
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
                // console.log('Response received:', response.status, response.statusText);
                if (response.ok) {
                    // console.log('Delete successful');
                    this.showSuccessMessage(`${this.itemType === 'pet' ? 'Pet' : 'Task'} has been removed successfully.`);
                    
                    // Reload the page after a short delay
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    // console.error('Delete failed:', response.status);
                    this.showAlert('Error removing item. Please try again.', 'danger');
                    this.resetRemoveButton(removeBtn, originalText);
                }
            })
            .catch(error => {
                // console.error('Fetch error:', error);
                this.showAlert('Error removing item. Please try again.', 'danger');
                this.resetRemoveButton(removeBtn, originalText);
            });
        } else {
            // console.error('Missing itemType or itemId');
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