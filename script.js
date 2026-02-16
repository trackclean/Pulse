/* ============================================
   Main Initialization
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    // Check for reduced motion preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
        document.documentElement.style.scrollBehavior = 'auto';
    }

    /* ============================================
       Active Navigation Tracking
       ============================================ */

    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');

    window.addEventListener('scroll', () => {
        let current = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop;

            if (window.scrollY >= sectionTop - 200) {
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

    /* ============================================
       Download Button Tracking (Optional)
       ============================================ */

    document.querySelectorAll('.download-link').forEach(link => {
        link.addEventListener('click', function() {
            if (window.gtag) {
                gtag('event', 'download', {
                    'platform': this.textContent.trim(),
                    'link': this.href
                });
            }
        });
    });
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

  const alts = [
    'Clean Track Buddy main interface',
    'Clean Track Buddy sample analysis view',
    'Clean Track Buddy duplicate detection',
    'Clean Track Buddy export options',
    'Clean Track Buddy settings and configuration'
  ];

  const backdrop = document.createElement('div');
  backdrop.className = 'lightbox-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-label', 'Screenshot lightbox');
  backdrop.innerHTML = `
    <div class="lightbox-content">
      <button class="lightbox-nav prev" aria-label="Previous screenshot">\u2190</button>
      <img class="lightbox-img" src="" alt="">
      <button class="lightbox-nav next" aria-label="Next screenshot">\u2192</button>
      <button class="lightbox-close" aria-label="Close lightbox">Close</button>
    </div>`;
  document.body.appendChild(backdrop);

  const imgEl = backdrop.querySelector('.lightbox-img');
  let current = 0;

  function open(i){
    current = i;
    imgEl.src = imgs[current];
    imgEl.alt = alts[current];
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close(){
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  backdrop.querySelector('.lightbox-close').addEventListener('click', close);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
  backdrop.querySelector('.prev').addEventListener('click', () => {
    current = (current - 1 + imgs.length) % imgs.length;
    imgEl.src = imgs[current];
    imgEl.alt = alts[current];
  });
  backdrop.querySelector('.next').addEventListener('click', () => {
    current = (current + 1) % imgs.length;
    imgEl.src = imgs[current];
    imgEl.alt = alts[current];
  });

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
