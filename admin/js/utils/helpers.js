/* generic helpers */
window.NOIR = window.NOIR || {};
NOIR.el = function(sel){ return document.querySelector(sel); };
NOIR.els = function(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); };
NOIR.esc = function(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); };
NOIR.debounce = function(fn, ms){
  var t; return function(){ var a=arguments, c=this; clearTimeout(t); t=setTimeout(function(){fn.apply(c,a);}, ms||200); };
};
NOIR.initials = function(name){
  return String(name||'?').trim().split(/\s+/).map(function(w){return w[0];}).slice(0,1).join('').toUpperCase();
};
NOIR.copy = function(text){
  if(navigator.clipboard){ navigator.clipboard.writeText(text).then(function(){ NOIR.toast && NOIR.toast('Copied to clipboard'); }); }
  else { NOIR.toast && NOIR.toast(text); }
};
NOIR.uid = function(prefix){ return (prefix||'id') + '-' + Math.random().toString(36).slice(2,8); };
