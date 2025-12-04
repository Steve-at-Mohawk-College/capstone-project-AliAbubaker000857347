// Community Accessibility Improvements
document.addEventListener('DOMContentLoaded', function () {
    /**
     * Initializes accessibility enhancements for the community page.
     * - Fixes ARIA attributes for comment toggles
     * - Adds skip to main content link
     * - Enhances form accessibility with proper labeling
     * - Adds screen reader announcements for dynamic content
     */

    /**
     * Fixes ARIA attributes for comment toggle buttons to ensure proper
     * screen reader announcements and keyboard navigation.
     */
    const commentToggles = document.querySelectorAll('.toggle-comments-btn');
    commentToggles.forEach((toggle, index) => {
        const postId = toggle.closest('.comment-toggle')?.dataset.postId;
        if (postId) {
            const commentsContainer = document.getElementById(`comments-${postId}`);
            if (commentsContainer) {
                toggle.setAttribute('aria-controls', `comments-${postId}`);
                toggle.setAttribute('aria-expanded', 'false');

                toggle.addEventListener('click', function () {
                    const isExpanded = this.getAttribute('aria-expanded') === 'true';
                    this.setAttribute('aria-expanded', !isExpanded);
                    commentsContainer.setAttribute('aria-hidden', isExpanded);
                });
            }
        }
    });

    /**
     * Creates and inserts a skip to main content link for keyboard users.
     * The link is visually hidden until focused, then appears at the top of the page.
     */
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip to main content';
    skipLink.style.cssText = `
        position: absolute;
        top: -40px;
        left: 6px;
        background: #000;
        color: #fff;
        padding: 8px;
        z-index: 10000;
        text-decoration: none;
    `;
    skipLink.addEventListener('focus', function () {
        this.style.top = '6px';
    });
    skipLink.addEventListener('blur', function () {
        this.style.top = '-40px';
    });

    document.body.insertBefore(skipLink, document.body.firstChild);

    /**
     * Ensures the main content area has an ID for the skip link to target.
     * Uses the first available main element, container, or defaults to body.
     */
    const mainContent = document.querySelector('main') || document.querySelector('.container') || document.body;
    if (!mainContent.id) {
        mainContent.id = 'main-content';
    }

    /**
     * Enhances form accessibility by ensuring all inputs have proper labels
     * and IDs. Creates screen-reader-only labels for unlabeled inputs.
     */
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (!input.id && input.name) {
                input.id = `input-${input.name}-${Math.random().toString(36).substr(2, 9)}`;
            }

            if (input.id && !input.labels?.length) {
                const label = form.querySelector(`label[for="${input.id}"]`);
                if (!label) {
                    const newLabel = document.createElement('label');
                    newLabel.htmlFor = input.id;
                    newLabel.textContent = input.placeholder || input.name;
                    newLabel.className = 'sr-only';
                    input.parentNode.insertBefore(newLabel, input);
                }
            }
        });
    });

    /**
     * Creates a live region for announcing dynamic content changes to screen readers.
     * The live region is hidden visually but accessible to assistive technologies.
     */
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);

    /**
     * Global function for announcing messages to screen readers.
     * Sets a message in the live region, which is automatically announced,
     * then clears it after a short delay.
     * 
     * @param {string} message - The message to announce to screen readers
     */
    window.announceToScreenReader = function (message) {
        liveRegion.textContent = message;
        setTimeout(() => {
            liveRegion.textContent = '';
        }, 1000);
    };

    /**
     * Enhances comment forms with screen reader announcements on submission.
     * Announces success message after form submission.
     */
    const commentForms = document.querySelectorAll('.comment-form');
    commentForms.forEach(form => {
        form.addEventListener('submit', function () {
            setTimeout(() => {
                window.announceToScreenReader('Comment posted successfully');
            }, 500);
        });
    });
});

/**
 * CSS for screen reader only content and accessibility enhancements.
 * Creates a style element with necessary accessibility styles.
 */
const style = document.createElement('style');
style.textContent = `
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }
    
    .skip-link:focus {
        top: 6px !important;
    }
`;
document.head.appendChild(style);