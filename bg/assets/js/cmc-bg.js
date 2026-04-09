/**
 * VSL Tracking Script for ClickMagick + BuyGoods
 * Handles VSL_Lead and VSL_Pitch events based on video time
 * Appends subid/subid2/subid3/subid4 from URL params to checkout links
 */

(function() {
    console.log("[VSL Tracker] Script loaded");

    // Get parameters from window object or use defaults
    const VSL_Lead_SEC = window.VSL_Lead_SEC || 30;
    const VSL_Pitch_SEC = window.VSL_Pitch_SEC || 60;

    console.log("[VSL Tracker] VSL_Lead_SEC:", VSL_Lead_SEC);
    console.log("[VSL Tracker] VSL_Pitch_SEC:", VSL_Pitch_SEC);

    // Event tracking flags
    let events = {
        pageView: false,
        vslPlay: false,
        vslLead: false,
        vslPitch: false
    };

    // Cached country code
    let countryCode = null;

    /**
     * Get clickid from URL parameter or cookie
     */
    function getClickId() {
        const urlParams = new URLSearchParams(window.location.search);
        const cmcVid = urlParams.get('cmc_vid');

        if (cmcVid) {
            setCookie('cmc-clickid-store', cmcVid, 30);
            return cmcVid;
        }

        const storedClickId = getCookie('cmc-clickid-store');
        if (storedClickId) return storedClickId;

        const cmcVidCookie = getCookie('cmc_vid');
        if (cmcVidCookie) return cmcVidCookie;

        return null;
    }

    /**
     * Set cookie with expiration
     */
    function setCookie(name, value, days) {
        let expires = '';
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = '; expires=' + date.toUTCString();
        }
        document.cookie = name + '=' + value + expires + '; path=/';
    }

    /**
     * Get cookie value
     */
    function getCookie(name) {
        const nameEQ = name + '=';
        const cookies = document.cookie.split(';');

        for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i].trim();
            if (cookie.indexOf(nameEQ) === 0) {
                return cookie.substring(nameEQ.length);
            }
        }
        return null;
    }

    /**
     * Get country code (cached, very fast)
     */
    function getCountryCode() {
        if (countryCode) return countryCode;

        const cached = getCookie('cmc-country');
        if (cached) {
            countryCode = cached;
            return countryCode;
        }

        fetch('https://www.cloudflare.com/cdn-cgi/trace')
            .then(res => res.text())
            .then(data => {
                const match = data.match(/loc=([A-Z]{2})/);
                if (match) {
                    countryCode = match[1];
                    setCookie('cmc-country', countryCode, 1);
                }
            })
            .catch(() => {
                countryCode = 'XX';
            });

        return countryCode || 'XX';
    }

    /**
     * Send postback event
     */
    function sendPostback(eventType, clickId) {
        if (!clickId) return;

        let postbackUrl = '';
        const country = getCountryCode();

        switch (eventType) {
            case 'PageView':
                postbackUrl = `https://www.clkmg.com/api/a/post/?uid=206113&s1=${clickId}&ref=PageView&cmc_country=${country}`;
                break;
            case 'VSL_Play':
                postbackUrl = `https://www.clkmg.com/api/a/post/?uid=206113&s1=${clickId}&ref=VSL_Play&cmc_country=${country}`;
                break;
            case 'VSL_Lead':
                postbackUrl = `https://www.clkmg.com/api/a/post/?uid=206113&s1=${clickId}&ref=VSL_Lead&cmc_country=${country}`;
                break;
            case 'VSL_Pitch':
                postbackUrl = `https://www.clkmg.com/api/e/post/?uid=206113&s1=${clickId}&ref=VSL_Pitch&cmc_country=${country}`;
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
     * Handle PageView postback
     */
    function handlePageViewPostback(clickId) {
        if (!events.pageView && clickId) {
            events.pageView = true;
            sendPostback('PageView', clickId);
            console.log('[VSL Tracker] PageView triggered');
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
            attachPostbackTracking(player, clickId);
            player._postbacksAttached = true;
        } else {
            console.error('[VSL Tracker] SmartPlayer instance not found.');
        }
    }

    /**
     * Attach postback tracking to video player
     */
    function attachPostbackTracking(player, clickId) {
        player.on('timeupdate', function() {
            const currentTime = player.video.currentTime;

            if (!events.vslPlay && currentTime >= 5) {
                events.vslPlay = true;
                sendPostback('VSL_Play', clickId);
                console.log('[VSL Tracker] VSL_Play triggered at 5 seconds');
            }

            if (!events.vslLead && currentTime >= VSL_Lead_SEC) {
                events.vslLead = true;
                sendPostback('VSL_Lead', clickId);
                console.log('[VSL Tracker] VSL_Lead triggered at', currentTime, 'seconds (threshold:', VSL_Lead_SEC, ')');
            }

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
    function initTracking(clickId, retryCount) {
        retryCount = retryCount || 0;
        if (typeof smartplayer !== 'undefined' &&
            smartplayer.instances &&
            smartplayer.instances.length) {
            initSmartPlayerTracking(clickId);
        } else {
            if (retryCount >= 10) {
                console.error('[VSL Tracker] SmartPlayer not found after 10 retries.');
                return;
            }
            console.log(`[VSL Tracker] Retry #${retryCount + 1} in 1000ms`);
            setTimeout(() => initTracking(clickId, retryCount + 1), 1000);
        }
    }

    /**
     * Append tracking params to BuyGoods checkout links
     */
    function patchCheckoutLinks() {
        var p = new URLSearchParams(window.location.search);
        var params = {
            subid:  p.get('utm_source')   || '',
            subid2: p.get('utm_campaign')  || '',
            subid3: p.get('pid')           || '',
            subid4: p.get('utm_content')   || ''
        };
        var selector = 'a[href*="buygoods.com/secure/checkout"]';

        function buildSuffix() {
            var parts = [];
            for (var key in params) {
                if (params[key]) parts.push(key + '=' + encodeURIComponent(params[key]));
            }
            return parts.join('&');
        }

        function patch() {
            var suffix = buildSuffix();
            if (!suffix) return;
            document.querySelectorAll(selector).forEach(function(a) {
                var href = a.getAttribute('href');
                if (href.indexOf('subid=') === -1) {
                    a.setAttribute('href', href + '&' + suffix);
                }
            });
        }

        patch();

        // Also patch on click as safety net
        document.addEventListener('click', function(e) {
            var a = e.target.closest(selector);
            if (a) {
                var href = a.getAttribute('href');
                if (href.indexOf('subid=') === -1) {
                    var suffix = buildSuffix();
                    if (suffix) a.setAttribute('href', href + '&' + suffix);
                }
            }
        }, true);
    }

    /**
     * Main initialization function
     */
    function init() {
        getCountryCode();

        const clickId = getClickId();

        if (clickId) {
            console.log('[VSL Tracker] ClickId found:', clickId);
            handlePageViewPostback(clickId);
            initTracking(clickId);
        } else {
            console.log('[VSL Tracker] No ClickId found');
        }

        // Patch checkout links (runs regardless of clickId)
        patchCheckoutLinks();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
