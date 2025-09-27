document.addEventListener('DOMContentLoaded', function() {
    // Get all newsletter forms in the page
    const newsletterForms = document.querySelectorAll('.newsletter-form');

    newsletterForms.forEach(form => {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const button = form.querySelector('button');
            const message = form.parentElement.querySelector('.newsletter-message');
            const input = form.querySelector('input[type="email"]');
            const email = input.value;

            // Email validation regex
            const emailRegex = /[a-z0-9._%+-]+@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com)$/i;
            
            if (!emailRegex.test(email)) {
                message.textContent = "Please enter a valid email address (gmail.com, yahoo.com, outlook.com, or hotmail.com)";
                message.className = "newsletter-message error";
                return;
            }

            // Show sending state
            form.classList.add('sending');
            button.disabled = true;
            input.disabled = true;
            
            try {
                // Simulate API call with timeout
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Success state
                message.textContent = "Thank you! You've been successfully subscribed to our newsletter.";
                message.className = "newsletter-message success";
                input.value = '';
                
                // Show success notification
                showNotification("Newsletter Subscription", "You'll receive updates about new courses via email!");

            } catch (error) {
                message.textContent = "An error occurred. Please try again later.";
                message.className = "newsletter-message error";
            } finally {
                // Reset button state
                form.classList.remove('sending');
                button.disabled = false;
                input.disabled = false;
            }
        });
    });
});

function showNotification(title, message) {
    // Create notification container if it doesn't exist
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <h4>${title}</h4>
        <p>${message}</p>
    `;

    // Add to container
    container.appendChild(notification);

    // Remove after animation
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
