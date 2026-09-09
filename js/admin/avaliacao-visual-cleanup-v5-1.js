(() => {
    'use strict';

    const VERSION = '5.1.0';

    function removeNode(selector) {
        document.querySelectorAll(selector).forEach((el) => {
            try { el.remove(); } catch (_) {}
        });
    }

    function cleanupLegacyEvaluationUI() {
        /*
         * V4 continua responsável por:
         * - interface atual de fotos
         * - upload
         * - IA
         * - histórico
         * - liberação ao aluno
         *
         * Este módulo remove somente elementos temporários e V3.
         */
        removeNode('#cfAfV4Overview');
        removeNode('#cfAfV4Health');

        removeNode('#cfAfSection');
        removeNode('#cfAfStepsStatic');

        document.querySelectorAll('.cf-af-section').forEach((el) => {
            if (el.id !== 'cfAfV4Section') {
                try { el.remove(); } catch (_) {}
            }
        });

        document.querySelectorAll('.cf-af-steps').forEach((el) => {
            if (el.id !== 'cfAfV4Steps') {
                try { el.remove(); } catch (_) {}
            }
        });

        window.__CORPOFITNESS_AVALIACAO_VISUAL_CLEANUP_VERSION__ = VERSION;
    }

    function start() {
        cleanupLegacyEvaluationUI();

        const observer = new MutationObserver(() => {
            cleanupLegacyEvaluationUI();
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        [250, 600, 1200, 2200, 4000].forEach((ms) => {
            setTimeout(cleanupLegacyEvaluationUI, ms);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();
