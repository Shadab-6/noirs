/* toast component */
window.NOIR = window.NOIR || {};
NOIR.toast = function(msg){
  var t = document.getElementById('noirToast');
  if(!t){
    t = document.createElement('div');
    t.className = 'toast'; t.id = 'noirToast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(NOIR._toastT);
  NOIR._toastT = setTimeout(function(){ t.classList.remove('show'); }, 2000);
};
