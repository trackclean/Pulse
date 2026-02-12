/* ============================================
   Smooth Scroll Enhancement
   ============================================ */

// Track active section in navigation
document.addEventListener('DOMContentLoaded', function() {
    // Smooth scroll links already handled by CSS
    // Add any additional interactivity here
    
    // Example: Add active class to nav links based on scroll position
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');

    window.addEventListener('scroll', () => {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (scrollY >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').slice(1) === current) {
                link.classList.add('active');
            }
        });
    });
});

/* ============================================
   Analytics (Optional)
   ============================================ */

// Add your analytics code here if needed
// Example: Google Analytics, Plausible, etc.

/* ============================================
   PayPal Integration
   ============================================ */

// The PayPal button form is already in HTML
// PayPal.me links will work directly
// For more advanced PayPal integration, consider using PayPal's JavaScript SDK

// Example: Uncomment and configure if using PayPal JavaScript SDK
/*
script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID">/script>

paypal.Buttons({
    createOrder: function(data, actions) {
        return actions.order.create({
            purchase_units: [{
                amount: {
                    value: '1.00'
                }
            }]
        });
    },
    onApprove: function(data, actions) {
        return actions.order.capture().then(function(details) {
            alert('Transaction completed by ' + details.payer.name.given_name);
        });
    }
}).render('#paypal-button-container');
*/

/* ============================================
   Copy to Clipboard (for command examples)
   ============================================ */

function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

/* ============================================
   Download Button Tracking (Optional)
   ============================================ */

document.querySelectorAll('.download-link').forEach(link => {
    link.addEventListener('click', function(e) {
        // Optional: Send analytics event
        if (window.gtag) {
            gtag('event', 'download', {
                'platform': this.textContent,
                'link': this.href
            });
        }
    });
});

/* ============================================
   Mobile Navigation (if expanded in future)
   ============================================ */

// Add mobile menu toggle if needed
// This is a placeholder for future mobile menu functionality

document.addEventListener('DOMContentLoaded', function() {
    // Check for reduced motion preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
        document.documentElement.style.scrollBehavior = 'auto';
    }
});

/* ============================================
   Gallery Lightbox
   ============================================ */
(function(){
  const imgs = [
    'assets/screenshots/Screenshot 2026-02-10 193107.png',
    'assets/screenshots/Screenshot 2026-02-10 193129.png',
    'assets/screenshots/Screenshot 2026-02-10 193149.png',
    'assets/screenshots/Screenshot 2026-02-10 193205.png',
    'assets/screenshots/Screenshot 2026-02-10 193222.png'
  ];

  const backdrop = document.createElement('div');
  backdrop.className = 'lightbox-backdrop';
  backdrop.innerHTML = `
    <div class="lightbox-content">
      <button class="lightbox-nav prev">\u2190</button>
      <img class="lightbox-img" src="" alt="">
      <button class="lightbox-nav next">\u2192</button>
      <button class="lightbox-close">Close</button>
    </div>`;
  document.body.appendChild(backdrop);

  const imgEl = backdrop.querySelector('.lightbox-img');
  let current = 0;
  function open(i){
    current = i;
    imgEl.src = imgs[current];
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function close(){
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }
  backdrop.querySelector('.lightbox-close').addEventListener('click', close);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
  backdrop.querySelector('.prev').addEventListener('click', () => { current = (current-1+imgs.length)%imgs.length; imgEl.src = imgs[current]; });
  backdrop.querySelector('.next').addEventListener('click', () => { current = (current+1)%imgs.length; imgEl.src = imgs[current]; });
  document.addEventListener('keydown', e => {
    if (!backdrop.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') backdrop.querySelector('.prev').click();
    if (e.key === 'ArrowRight') backdrop.querySelector('.next').click();
  });

  document.querySelectorAll('.gallery-item').forEach(btn => {
    btn.addEventListener('click', () => open(Number(btn.dataset.index)));
  });
})();
