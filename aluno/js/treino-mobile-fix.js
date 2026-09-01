(() => {
  'use strict';

  const PAGE_MATCH = /\/aluno\/treinos-seguro(?:\.html)?\/?$/i;
  if (!PAGE_MATCH.test(location.pathname)) return;

  const state = {
    activeExercise: 0,
    pendingCompletion: null,
    observerBusy: false,
    list: null,
    observer: null
  };

  function forceViewport() {
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.prepend(viewport);
    }

    viewport.setAttribute(
      'content',
      'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content'
    );
  }

  function injectCss() {
    document.getElementById('cf-treino-mobile-fix-v3')?.remove();

    const style = document.createElement('style');
    style.id = 'cf-treino-mobile-fix-v3';
    style.textContent = `
      html, body {
        width: 100% !important;
        max-width: 100% !important;
        overflow-x: hidden !important;
        -webkit-text-size-adjust: 100% !important;
        text-size-adjust: 100% !important;
      }

      body {
        font-size: 16px !important;
      }

      input, textarea, select, button {
        touch-action: manipulation;
      }

      .screen,
      .screen-wide,
      #detailScreen,
      #exerciseList,
      .exercise,
      .ex-head,
      .ex-body,
      .set-table,
      .set-row,
      .set-field,
      .sub-ex,
      .sub-title,
      .prescription,
      .session-strip,
      .bottom-inner {
        min-width: 0 !important;
        max-width: 100% !important;
      }

      .screen,
      .screen-wide {
        width: 100% !important;
        padding-left: max(12px, env(safe-area-inset-left)) !important;
        padding-right: max(12px, env(safe-area-inset-right)) !important;
      }

      .exercise {
        scroll-margin-top: 145px;
      }

      .exercise.cf-next-exercise {
        outline: 2px solid rgba(96,165,250,.75);
        outline-offset: 2px;
        animation: cfPulse .8s ease-out 1;
      }

      @keyframes cfPulse {
        0% { transform: scale(.992); }
        100% { transform: scale(1); }
      }

      .ex-head {
        grid-template-columns: 52px minmax(0, 1fr) 40px !important;
        gap: 9px !important;
        padding: 12px 10px !important;
      }

      .ex-head > div:nth-child(2) {
        min-width: 0 !important;
      }

      .ex-thumb {
        width: 52px !important;
        height: 52px !important;
      }

      .ex-num {
        font-size: 12px !important;
      }

      .ex-head h3 {
        font-size: 16px !important;
        line-height: 1.28 !important;
        overflow-wrap: anywhere !important;
      }

      .ex-meta {
        font-size: 12px !important;
        line-height: 1.45 !important;
        overflow-wrap: anywhere !important;
      }

      .chip,
      .conj-banner,
      .no-video,
      .details-link {
        font-size: 12px !important;
      }

      .video-btn {
        min-height: 44px !important;
        font-size: 13px !important;
      }

      .set-row {
        width: 100% !important;
        grid-template-columns: 30px minmax(0, 1fr) minmax(0, 1fr) 44px !important;
        gap: 6px !important;
        padding: 8px 6px !important;
      }

      .set-field {
        min-width: 0 !important;
      }

      .set-field label {
        display: block !important;
        font-size: 11px !important;
        line-height: 1.2 !important;
        white-space: normal !important;
      }

      /* Safari/iPhone aplica zoom automático quando o input tem menos de 16px.
         Usamos 18px e também inline style via JS para máxima compatibilidade. */
      input.set-input,
      .set-input,
      .reps-input,
      .load-input,
      #detailRpe,
      #detailRir,
      #detailObs,
      input[type="text"],
      input[type="number"],
      input[type="tel"],
      textarea,
      select {
        min-width: 0 !important;
        width: 100% !important;
        font-size: 18px !important;
        line-height: 1.3 !important;
      }

      .set-input {
        min-height: 44px !important;
        padding: 8px 2px !important;
      }

      .set-input:focus,
      .reps-input:focus,
      .load-input:focus {
        font-size: 18px !important;
        transform: none !important;
      }

      .check-set {
        width: 42px !important;
        height: 42px !important;
      }

      .bottom-inner {
        width: 100% !important;
      }

      @media (max-width: 390px) {
        .screen {
          padding-left: 10px !important;
          padding-right: 10px !important;
          padding-bottom: 118px !important;
        }

        .ex-head {
          grid-template-columns: 46px minmax(0, 1fr) 38px !important;
          gap: 7px !important;
          padding: 10px 8px !important;
        }

        .ex-thumb {
          width: 46px !important;
          height: 46px !important;
        }

        .ex-body {
          padding: 10px 7px 12px !important;
        }

        .set-row {
          grid-template-columns: 28px minmax(0, 1fr) minmax(0, 1fr) 40px !important;
          gap: 4px !important;
          padding: 7px 5px !important;
        }

        .check-set {
          width: 40px !important;
          height: 40px !important;
        }
      }

      @media (max-width: 340px) {
        .set-row {
          grid-template-columns: 27px minmax(0, 1fr) minmax(0, 1fr) 38px !important;
        }

        .check-set {
          width: 38px !important;
          height: 38px !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function configureInputs(root = document) {
    root.querySelectorAll('.reps-input').forEach(input => {
      input.setAttribute('inputmode', 'numeric');
      input.setAttribute('enterkeyhint', 'next');
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('autocorrect', 'off');
      input.setAttribute('spellcheck', 'false');
      input.style.setProperty('font-size', '18px', 'important');
    });

    root.querySelectorAll('.load-input').forEach(input => {
      input.setAttribute('inputmode', 'decimal');
      input.setAttribute('enterkeyhint', 'done');
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('autocorrect', 'off');
      input.setAttribute('spellcheck', 'false');
      input.style.setProperty('font-size', '18px', 'important');
    });
  }

  function exercises() {
    return [...document.querySelectorAll('#exerciseList .exercise[data-exercise]')];
  }

  function openOnly(index, shouldScroll = false) {
    const cards = exercises();
    if (!cards.length) return;

    const target = cards.find(card => Number(card.dataset.exercise) === Number(index));
    if (!target) return;

    state.observerBusy = true;

    cards.forEach(card => {
      card.classList.toggle('open', card === target);
    });

    state.activeExercise = Number(target.dataset.exercise);
    configureInputs(target);

    if (shouldScroll) {
      target.classList.add('cf-next-exercise');

      setTimeout(() => {
        target.classList.remove('cf-next-exercise');
      }, 1000);

      setTimeout(() => {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 120);
    }

    setTimeout(() => {
      state.observerBusy = false;
    }, 0);
  }

  function restoreAfterRender() {
    configureInputs(state.list || document);

    if (state.observerBusy) return;

    const cards = exercises();
    if (!cards.length) return;

    const pending = state.pendingCompletion;

    if (pending) {
      const current = cards.find(
        card => Number(card.dataset.exercise) === pending.exerciseIndex
      );

      if (!current) {
        state.pendingCompletion = null;
        return;
      }

      const nowDone = current.classList.contains('done');

      if (pending.wasLastIncomplete && nowDone) {
        const next = cards.find(
          card => Number(card.dataset.exercise) === pending.exerciseIndex + 1
        );

        state.pendingCompletion = null;

        if (next) {
          openOnly(Number(next.dataset.exercise), true);
        } else {
          openOnly(pending.exerciseIndex, false);
        }

        return;
      }

      state.pendingCompletion = null;
      openOnly(pending.exerciseIndex, false);
      return;
    }

    if (
      state.activeExercise > 0 &&
      cards.some(card => Number(card.dataset.exercise) === state.activeExercise)
    ) {
      openOnly(state.activeExercise, false);
    }
  }

  function handleClickCapture(event) {
    const completeButton = event.target.closest('[data-complete]');

    if (completeButton) {
      const card = completeButton.closest('.exercise[data-exercise]');
      if (!card) return;

      const exerciseIndex = Number(card.dataset.exercise);
      const incompleteRows = [
        ...card.querySelectorAll('.set-row:not(.completed)')
      ];

      const clickedRow = completeButton.closest('.set-row');
      const clickingIncomplete =
        !!clickedRow && !clickedRow.classList.contains('completed');

      state.activeExercise = exerciseIndex;
      state.pendingCompletion = {
        exerciseIndex,
        wasLastIncomplete:
          clickingIncomplete && incompleteRows.length === 1
      };

      return;
    }

    const toggle = event.target.closest('[data-toggle]');

    if (toggle) {
      const card = toggle.closest('.exercise[data-exercise]');
      if (card) {
        state.activeExercise = Number(card.dataset.exercise);
      }
    }
  }

  function attachObserver() {
    const list = document.getElementById('exerciseList');

    if (!list || state.list === list) return;

    state.observer?.disconnect();
    state.list = list;

    state.observer = new MutationObserver(() => {
      requestAnimationFrame(restoreAfterRender);
    });

    state.observer.observe(list, {
      childList: true,
      subtree: false
    });

    configureInputs(list);
  }

  function init() {
    forceViewport();
    injectCss();
    attachObserver();
    configureInputs();

    document.addEventListener('click', handleClickCapture, true);

    const bodyObserver = new MutationObserver(() => {
      attachObserver();
      configureInputs();
    });

    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
