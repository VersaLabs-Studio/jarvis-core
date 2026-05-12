// JARVIS Dashboard - Main JavaScript
// Global initialization and utilities

(function() {
  'use strict';

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeSpringAnimations();
    initializeTooltips();
    initializeMobileMenu();
    initializeResponsiveTables();
  });

  // =============================================
  // Navigation Active State
  // =============================================
  function initializeNavigation() {
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    var navLinks = document.querySelectorAll('nav a');

    navLinks.forEach(function(link) {
      var href = link.getAttribute('href');
      if (href === currentPage || (currentPage === '' && href === 'index.html')) {
        link.classList.add('text-white', 'bg-white', 'bg-opacity-10');
        link.classList.remove('text-zinc-400');
      }
    });
  }

  // =============================================
  // Spring Animations
  // =============================================
  function initializeSpringAnimations() {
    var interactiveElements = document.querySelectorAll('button, a[href], .glass');
    interactiveElements.forEach(function(el) {
      if (!el.classList.contains('no-spring')) {
        el.classList.add('animate-spring-scale');
      }
    });

    var cards = document.querySelectorAll('.glass, .bento-card');
    cards.forEach(function(card, index) {
      card.style.animationDelay = (index * 50) + 'ms';
      card.classList.add('animate-spring');
    });
  }

  // =============================================
  // Tooltips
  // =============================================
  function initializeTooltips() {
    var tooltipElements = document.querySelectorAll('[data-tooltip]');
    tooltipElements.forEach(function(el) {
      el.addEventListener('mouseenter', function(e) {
        var tooltip = document.createElement('div');
        tooltip.className = 'tooltip glass px-3 py-2 text-xs text-zinc-400 rounded-lg';
        tooltip.textContent = this.getAttribute('data-tooltip');
        tooltip.style.position = 'absolute';
        tooltip.style.zIndex = '9999';
        document.body.appendChild(tooltip);

        var rect = this.getBoundingClientRect();
        tooltip.style.top = (rect.top - tooltip.offsetHeight - 8) + 'px';
        tooltip.style.left = (rect.left + (rect.width - tooltip.offsetWidth) / 2) + 'px';

        this._tooltip = tooltip;
      });

      el.addEventListener('mouseleave', function() {
        if (this._tooltip) {
          this._tooltip.remove();
          this._tooltip = null;
        }
      });
    });
  }

  // =============================================
  // Mobile Menu
  // =============================================
  function initializeMobileMenu() {
    var toggle = document.querySelector('[data-sidebar-toggle]');
    var sidebar = document.querySelector('aside');
    var overlay = document.querySelector('.sidebar-overlay');

    if (!toggle || !sidebar) return;

    function openSidebar() {
      sidebar.classList.add('is-open');
      if (overlay) overlay.classList.add('is-visible');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      // Focus first link for accessibility
      var firstLink = sidebar.querySelector('a');
      if (firstLink) firstLink.focus();
    }

    function closeSidebar() {
      sidebar.classList.remove('is-open');
      if (overlay) overlay.classList.remove('is-visible');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      toggle.focus();
    }

    function toggleSidebar() {
      if (sidebar.classList.contains('is-open')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    }

    // Toggle click
    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      toggleSidebar();
    });

    // Overlay click
    if (overlay) {
      overlay.addEventListener('click', closeSidebar);
    }

    // Close on nav link click (mobile only)
    var navLinks = sidebar.querySelectorAll('a');
    navLinks.forEach(function(link) {
      link.addEventListener('click', function() {
        if (window.innerWidth < 1024) {
          closeSidebar();
        }
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && sidebar.classList.contains('is-open')) {
        closeSidebar();
      }
    });

    // Close on resize to desktop
    window.addEventListener('resize', function() {
      if (window.innerWidth >= 1024 && sidebar.classList.contains('is-open')) {
        closeSidebar();
      }
    });

    // Swipe to close
    var touchStartX = 0;
    document.addEventListener('touchstart', function(e) {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    document.addEventListener('touchend', function(e) {
      var touchEndX = e.changedTouches[0].screenX;
      if (touchEndX < touchStartX - 60 && sidebar.classList.contains('is-open')) {
        closeSidebar();
      }
    }, { passive: true });
  }

  // =============================================
  // Responsive Tables
  // =============================================
  function initializeResponsiveTables() {
    var tables = document.querySelectorAll('table');
    tables.forEach(function(table) {
      // Only wrap if not already wrapped
      var parent = table.parentNode;
      if (parent && parent.classList.contains('table-responsive')) return;

      var wrapper = document.createElement('div');
      wrapper.className = 'table-responsive';
      parent.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  // =============================================
  // Utilities
  // =============================================
  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  function formatDate(dateStr) {
    var date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function timeAgo(dateStr) {
    var date = new Date(dateStr);
    var now = new Date();
    var seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
  }

  // =============================================
  // Mock Actions & Toast
  // =============================================
  function mockAction(action, data) {
    console.log('Mock action: ' + action, data);
    showToast(action + ' - This is a demo');
  }

  function showToast(message) {
    var toast = document.createElement('div');
    toast.className = 'fixed bottom-6 right-6 left-6 md:left-auto glass px-4 py-3 text-sm text-zinc-300 rounded-xl z-50 animate-spring';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
  }

  // Export
  window.JARVIS = {
    mockAction: mockAction,
    showToast: showToast,
    formatNumber: formatNumber,
    formatDate: formatDate,
    timeAgo: timeAgo
  };
})();
