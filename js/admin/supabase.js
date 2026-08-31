const NEXT_PUBLIC_SUPABASE_URL = 'https://rylbznbtrrsuyzxgsivg.supabase.co';
        const NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_3xR7VpxN0s-nIgn6t2COGA_3n9dnoBC';
        const _supabase = supabase.createClient(
            NEXT_PUBLIC_SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
            {
                auth: {
                    flowType: 'pkce',
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                    storageKey: 'corpofitness.admin.auth'
                }
            }
        );
