(function () {
    'use strict';

    const ready = (fn) => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn();

    ready(() => {
        const header = document.querySelector('header');
        const menu = document.querySelector('.menu');
        const menuButton = document.querySelector('.menu-mobile');
        const backToTop = document.getElementById('backToTop');
        const loader = document.getElementById('loader');

        const closeMenu = () => {
            menu?.classList.remove('active');
            document.body.classList.remove('menu-open');
            menuButton?.setAttribute('aria-expanded', 'false');
        };

        menuButton?.setAttribute('aria-expanded', 'false');
        menuButton?.setAttribute('aria-controls', menu?.id || 'mainMenu');
        if (menu && !menu.id) menu.id = 'mainMenu';
        menuButton?.addEventListener('click', () => {
            const open = menu?.classList.toggle('active');
            document.body.classList.toggle('menu-open', Boolean(open));
            menuButton.setAttribute('aria-expanded', String(Boolean(open)));
        });

        document.querySelectorAll('a[href^="#"]').forEach((link) => {
            link.addEventListener('click', (event) => {
                const selector = link.getAttribute('href');
                if (!selector || selector === '#') return;
                const target = document.querySelector(selector);
                if (!target) return;
                event.preventDefault();
                closeMenu();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });

        const handleScroll = () => {
            const scrolled = window.scrollY > 24;
            header?.classList.toggle('scrolled', scrolled);
            backToTop?.classList.toggle('visible', window.scrollY > 500);
        };
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

        const observer = 'IntersectionObserver' in window ? new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                const target = Number(el.dataset.target || 0);
                const suffix = el.dataset.suffix || '';
                const startedAt = performance.now();
                const duration = 1000;
                const tick = (now) => {
                    const progress = Math.min(1, (now - startedAt) / duration);
                    el.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3))) + suffix;
                    if (progress < 1) requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
                obs.unobserve(el);
            });
        }, { threshold: .4 }) : null;
        document.querySelectorAll('.counter-number[data-target]').forEach((el) => observer?.observe(el));

        const contactMessage = document.getElementById('contatoMsg');
        const counter = document.querySelector('.char-counter');
        contactMessage?.addEventListener('input', () => {
            if (counter) counter.textContent = `${contactMessage.value.length}/${contactMessage.maxLength || 1000}`;
        });

        document.querySelectorAll('a[target="_blank"]').forEach((link) => link.setAttribute('rel', 'noopener noreferrer'));
        window.addEventListener('load', () => window.setTimeout(() => loader?.classList.add('hidden'), 120));
        window.setTimeout(() => loader?.classList.add('hidden'), 2500);

        if (window.AOS) window.AOS.init({ duration: 650, once: true, offset: 60 });
    });
})();
