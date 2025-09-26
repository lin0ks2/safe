/*!
 * dicts.js — Lexitron
 * Version: 1.5.0
 * Date: 2025-09-21
 *
 * Purpose:
 *  - Part of the Lexitron web app
 */
(function(){
  window.decks = window.decks || {};
  // ожидаем, что в deck.de.js присутствуют window.decks.de_verbs и window.decks.de_nouns
  // ничего больше не делаем — лишь проверка на массивы.
  if (!Array.isArray(window.decks.de_verbs)) window.decks.de_verbs = [];
  if (!Array.isArray(window.decks.de_nouns)) window.decks.de_nouns = [];
})();
// конец!
/* -------------------------------  К О Н Е Ц  ------------------------------- */
