/* ============================================
   Pulse — Interactive Scripts
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
        document.documentElement.style.scrollBehavior = 'auto';
        document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
    }

    /* ============================================
       Scroll-triggered Reveal
       ============================================ */
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = parseInt(entry.target.dataset.delay || 0) * 100;
                setTimeout(() => entry.target.classList.add('visible'), delay);
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    /* ============================================
       Navbar Scroll Effect
       ============================================ */
    const navbar = document.getElementById('navbar');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 60) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }, { passive: true });

    /* ============================================
       Active Nav Tracking
       ============================================ */
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            if (window.scrollY >= section.offsetTop - 200) {
                current = section.getAttribute('id');
            }
        });
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').slice(1) === current) {
                link.classList.add('active');
            }
        });
    }, { passive: true });

    /* ============================================
       Mobile Nav Toggle
       ============================================ */
    const navToggle = document.getElementById('navToggle');
    const navLinksList = document.querySelector('.nav-links');

    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navLinksList.classList.toggle('open');
        });

        navLinksList.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                navLinksList.classList.remove('open');
            });
        });
    }

    /* ============================================
       Bug Report Form → GitHub Issue
       ============================================ */
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const type = document.getElementById('reportType').value;
            const title = document.getElementById('reportTitle').value.trim();
            const desc = document.getElementById('reportDesc').value.trim();

            if (!title || !desc) return;

            const labels = type === 'bug' ? 'bug' : type === 'feature' ? 'enhancement' : '';
            const body = `**Type:** ${type}\n\n${desc}`;
            const url = `https://github.com/trackclean/clean-track/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}${labels ? '&labels=' + encodeURIComponent(labels) : ''}`;

            window.open(url, '_blank', 'noopener,noreferrer');
        });
    }

    /* ============================================
       Download Button Tracking
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

    /* ============================================
       Hero Canvas — Audio Waveform Visualizer
       ============================================ */
    const canvas = document.getElementById('heroCanvas');
    if (canvas && !prefersReducedMotion) {
        const ctx = canvas.getContext('2d');
        let width, height;
        let animId;
        let mouseX = 0.5, mouseY = 0.5;

        function resize() {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.parentElement.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            ctx.scale(dpr, dpr);
        }

        resize();
        window.addEventListener('resize', resize);

        canvas.parentElement.addEventListener('mousemove', (e) => {
            const rect = canvas.parentElement.getBoundingClientRect();
            mouseX = (e.clientX - rect.left) / rect.width;
            mouseY = (e.clientY - rect.top) / rect.height;
        });

        const barCount = 80;
        const bars = [];
        for (let i = 0; i < barCount; i++) {
            bars.push({
                phase: Math.random() * Math.PI * 2,
                speed: 0.3 + Math.random() * 0.7,
                amp: 0.3 + Math.random() * 0.7
            });
        }

        const particles = [];
        for (let i = 0; i < 50; i++) {
            particles.push({
                x: Math.random(),
                y: Math.random(),
                size: 1 + Math.random() * 2,
                speedX: (Math.random() - 0.5) * 0.0003,
                speedY: (Math.random() - 0.5) * 0.0003,
                opacity: 0.1 + Math.random() * 0.3
            });
        }

        let time = 0;

        function draw() {
            ctx.clearRect(0, 0, width, height);
            time += 0.008;

            const barWidth = width / barCount;
            const centerY = height * 0.6;

            bars.forEach((bar, i) => {
                const x = i * barWidth + barWidth / 2;
                const distFromMouse = Math.abs(i / barCount - mouseX);
                const mouseInfluence = Math.max(0, 1 - distFromMouse * 3);
                const baseAmp = 15 + bar.amp * 25;
                const waveAmp = baseAmp + mouseInfluence * 30;
                const barH = waveAmp * (0.5 + 0.5 * Math.sin(time * bar.speed + bar.phase + i * 0.12));

                const gradient = ctx.createLinearGradient(x, centerY - barH, x, centerY + barH);
                gradient.addColorStop(0, `rgba(0, 240, 255, ${0.15 + mouseInfluence * 0.25})`);
                gradient.addColorStop(0.5, `rgba(180, 74, 255, ${0.1 + mouseInfluence * 0.2})`);
                gradient.addColorStop(1, `rgba(0, 240, 255, ${0.15 + mouseInfluence * 0.25})`);

                ctx.beginPath();
                ctx.roundRect(x - barWidth * 0.2, centerY - barH, barWidth * 0.4, barH * 2, 3);
                ctx.fillStyle = gradient;
                ctx.fill();
            });

            particles.forEach(p => {
                p.x += p.speedX + Math.sin(time + p.y * 10) * 0.0001;
                p.y += p.speedY;
                if (p.x < 0) p.x = 1;
                if (p.x > 1) p.x = 0;
                if (p.y < 0) p.y = 1;
                if (p.y > 1) p.y = 0;

                const px = p.x * width;
                const py = p.y * height;
                const dist = Math.hypot(px - mouseX * width, py - mouseY * height);
                const glow = Math.max(0, 1 - dist / 300);

                ctx.beginPath();
                ctx.arc(px, py, p.size + glow * 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 240, 255, ${p.opacity + glow * 0.3})`;
                ctx.fill();
            });

            animId = requestAnimationFrame(draw);
        }

        draw();

        const heroObserver = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                if (!animId) draw();
            } else {
                cancelAnimationFrame(animId);
                animId = null;
            }
        }, { threshold: 0 });

        heroObserver.observe(canvas.parentElement);
    }
});

/* ============================================
   Lightbox (for workflow screenshots)
   ============================================ */
(function() {
    const imgs = [
        'assets/screenshots/01-empty-state.png',
        'assets/screenshots/02-files-loaded.png',
        'assets/screenshots/03-analyze-dropdown.png',
        'assets/screenshots/04-category-view.png',
        'assets/screenshots/05-settings-dialog.png',
        'assets/screenshots/06-appearance-tab.png',
        'assets/screenshots/07-theme-midnight-blue.png',
        'assets/screenshots/08-theme-deep-forest.png',
        'assets/screenshots/09-theme-warm-sunset.png',
        'assets/screenshots/10-export-dialog.png'
    ];

    const alts = [
        'Pulse empty state with drag and drop zone',
        'Pulse main interface with loaded audio files',
        'Pulse toolbar with Analyze dropdown menu',
        'Pulse category view with grouped tracks',
        'Pulse settings dialog with processing options',
        'Pulse appearance settings with theme selector',
        'Pulse Midnight Blue theme',
        'Pulse Deep Forest theme',
        'Pulse Warm Sunset theme',
        'Pulse export options dialog'
    ];

    const backdrop = document.createElement('div');
    backdrop.className = 'lightbox-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-label', 'Screenshot lightbox');
    backdrop.innerHTML = `
        <button class="lightbox-nav prev" aria-label="Previous screenshot">\u2190</button>
        <div class="lightbox-content">
            <img class="lightbox-img" src="" alt="">
        </div>
        <button class="lightbox-nav next" aria-label="Next screenshot">\u2192</button>
        <button class="lightbox-close" aria-label="Close lightbox">\u2715</button>`;
    document.body.appendChild(backdrop);

    const imgEl = backdrop.querySelector('.lightbox-img');
    let current = 0;

    function open(i) {
        current = i;
        imgEl.src = imgs[current];
        imgEl.alt = alts[current];
        backdrop.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function close() {
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

    // Lightbox triggers from workflow screenshots and hero
    document.querySelectorAll('.lightbox-trigger').forEach(btn => {
        btn.addEventListener('click', () => open(Number(btn.dataset.index)));
    });
})();
