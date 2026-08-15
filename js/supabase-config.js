(function () {
    'use strict';

    window.CF_SUPABASE_CONFIG = Object.freeze({
        url: 'https://rylbznbtrrsuyzxgsivg.supabase.co',
        publishableKey: 'sb_publishable_3xR7VpxN0s-nIgn6t2COGA_3n9dnoBC'
    });

    if (!window.supabase?.createClient) {
        throw new Error('O cliente Supabase não foi carregado. Verifique a conexão ou a política CSP.');
    }

    window._supabase = window.supabase.createClient(
        window.CF_SUPABASE_CONFIG.url,
        window.CF_SUPABASE_CONFIG.publishableKey,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storageKey: 'corpofitness.auth'
            }
        }
    );
})();
