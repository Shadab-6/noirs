/* reusable sidebar component */
window.NOIR = window.NOIR || {};
NOIR.NAV = [
  {id:'dashboard', label:'Dashboard', icon:'home'},
  {id:'orders',    label:'Orders',    icon:'bag', dot:true},
  {id:'products',  label:'Products',  icon:'box'},
  {id:'categories',label:'Categories',icon:'grid'},
  {id:'customers', label:'Customers', icon:'user'},
  {id:'inventory', label:'Inventory', icon:'archive'},
  {id:'coupons',   label:'Coupons',   icon:'tag'},
  {id:'reviews',   label:'Reviews',   icon:'star'},
  {id:'analytics', label:'Analytics', icon:'chart'},
  {id:'settings',  label:'Settings',  icon:'settings'}
];
NOIR.renderSidebar = function(active){
  var html = '<div class="logo">NOIR.</div><nav class="nav">';
  NOIR.NAV.forEach(function(item){
    html += '<a href="../pages/'+item.id+'.html" class="'+(item.id===active?'active':'')+'">'
      + NOIR.icon(item.icon,18) + '<span>'+item.label+'</span>'
      + (item.dot ? '<span class="dot"></span>' : '') + '</a>';
  });
  html += '</nav><div class="sidebar-foot">'
    + '<a class="viewstore" href="../../index.html" target="_blank" rel="noopener"><span>View Store</span>'+NOIR.icon('external',14)+'</a>'
    + '<div class="darkrow">'+NOIR.icon('moon',16)+'<span>Dark Mode</span><span class="switch" id="darkToggle" role="switch" aria-label="Dark mode"></span></div>'
    + '</div>';
  return html;
};
NOIR.mountSidebar = function(active){
  var sb = document.createElement('aside');
  sb.className = 'sidebar';
  sb.id = 'sidebar';
  sb.innerHTML = NOIR.renderSidebar(active);
  var backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  backdrop.id = 'sidebarBackdrop';
  document.body.prepend(sb);
  document.body.prepend(backdrop);
  var t = document.getElementById('darkToggle');
  if(t) t.addEventListener('click', function(){
    t.classList.toggle('on');
    NOIR.toast('Theme preference saved');
  });
  backdrop.addEventListener('click', NOIR.closeSidebar);
};
NOIR.closeSidebar = function(){
  var sb = document.getElementById('sidebar'), bd = document.getElementById('sidebarBackdrop');
  if(sb) sb.classList.remove('open');
  if(bd) bd.classList.remove('show');
};
