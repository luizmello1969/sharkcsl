/* ============================================
   PRESELL VIGORTRIX — SCRIPTS
   ============================================ */

(function () {
  'use strict';

  /* ========== CONFIG ========== */
  // Replace #VSL_LINK with your actual VSL URL
  var VSL_LINK = '#VSL_LINK';

  /* ========== SET ALL CTA LINKS ========== */
  function setLinks() {
    var allLinks = document.querySelectorAll('a[href="#VSL_LINK"]');
    allLinks.forEach(function (link) {
      link.setAttribute('href', VSL_LINK);
    });
  }

  /* ========== TRACK CTA CLICKS ========== */
  function trackClicks() {
    var ctas = document.querySelectorAll('.cta-btn, .cta-btn-bottom, .video-wrapper');
    ctas.forEach(function (el) {
      el.addEventListener('click', function () {
        // Google Ads / Facebook Pixel event (customize as needed)
        if (typeof gtag === 'function') {
          gtag('event', 'cta_click', {
            event_category: 'presell',
            event_label: el.id || 'video-cta'
          });
        }
        if (typeof fbq === 'function') {
          fbq('track', 'ViewContent', {
            content_name: 'presell_cta_click'
          });
        }
      });
    });
  }

  /* ========== SCROLL FADE-IN FOR BODY COPY ========== */
  function initScrollReveal() {
    var paragraphs = document.querySelectorAll('.body-copy p');
    
    paragraphs.forEach(function (p) {
      p.style.opacity = '0';
      p.style.transform = 'translateY(20px)';
      p.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    paragraphs.forEach(function (p) {
      observer.observe(p);
    });
  }

  /* ========== INIT ========== */
  document.addEventListener('DOMContentLoaded', function () {
    setLinks();
    trackClicks();
    initScrollReveal();
  });

})();
