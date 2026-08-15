(function () {
    'use strict';

    const FALLBACK_IMAGE = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">' +
        '<rect width="800" height="600" fill="#111827"/><path d="M300 390l80-90 65 70 55-55 100 105H200z" fill="#2563eb"/>' +
        '<circle cx="520" cy="205" r="38" fill="#60a5fa"/><text x="400" y="505" fill="#e5e7eb" font-family="Arial" font-size="28" text-anchor="middle">Corpofitness</text></svg>'
    );

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function escapeJsString(value) {
        return String(value ?? '')
            .replaceAll('\\', '\\\\')
            .replaceAll("'", "\\'")
            .replaceAll('\r', '\\r')
            .replaceAll('\n', '\\n')
            .replaceAll('<', '\\x3c')
            .replaceAll('>', '\\x3e')
            .replaceAll('&', '\\x26')
            .replaceAll('\u2028', '\\u2028')
            .replaceAll('\u2029', '\\u2029');
    }

    function safeUrl(value, fallback = '#', options = {}) {
        const raw = String(value ?? '').trim();
        if (!raw) return fallback;
        if (raw.startsWith('#') && options.allowHash !== false) return raw;

        try {
            const parsed = new URL(raw, window.location.origin);
            const allowed = parsed.protocol === 'https:' ||
                (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname));
            if (!allowed) return fallback;
            if (options.sameOrigin && parsed.origin !== window.location.origin) return fallback;
            return parsed.href;
        } catch (_) {
            return fallback;
        }
    }

    function safeImageUrl(value, fallback = FALLBACK_IMAGE) {
        const raw = String(value ?? '').trim();
        if (raw.startsWith('data:image/') && raw.length <= 2_000_000 && !/svg\+xml/i.test(raw)) return raw;
        return safeUrl(raw, fallback, { allowHash: false });
    }

    function safeMediaUrl(value, fallback = '') {
        return safeUrl(value, fallback, { allowHash: false });
    }

    function safeId(value) {
        const id = String(value ?? '');
        return /^[a-zA-Z0-9_-]{1,128}$/.test(id) ? id : '';
    }

    function safeIconClass(value, fallback = 'fas fa-dumbbell') {
        const icon = String(value ?? '').trim();
        return /^[a-zA-Z0-9_-]+(?:\s+[a-zA-Z0-9_-]+){0,4}$/.test(icon) ? icon : fallback;
    }

    function normalizeText(value, maxLength = 5000) {
        return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, maxLength);
    }

    window.CF_SECURITY = Object.freeze({
        FALLBACK_IMAGE,
        escapeHtml,
        escapeJsString,
        safeUrl,
        safeImageUrl,
        safeMediaUrl,
        safeId,
        safeIconClass,
        normalizeText
    });
    // Aliases globais para páginas legadas que ainda possuem scripts inline.
    window.cfEsc = escapeHtml;
    window.cfEscJs = escapeJsString;
    window.cfSafeUrl = safeUrl;
    window.cfSafeImage = safeImageUrl;
    window.cfSafeMedia = safeMediaUrl;
    window.cfSafeId = safeId;
    window.cfSafeIcon = safeIconClass;
    window.cfText = normalizeText;
})();
