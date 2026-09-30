/* confirm modal component */
window.NOIR = window.NOIR || {};
NOIR.confirm = function(opts){
  var wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = '<div class="m-bg"></div><div class="modal" role="alertdialog">'
    + '<h3>'+NOIR.esc(opts.title||'Are you sure?')+'</h3>'
    + '<p>'+NOIR.esc(opts.message||'')+'</p>'
    + '<div class="m-actions">'
    + '<button class="btn outline" data-act="cancel">Cancel</button>'
    + '<button class="btn '+(opts.danger?'':'success')+'" data-act="ok">'+(opts.okLabel||'Confirm')+'</button>'
    + '</div></div>';
  document.body.appendChild(wrap);
  requestAnimationFrame(function(){ wrap.classList.add('show'); });
  function done(val){
    wrap.classList.remove('show');
    setTimeout(function(){ wrap.remove(); }, 150);
    if(val && opts.onOk) opts.onOk();
  }
  wrap.querySelector('.m-bg').addEventListener('click', function(){ done(false); });
  wrap.querySelector('[data-act="cancel"]').addEventListener('click', function(){ done(false); });
  wrap.querySelector('[data-act="ok"]').addEventListener('click', function(){ done(true); });
};
