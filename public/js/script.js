// Main site functionality
document.addEventListener('DOMContentLoaded', () => {
    // Update active navigation link based on current page
    function updateActiveNavLink() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('nav a');

        navLinks.forEach(link => {
            const linkPath = new URL(link.href).pathname;
            const isActive = currentPath === linkPath;

            // Update classes
            link.classList.toggle('border-indigo-primary', isActive);
            link.classList.toggle('text-gray-900', isActive);
            link.classList.toggle('border-transparent', !isActive);
            link.classList.toggle('text-gray-500', !isActive);
        });
    }

    // Call updateActiveNavLink when the page loads
    updateActiveNavLink();

    // Handle login button click
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            utils.analytics.track('login_button_click');
        });
    }

    // Handle smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = anchor.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Handle mobile menu
    const mobileMenuBtn = document.querySelector('[aria-controls="mobile-menu"]');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
            mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);

            if (!isExpanded) {
                mobileMenu.classList.remove('hidden');
                requestAnimationFrame(() => {
                    mobileMenu.classList.add('opacity-100', 'translate-y-0');
                    mobileMenu.classList.remove('opacity-0', '-translate-y-2');
                });
            } else {
                mobileMenu.classList.add('opacity-0', '-translate-y-2');
                mobileMenu.classList.remove('opacity-100', 'translate-y-0');
                setTimeout(() => mobileMenu.classList.add('hidden'), 300);
            }
        });
    }

    // Handle social links
    const socialLinks = {
        'discordLink': config.socialLinks.discord,
        'robloxLink': config.socialLinks.robloxGroup
    };

    Object.entries(socialLinks).forEach(([id, url]) => {
        const link = document.getElementById(id);
        if (link) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                utils.analytics.track('social_link_click', { platform: id });
                window.open(url, '_blank', 'noopener,noreferrer');
            });
        }
    });
});
