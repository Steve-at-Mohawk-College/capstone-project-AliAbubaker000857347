/**
 * ThemeManager - Manages theme switching between light and dark modes.
 * Provides persistent theme storage, system preference detection, and visual feedback.
 */
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

    /**
     * Initializes the theme manager.
     * Applies stored theme and sets up event listeners.
     */
    init() {
        this.applyTheme(this.currentTheme);
        this.setupEventListeners();
    }

    /**
     * Retrieves stored theme preference from localStorage.
     * 
     * @returns {string|null} Stored theme preference or null if not set
     */
    getStoredTheme() {
        return localStorage.getItem('theme');
    }

    /**
     * Stores theme preference in localStorage.
     * 
     * @param {string} theme - Theme to store ('light' or 'dark')
     */
    setStoredTheme(theme) {
        localStorage.setItem('theme', theme);
    }

    /**
     * Applies the specified theme to the document.
     * Updates data-theme attribute, toggle icon, and storage.
     * 
     * @param {string} theme - Theme to apply ('light' or 'dark')
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.updateToggleIcon(theme);
        this.setStoredTheme(theme);
    }

    /**
     * Updates the theme toggle icon based on current theme.
     * Shows/hides appropriate sun/moon icons and updates tooltip.
     * 
     * @param {string} theme - Current theme ('light' or 'dark')
     */
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

    /**
     * Toggles between light and dark themes.
     * Applies new theme and dispatches custom event for other components.
     */
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
        
        // Dispatch custom event for other components to listen to
        document.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: this.currentTheme }
        }));
    }

    /**
     * Sets up event listeners for theme toggle and system preference changes.
     */
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

    /**
     * Returns the current theme.
     * 
     * @returns {string} Current theme ('light' or 'dark')
     */
    getCurrentTheme() {
        return this.currentTheme;
    }
}

/**
 * Initializes the ThemeManager when the DOM is fully loaded.
 * Makes themeManager globally available for other scripts.
 */
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});