class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.tasks = []; // Initialize as empty array
        this.init();
    }

    async init() {
        // console.log('🗓️ Calendar Manager initialized');
        await this.loadCalendarData();
        this.renderCalendar();
        this.bindEvents();
        this.setupTaskNotifications();
    }

    async loadCalendarData() {
    try {
        // console.log('📡 Fetching calendar data...');
        const response = await fetch('/tasks/calendar');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Ensure tasks is always an array
        this.tasks = Array.isArray(data) ? data : [];
        
        // console.log('📅 Loaded tasks for calendar:', this.tasks);
        
        this.renderCalendar();
    } catch (error) {
        // console.error('❌ Error loading calendar data:', error);
        this.tasks = []; // Ensure it's always an array
        this.renderCalendar(); // Render calendar even with empty data
    }
}

renderCalendar() {
   const calendarElement = document.getElementById('calendarDaysGrid'); // Changed this line
    if (!calendarElement) {
        console.error('❌ Calendar days grid element not found');
        return;
    }

    const month = this.currentDate.getMonth();
    const year = this.currentDate.getFullYear();
    
    // Update calendar header
    const monthYearElement = document.getElementById('calendarMonthYear');
    if (monthYearElement) {
        monthYearElement.textContent = 
            this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    // Generate calendar grid
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    let calendarHTML = '';

    // Calendar days only (headers are already in HTML)
    let dayCount = 1;
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 7; j++) {
            if (i === 0 && j < startingDay) {
                // Empty cells before first day
                calendarHTML += `<div class="calendar-day-card empty"></div>`;
            } else if (dayCount > daysInMonth) {
                // Empty cells after last day
                calendarHTML += `<div class="calendar-day-card empty"></div>`;
            } else {
                // Create date without timezone issues
                const currentDate = new Date(year, month, dayCount);
                const dateString = this.formatDateForComparison(currentDate);
                const dayTasks = this.getTasksForDate(dateString);
                
                const isToday = this.isToday(currentDate);
                const isSelected = this.isSelectedDate(currentDate);
                
                calendarHTML += `
                    <div class="calendar-day-card ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" 
                         data-date="${dateString}">
                        <div class="day-number">${dayCount}</div>
                        ${dayTasks.length > 0 ? `
                            <div class="task-indicators">
                                ${dayTasks.slice(0, 3).map(task => `
                                    <div class="task-indicator ${task.priority}" 
                                         title="${task.title} - ${task.pet_name}">
                                        <i class="bi bi-${this.getTaskIcon(task.task_type)}"></i>
                                    </div>
                                `).join('')}
                                ${dayTasks.length > 3 ? `<div class="more-tasks">+${dayTasks.length - 3}</div>` : ''}
                            </div>
                        ` : ''}
                    </div>
                `;
                dayCount++;
            }
        }
        
        if (dayCount > daysInMonth) break;
    }

    // Clear only the calendar days (keep the headers)
    const existingDayElements = calendarElement.querySelectorAll('.calendar-day-card, .calendar-day-card.empty');
    existingDayElements.forEach(el => el.remove());
    
    // Add the new calendar days
    calendarElement.innerHTML += calendarHTML;
    
    this.setupDayClickHandlers();
    
    // Hide loading spinner
    const loadingElement = document.getElementById('calendarLoading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
    
    // Show message if no tasks
    if (this.tasks.length === 0) {
        // Remove any existing empty state message
        const existingEmptyState = calendarElement.querySelector('.calendar-empty-state');
        if (existingEmptyState) {
            existingEmptyState.remove();
        }
        
        const noTasksMessage = document.createElement('div');
        noTasksMessage.className = 'calendar-empty-state';
        noTasksMessage.style.gridColumn = '1 / -1'; // Span all columns
        noTasksMessage.innerHTML = `
            <i class="bi bi-info-circle display-4 text-muted"></i>
            <p class="mt-3 text-muted">No upcoming tasks found.</p>
            <a href="/schedule-task" class="btn btn-primary mt-2">
                <i class="bi bi-plus-circle"></i> Schedule Your First Task
            </a>
        `;
        calendarElement.appendChild(noTasksMessage);
    } else {
        // Remove empty state message if tasks exist
        const existingEmptyState = calendarElement.querySelector('.calendar-empty-state');
        if (existingEmptyState) {
            existingEmptyState.remove();
        }
    }
}

