/**
 * CalendarManager - Manages interactive calendar functionality for pet care tasks.
 * Handles calendar rendering, task display, date navigation, and task notifications.
 */
class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.tasks = [];
        this.init();
    }

    /**
     * Initializes the calendar manager.
     * Loads calendar data, renders the calendar, binds events, and sets up notifications.
     */
    async init() {
        await this.loadCalendarData();
        this.renderCalendar();
        this.bindEvents();
        this.setupTaskNotifications();
    }

    /**
     * Loads task data for the calendar from the server.
     * Handles errors gracefully and ensures tasks array is always valid.
     */
    async loadCalendarData() {
        try {
            const response = await fetch('/tasks/calendar');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.tasks = Array.isArray(data) ? data : [];
            this.renderCalendar();
        } catch (error) {
            // console.error('❌ Error loading calendar data:', error);
            this.tasks = [];
            this.renderCalendar();
        }
    }

    /**
     * Renders the calendar grid with days, task indicators, and navigation.
     * Updates calendar header, generates day grid with task indicators, and handles empty states.
     */
    renderCalendar() {
        const calendarElement = document.getElementById('calendarDaysGrid');
        if (!calendarElement) {
            // console.error('❌ Calendar days grid element not found');
            return;
        }

        const month = this.currentDate.getMonth();
        const year = this.currentDate.getFullYear();
        
        const monthYearElement = document.getElementById('calendarMonthYear');
        if (monthYearElement) {
            monthYearElement.textContent = 
                this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        let calendarHTML = '';
        let dayCount = 1;
        
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 7; j++) {
                if (i === 0 && j < startingDay) {
                    calendarHTML += `<div class="calendar-day-card empty"></div>`;
                } else if (dayCount > daysInMonth) {
                    calendarHTML += `<div class="calendar-day-card empty"></div>`;
                } else {
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

        const existingDayElements = calendarElement.querySelectorAll('.calendar-day-card, .calendar-day-card.empty');
        existingDayElements.forEach(el => el.remove());
        
        calendarElement.innerHTML += calendarHTML;
        
        this.setupDayClickHandlers();
        
        const loadingElement = document.getElementById('calendarLoading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        if (this.tasks.length === 0) {
            const existingEmptyState = calendarElement.querySelector('.calendar-empty-state');
            if (existingEmptyState) {
                existingEmptyState.remove();
            }
            
            const noTasksMessage = document.createElement('div');
            noTasksMessage.className = 'calendar-empty-state';
            noTasksMessage.style.gridColumn = '1 / -1';
            noTasksMessage.innerHTML = `
                <i class="bi bi-info-circle display-4 text-muted"></i>
                <p class="mt-3 text-muted">No upcoming tasks found.</p>
                <a href="/schedule-task" class="btn btn-primary mt-2">
                    <i class="bi bi-plus-circle"></i> Schedule Your First Task
                </a>
            `;
            calendarElement.appendChild(noTasksMessage);
        } else {
            const existingEmptyState = calendarElement.querySelector('.calendar-empty-state');
            if (existingEmptyState) {
                existingEmptyState.remove();
            }
        }
    }

    /**
     * Formats a Date object to YYYY-MM-DD string for consistent comparison.
     * Avoids timezone issues by using local date components.
     * 
     * @param {Date} date - Date object to format
     * @returns {string} Formatted date string (YYYY-MM-DD)
     */
    formatDateForComparison(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Retrieves tasks scheduled for a specific date.
     * 
     * @param {string} dateString - Date in YYYY-MM-DD format
     * @returns {Array} Array of tasks for the specified date
     */
    getTasksForDate(dateString) {
        if (!Array.isArray(this.tasks)) {
            return [];
        }
        
        return this.tasks.filter(task => {
            if (!task || !task.due_date) return false;
            
            try {
                const taskDate = new Date(task.due_date);
                const taskDateStr = taskDate.toISOString().split('T')[0];
                return taskDateStr === dateString;
            } catch (error) {
                // console.error('❌ Error parsing task date:', error, task);
                return false;
            }
        });
    }

    /**
     * Returns Bootstrap icon class name for a given task type.
     * 
     * @param {string} taskType - Type of task (feeding, cleaning, vaccination, etc.)
     * @returns {string} Bootstrap icon class name
     */
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

    /**
     * Checks if a date is today.
     * 
     * @param {Date} date - Date to check
     * @returns {boolean} True if date is today
     */
    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    /**
     * Checks if a date is the currently selected date.
     * 
     * @param {Date} date - Date to check
     * @returns {boolean} True if date is selected
     */
    isSelectedDate(date) {
        return this.selectedDate.toDateString() === date.toDateString();
    }

    /**
     * Binds event listeners to calendar navigation controls.
     */
    bindEvents() {
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

    /**
     * Sets up click handlers for calendar day elements.
     * Displays task details modal when a day is clicked.
     */
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

    /**
     * Displays tasks for a selected day in a modal.
     * 
     * @param {string} dateString - Selected date in YYYY-MM-DD format
     */
    showDayTasks(dateString) {
        const tasks = this.getTasksForDate(dateString);
        const modalBody = document.getElementById('dayTasksModalBody');
        const modalTitle = document.getElementById('dayTasksModalLabel');
        
        if (modalBody && modalTitle) {
            const [year, month, day] = dateString.split('-');
            const localDate = new Date(year, month - 1, day);
            
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

            const modal = new bootstrap.Modal(document.getElementById('dayTasksModal'));
            modal.show();
        }
    }

    /**
     * Checks for overdue tasks and displays notifications.
     * Only runs if tasks array is valid.
     */
    async setupTaskNotifications() {
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

    /**
     * Displays an alert notification for overdue tasks.
     * 
     * @param {Array} tasks - Array of overdue task objects
     */
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

/**
 * Initializes the calendar manager when the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', function() {
    window.calendarManager = new CalendarManager();
});