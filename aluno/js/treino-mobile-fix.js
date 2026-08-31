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

  function injectMobileCss() {
    const style = document.createElement('style');
    style.id = 'cf-treino-mobile-fix';
    style.textContent = `
      html, body {
        width: 100%;
        max-width: 100%;
        overflow-x: hidden;
        -webkit-text-size-adjust: 100%;
        text-size-adjust: 100%;
      }
      body { font-size: 16px; }
      button, input, textarea, select { touch-action: manipulation; }
      .screen, .screen-wide {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        padding-left: max(12px, env(safe-area-inset-left)) !important;
        padding-right: max(12px, env(safe-area-inset-right)) !important;
      }
      #detailScreen, #exerciseList, .exercise, .ex-head, .ex-body,
      .set-table, .set-row, .set-field, .sub-ex, .sub-title,
      .prescription, .session-strip, .bottom-inner {
        min-width: 0;
        max-width: 100%;
      }
      .exercise { scroll-margin-top: 145px; }
      .exercise.cf-next-exercise {
        outline: 2px solid rgba(96,165,250,.70);
        outline-offset: 2px;
        animation: cfNextExercisePulse .8s ease-out 1;
      }
      @keyframes cfNextExercisePulse {
        0% { transform: scale(.992); box-shadow: 0 0 0 0 rgba(96,165,250,.35); }
        100% { transform: scale(1); box-shadow: 0 0 0 12px rgba(96,165,250,0); }
      }
      .ex-head {
        grid-template-columns: 54px minmax(0, 1fr) 40px !important;
        gap: 10px !important;
        padding: 13px 12px !important;
      }
      .ex-head > div:nth-child(2) { min-width: 0; }
      .ex-thumb { width: 54px !important; height: 54px !important; }
      .ex-num { font-size: .70rem !important; }
      .ex-head h3 {
        font-size: 1rem !important;
        line-height: 1.28;
        overflow-wrap: anywhere;
      }
      .ex-meta {
        font-size: .72rem !important;
        line-height: 1.45 !important;
        overflow-wrap: anywhere;
      }
      .ex-body { padding: 12px !important; }
      .prescription { gap: 7px !important; }
      .chip { font-size: .70rem !important; line-height: 1.25; }
      .video-btn { font-size: .78rem !important; min-height: 44px; }
      .no-video { font-size: .70rem !important; line-height: 1.4; }
      .conj-banner { font-size: .72rem !important; line-height: 1.45; }
      .sub-title strong { font-size: .82rem !important; }
      .sub-title small { font-size: .68rem !important; line-height: 1.35; }
      .set-table { gap: 8px !important; }
      .set-row {
        width: 100%;
        grid-template-columns: 32px minmax(0, 1fr) minmax(0, 1fr) 44px !important;
        gap: 7px !important;
        padding: 9px 8px !important;
      }
      .set-n { width: 30px !important; height: 34px !important; }
      .set-field { min-width: 0; }
      .set-field label {
        font-size: 11px !important;
        line-height: 1.2;
        white-space: normal;
      }
      .set-input,
      input.set-input,
      .reps-input,
      .load-input,
      #detailRpe,
      #detailRir,
      #detailObs {
        min-width: 0;
        width: 100%;
        font-size: 16px !important;
        line-height: 1.25;
      }
      .set-input {
        min-height: 38px;
        padding: 7px 2px !important;
      }
      .check-set {
        width: 42px !important;
        height: 42px !important;
        align-self: center;
      }
      .details-link {
        font-size: .70rem !important;
        min-height: 36px;
        padding: 7px 4px !important;
      }
      .session-strip {
        top: calc(68px + env(safe-area-inset-top)) !important;
      }
      .session-time { font-size: .80rem !important; }
      .progress-label { font-size: .72rem !important; text-align: right; }
      .bottom-action {
        padding-left: max(10px, env(safe-area-inset-left)) !important;
        padding-right: max(10px, env(safe-area-inset-right)) !important;
      }
      .bottom-inner { width: 100% !important; max-width: 760px; }
      .finish-btn { min-height: 48px; font-size: .90rem; }
      .overlay { padding: 12px !important; }
      .modal {
        width: 100% !important;
        max-width: 520px !important;
        max-height: calc(100dvh - 24px) !important;
      }

      @media (max-width: 390px) {
        .topbar { padding-left: 11px !important; padding-right: 11px !important; }
        .top-logo { max-width: 52vw !important; height: 44px !important; }
        .screen { padding-top: 12px !important; padding-bottom: 118px !important; }
        .detail-head h1 { font-size: 1.05rem !important; }
        .detail-head p { font-size: .72rem !important; }
        .session-strip { padding: 10px !important; }
        .ex-head {
          grid-template-columns: 48px minmax(0, 1fr) 38px !important;
          gap: 8px !important;
          padding: 11px 9px !important;
        }
        .ex-thumb { width: 48px !important; height: 48px !important; border-radius: 13px !important; }
        .expand-btn { width: 36px !important; height: 36px !important; }
        .ex-body { padding: 10px 8px 12px !important; }
        .set-row {
          grid-template-columns: 29px minmax(0, 1fr) minmax(0, 1fr) 42px !important;
          gap: 5px !important;
          padding: 8px 6px !important;
        }
        .set-n { width: 28px !important; }
        .check-set { width: 40px !important; height: 40px !important; }
        .set-field label { font-size: 10px !important; }
      }

      @media (max-width: 340px) {
        .set-row {
          grid-template-columns: 28px minmax(0, 1fr) minmax(0, 1fr) 38px !important;
          gap: 4px !important;
          padding-left: 5px !important;
          padding-right: 5px !important;
        }
        .check-set { width: 38px !important; height: 38px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function improveViewport() {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) return;
    const parts = viewport.content.split(',').map(v => v.trim()).filter(Boolean);
    if (!parts.some(v => /^interactive-widget=/i.test(v))) {
      parts.push('interactive-widget=resizes-content');
    }
    viewport.content = parts.join(', ');
  }

  function configureInputs(root = document) {
    root.querySelectorAll('.reps-input').forEach(input => {
      input.setAttribute('inputmode', 'numeric');
      input.setAttribute('enterkeyhint', 'next');
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('autocorrect', 'off');
      input.setAttribute('spellcheck', 'false');
    });
    root.querySelectorAll('.load-input').forEach(input => {
      input.setAttribute('inputmode', 'decimal');
      input.setAttribute('enterkeyhint', 'done');
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('autocorrect', 'off');
      input.setAttribute('spellcheck', 'false');
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
    cards.forEach(card => card.classList.toggle('open', card === target));
    state.activeExercise = Number(target.dataset.exercise);
    configureInputs(target);

    if (shouldScroll) {
      target.classList.add('cf-next-exercise');
      window.setTimeout(() => target.classList.remove('cf-next-exercise'), 1000);
      window.setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
    window.setTimeout(() => { state.observerBusy = false; }, 0);
  }

  function restoreAfterRender() {
    configureInputs(state.list || document);
    if (state.observerBusy) return;

    const cards = exercises();
    if (!cards.length) return;

    const pending = state.pendingCompletion;
    if (pending) {
      const current = cards.find(card => Number(card.dataset.exercise) === pending.exerciseIndex);
      if (!current) {
        state.pendingCompletion = null;
        return;
      }

      const nowDone = current.classList.contains('done');
      if (pending.wasLastIncomplete && nowDone) {
        const next = cards.find(card => Number(card.dataset.exercise) === pending.exerciseIndex + 1);
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

    const open = cards.find(card => card.classList.contains('open'));
    if (open && Number(open.dataset.exercise) !== 0) {
      state.activeExercise = Number(open.dataset.exercise);
      return;
    }

    if (state.activeExercise > 0 && cards.some(card => Number(card.dataset.exercise) === state.activeExercise)) {
      openOnly(state.activeExercise, false);
    }
  }

  function handleClickCapture(event) {
    const completeButton = event.target.closest('[data-complete]');
    if (completeButton) {
      const card = completeButton.closest('.exercise[data-exercise]');
      if (!card) return;
      const exerciseIndex = Number(card.dataset.exercise);
      const incompleteRows = [...card.querySelectorAll('.set-row:not(.completed)')];
      const clickedRow = completeButton.closest('.set-row');
      const clickingIncomplete = !!clickedRow && !clickedRow.classList.contains('completed');

      state.activeExercise = exerciseIndex;
      state.pendingCompletion = {
        exerciseIndex,
        key: completeButton.dataset.complete || '',
        wasLastIncomplete: clickingIncomplete && incompleteRows.length === 1
      };
      return;
    }

    const toggle = event.target.closest('[data-toggle]');
    if (toggle) {
      const card = toggle.closest('.exercise[data-exercise]');
      if (card) state.activeExercise = Number(card.dataset.exercise);
    }
  }

  function attachObserver() {
    const list = document.getElementById('exerciseList');
    if (!list || state.list === list) return;

    state.observer?.disconnect();
    state.list = list;
    state.observer = new MutationObserver(() => {
      window.requestAnimationFrame(restoreAfterRender);
    });
    state.observer.observe(list, { childList: true, subtree: false });
    configureInputs(list);
  }

  function init() {
    improveViewport();
    injectMobileCss();
    attachObserver();
    configureInputs();
    document.addEventListener('click', handleClickCapture, true);

    const bodyObserver = new MutationObserver(() => attachObserver());
    bodyObserver.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
