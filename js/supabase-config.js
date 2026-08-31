(function () {
  'use strict';
  window.CF_SUPABASE_CONFIG = Object.freeze({
    url: 'https://rylbznbtrrsuyzxgsivg.supabase.co',
    publishableKey: 'sb_publishable_3xR7VpxN0s-nIgn6t2COGA_3n9dnoBC'
  });
  if (!window.supabase?.createClient) throw new Error('Supabase JS não foi carregado.');
  window._supabase = window.supabase.createClient(
    window.CF_SUPABASE_CONFIG.url,
    window.CF_SUPABASE_CONFIG.publishableKey,
    { auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'corpofitness.aluno.auth'
    }}
  );
})();
