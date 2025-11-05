// Community Accessibility Improvements
document.addEventListener('DOMContentLoaded', function() {
    // Fix ARIA attributes for comment toggles
    const commentToggles = document.querySelectorAll('.toggle-comments-btn');
    commentToggles.forEach((toggle, index) => {
        const postId = toggle.closest('.comment-toggle')?.dataset.postId;
        if (postId) {
            const commentsContainer = document.getElementById(`comments-${postId}`);
            if (commentsContainer) {
                // Add ARIA controls and expanded state
                toggle.setAttribute('aria-controls', `comments-${postId}`);
                toggle.setAttribute('aria-expanded', 'false');
                
                // Update on click
                toggle.addEventListener('click', function() {
                    const isExpanded = this.getAttribute('aria-expanded') === 'true';
                    this.setAttribute('aria-expanded', !isExpanded);
                    commentsContainer.setAttribute('aria-hidden', isExpanded);
                });
            }
        }
    });

    // Add skip to main content link
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
    skipLink.addEventListener('focus', function() {
        this.style.top = '6px';
    });
    skipLink.addEventListener('blur', function() {
        this.style.top = '-40px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);

    // Add main content ID if not present
    const mainContent = document.querySelector('main') || document.querySelector('.container') || document.body;
    if (!mainContent.id) {
        mainContent.id = 'main-content';
    }

    // Enhance form accessibility
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (!input.id && input.name) {
                input.id = `input-${input.name}-${Math.random().toString(36).substr(2, 9)}`;
            }
            
            // Ensure labels are properly associated
            if (input.id && !input.labels?.length) {
                const label = form.querySelector(`label[for="${input.id}"]`);
                if (!label) {
                    // Create label if missing
                    const newLabel = document.createElement('label');
                    newLabel.htmlFor = input.id;
                    newLabel.textContent = input.placeholder || input.name;
                    newLabel.className = 'sr-only';
                    input.parentNode.insertBefore(newLabel, input);
                }
            }
        });
    });

    // Add live region for dynamic content
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);

    // Function to announce changes to screen readers
    window.announceToScreenReader = function(message) {
        liveRegion.textContent = message;
        setTimeout(() => {
            liveRegion.textContent = '';
        }, 1000);
    };

    // Enhance comment submission with announcements
    const commentForms = document.querySelectorAll('.comment-form');
    commentForms.forEach(form => {
        form.addEventListener('submit', function() {
            setTimeout(() => {
                window.announceToScreenReader('Comment posted successfully');
            }, 500);
        });
    });
});

// CSS for screen reader only content
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