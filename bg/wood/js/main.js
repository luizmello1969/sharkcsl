(function () {
  'use strict';

  const menuToggle = document.querySelector('[data-menu-toggle]');
  const drawer = document.querySelector('[data-mobile-drawer]');
  const drawerClose = document.querySelector('[data-drawer-close]');

  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (menuToggle) menuToggle.addEventListener('click', openDrawer);
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);

  if (drawer) {
    drawer.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeDrawer);
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('open')) {
      closeDrawer();
    }
  });

  document.querySelectorAll('[data-faq-item]').forEach(function (item) {
    const question = item.querySelector('[data-faq-question]');
    if (!question) return;

    question.addEventListener('click', function () {
      const isOpen = item.classList.contains('open');

      document.querySelectorAll('[data-faq-item].open').forEach(function (other) {
        if (other !== item) other.classList.remove('open');
      });

      item.classList.toggle('open', !isOpen);
    });
  });

  document.querySelectorAll('a.scroll-to-section, a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      const headerHeight = 72;
      const targetY = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 12;

      window.scrollTo({
        top: targetY,
        behavior: 'smooth'
      });

      closeDrawer();
    });
  });

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const revealEls = document.querySelectorAll('[data-reveal]');
    if (revealEls.length && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });

      revealEls.forEach(function (el) { io.observe(el); });
    }
  }

})();
