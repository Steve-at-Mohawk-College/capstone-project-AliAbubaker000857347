class SessionTimeout {
    constructor() {
        this.timeoutMinutes = 10; // Session timeout in minutes
        this.warningMinutes = 1; // Show warning 1 minute before timeout
        this.timeoutMilliseconds = this.timeoutMinutes * 60 * 1000;
        this.warningMilliseconds = this.warningMinutes * 60 * 1000;
        
        this.timeoutTimer = null;
        this.warningTimer = null;
        
        this.modalShown = false;
        this.userIsActive = true;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.resetTimers();
        console.log('Session timeout handler initialized');
    }
    
    setupEventListeners() {
        // Listen for user activity
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        events.forEach(event => {
            document.addEventListener(event, () => {
                this.userIsActive = true;
                this.resetTimers();
            }, { passive: true });
        });
        
        // Handle visibility change (tab switching)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.userIsActive = true;
                this.resetTimers();
            }
        });
        
        // Handle modal buttons
        document.addEventListener('click', (e) => {
            if (e.target.id === 'extendSessionBtn') {
                this.extendSession();
            } else if (e.target.id === 'logoutNowBtn') {
                this.logoutNow();
            }
        });
    }
    
    resetTimers() {
        if (this.userIsActive) {
            // Clear existing timers
            clearTimeout(this.timeoutTimer);
            clearTimeout(this.warningTimer);
            
            // Set new timers
            this.warningTimer = setTimeout(() => {
                this.showWarning();
            }, this.timeoutMilliseconds - this.warningMilliseconds);
            
            this.timeoutTimer = setTimeout(() => {
                this.logout();
            }, this.timeoutMilliseconds);
            
            this.userIsActive = false;
        }
    }
    
    showWarning() {
        if (!this.modalShown) {
            this.modalShown = true;
            this.createWarningModal();
            
            // Show the modal with animation
            const modal = new bootstrap.Modal(document.getElementById('sessionTimeoutModal'));
            modal.show();
            
            // Start countdown in the modal
            this.startCountdown();
        }
    }
    
    createWarningModal() {
        // Create modal HTML if it doesn't exist
        if (!document.getElementById('sessionTimeoutModal')) {
            const modalHTML = `
                <div class="modal fade" id="sessionTimeoutModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header bg-warning">
                                <h5 class="modal-title">Session About to Expire</h5>
                            </div>
                            <div class="modal-body">
                                <p>Your session will expire in <span id="countdown">${this.warningMinutes}:00</span> due to inactivity.</p>
                                <p>Would you like to continue your session?</p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" id="logoutNowBtn">Log Out Now</button>
                                <button type="button" class="btn btn-primary" id="extendSessionBtn">Continue Session</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
    }
    
    startCountdown() {
        let seconds = this.warningMinutes * 60;
        const countdownElement = document.getElementById('countdown');
        
        const countdownInterval = setInterval(() => {
            seconds--;
            
            if (seconds <= 0) {
                clearInterval(countdownInterval);
                this.logout();
                return;
            }
            
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            
            countdownElement.textContent = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
    
    extendSession() {
        // Hide modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('sessionTimeoutModal'));
        if (modal) modal.hide();
        
        this.modalShown = false;
        
        // Send request to extend session
        fetch('/auth/extend-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
        })
        .then(response => {
            if (response.ok) {
                console.log('Session extended');
                this.resetTimers();
            } else {
                console.error('Failed to extend session');
                this.logout();
            }
        })
        .catch(error => {
            console.error('Error extending session:', error);
            this.logout();
        });
    }
    
    logoutNow() {
        this.logout();
    }
    
    logout() {
        // Clear all timers
        clearTimeout(this.timeoutTimer);
        clearTimeout(this.warningTimer);
        
        // Hide modal if shown
        if (this.modalShown) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('sessionTimeoutModal'));
            if (modal) modal.hide();
        }
        
        // Redirect to logout or show message
        window.location.href = '/auth/logout?reason=timeout';
    }
    
    // Public method to manually reset timers (useful for AJAX requests)
    reset() {
        this.userIsActive = true;
        this.resetTimers();
    }
    
    // Public method to destroy the instance
    destroy() {
        clearTimeout(this.timeoutTimer);
        clearTimeout(this.warningTimer);
        
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        events.forEach(event => {
            document.removeEventListener(event, this.resetTimers);
        });
        
        const modal = document.getElementById('sessionTimeoutModal');
        if (modal) modal.remove();
    }
}

// Initialize session timeout when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.sessionTimeout = new SessionTimeout();
    
    // Also reset on AJAX requests (if using jQuery)
    if (typeof jQuery !== 'undefined') {
        $(document).ajaxComplete(function() {
            if (window.sessionTimeout) {
                window.sessionTimeout.reset();
            }
        });
    }
    
    // Export for manual control
    window.resetSessionTimer = function() {
        if (window.sessionTimeout) {
            window.sessionTimeout.reset();
        }
    };
});