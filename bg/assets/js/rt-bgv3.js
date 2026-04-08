/**
 * VSL Tracking Script
 * Handles VSL_Lead and VSL_Pitch events based on video time
 * Receives VSL_Lead_SEC and VSL_Pitch_SEC as parameters
 */

(function() {
    console.log("[VSL Tracker] Script loaded");

    // Get parameters from window object or use defaults
    const VSL_Lead_SEC = window.VSL_Lead_SEC || 30;
    const VSL_Pitch_SEC = window.VSL_Pitch_SEC || 60;

    // Postback configuration
    const POSTBACK_TOKEN = window.RT_POSTBACK_TOKEN || "3gpocwafus";
    const POSTBACK_BASE = "https://lmw2o.ttrk.io/postback";

    console.log("[VSL Tracker] VSL_Lead_SEC:", VSL_Lead_SEC);
    console.log("[VSL Tracker] VSL_Pitch_SEC:", VSL_Pitch_SEC);

    // Event tracking flags
    let events = {
        vslPlay: false,
        vslLead: false,
        vslPitch: false,
        viewContent: false
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
            console.log("[VSL Tracker] Tracking ID found in cookie: " + cookieId);
            return cookieId;
        }
        // 2. Try URL params (only explicit clickid params)
        const searchParams = urlObj.searchParams;
        const knownParamNames = ['rtkcid', 'clickid'];
        for (let i = 0; i < knownParamNames.length; i++) {
            if (searchParams.has(knownParamNames[i])) {
                const paramValue = searchParams.get(knownParamNames[i]);
                if (paramValue && paramValue !== 'undefined') {
                    console.log(`[VSL Tracker] Tracking ID found in param ${knownParamNames[i]}: ${paramValue}`);
                    return paramValue;
                }
            }
        }
        // 3. Try sessionStorage (set by unilpclick.js)
        try {
            const sessionId = sessionStorage.getItem('rtkclickid');
            if (sessionId && sessionId !== 'undefined') {
                console.log("[VSL Tracker] Tracking ID found in session: " + sessionId);
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

        switch (eventType) {
            case 'VSL_Play':
                postbackUrl = `${POSTBACK_BASE}?clickid=${clickId}&ptoken=${POSTBACK_TOKEN}&type=VSL_Play&sub18=${clickId}&status=approved`;
                break;
            case 'VSL_Lead':
                postbackUrl = `${POSTBACK_BASE}?clickid=${clickId}&ptoken=${POSTBACK_TOKEN}&type=VSL_Lead&sub18=${clickId}&status=approved`;
                break;
            case 'VSL_Pitch':
                postbackUrl = `${POSTBACK_BASE}?clickid=${clickId}&ptoken=${POSTBACK_TOKEN}&type=VSL_Pitch&sub18=${clickId}&status=approved`;
                break;
            case 'ViewContent':
                postbackUrl = `${POSTBACK_BASE}?clickid=${clickId}&ptoken=${POSTBACK_TOKEN}&type=ViewContent&sub18=${clickId}&status=approved`;
                break;
            default:
                console.error('[VSL Tracker] Unknown event type:', eventType);
                return;
        }

        if (postbackUrl) {
            const img = new Image();
            img.src = postbackUrl;
            console.log(`[Postback: ${eventType}]`, postbackUrl);
        }
    }

    /**
     * Initialize SmartPlayer tracking
     */
    function initSmartPlayerTracking(clickId) {
        const player = typeof smartplayer !== 'undefined' &&
                      smartplayer.instances &&
                      smartplayer.instances.length ?
                      smartplayer.instances[0] : null;

        if (player) {
            console.log('[VSL Tracker] Player instance found:', player);

            // Attach postback tracking to player
            attachPostbackTracking(player, clickId);

            // Mark as attached to prevent duplicates
            player._postbacksAttached = true;

        } else {
            console.error('[VSL Tracker] SmartPlayer instance not found.');
        }
    }

    /**
     * Attach postback tracking to video player
     */
    function attachPostbackTracking(player, clickId) {
        // Track time-based events
        player.on('timeupdate', function() {
            const currentTime = player.video.currentTime;

            // VSL_Play event at 5 seconds (same logic as rt-legacy.js)
            if (!events.vslPlay && currentTime >= 5) {
                events.vslPlay = true;
                sendPostback('VSL_Play', clickId);
                console.log('[VSL Tracker] VSL_Play triggered at 5 seconds');
            }

            // VSL_Lead event at VSL_Lead_SEC seconds
            if (!events.vslLead && currentTime >= VSL_Lead_SEC) {
                events.vslLead = true;
                sendPostback('VSL_Lead', clickId);
                console.log('[VSL Tracker] VSL_Lead triggered at', currentTime, 'seconds (threshold:', VSL_Lead_SEC, ')');
            }

            // VSL_Pitch event at VSL_Pitch_SEC seconds
            if (!events.vslPitch && currentTime >= VSL_Pitch_SEC) {
                events.vslPitch = true;
                sendPostback('VSL_Pitch', clickId);
                console.log('[VSL Tracker] VSL_Pitch triggered at', currentTime, 'seconds (threshold:', VSL_Pitch_SEC, ')');
            }
        });


    }

    /**
     * Initialize tracking with retry mechanism
     */
    function initTracking(clickId, retryCount = 0) {
        if (typeof smartplayer !== 'undefined' &&
            smartplayer.instances &&
            smartplayer.instances.length) {

            initSmartPlayerTracking(clickId);

        } else {
            if (retryCount >= 10) {
                console.error('[VSL Tracker] SmartPlayer not found after 10 retries.');
                return;
            }

            const delay = 1000; // 1 second
            console.log(`[VSL Tracker] Retry #${retryCount + 1} in ${delay}ms`);
            setTimeout(() => initTracking(clickId, retryCount + 1), delay);
        }
    }

    /**
     * Setup ViewContent button handler
     */
    function setupViewContentHandler(clickId) {
        function attachToViewContentButtons() {
            const buttons = document.querySelectorAll('[id="ViewContent"]:not([data-observed])');
            buttons.forEach(btn => {
                btn.dataset.observed = "true";
                function handleViewContentClick() {
                    if (!btn.dataset.postbackFired) {
                        btn.dataset.postbackFired = "true";
                        if (!events.viewContent) {
                            events.viewContent = true;
                            sendPostback('ViewContent', clickId);
                            console.log('[VSL Tracker] ViewContent triggered by button');
                        }
                    }
                }
                // Attach multiple event types for better compatibility
                ['pointerdown', 'click', 'touchstart'].forEach(eventType => {
                    btn.addEventListener(eventType, handleViewContentClick, { once: true });
                });
            });
        }

        // Attach immediately if buttons are present
        attachToViewContentButtons();

        // Watch for dynamically inserted buttons
        const observer = new MutationObserver(attachToViewContentButtons);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    /**
     * Main initialization function
     */
    function init() {
        const urlObj = new URL(window.location.href);
        const clickId = findClickId(urlObj);

        if (clickId) {
            console.log('[VSL Tracker] ClickId found:', clickId);
            initTracking(clickId);
            setupViewContentHandler(clickId);
        } else {
            console.log('[VSL Tracker] No ClickId found');
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
