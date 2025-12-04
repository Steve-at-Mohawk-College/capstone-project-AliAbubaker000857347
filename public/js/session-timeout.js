/**
 * SessionTimeout - Manages user session timeout with warning and auto-logout functionality.
 * Monitors user activity and displays warning modal before session expiration.
 */
class SessionTimeout {
    constructor() {
        this.timeoutMinutes = 10;
        this.warningMinutes = 1;
        this.timeoutMilliseconds = this.timeoutMinutes * 60 * 1000;
        this.warningMilliseconds = this.warningMinutes * 60 * 1000;
        
        this.timeoutTimer = null;
        this.warningTimer = null;
        
        this.modalShown = false;
        this.userIsActive = true;
        
        this.init();
    }
    
    /**
     * Initializes the session timeout handler.
     * Sets up event listeners and starts timers.
     */
    init() {
        this.setupEventListeners();
        this.resetTimers();
        // console.log('Session timeout handler initialized');
    }
    
    /**
     * Sets up event listeners for user activity detection.
     * Listens for mouse, keyboard, scroll, and touch events.
     */
    setupEventListeners() {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        events.forEach(event => {
            document.addEventListener(event, () => {
                this.userIsActive = true;
                this.resetTimers();
            }, { passive: true });
        });
        
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.userIsActive = true;
                this.resetTimers();
            }
        });
        
        document.addEventListener('click', (e) => {
            if (e.target.id === 'extendSessionBtn') {
                this.extendSession();
            } else if (e.target.id === 'logoutNowBtn') {
                this.logoutNow();
            }
        });
    }
    
    /**
     * Resets all timers when user activity is detected.
     * Clears existing timers and sets new warning and logout timers.
     */
    resetTimers() {
        if (this.userIsActive) {
            clearTimeout(this.timeoutTimer);
            clearTimeout(this.warningTimer);
            
            this.warningTimer = setTimeout(() => {
                this.showWarning();
            }, this.timeoutMilliseconds - this.warningMilliseconds);
            
            this.timeoutTimer = setTimeout(() => {
                this.logout();
            }, this.timeoutMilliseconds);
            
            this.userIsActive = false;
        }
    }
    
    /**
     * Shows warning modal when session is about to expire.
     * Creates modal if it doesn't exist and displays with countdown timer.
     */
    showWarning() {
        if (!this.modalShown) {
            this.modalShown = true;
            this.createWarningModal();
            
            const modal = new bootstrap.Modal(document.getElementById('sessionTimeoutModal'));
            modal.show();
            
            this.startCountdown();
        }
    }
    
    /**
     * Creates the session timeout warning modal.
     * Injects modal HTML into the DOM if it doesn't already exist.
     */
    createWarningModal() {
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
    
    /**
     * Starts countdown timer in the warning modal.
     * Updates countdown display every second until expiration.
     */
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
    
    /**
     * Extends user session when "Continue Session" is clicked.
     * Sends request to server and resets timers on success.
     */
    extendSession() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('sessionTimeoutModal'));
        if (modal) modal.hide();
        
        this.modalShown = false;
        
        fetch('/auth/extend-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin'
        })
        .then(response => {
            if (response.ok) {
                // console.log('Session extended');
                this.resetTimers();
            } else {
                // console.error('Failed to extend session');
                this.logout();
            }
        })
        .catch(error => {
            // console.error('Error extending session:', error);
            this.logout();
        });
    }
    
    /**
     * Immediately logs out user when "Log Out Now" is clicked.
     */
    logoutNow() {
        this.logout();
    }
    
    /**
     * Logs out user and redirects to logout page.
     * Clears timers and hides modal before redirecting.
     */
    logout() {
        clearTimeout(this.timeoutTimer);
        clearTimeout(this.warningTimer);
        
        if (this.modalShown) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('sessionTimeoutModal'));
            if (modal) modal.hide();
        }
        
        window.location.href = '/auth/logout?reason=timeout';
    }
    
    /**
     * Public method to manually reset session timers.
     * Useful for resetting timers after AJAX requests or specific user actions.
     */
    reset() {
        this.userIsActive = true;
        this.resetTimers();
    }
    
    /**
     * Destroys the session timeout handler.
     * Clears timers, removes event listeners, and cleans up modal.
     */
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

/**
 * Initializes the session timeout handler when the DOM is fully loaded.
 * Also sets up AJAX completion monitoring if jQuery is available.
 */
document.addEventListener('DOMContentLoaded', function() {
    window.sessionTimeout = new SessionTimeout();
    
    if (typeof jQuery !== 'undefined') {
        $(document).ajaxComplete(function() {
            if (window.sessionTimeout) {
                window.sessionTimeout.reset();
            }
        });
    }
    
    /**
     * Global function to manually reset the session timer.
     * Can be called from other scripts to keep session alive during long operations.
     */
    window.resetSessionTimer = function() {
        if (window.sessionTimeout) {
            window.sessionTimeout.reset();
        }
    };
});