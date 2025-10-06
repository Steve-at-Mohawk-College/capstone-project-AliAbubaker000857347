class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('themeToggle');
        this.lightIcon = document.getElementById('lightIcon');
        this.darkIcon = document.getElementById('darkIcon');
        
        // Only initialize if theme toggle exists
        if (this.themeToggle) {
            this.currentTheme = this.getStoredTheme() || 'light';
            this.init();
        }
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.setupEventListeners();
    }

    getStoredTheme() {
        return localStorage.getItem('theme');
    }

    setStoredTheme(theme) {
        localStorage.setItem('theme', theme);
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.updateToggleIcon(theme);
        this.setStoredTheme(theme);
    }

    updateToggleIcon(theme) {
        if (!this.lightIcon || !this.darkIcon) return;
        
        if (theme === 'dark') {
            this.lightIcon.classList.remove('d-none');
            this.darkIcon.classList.add('d-none');
            this.themeToggle.setAttribute('title', 'Switch to light mode');
        } else {
            this.lightIcon.classList.add('d-none');
            this.darkIcon.classList.remove('d-none');
            this.themeToggle.setAttribute('title', 'Switch to dark mode');
        }
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
        
        // Dispatch custom event for other components to listen to
        document.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: this.currentTheme }
        }));
    }

    setupEventListeners() {
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Listen for system preference changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            if (!this.getStoredTheme()) { // Only auto-change if no user preference
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    // Method to get current theme (can be used by other scripts)
    getCurrentTheme() {
        return this.currentTheme;
    }
}

// Initialize theme manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});