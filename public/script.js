const scrollReveal = () => {
    const elements = document.querySelectorAll('.scroll-reveal');
    elements.forEach(element => {
        const rect = element.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight * 0.85 && rect.bottom > 0;
        if (isVisible) {
            element.classList.add('active');
        }
    });
};

// Smooth Scroll for Navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Parallax Effect for Hero Section
const parallaxEffect = () => {
    const hero = document.querySelector('.hero');
    if (hero) {
        const scrolled = window.pageYOffset;
        hero.style.backgroundPositionY = -(scrolled * 0.5) + 'px';
    }
};

const mouseMoveEffect = () => {
    const cards = document.querySelectorAll('.skill-card, .project-card, .social-card, .devops-tile, .resume-card, .experience-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const rotateX = (y - rect.height / 2) / 20;
            const rotateY = (rect.width / 2 - x) / 20;
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(20px)`;
            card.style.setProperty('--mx', `${x}px`);
            card.style.setProperty('--my', `${y}px`);
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
        });
    });
};

const init = () => {
    scrollReveal();
    window.addEventListener('scroll', () => {
        scrollReveal();
        parallaxEffect();
    });
    mouseMoveEffect();
    initStarfield();
};

// Run initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Starfield generator
const initStarfield = () => {
    const container = document.querySelector('.starfield');
    if (!container) return;

    const layers = [
        { class: 'depth1', count: 80, parallax: 0.6 },
        { class: 'depth2', count: 60, parallax: 0.4 },
        { class: 'depth3', count: 40, parallax: 0.25 },
    ];

    const layerEls = layers.map(() => {
        const el = document.createElement('div');
        el.className = 'star-layer';
        container.appendChild(el);
        return el;
    });

    layers.forEach((layer, idx) => {
        for (let i = 0; i < layer.count; i++) {
            const star = document.createElement('div');
            star.className = `star ${layer.class}`;
            const size = Math.random() * 2 + 1;
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            star.style.left = `${Math.random() * 100}vw`;
            star.style.top = `${Math.random() * 100}vh`;
            star.style.animationDelay = `${Math.random() * 12}s`;
            layerEls[idx].appendChild(star);
        }
    });

    // Nebula
    const nebulaColors = ['blue', 'purple', 'cyan'];
    nebulaColors.forEach((c, i) => {
        const n = document.createElement('div');
        n.className = `nebula ${c}`;
        n.style.left = `${10 + i * 30}vw`;
        n.style.top = `${60 - i * 20}vh`;
        container.appendChild(n);
    });

    // Mouse parallax
    let mx = 0, my = 0, tx = 0, ty = 0;
    const onMove = (e) => {
        const rect = { w: window.innerWidth, h: window.innerHeight };
        mx = (e.clientX / rect.w - 0.5) * 2;
        my = (e.clientY / rect.h - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMove);
    const tick = () => {
        tx += (mx - tx) * 0.06;
        ty += (my - ty) * 0.06;
        layerEls.forEach((el, idx) => {
            const p = layers[idx].parallax;
            el.style.transform = `translate3d(${tx * 10 * p}px, ${ty * 10 * p}px, 0)`;
        });
        requestAnimationFrame(tick);
    };
    tick();

    // Shooting stars
    const spawnShootingStar = () => {
        const el = document.createElement('div');
        el.className = 'shooting-star';
        el.style.left = `${Math.random() * 80}vw`;
        el.style.top = `${20 + Math.random() * 60}vh`;
        container.appendChild(el);
        el.addEventListener('animationend', () => el.remove());
    };
    setInterval(spawnShootingStar, 6000 + Math.random() * 4000);
};