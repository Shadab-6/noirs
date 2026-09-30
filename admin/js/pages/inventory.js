/* Inventory page */
window.NOIR = window.NOIR || {};
NOIR.pages = NOIR.pages || {};
(function(){
 var state = {tab:'All', page:1, perPage:10, search:'', cat:'All Categories', status:'All Status', sort:'Stock: Low to High'};
 function filtered(){
  var list = NOIR.DATA.products.slice();
  if(state.tab === 'In Stock') list = list.filter(function(p){ return p.stock > 10; });
  if(state.tab === 'Low Stock') list = list.filter(function(p){ return p.stock > 0 && p.stock <= 10; });
  if(state.tab === 'Out of Stock') list = list.filter(function(p){ return p.stock === 0; });
  if(state.cat !== 'All Categories') list = list.filter(function(p){ return p.cat === state.cat; });
  if(state.status !== 'All Status') list = list.filter(function(p){ return p.status === state.status; });
  if(state.search){
   var q = state.search.toLowerCase();
   list = list.filter(function(p){ return p.name.toLowerCase().indexOf(q) > -1 || p.sku.toLowerCase().indexOf(q) > -1; });
  }
  if(state.sort === 'Stock: Low to High') list.sort(function(a,b){ return a.stock - b.stock; });
  if(state.sort === 'Stock: High to Low') list.sort(function(a,b){ return b.stock - a.stock; });
  return list;
 }
 function counts(){
  var all = NOIR.DATA.products;
  return {
   all: all.length, total: all.reduce(function(s,p){ return s+p.stock; },0),
   low: all.filter(function(p){ return p.stock>0 && p.stock<=10; }).length,
   oos: all.filter(function(p){ return p.stock===0; }).length,
   inStock: all.filter(function(p){ return p.stock>10; }).length
  };
 }
 NOIR.pages.inventory = {
  init: function(){
   var root = document.getElementById('page-root');
   var cats = ['All Categories'].concat(NOIR.DATA.categories.map(function(c){ return c.name; }));
   var n = counts();
   root.innerHTML =
    NOIR.pageHead('Inventory', 'Track and manage your stock across all products.', '')
    + '<div class="stats">'
    + NOIR.statCard({icon:'box', label:'Total Products', value:String(n.all), sub:'All products'})
    + NOIR.statCard({icon:'box', label:'Total Stock Units', value:String(n.total), sub:'Across all products'})
    + NOIR.statCard({icon:'warning', icCls:'warn', label:'Low Stock Items', value:String(n.low), sub:'Needs attention'})
    + NOIR.statCard({icon:'eyeoff', icCls:'danger', label:'Out of Stock', value:String(n.oos), sub:'Restock required'})
    + '</div>'
    + '<div id="invTabs"></div>'
    + '<div class="filters">'
    + '<select class="fselect" data-filter="cat">'+cats.map(function(c){ return '<option>'+c+'</option>'; }).join('')+'</select>'
    + '<select class="fselect" data-filter="status"><option>All Status</option><option>Active</option><option>Low Stock</option><option>Out of Stock</option><option>Draft</option></select>'
    + '<select class="fselect" data-filter="sort"><option>Sort by: Stock (Low to High)</option><option>Sort by: Stock (High to Low)</option></select>'
    + '<button class="clear-btn" id="clearF">'+NOIR.icon('filter',13)+'<span>Clear Filters</span></button>'
    + '<div class="fsearch" style="margin-left:auto">'+NOIR.icon('search',14)+'<input data-filter="__search" placeholder="Search product or SKU..."></div>'
    + '</div>'
    + '<div class="card"><div class="tablewrap"><table><thead><tr>'
    + '<th>Product</th><th>SKU</th><th>Category</th><th>Stock</th><th>Status</th><th>Actions</th>'
    + '</tr></thead><tbody id="invBody"></tbody></table></div>'
    + '<div id="invPager"></div></div>';

   document.getElementById('invTabs').innerHTML = NOIR.tabsHtml(['All Products ('+n.all+')','In Stock ('+n.inStock+')','Low Stock ('+n.low+')','Out of Stock ('+n.oos+')'], 'All Products');
   NOIR.bindTabs(document.getElementById('invTabs'), function(tab){ state.tab = tab; state.page = 1; render(); });
   var filters = root.querySelector('.filters');
   filters.addEventListener('change', function(e){
    var k = e.target.getAttribute('data-filter');
    if(k === 'cat') state.cat = e.target.value;
    if(k === 'status') state.status = e.target.value;
    if(k === 'sort') state.sort = e.target.value;
    state.page = 1; render();
   });
   var search = filters.querySelector('input[data-filter="__search"]');
   search.addEventListener('input', NOIR.debounce(function(){ state.search = search.value.trim(); state.page = 1; render(); }, 200));
   document.getElementById('clearF').addEventListener('click', function(){
    state.cat='All Categories'; state.status='All Status'; state.search=''; state.sort='Stock: Low to High';
    filters.querySelectorAll('select').forEach(function(s){ s.selectedIndex = 0; });
    search.value = ''; state.page = 1; render(); NOIR.toast('Filters cleared');
   });
   NOIR.bindPagination(document.getElementById('invPager'), state, render);
   root.addEventListener('click', function(e){
    var row = e.target.closest('tr[data-pid]');
    if(row && !e.target.closest('button')){
     var p = NOIR.DATA.products.find(function(x){ return x.id === Number(row.getAttribute('data-pid')); });
     openInventoryDrawer(p);
    }
   });
   render();
  }
 };
 function render(){
  var list = filtered();
  var from = (state.page - 1) * state.perPage;
  var pageItems = list.slice(from, from + state.perPage);
  var body = document.getElementById('invBody');
  body.innerHTML = pageItems.length ? pageItems.map(function(p){
   return '<tr data-pid="'+p.id+'"><td><div class="rowflex"><div class="thumb">'+NOIR.garment(p.cat)+'</div><div><div class="cell-main">'+NOIR.esc(p.name)+'</div></div></div></td>'
    + '<td>'+p.sku+'</td><td>'+NOIR.esc(p.cat)+'</td><td>'+p.stock+'</td><td>'+NOIR.badge(p.status)+'</td>'
    + '<td><button class="btn outline sm" data-edit="'+p.id+'">'+NOIR.icon('edit',13)+'<span>Edit Stock</span></button></td></tr>';
  }).join('') : '<tr><td colspan="6"><div class="empty">No products found.</div></td></tr>';
  var total = list.length;
  var to = Math.min(from + state.perPage, total);
  document.getElementById('invPager').innerHTML = NOIR.pagination({
   total: total, perPage: state.perPage, page: state.page,
   from: total ? from + 1 : 0, to: to, noun: 'products'
  });
  body.querySelectorAll('[data-edit]').forEach(function(btn){
   btn.addEventListener('click', function(e){
    e.stopPropagation();
    openInventoryDrawer(NOIR.DATA.products.find(function(x){ return x.id === Number(btn.getAttribute('data-edit')); }));
   });
  });
 }
 function openInventoryDrawer(p){
  var body =
   '<div class="flex" style="align-items:flex-start;">'
   + '<div class="thumb xl">'+(p.image?'<img src="'+NOIR.esc(p.image)+'" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">':NOIR.garment(p.cat,48))+'</div>'
   + '<div class="grow"><div class="cell-main" style="font-size:15px">'+NOIR.esc(p.name)+'</div><div class="cell-sub">SKU: '+p.sku+'</div>'
   + '<div class="mt10">'+NOIR.badge(p.status)+'</div></div></div>'
   + '<div class="tiles" style="margin-top:16px;">'
   + '<div class="tile">'+NOIR.icon('box',16)+'<div class="tv">'+p.stock+'</div><div class="tl">Current Stock</div></div></div>'
   + '<div class="field"><label>Current Stock</label><div class="flex"><input id="curStock" value="'+p.stock+'"><button class="btn" id="updStock">Update</button></div></div>'
   + '<div class="err-msg" id="stErr" style="display:none;">&nbsp;</div>';
  NOIR.openDrawer('', body, {wide:true});
  document.getElementById('updStock').addEventListener('click', async function(){
   var btn = this, err = document.getElementById('stErr'); err.style.display='none';
   var val = Number(document.getElementById('curStock').value);
   if(!Number.isInteger(val) || val < 0){ err.textContent = 'Enter a valid stock quantity.'; err.style.display='block'; return; }
   btn.disabled = true; btn.textContent = 'Updating…';
   try {
    await NoirAdminApi.setProductStock(NOIR.adminSession.accessToken, p.id, val);
    p.stock = val;
    NOIR.closeDrawer(); NOIR.toast('Stock updated');
    NOIR.pages.inventory.init();
   } catch(e){
    err.textContent = e.message || 'Could not update stock'; err.style.display='block';
   } finally { btn.disabled = false; btn.textContent = 'Update'; }
  });
 }
})();
