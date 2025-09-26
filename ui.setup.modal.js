/*!
 * ui.setup.modal.js — Lexitron
 * Version: 1.6.1 (safe patch)
 * Date: 2025-09-26
 *
 * Changes vs 1.5.0:
 *  - deviceLang() fallback for initial UI language (ru/uk)
 *  - persist chosen UI language on OK to LS + App.saveSettings(App.settings)
 *  - dispatch 'i18n:lang-changed' on OK
 */
(function(){
  const LS = {
    uiLang: 'lexitron.uiLang',
    studyLang: 'lexitron.studyLang',
    deckKey: 'lexitron.deckKey',
    setupDone: 'lexitron.setupDone',
    legacyActiveKey: 'lexitron.activeKey'
  };
  const FLAG_EMOJI = { ru:'🇷🇺', uk:'🇺🇦', en:'🇬🇧', de:'🇩🇪', es:'🇪🇸', fr:'🇫🇷', it:'🇮🇹', pl:'🇵🇱', sr:'🇷🇸', tr:'🇹🇷' };

  function get(k, d){ try{ const v = localStorage.getItem(k); return v===null?d:v; }catch(_){ return d; } }
  function set(k, v){ try{ localStorage.setItem(k, v); }catch(_){ } }

  function deviceLang(){
    try{
      const nav = (navigator.language || (navigator.languages && navigator.languages[0]) || '').toLowerCase();
      if (nav.indexOf('ru') === 0) return 'ru';
      if (nav.indexOf('uk') === 0) return 'uk';
    }catch(_){}
    return 'ru'; // default
  }

  function L(lang){
    const l=(lang||'').toLowerCase();
    const map={
      ru:{setupTitle:'Первичная настройка', uiLanguage:'Язык интерфейса', studyLanguage:'Язык тренировки', chooseDeck:'Выберите словарь', ok:'OK'},
      uk:{setupTitle:'Початкове налаштування', uiLanguage:'Мова інтерфейсу', studyLanguage:'Мова тренування', chooseDeck:'Оберіть словник', ok:'OK'},
      en:{setupTitle:'Initial setup', uiLanguage:'Interface language', studyLanguage:'Study language', chooseDeck:'Choose deck', ok:'OK'}
    };
    return map[l]||map.ru;
  }
  function T(key, def, eff){
    try{
      const lang = eff || (get(LS.uiLang) || (window.App&&App.settings&&App.settings.lang) || 'uk');
      const bag = (window.I18N && I18N[lang]) || (I18N && I18N.uk) || {};
      return bag[key] || def || key;
    }catch(_){ return def || key; }
  }
  function effectiveLang(){
    const ls = get(LS.uiLang);
    if (ls) return String(ls).toLowerCase();
    const appLang = (window.App&&App.settings&&App.settings.lang) ? String(App.settings.lang).toLowerCase() : '';
    return (appLang || deviceLang());
  }

  function build(){
    // Ensure LS.uiLang is set to the effective language so flags, labels, and fallback match
    const eff = effectiveLang();
    if (!get(LS.uiLang)) set(LS.uiLang, eff);
    if (window.App && App.settings) {
      App.settings.lang = eff;
      try{ App.saveSettings && App.saveSettings(App.settings); }catch(_){}
    }

    const m = document.createElement('div');
    m.id = 'setupModal';
    m.className = 'modal hidden';
    m.setAttribute('role','dialog');
    m.setAttribute('aria-modal','true');

    const labelSetup = T('setupTitle', L(eff).setupTitle, eff);
    const labelUi = T('uiLanguage', L(eff).uiLanguage, eff);
    const labelStudy = T('studyLanguage', L(eff).studyLanguage, eff);
    const labelOk = T('ok', L(eff).ok, eff) || T('confirm', L(eff).ok, eff);

    m.innerHTML = `
      <div class="backdrop"></div>
      <div class="dialog">
        <h2>${labelSetup}</h2>
        <div id="langFlags">
          <div class="field">
            <div class="label">${labelUi}</div>
            <div class="langFlags flagsRow" id="setupUiFlags"></div>
          </div>
          <div class="field">
            <div class="label">${labelStudy}</div>
            <div class="langFlags flagsRow" id="setupStudyFlags"></div>
          </div>
        </div>
        <div class="modalActions">
          <button id="setupConfirm" class="primary" disabled>${labelOk}</button>
        </div>
      </div>`;
    document.body.appendChild(m);

    // Theme sync if not set yet
    try{
      const body=document.body;
      if (!body.getAttribute('data-theme')){
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const root=document.documentElement;
        root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      }
    }catch(_){}

    const uiFlagsEl = m.querySelector('#setupUiFlags');
    const studyFlagsEl = m.querySelector('#setupStudyFlags');
    const okBtn = m.querySelector('#setupConfirm');

    function activeUi(){ return (uiFlagsEl.querySelector('.flagBtn.active')?.dataset.code)||eff; }
    function activeStudy(){ return (studyFlagsEl.querySelector('.flagBtn.active')?.dataset.code)||null; }

    function rerenderStaticLabels(code){
      const lab = L(code);
      m.querySelector('h2').textContent = (I18N[code]?.setupTitle)||lab.setupTitle;
      m.querySelectorAll('.field .label')[0].textContent = (I18N[code]?.uiLanguage)||lab.uiLanguage;
      m.querySelectorAll('.field .label')[1].textContent = (I18N[code]?.studyLanguage)||lab.studyLanguage;
      okBtn.textContent = (I18N[code]?.ok || I18N[code]?.confirm || lab.ok);
    }

    function renderUiFlags(){
      uiFlagsEl.innerHTML='';
      const current = effectiveLang();
      const candidates = Object.keys(window.I18N||{}).filter(x=>['ru','uk','en'].includes(x));
      (candidates.length?candidates:['ru','uk']).forEach(code=>{
        const b=document.createElement('button');
        b.className='flagBtn'+(code===current?' active':'');
        b.title=code.toUpperCase();
        b.textContent = (window.FLAG_EMOJI?.[code]) || (typeof FLAG_EMOJI!=='undefined' && FLAG_EMOJI[code]) || code.toUpperCase();
        b.dataset.code=code;
        b.addEventListener('click',()=>{
          uiFlagsEl.querySelectorAll('.flagBtn').forEach(x=>x.classList.remove('active'));
          b.classList.add('active');
          set(LS.uiLang, code);
          if (window.App && App.settings) {
            App.settings.lang = code;
            try{ App.saveSettings && App.saveSettings(App.settings); }catch(_){}
          }
          rerenderStaticLabels(code);
        });
        uiFlagsEl.appendChild(b);
      });
    }

    function builtinKeys(){
      try{
        if (window.App && App.Decks && typeof App.Decks.builtinKeys==='function') return App.Decks.builtinKeys();
        return Object.keys(window.decks||{});
      }catch(_){ return []; }
    }
    function firstDeckForLang(lang){
      const pref = (lang||'').toLowerCase() + '_';
      const keys = builtinKeys().filter(k => String(k).startsWith(pref));
      const preferred = pref + 'verbs';
      if (keys.includes(preferred)) return preferred;
      return keys[0] || null;
    }

    function renderStudyFlags(){
      studyFlagsEl.innerHTML='';
      const langs = Array.from(new Set(builtinKeys().map(k=>k.split('_')[0]))).filter(Boolean);
      let cur = (get(LS.studyLang) || '').toLowerCase();
      if (!cur){
        const dk = get(LS.deckKey);
        if (dk) cur = String(dk).split('_')[0] || '';
      }
      langs.forEach(code=>{
        const b=document.createElement('button');
        b.className='flagBtn'+(code===cur?' active':'');
        b.title=code.toUpperCase();
        b.textContent = (window.FLAG_EMOJI?.[code]) || (typeof FLAG_EMOJI!=='undefined' && FLAG_EMOJI[code]) || code.toUpperCase();
        b.dataset.code=code;
        b.addEventListener('click', ()=>{
          studyFlagsEl.querySelectorAll('.flagBtn').forEach(x=>x.classList.remove('active'));
          b.classList.add('active');
          set(LS.studyLang, code);
          const first = firstDeckForLang(code);
          if (first){ set(LS.deckKey, first); }
          okBtn.disabled = !first;
        });
        studyFlagsEl.appendChild(b);
      });
      if (cur){
        const first = firstDeckForLang(cur);
        if (first){ set(LS.deckKey, first); okBtn.disabled = false; }
      }
    }

    renderUiFlags();
    renderStudyFlags();
    okBtn.disabled = !get(LS.deckKey);

    // open modal
    m.classList.remove('hidden');

    okBtn.addEventListener('click', ()=>{
      const ui = activeUi() || effectiveLang();
      const st = activeStudy() || get(LS.studyLang) || '';
      let dk = get(LS.deckKey);
      if (!dk && st){ dk = firstDeckForLang(st); if (dk) set(LS.deckKey, dk); }
      if (!dk) return;

      set(LS.uiLang, ui);
      set(LS.studyLang, st);
      set(LS.deckKey, dk);
      set(LS.setupDone, 'true');
      set(LS.legacyActiveKey, dk);

      if (window.App && App.settings){
        App.settings.lang = ui;
        try{ App.saveSettings && App.saveSettings(App.settings); }catch(_){}
      }

      m.remove();
      try{ document.body && document.body.removeAttribute('data-theme'); }catch(_){}
      if (window.App && App.applyTheme) App.applyTheme();

      // notify
      try{ document.dispatchEvent(new CustomEvent('i18n:lang-changed', { detail:{ lang: ui } })); }catch(_){}
      document.dispatchEvent(new CustomEvent('lexitron:setup:done', { detail:{ uiLang:ui, studyLang:st, deckKey:dk } }));
    });
  }

  function shouldShow(){
    try{
      var force = /(?:\?|&)setup=1(?:&|$)/.test(location.search);
      if (force) return true;
    }catch(_){}
    try{
      var dk = localStorage.getItem('lexitron.deckKey') || localStorage.getItem('lexitron.activeKey');
      if (!dk) return true;
      if (!window.decks || !Array.isArray(window.decks[dk]) || window.decks[dk].length < 4) return true;
    }catch(_){ return true; }
    return get(LS.setupDone) !== 'true';
  }

  window.SetupModal = { build, shouldShow, LS };
})();
