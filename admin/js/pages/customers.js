/* Customers page */
window.NOIR = window.NOIR || {};
NOIR.pages = NOIR.pages || {};
(function(){
 var state = {tab:'All', page:1, perPage:10, search:''};
 function counts(){
  var all = NOIR.DATA.customers;
  return { all: all.length, active: all.filter(function(c){return c.status==='Active';}).length, inactive: all.filter(function(c){return c.status==='Inactive';}).length };
 }
 NOIR.pages.customers = {
  init: function(){
   var root = document.getElementById('page-root');
   var n = counts();
   var avgOrders = n.all ? (NOIR.DATA.customers.reduce(function(s,c){return s+c.orders;},0)/n.all).toFixed(1) : '0';
   var avgSpend = n.all ? Math.round(NOIR.DATA.customers.reduce(function(s,c){return s+c.spent;},0)/n.all) : 0;
   root.innerHTML =
    NOIR.pageHead('Customers', 'View your customers, their orders, and contact information.', '')
    + '<div class="stats">'
    + NOIR.statCard({icon:'users', label:'Total Customers', value:String(n.all), sub:'All time'})
    + NOIR.statCard({icon:'user', label:'Active Customers', value:String(n.active), sub:'Ordered in the last 90 days'})
    + NOIR.statCard({icon:'bag', label:'Avg. Orders per Customer', value:avgOrders, sub:'All time'})
    + NOIR.statCard({icon:'rupee', label:'Avg. Spend per Customer', value:NOIR.fmt.inr(avgSpend), sub:'All time'})
    + '</div>'
    + '<div id="custTabs"></div>'
    + '<div class="filters">'
    + '<div class="fsearch" style="margin-left:auto">'+NOIR.icon('search',14)+'<input data-filter="__search" placeholder="Search customers..."></div>'
    + '</div>'
    + '<div class="card"><div class="tablewrap"><table><thead><tr>'
    + '<th>Customer</th><th>Contact</th><th>Orders</th><th>Total Spent</th><th>Status</th><th>Joined Date</th>'
    + '</tr></thead><tbody id="custBody"></tbody></table></div>'
    + '<div id="custPager"></div></div>';

   document.getElementById('custTabs').innerHTML = NOIR.tabsHtml(['All Customers ('+n.all+')','Active ('+n.active+')','Inactive ('+n.inactive+')'], 'All Customers');
   NOIR.bindTabs(document.getElementById('custTabs'), function(tab){ state.tab = tab; state.page = 1; render(); });
   var search = root.querySelector('input[data-filter="__search"]');
   search.addEventListener('input', NOIR.debounce(function(){ state.search = search.value.trim(); state.page = 1; render(); }, 200));
   NOIR.bindPagination(document.getElementById('custPager'), state, render);
   root.addEventListener('click', function(e){
    var row = e.target.closest('tr[data-cuid]');
    if(row){
     var c = NOIR.DATA.customers.find(function(x){ return x.id === row.getAttribute('data-cuid'); });
     openCustomerDrawer(c);
    }
   });
   render();
  }
 };
 function filtered(){
  return NOIR.DATA.customers.filter(function(c){
   if(state.tab === 'Active' && c.status !== 'Active') return false;
   if(state.tab === 'Inactive' && c.status !== 'Inactive') return false;
   if(state.search){
    var q = state.search.toLowerCase();
    if(c.name.toLowerCase().indexOf(q) < 0 && c.email.toLowerCase().indexOf(q) < 0 && (c.phone||'').indexOf(q) < 0) return false;
   }
   return true;
  });
 }
 function render(){
  var list = filtered();
  var from = (state.page - 1) * state.perPage;
  var pageItems = list.slice(from, from + state.perPage);
  var body = document.getElementById('custBody');
  body.innerHTML = pageItems.length ? pageItems.map(function(c){
   return '<tr data-cuid="'+NOIR.esc(c.id)+'"><td><div class="rowflex"><div class="avatar soft">'+NOIR.initials(c.name)+'</div><div><div class="cell-main">'+NOIR.esc(c.name)+'</div></div></div></td>'
    + '<td>'+NOIR.esc(c.email)+'<div class="cell-sub">'+NOIR.esc(c.phone||'')+'</div></td>'
    + '<td>'+c.orders+'</td><td>'+NOIR.fmt.inr(c.spent)+'</td><td>'+NOIR.badge(c.status)+'</td><td>'+c.joined+'</td></tr>';
  }).join('') : '<tr><td colspan="6"><div class="empty">No customers found.</div></td></tr>';
  var total = list.length;
  var to = Math.min(from + state.perPage, total);
  document.getElementById('custPager').innerHTML = NOIR.pagination({
   total: total, perPage: state.perPage, page: state.page,
   from: total ? from + 1 : 0, to: to, noun: 'customers'
  });
 }
 function openCustomerDrawer(c){
  var recent = c.recent.length ? c.recent.map(function(r){
   return '<div class="oitem"><div class="thumb">'+NOIR.garment(r.cat,28)+'</div>'
    + '<div class="grow"><div class="nm">'+NOIR.esc(r.oid)+'</div><div class="mta">'+r.date+'</div></div>'
    + '<div style="text-align:right"><div class="pr">'+NOIR.fmt.inr(r.amt)+'</div><div class="mt10">'+NOIR.badge(r.status)+'</div></div></div>';
  }).join('') : '<div class="empty">No orders yet.</div>';
  var body =
   '<div class="flex" style="align-items:flex-start;">'
   + '<div class="avatar lg soft">'+NOIR.initials(c.name)+'</div>'
   + '<div class="grow"><div class="cell-main" style="font-size:16px">'+NOIR.esc(c.name)+'</div><div class="cell-sub">'+NOIR.esc(c.email)+'</div><div class="mt10">'+NOIR.badge(c.status)+'</div></div></div>'
   + '<div class="section-title" style="margin-top:8px">Contact Information</div>'
   + '<div class="dline"><span>'+NOIR.icon('mail',14)+' Email</span><b>'+NOIR.esc(c.email)+'</b></div>'
   + '<div class="dline"><span>'+NOIR.icon('phone',14)+' Phone</span><b>'+NOIR.esc(c.phone||'—')+'</b></div>'
   + '<div class="dline"><span>'+NOIR.icon('cal',14)+' First Order</span><b>'+c.joinedFull+'</b></div>'
   + '<div class="dline"><span>'+NOIR.icon('pin',14)+' Last Shipped To</span><b>'+NOIR.esc(c.loc)+'</b></div>'
   + '<div class="section-title">Customer Stats</div>'
   + '<div class="tiles">'
   + '<div class="tile"><div class="tv">'+c.orders+'</div><div class="tl">Total Orders</div></div>'
   + '<div class="tile"><div class="tv">'+NOIR.fmt.inr(c.spent)+'</div><div class="tl">Total Spent</div></div>'
   + '<div class="tile"><div class="tv">'+(c.status==='Active'?'Yes':'No')+'</div><div class="tl">Active (90d)</div></div></div>'
   + '<div class="section-title">Recent Orders</div>'+recent;
  NOIR.openDrawer('', body, {wide:true});
 }
})();
