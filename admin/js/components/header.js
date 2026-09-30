/* reusable top header component */
window.NOIR = window.NOIR || {};
NOIR.SEARCH_HINTS = {
  dashboard:'Search orders, products, customers...',
  orders:'Search by order ID, customer...',
  products:'Search products, categories, SKU...',
  categories:'Search categories...',
  customers:'Search customers by name, email, phone...',
  inventory:'Search product or SKU...',
  coupons:'Search coupons by code, name, type...',
  reviews:'Search reviews by customer, product, or keyword...',
  analytics:'Search analytics, orders, products, customers...',
  settings:'Search settings...'
};
NOIR.mountHeader = function(page){
  var host = document.getElementById('topbar');
  if(!host) return;
  var session = NOIR.adminSession;
  var email = (session && session.user && session.user.email) || 'Admin';
  var initial = NOIR.initials(email);
  host.innerHTML =
    '<button class="hamburger" id="hamburger" aria-label="Menu">'+NOIR.icon('menu',18)+'</button>'
    + '<div class="search">'+NOIR.icon('search',16)
    + '<input id="globalSearch" placeholder="'+(NOIR.SEARCH_HINTS[page]||'Search...')+'"></div>'
    + '<div class="topbar-right">'
    + '<div class="bell" id="bellBtn" title="Notifications">'+NOIR.icon('bell',19)+'<span class="b"></span></div>'
    + '<div class="admin-chip" id="adminChip"><div class="avatar">'+initial+'</div><span class="nm">'+NOIR.esc(email)+'</span>'+NOIR.icon('down',14)
    + '<div class="admin-menu" id="adminMenu">'
    + '<div class="danger" id="adminSignOut">Sign Out</div>'
    + '</div></div></div>';
  document.getElementById('hamburger').addEventListener('click', function(){
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarBackdrop').classList.add('show');
  });
  document.getElementById('bellBtn').addEventListener('click', function(){ NOIR.toast('3 new notifications'); });
  var chip = document.getElementById('adminChip'), menu = document.getElementById('adminMenu');
  chip.addEventListener('click', function(e){ e.stopPropagation(); menu.classList.toggle('open'); });
  document.addEventListener('click', function(){ menu.classList.remove('open'); });
  document.getElementById('adminSignOut').addEventListener('click', async function(){
    await NoirAuth.signOut();
    location.href = '../index.html';
  });
  var gs = document.getElementById('globalSearch');
  gs.addEventListener('keydown', function(e){
    if(e.key === 'Enter' && gs.value.trim()) NOIR.toast('Searching for "' + gs.value.trim() + '"');
  });
};
