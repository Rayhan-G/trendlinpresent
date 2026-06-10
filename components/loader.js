// Load header and footer dynamically
function loadHeader() {
    fetch('/components/header.html')
        .then(response => response.text())
        .then(data => {
            document.body.insertAdjacentHTML('afterbegin', data);
            setActiveNav();
        })
        .catch(error => console.error('Error loading header:', error));
}

function loadFooter() {
    fetch('/components/footer.html')
        .then(response => response.text())
        .then(data => {
            document.body.insertAdjacentHTML('beforeend', data);
        })
        .catch(error => console.error('Error loading footer:', error));
}

function setActiveNav() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.main-nav a');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (currentPath === href || 
            (currentPath.includes('/categories/') && href.includes(currentPath.split('/')[2])) ||
            (currentPath === '/' && href === '/')) {
            link.classList.add('active');
        }
    });
}

// Load when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    loadHeader();
    loadFooter();
});