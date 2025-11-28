/**
 * Video Delay Control Script
 * Controls video player and reveals hidden content based on video playback time
 * Automatically uses the first smartplayer instance found (no videoId needed for single video pages)
 * 
 * @param {Object} config - Configuration object
 * @param {number} config.secondsToDisplay - Seconds of video playback before revealing content
 * @param {string} config.delayedContentSelector - CSS selector for delayed content (default: "#delayed-content")
 * @param {string} config.delayClass - CSS class to remove when revealing (default: "atomicat-delay")
 * @param {string} config.showClass - CSS class to add when revealing (default: "show")
 * @param {string} config.storageKey - localStorage key to track if already displayed (optional)
 * @param {string} config.scrollToId - Element ID to scroll to after reveal (optional)
 * @param {number} config.maxAttempts - Maximum attempts to find video player (default: 20)
 * @param {number} config.retryDelay - Delay between retry attempts in ms (default: 1000)
 * @param {boolean} config.debug - Enable debug logging (default: false)
 */

(function(window) {
  'use strict';

  // Default configuration
  const DEFAULT_CONFIG = {
    secondsToDisplay: 1729,
    delayedContentSelector: '#delayed-content',
    delayClass: 'atomicat-delay',
    showClass: 'show',
    storageKey: null,
    scrollToId: null,
    maxAttempts: 20,
    retryDelay: 1000,
    debug: false
  };

  /**
   * Video Delay Controller Class
   */
  class VideoDelayController {
    constructor(config = {}) {
      this.config = { ...DEFAULT_CONFIG, ...config };
      this.attempts = 0;
      this.isDisplayed = false;
      this.videoInstance = null;
      this.timeUpdateHandler = null;
      this.intervalId = null;
      
      // Check if already displayed
      if (this.config.storageKey) {
        const alreadyDisplayed = localStorage.getItem(this.config.storageKey);
        if (alreadyDisplayed === 'true') {
          this.log('Content already displayed, revealing immediately');
          setTimeout(() => this.revealContent(), 100);
          return;
        }
      }

      // Start watching video progress
      this.startWatching();
    }

    log(...args) {
      if (this.config.debug) {
        console.log('[VideoDelayController]', ...args);
      }
    }

    error(...args) {
      console.error('[VideoDelayController]', ...args);
    }

    /**
     * Reveal the delayed content
     */
    revealContent() {
      if (this.isDisplayed) {
        this.log('Content already displayed');
        return;
      }

      this.isDisplayed = true;
      this.log('Revealing delayed content');

      try {
        // Remove delay class from all elements
        const delayedElements = document.querySelectorAll(`.${this.config.delayClass}`);
        delayedElements.forEach(el => {
          el.classList.remove(this.config.delayClass);
        });

        // Show delayed content container
        const delayedContent = document.querySelector(this.config.delayedContentSelector);
        if (delayedContent) {
          delayedContent.classList.add(this.config.showClass);
          delayedContent.setAttribute('aria-hidden', 'false');
        }

        // Scroll to #kits section after a delay to ensure content is visible
        setTimeout(() => {
          const kitsSection = document.getElementById('kits');
          if (kitsSection) {
            // Scroll to the kits section, positioning it at the top of the viewport
            kitsSection.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start',
              inline: 'nearest'
            });
          }
        }, 500);

        // Save to localStorage if configured
        if (this.config.storageKey) {
          localStorage.setItem(this.config.storageKey, 'true');
        }

        // Scroll to element if configured (fallback for custom scrollToId)
        if (this.config.scrollToId && this.config.scrollToId !== this.config.delayedContentSelector.replace('#', '')) {
          const scrollElement = document.getElementById(this.config.scrollToId);
          if (scrollElement) {
            scrollElement.scrollIntoView({ behavior: 'smooth' });
          }
        }

        // Clear interval if running
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }

        // Remove event listener if video instance exists
        if (this.videoInstance && this.timeUpdateHandler) {
          try {
            // Try different methods to remove event listener
            if (typeof this.videoInstance.off === 'function') {
              this.videoInstance.off('timeupdate', this.timeUpdateHandler);
            } else if (typeof this.videoInstance.removeEventListener === 'function') {
              this.videoInstance.removeEventListener('timeupdate', this.timeUpdateHandler);
            } else if (this.videoInstance.video && typeof this.videoInstance.video.removeEventListener === 'function') {
              this.videoInstance.video.removeEventListener('timeupdate', this.timeUpdateHandler);
            }
          } catch (e) {
            this.log('Could not remove event listener:', e);
          }
        }

      } catch (error) {
        this.error('Error revealing content:', error);
      }
    }

    /**
     * Get video instance from smartplayer
     * Automatically uses the first instance (for single video pages)
     */
    getVideoInstance() {
      if (typeof smartplayer === 'undefined' || !smartplayer.instances || !smartplayer.instances.length) {
        return null;
      }

      // Always use the first instance (simplified for single video pages)
      return smartplayer.instances[0];
    }

    /**
     * Start watching video progress
     */
    startWatching() {
      if (this.isDisplayed) {
        this.log('Content already displayed, skipping watch');
        return;
      }

      this.videoInstance = this.getVideoInstance();

      if (!this.videoInstance) {
        if (this.attempts >= this.config.maxAttempts) {
          this.error('Max attempts reached, revealing content anyway');
          this.revealContent();
          return;
        }

        this.attempts++;
        this.log(`Video instance not found, retrying (${this.attempts}/${this.config.maxAttempts})`);
        
        setTimeout(() => {
          this.startWatching();
        }, this.config.retryDelay);

        return;
      }

      this.log('Video instance found, starting to watch progress');
      this.log(`Will reveal content at ${this.config.secondsToDisplay} seconds`);

      // Create timeupdate handler
      this.timeUpdateHandler = () => {
        if (this.isDisplayed) return;

        const currentTime = this.videoInstance?.video?.currentTime || 0;
        
        // Skip if video is autoplaying (might be paused)
        if (this.videoInstance.smartAutoPlay && currentTime === 0) {
          return;
        }

        if (currentTime >= this.config.secondsToDisplay) {
          this.revealContent();
        }
      };

      // Attach event listener
      this.videoInstance.on('timeupdate', this.timeUpdateHandler);

      // Log every second to console
      this.intervalId = setInterval(() => {
        if (this.isDisplayed) {
          clearInterval(this.intervalId);
          return;
        }
        
        const currentTime = this.videoInstance?.video?.currentTime || 0;
        console.log(`[Video Delay] Current: ${currentTime.toFixed(2)}s | Delay: ${this.config.secondsToDisplay}s | Remaining: ${Math.max(0, (this.config.secondsToDisplay - currentTime).toFixed(2))}s`);
      }, 1000);

      // Also check immediately in case video is already past the threshold
      if (this.videoInstance.video && this.videoInstance.video.currentTime >= this.config.secondsToDisplay) {
        this.revealContent();
      }
    }

    /**
     * Manually trigger reveal (for testing or external control)
     */
    forceReveal() {
      this.log('Force revealing content');
      this.revealContent();
    }

    /**
     * Cleanup - remove event listeners
     */
    destroy() {
      // Clear interval if running
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      if (this.videoInstance && this.timeUpdateHandler) {
        try {
          // Try different methods to remove event listener
          if (typeof this.videoInstance.off === 'function') {
            this.videoInstance.off('timeupdate', this.timeUpdateHandler);
          } else if (typeof this.videoInstance.removeEventListener === 'function') {
            this.videoInstance.removeEventListener('timeupdate', this.timeUpdateHandler);
          } else if (this.videoInstance.video && typeof this.videoInstance.video.removeEventListener === 'function') {
            this.videoInstance.video.removeEventListener('timeupdate', this.timeUpdateHandler);
          }
        } catch (e) {
          this.log('Could not remove event listener:', e);
        }
      }
      this.videoInstance = null;
      this.timeUpdateHandler = null;
    }
  }

  /**
   * Initialize video delay control
   * Can be called with configuration object
   */
  window.initVideoDelayControl = function(config = {}) {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        return new VideoDelayController(config);
      });
    } else {
      return new VideoDelayController(config);
    }
  };

  // Auto-initialize if config is provided via data attribute or global variable
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

  function autoInit() {
    // Check for global config
    if (window.VIDEO_DELAY_CONFIG) {
      window.initVideoDelayControl(window.VIDEO_DELAY_CONFIG);
    }
    // Check for data attribute on script tag
    else {
      const script = document.querySelector('script[data-video-delay-config]');
      if (script) {
        try {
          const config = JSON.parse(script.getAttribute('data-video-delay-config'));
          window.initVideoDelayControl(config);
        } catch (e) {
          console.error('Invalid video delay config:', e);
        }
      }
    }
  }

})(window);

