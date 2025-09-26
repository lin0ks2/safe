/*!
 * app.core.js — Lexitron
 * Version: 1.6.1
 * Date: 2025-09-21
 *
 * Purpose:
 *  - Part of the Lexitron web app
 */

(function(){
  const App = window.App = (window.App||{});
  App.APP_VER = '1.6.1';

  const LS_SETTINGS = 'k_settings_v1_3_1';
  const LS_STATE    = 'k_state_v1_3_1';
  const LS_DICTS    = 'k_dicts_v1_3_1';

  // Fallback + external
  const I18N_FALLBACK = window.I18N;

  App.settings = loadSettings();
  App.state = loadState() || {
    index:0,lastIndex:-1,favorites:{},stars:{},successes:{},
    lastShownWordId:null, totals:{shown:0,errors:0}, lastSeen:{}
  };
  App.dictRegistry = loadDictRegistrySafe();

  // ── миграция под наборы: setSize=50 по умолчанию, map под активные наборы ──
  (function migrateSets(){
    let ss = 4;
    try { ss = Number(App.state.setSize); } catch(e){}
    if (!Number.isFinite(ss) || ss < 2) ss = 4;
    App.state.setSize = ss;

    if (!App.state.setByDeck || typeof App.state.setByDeck !== 'object'){
      App.state.setByDeck = {};
    }
  })();

  App.i18n = function(){
    const lang = App.settings.lang || 'uk';
    const base = (I18N_FALLBACK && I18N_FALLBACK[lang]) ? I18N_FALLBACK[lang] : I18N_FALLBACK.uk;
    return base;
  };

  App.clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
  App.shuffle = (a)=>{const arr=a.slice();for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;};
  App.escapeHtml = (s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function loadSettings(){ try{ const raw=localStorage.getItem(LS_SETTINGS); if(raw) return Object.assign({lang:'uk',theme:'auto',repeats:6}, JSON.parse(raw)); }catch(e){} return {lang:'uk',theme:'auto',repeats:6}; }
  App.saveSettings = function(s){ try{ localStorage.setItem(LS_SETTINGS, JSON.stringify(s)); }catch(e){} };

  function loadState(){ try{ const raw=localStorage.getItem(LS_STATE); if(raw) return JSON.parse(raw);}catch(e){} return null; }
  App.saveState = function(){ try{ localStorage.setItem(LS_STATE, JSON.stringify(App.state)); }catch(e){} };

  function loadDictRegistrySafe(){ try{ const raw=localStorage.getItem(LS_DICTS); if(raw) return JSON.parse(raw);}catch(e){} return { activeKey:null, user:{} }; }
  App.saveDictRegistry = function(){ try{ localStorage.setItem(LS_DICTS, JSON.stringify(App.dictRegistry)); }catch(e){} };

  // DOM map
  App.DOM = {
    titleEl:document.getElementById('title'),
    appVerEl:document.getElementById('appVer'),
    taglineEl:document.getElementById('tagline'),
    wordEl:document.getElementById('wordText'),
    hintEl:document.getElementById('hintText'),
    optionsRow:document.getElementById('optionsRow'),
    favBtn:document.getElementById('favBtn'),
    starsEl:document.getElementById('stars'),
    statsBar:document.getElementById('statsBar'),
    copyYearEl:document.getElementById('copyYear'),
    // header controls
    themeToggleBtn:document.getElementById('themeToggleBtn'),
    langToggleBtn:document.getElementById('langToggleBtn'),
    dictsBtn:document.getElementById('dictsBtn'),
    modalTitleEl:document.getElementById('modalTitle'),
    langFlags:document.getElementById('langFlags'),
    // modal
    modal:document.getElementById('modal'),
    backdrop:document.getElementById('backdrop'),
    okBtn:document.getElementById('okBtn'),
    dictListHost:document.getElementById('dictList')
  };
  if (App.DOM.copyYearEl) App.DOM.copyYearEl.textContent = new Date().getFullYear();

  App.bootstrap = function(){
    // set version label
    if (App.DOM.appVerEl) App.DOM.appVerEl.textContent = 'v' + App.APP_VER;
  };
})();
// конец!


/* === Favorites v2 (per-dictionary) migration === */
App.migrateFavoritesToV2 = function(){
  try{
    const st = App.state || (App.state = {});
    if (st.favorites_v2 && typeof st.favorites_v2 === 'object') return; // already migrated

    const old = st.favorites || {};
    const v2 = {};

    const dictKeys = []
      .concat(App.Decks.builtinKeys ? App.Decks.builtinKeys() : [])
      .concat(Object.keys((App.dictRegistry && App.dictRegistry.user) || {}));

    const idToDicts = {};
    dictKeys.forEach(key => {
      const arr = App.Decks.resolveDeckByKey(key) || [];
      arr.forEach(w => {
        (idToDicts[w.id] = idToDicts[w.id] || []).push(key);
      });
    });

    let migrated = 0, skipped = 0;
    Object.keys(old || {}).forEach(idStr => {
      if (!old[idStr]) return;
      const id = +idStr;
      const dicts = idToDicts[id] || [];
      if (dicts.length === 1){
        const k = dicts[0];
        if (!v2[k]) v2[k] = {};
        v2[k][id] = true;
        migrated++;
      } else {
        skipped++;
      }
    });

    st.favorites_v2 = v2;
    st.favorites_legacy = old;
    try { App.saveState && App.saveState(); } catch(e){}
    /* log removed */}catch(e){ console.warn('Favorites v2 migration failed:', e); }
};

App.isFavorite = function(dictKey, wordId){
  try{
    const st = App.state || {};
    const v2 = st.favorites_v2 || {};
    return !!(v2[dictKey] && v2[dictKey][wordId]);
  }catch(e){ return false; }
};

App.toggleFavorite = function(dictKey, wordId){
  try{
    const st = App.state || (App.state = {});
    st.favorites_v2 = st.favorites_v2 || {};
    st.favorites_v2[dictKey] = st.favorites_v2[dictKey] || {};
    st.favorites_v2[dictKey][wordId] = !st.favorites_v2[dictKey][wordId];
    App.saveState && App.saveState();
  }catch(e){}
};

App.clearFavoritesAll = function(){
  try{
    const st = App.state || {};
    st.favorites_v2 = {};
    App.saveState && App.saveState();
  }catch(e){}
};

// MIGRATION: import progress from 'working-sets' keys (one-time)
(function migrateFromWorkingSets(){
  if (window.__ws_migrated__) return;
  window.__ws_migrated__ = true;
  try{
    // 1) Active sets by deck
    const legacySetsRaw = localStorage.getItem('app.setByDeck');
    if (legacySetsRaw){
      try{
        const legacySets = JSON.parse(legacySetsRaw);
        if (legacySets && typeof legacySets==='object'){
          window.App = window.App || {};
          App.Sets = App.Sets || { state:{ activeByDeck:{}, completedByDeck:{} } };
          App.Sets.state = App.Sets.state || { activeByDeck:{}, completedByDeck:{} };
          App.Sets.state.activeByDeck = Object.assign({}, App.Sets.state.activeByDeck, legacySets);
          if (App.Sets._save) App.Sets._save();
        }
      }catch(_){}
      localStorage.removeItem('app.setByDeck');
    }

    // 2) Stars (rare): app.starsByDeck -> flatten into App.state.stars
    const legacyStarsRaw = localStorage.getItem('app.starsByDeck');
    if (legacyStarsRaw){
      try{
        const legacyStarsByDeck = JSON.parse(legacyStarsRaw);
        App.state = App.state || {};
        App.state.stars = App.state.stars || {};
        if (legacyStarsByDeck && typeof legacyStarsByDeck==='object'){
          for (const deckKey of Object.keys(legacyStarsByDeck)){
            const m = legacyStarsByDeck[deckKey]||{};
            for (const wid of Object.keys(m)){
              const v = m[wid]|0;
              App.state.stars[wid] = Math.max(App.state.stars[wid]||0, v|0);
            }
          }
          App.saveState && App.saveState();
        }
      }catch(_){}
      localStorage.removeItem('app.starsByDeck');
    }

    // 3) Mistakes: __mistakes_<deckKey> -> totals.errors
    const keys = Object.keys(localStorage);
    let added = 0;
    keys.forEach(k=>{
      const mm = /^__mistakes_(.+)$/.exec(k);
      if (!mm) return;
      try{
        const arr = JSON.parse(localStorage.getItem(k)||'[]');
        added += Array.isArray(arr) ? arr.length : 0;
      }catch(_){}
      localStorage.removeItem(k);
    });
    if (added>0){
      App.state = App.state || {};
      App.state.totals = App.state.totals || {};
      App.state.totals.errors = (App.state.totals.errors|0) + added;
      App.saveState && App.saveState();
    }
  }catch(_){}
})();


  /**
   * Reset deck progress (stars/successes/lastSeen) for a given dictionary key.
   * Safe: does not touch sets-completion or favorites/mistakes storages.
   */
  App.resetDeckProgress = function(dictKey){
    try{
      const key = String(dictKey || (App.dictRegistry && App.dictRegistry.activeKey) || '');
      if (!key) return;
      const deck = (App.Decks && App.Decks.resolveDeckByKey) ? (App.Decks.resolveDeckByKey(key) || []) : [];
      if (!Array.isArray(deck) || deck.length===0) return;
      const ids = new Set(deck.map(w => String(w.id)));
      App.state = App.state || {};
      App.state.stars = App.state.stars || {};
      App.state.successes = App.state.successes || {};
      App.state.lastSeen = App.state.lastSeen || {};
      ids.forEach(id=>{
        App.state.stars[id] = 0;
        App.state.successes[id] = 0;
        App.state.lastSeen[id] = 0;
      });
      App.saveState && App.saveState();
    }catch(_){}
  };
/* -------------------------------  К О Н Е Ц  ------------------------------- */
