/**
 * RT DTC Tracking Script
 * Fires two events:
 *   - PageView_DTC : on page load (after Meta Pixel sets _fbp)
 *   - AddToCart    : when an element with id="AddToCart" is clicked
 */

(function() {
    console.log("[RT DTC] Script loaded");

    // Postback configuration
    const POSTBACK_TOKEN = window.RT_POSTBACK_TOKEN || "3gpocwafus";
    const POSTBACK_BASE = "https://lmw2o.ttrk.io/postback";

    // Event tracking flags
    let events = {
        pageView: false,
        addToCart: false
    };

    /**
     * Get cookie value (RedTrack style)
     */
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    /**
     * Find click ID using RedTrack logic
     */
    function findClickId(urlObj) {
        // 1. Try cookie (set by unilpclick.js)
        const cookieId = getCookie('rtkclickid-store');
        if (cookieId && cookieId !== 'undefined') {
            console.log("[RT DTC] Tracking ID found in cookie: " + cookieId);
            return cookieId;
        }
        // 2. Try URL params (only explicit clickid params)
        const searchParams = urlObj.searchParams;
        const knownParamNames = ['rtkcid', 'clickid'];
        for (let i = 0; i < knownParamNames.length; i++) {
            if (searchParams.has(knownParamNames[i])) {
                const paramValue = searchParams.get(knownParamNames[i]);
                if (paramValue && paramValue !== 'undefined') {
                    console.log(`[RT DTC] Tracking ID found in param ${knownParamNames[i]}: ${paramValue}`);
                    return paramValue;
                }
            }
        }
        // 3. Try sessionStorage (set by unilpclick.js)
        try {
            const sessionId = sessionStorage.getItem('rtkclickid');
            if (sessionId && sessionId !== 'undefined') {
                console.log("[RT DTC] Tracking ID found in session: " + sessionId);
                return sessionId;
            }
        } catch (e) {}
        return null;
    }

    /**
     * Send postback event
     */
    function sendPostback(eventType, clickId) {
        if (!clickId) return;

        let postbackUrl = '';
        var fbp = encodeURIComponent(getCookie('_fbp') || '');
        var fbc = encodeURIComponent(getCookie('_fbc') || '');
        var fbParams = `&sub19=${fbp}&sub20=${fbc}`;

        switch (eventType) {
            case 'PageView_DTC':
                postbackUrl = `${POSTBACK_BASE}?clickid=${clickId}&ptoken=${POSTBACK_TOKEN}&type=PageView_DTC&eventid=${clickId}&sub18=${clickId}${fbParams}&status=approved`;
                break;
            case 'AddToCart':
                postbackUrl = `${POSTBACK_BASE}?clickid=${clickId}&ptoken=${POSTBACK_TOKEN}&type=AddToCart&sub18=${clickId}${fbParams}&status=approved`;
                break;
            default:
                console.error('[RT DTC] Unknown event type:', eventType);
                return;
        }

        if (postbackUrl) {
            // AddToCart is followed by a redirect to checkout — use sendBeacon
            // to guarantee delivery even if the browser starts navigating away.
            if (eventType === 'AddToCart' && navigator.sendBeacon) {
                const sent = navigator.sendBeacon(postbackUrl);
                console.log(`[Postback: ${eventType}] sendBeacon`, sent, postbackUrl);
                if (sent) return;
                // fall through to image fallback if sendBeacon returned false
            }
            const img = new Image();
            img.src = postbackUrl;
            console.log(`[Postback: ${eventType}]`, postbackUrl);
        }
    }

    /**
     * Setup AddToCart button handler (document-level capture)
     * Fires when any element matching #AddToCart (or its children) is clicked.
     * - Document-level listener: survives DOM re-renders, works for dynamic content
     * - Capture phase: immune to other scripts' stopPropagation()
     * - Uses closest() to match nested clicks (e.g., icon inside button)
     */
    function setupAddToCartHandler(clickId) {
        document.addEventListener('click', function(e) {
            if (e.target && e.target.closest && e.target.closest('#AddToCart')) {
                if (!events.addToCart) {
                    events.addToCart = true;
                    sendPostback('AddToCart', clickId);
                    console.log('[RT DTC] AddToCart triggered by button');
                }
            }
        }, { capture: true });
    }

    /**
     * Wait for Meta Pixel to set _fbp cookie before firing PageView_DTC.
     * Polls every 500ms for up to 10s. If _fbp never appears, PageView_DTC is skipped.
     * (_fbc only exists for Facebook traffic — _fbp is the universal signal.)
     */
    function waitForFbpThenFirePageView(clickId, attempt) {
        if (events.pageView) return;
        var fbp = getCookie('_fbp');
        if (fbp) {
            events.pageView = true;
            sendPostback('PageView_DTC', clickId);
            console.log('[RT DTC] PageView_DTC triggered (after _fbp set, attempt ' + attempt + ')');
            return;
        }
        if (attempt >= 20) {
            console.log('[RT DTC] _fbp not set after 10s — PageView_DTC skipped');
            return;
        }
        setTimeout(function() { waitForFbpThenFirePageView(clickId, attempt + 1); }, 500);
    }

    /**
     * Main initialization function with retry for async cookie
     */
    function init(retryCount) {
        retryCount = retryCount || 0;
        const urlObj = new URL(window.location.href);
        const clickId = findClickId(urlObj);

        if (clickId) {
            console.log('[RT DTC] ClickId found:', clickId);
            // PageView_DTC fires once Meta Pixel has set _fbp (so deduplication works).
            // Wait up to ~10s; if _fbp never appears, skip PageView_DTC.
            waitForFbpThenFirePageView(clickId, 0);
            setupAddToCartHandler(clickId);
        } else if (retryCount < 10) {
            console.log('[RT DTC] No ClickId yet, retry #' + (retryCount + 1) + ' in 1s');
            setTimeout(function() { init(retryCount + 1); }, 1000);
        } else {
            console.log('[RT DTC] No ClickId found after 10 retries');
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { init(0); });
    } else {
        init(0);
    }

})();
