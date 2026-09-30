/* lightweight form validation */
window.NOIR = window.NOIR || {};
NOIR.validate = {
  required: function(v){ return v != null && String(v).trim().length > 0; },
  email: function(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v||'').trim()); },
  phone: function(v){ return /^[+]?[\d\s()-]{8,16}$/.test(String(v||'').trim()); },
  min: function(v, n){ return Number(v) >= n; },
  code: function(v){ return /^[A-Z0-9_-]{3,20}$/i.test(String(v||'').trim()); }
};
/* attach to a form: validates inputs with data-validate="required|email|..." */
NOIR.bindValidation = function(form, onOk){
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var ok = true, first = null;
    NOIR.els('input,select,textarea', form) && 0;
    Array.prototype.forEach.call(form.querySelectorAll('input,select,textarea'), function(inp){
      var rules = (inp.getAttribute('data-validate')||'').split('|').filter(Boolean);
      var wrap = inp.closest('.field');
      var bad = false;
      rules.forEach(function(r){
        if(r === 'required' && !NOIR.validate.required(inp.value)) bad = true;
        if(r === 'email' && !NOIR.validate.email(inp.value)) bad = true;
        if(r === 'phone' && !NOIR.validate.phone(inp.value)) bad = true;
        if(r.indexOf('min:') === 0 && !NOIR.validate.min(inp.value, Number(r.slice(4)))) bad = true;
        if(r === 'code' && !NOIR.validate.code(inp.value)) bad = true;
      });
      if(wrap) wrap.classList.toggle('error', bad);
      if(bad){ ok = false; first = first || inp; }
    });
    if(!ok){ first && first.focus(); if(NOIR.toast) NOIR.toast('Please fix the highlighted fields'); return; }
    onOk && onOk(form);
  });
};