// Add this helper method
formatDateForComparison(date) {
    // Format as YYYY-MM-DD without timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

getTasksForDate(dateString) {
    // Ensure this.tasks is always an array before using filter
    if (!Array.isArray(this.tasks)) {
        console.warn('⚠️ this.tasks is not an array:', this.tasks);
        return [];
    }
    
    return this.tasks.filter(task => {
        if (!task || !task.due_date) return false;
        
        try {
            // Simple fix: compare date strings directly
            const taskDate = new Date(task.due_date);
            const taskDateStr = taskDate.toISOString().split('T')[0];
            return taskDateStr === dateString;
        } catch (error) {
            console.error('❌ Error parsing task date:', error, task);
            return false;
        }
    });
}

    getTaskIcon(taskType) {
        const icons = {
            'feeding': 'cup-straw',
            'cleaning': 'bucket',
            'vaccination': 'syringe',
            'medication': 'capsule',
            'grooming': 'scissors',
            'vet_visit': 'hospital',
            'exercise': 'activity',
            'other': 'calendar-check'
        };
        return icons[taskType] || 'calendar-check';
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    isSelectedDate(date) {
        return this.selectedDate.toDateString() === date.toDateString();
    }

    bindEvents() {
        // Navigation
        const prevMonthBtn = document.getElementById('prevMonth');
        const nextMonthBtn = document.getElementById('nextMonth');
        const todayBtn = document.getElementById('todayBtn');
        const addEventBtn = document.getElementById('addCalendarEvent');

        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.renderCalendar();
            });
        }

        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.renderCalendar();
            });
        }

        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                this.currentDate = new Date();
                this.selectedDate = new Date();
                this.renderCalendar();
            });
        }

        if (addEventBtn) {
            addEventBtn.addEventListener('click', () => {
                window.location.href = '/schedule-task';
            });
        }
    }

    setupDayClickHandlers() {
    document.querySelectorAll('.calendar-day-card:not(.empty)').forEach(day => {
        day.addEventListener('click', () => {
            const dateString = day.getAttribute('data-date');
            this.selectedDate = new Date(dateString);
            this.renderCalendar();
            this.showDayTasks(dateString);
        });
    });
}

    showDayTasks(dateString) {
    const tasks = this.getTasksForDate(dateString);
    const modalBody = document.getElementById('dayTasksModalBody');
    const modalTitle = document.getElementById('dayTasksModalLabel');
    
    if (modalBody && modalTitle) {
        // FIX: Parse the date string without timezone conversion
        const [year, month, day] = dateString.split('-');
        const localDate = new Date(year, month - 1, day); // month is 0-indexed
        
        modalTitle.textContent = `Tasks for ${localDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })}`;

        if (tasks.length === 0) {
            modalBody.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-calendar-x text-muted" style="font-size: 3rem;"></i>
                    <p class="mt-3 text-muted">No tasks scheduled for this day</p>
                    <a href="/schedule-task" class="btn btn-primary mt-2">
                        <i class="bi bi-plus-circle"></i> Schedule Task
                    </a>
                </div>
            `;
        } else {
            modalBody.innerHTML = tasks.map(task => {
                // FIX: Also fix task date display
                const taskDate = new Date(task.due_date);
                const localTaskDate = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
                
                return `
                    <div class="task-item-calendar mb-3 p-3 border rounded">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <h6 class="mb-1">${task.title}</h6>
                                <p class="mb-1 text-muted small">
                                    <i class="bi bi-${this.getTaskIcon(task.task_type)} me-1"></i>
                                    ${task.task_type} • ${task.pet_name}
                                </p>
                                <p class="mb-0 small">
                                    <i class="bi bi-clock me-1"></i>
                                    ${taskDate.toLocaleTimeString('en-US', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                    })} • 
                                    ${localTaskDate.toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </p>
                            </div>
                            <span class="badge ${task.priority === 'high' ? 'bg-danger' : task.priority === 'medium' ? 'bg-warning' : 'bg-success'}">
                                ${task.priority}
                            </span>
                        </div>
                        ${task.description ? `<p class="mt-2 mb-0 small">${task.description}</p>` : ''}
                    </div>
                `;
            }).join('');
        }

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('dayTasksModal'));
        modal.show();
    }
}


    async setupTaskNotifications() {
        // Check for overdue tasks and show notifications
        if (!Array.isArray(this.tasks)) return;
        
        const overdueTasks = this.tasks.filter(task => {
            if (!task || !task.due_date) return false;
            
            try {
                const dueDate = new Date(task.due_date);
                return dueDate < new Date() && !task.completed;
            } catch (error) {
                return false;
            }
        });

        if (overdueTasks.length > 0) {
            this.showOverdueNotification(overdueTasks);
        }
    }

    showOverdueNotification(tasks) {
        const notification = document.createElement('div');
        notification.className = 'alert alert-warning alert-dismissible fade show position-fixed top-0 end-0 m-3';
        notification.style.zIndex = '1060';
        notification.innerHTML = `
            <i class="bi bi-exclamation-triangle me-2"></i>
            <strong>${tasks.length} overdue task${tasks.length > 1 ? 's' : ''}</strong>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            <div class="mt-2">
                <a href="/task-overview" class="btn btn-sm btn-outline-warning">View Tasks</a>
            </div>
        `;
        document.body.appendChild(notification);
    }
}

// Initialize calendar when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // console.log('📄 DOM loaded, initializing calendar...');
    window.calendarManager = new CalendarManager();
});