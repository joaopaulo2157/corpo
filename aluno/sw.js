// ==================================================
// SERVICE WORKER - CORPOFITNESS ALUNO PWA
// ==================================================
const CACHE_NAME = 'corpofitness-aluno-v6';
const STATIC_ASSETS = [
    'index.html',
    'treinos.html',
    'metas.html',
    'progresso.html',
    'agendamentos.html',
    'financeiro.html',
    'perfil.html',
    'css/style.css',
    'js/script.js',
    'manifest.json'
];

// Instalação do SW e Cache de assets estáticos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Ativação e Limpeza de caches antigos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) return caches.delete(key);
                })
            );
        })
    );
    self.clients.claim();
});

// Estratégia Stale-While-Revalidate para máxima velocidade
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                const fetchedResponse = fetch(event.request).then((networkResponse) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                }).catch(() => cachedResponse);

                return cachedResponse || fetchedResponse;
            });
        })
    );
});
