/*!
 * ui.setup.modal.js — Setup wizard (language & dictionary)
 * Version: 1.6.1 (patch: persist uiLang to LS on OK + fire i18n:lang-changed)
 */
(function(){
  'use strict';

  var W = window;
  var D = document;

  // LocalStorage keys
  var LS = {
    uiLang: 'lexitron.uiLang',
    setupDone: 'lexitron.setupDone'
  };

  function getLS(k){ try { return localStorage.getItem(k); } catch(_) { return null; } }
  function setLS(k,v){ try { localStorage.setItem(k, v); } catch(_){} }

  function deviceLang(){
    try{
      var nav = (navigator.language || (navigator.languages && navigator.languages[0]) || '').toLowerCase();
      if (nav.indexOf('ru')===0) return 'ru';
      if (nav.indexOf('uk')===0) return 'uk';
    }catch(_){}
    return 'ru';
  }

  function effectiveLang(){
    var ls = getLS(LS.uiLang);
    if (ls) return ls.toLowerCase();
    try{
      if (W.App && App.settings && App.settings.lang) return String(App.settings.lang).toLowerCase();
    }catch(_){}
    return deviceLang();
  }

  // Открытие мастера
  function openSetupModal(){
    var lang = effectiveLang();
    try{
      if (W.App && App.settings){
        App.settings.lang = lang;
        if (App.saveSettings) App.saveSettings(App.settings);
      }
    }catch(_){}
    // остальное строит родной код приложения
    if (typeof W.SetupModalBuild === 'function'){
      return W.SetupModalBuild(lang);
    }
  }

  // Хук на кнопку ОК
  function hookOk(){
    var ok = D.getElementById('okBtn');
    if (!ok) return;
    if (ok.__lexi_hooked) return;
    ok.__lexi_hooked = true;

    ok.addEventListener('click', function(){
      try{
        var chosen = (W.App && App.settings && App.settings.lang)
            ? String(App.settings.lang).toLowerCase()
            : effectiveLang();

        setLS(LS.uiLang, chosen);              // сохранить в LS
        if (W.App && App.saveSettings && App.settings){
          App.settings.lang = chosen;
          App.saveSettings(App.settings);
        }

        // сообщаем другим модулям
        try{ D.dispatchEvent(new CustomEvent('i18n:lang-changed',{detail:{lang:chosen}})); }catch(_){}

        setLS(LS.setupDone,'1');
      }catch(e){}
    });
  }

  if (D.readyState==='loading'){
    D.addEventListener('DOMContentLoaded',hookOk,{once:true});
  }else{
    hookOk();
  }

  W.SetupModalOpen = openSetupModal;

})();
