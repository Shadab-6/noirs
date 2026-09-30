/* right-side drawer component */
window.NOIR = window.NOIR || {};
NOIR._drawerEls = function(){
  if(!document.getElementById('noirOverlay')){
    var ov = document.createElement('div'); ov.className='overlay'; ov.id='noirOverlay';
    var dr = document.createElement('div'); dr.className='drawer'; dr.id='noirDrawer';
    dr.setAttribute('role','dialog'); dr.setAttribute('aria-modal','true');
    document.body.appendChild(ov); document.body.appendChild(dr);
    ov.addEventListener('click', NOIR.closeDrawer);
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') NOIR.closeDrawer(); });
  }
  return {ov:document.getElementById('noirOverlay'), dr:document.getElementById('noirDrawer')};
};
NOIR.openDrawer = function(title, bodyHtml, opts){
  opts = opts || {};
  var els = NOIR._drawerEls();
  els.dr.innerHTML =
    '<div class="drawer-head"><h3>'+title+'</h3>'
    + '<button class="drawer-close" aria-label="Close" onclick="NOIR.closeDrawer()">'+NOIR.icon('x',15)+'</button></div>'
    + '<div class="drawer-body">'+bodyHtml+'</div>';
  if(opts.wide) els.dr.style.width = '520px'; else els.dr.style.width = '';
  requestAnimationFrame(function(){
    els.dr.classList.add('show'); els.ov.classList.add('show');
  });
  document.body.style.overflow = 'hidden';
};
NOIR.closeDrawer = function(){
  var els = NOIR._drawerEls();
  els.dr.classList.remove('show'); els.ov.classList.remove('show');
  document.body.style.overflow = '';
};
NOIR.drawerTabs = function(container, tabs, onTab){
  container.innerHTML = '<div class="drawer-tabs">'+tabs.map(function(t,i){
    return '<button class="'+(i===0?'active':'')+'" data-tab="'+t+'">'+t+'</button>';
  }).join('')+'</div>';
  container.addEventListener('click', function(e){
    var b = e.target.closest('button'); if(!b) return;
    container.querySelectorAll('button').forEach(function(x){x.classList.remove('active');});
    b.classList.add('active');
    onTab && onTab(b.getAttribute('data-tab'));
  });
  if(tabs.length) onTab && onTab(tabs[0]); // paint the default tab's content immediately, not just on click
};
