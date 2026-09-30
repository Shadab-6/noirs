/* Categories page */
window.NOIR = window.NOIR || {};
NOIR.pages = NOIR.pages || {};
(function(){
 var state = {tab:'All', search:'', sort:'Custom Order'};

 async function refresh(){
  var rows = await NoirAdminApi.listCategories(NOIR.adminSession.accessToken);
  NOIR.DATA.categories = (rows||[]).map(NOIR.mapCategory);
 }

 NOIR.pages.categories = {
  init: function(){
   var root = document.getElementById('page-root');
   var all = NOIR.DATA.categories;
   var totalProd = NOIR.DATA.products.length;
   var active = all.filter(function(c){ return c.status==='Active'; }).length;
   var hidden = all.length - active;
   root.innerHTML =
    NOIR.pageHead('Categories', 'Organize your products into categories for better navigation. Categories come from the category each product is assigned — rename one here to relabel every product in it.', '')
    + '<div class="stats">'
    + NOIR.statCard({icon:'grid', label:'Total Categories', value:String(all.length), sub:'From your catalogue'})
    + NOIR.statCard({icon:'box', label:'Total Products', value:String(totalProd), sub:'All products'})
    + NOIR.statCard({icon:'eye', label:'Active Categories', value:String(active), sub:NOIR.fmt.pct(active,all.length)+' of total'})
    + NOIR.statCard({icon:'eyeoff', label:'Empty Categories', value:String(hidden), sub:'No active products'})
    + '</div>'
    + '<div id="catTabs"></div>'
    + '<div class="filters">'
    + '<div class="fsearch">'+NOIR.icon('search',14)+'<input data-filter="__search" placeholder="Search categories..."></div>'
    + '</div>'
    + '<div class="card"><div class="tablewrap"><table><thead><tr>'
    + '<th>#</th><th>Category</th><th>Products</th><th>Status</th><th>Actions</th>'
    + '</tr></thead><tbody id="catBody"></tbody></table></div></div>';

   document.getElementById('catTabs').innerHTML = NOIR.tabsHtml(['All Categories ('+all.length+')','Active ('+active+')','Hidden ('+hidden+')'], 'All Categories');
   NOIR.bindTabs(document.getElementById('catTabs'), function(tab){ state.tab = tab; render(); });
   var search = root.querySelector('input[data-filter="__search"]');
   search.addEventListener('input', NOIR.debounce(function(){ state.search = search.value.trim(); render(); }, 200));
   root.addEventListener('click', function(e){
    var ren = e.target.closest('[data-ren]');
    if(ren){ openRenameForm(NOIR.DATA.categories.find(function(x){ return x.slug === ren.getAttribute('data-ren'); })); return; }
   });
   render();
  }
 };

 function render(){
  var list = NOIR.DATA.categories.filter(function(c){
   if(state.tab === 'Active' && c.status !== 'Active') return false;
   if(state.tab === 'Hidden' && c.status !== 'Hidden') return false;
   if(state.search && c.name.toLowerCase().indexOf(state.search.toLowerCase()) < 0) return false;
   return true;
  });
  document.getElementById('catBody').innerHTML = list.length ? list.map(function(c){
   return '<tr><td>'+c.id+'</td>'
    + '<td><div class="rowflex"><div class="thumb">'+NOIR.garment(c.name)+'</div><span class="cell-main">'+NOIR.esc(c.name)+'</span></div></td>'
    + '<td>'+c.prod+'</td><td>'+NOIR.badge(c.status)+'</td>'
    + '<td><button class="btn outline sm" data-ren="'+NOIR.esc(c.slug)+'">'+NOIR.icon('edit',13)+'<span>Rename</span></button></td></tr>';
  }).join('') : '<tr><td colspan="5"><div class="empty">No categories found.</div></td></tr>';
 }

 function openRenameForm(c){
  var body = '<form id="catForm" novalidate>'
   + '<div class="field"><label>Category Name <span class="req">*</span></label><input id="catName" value="'+NOIR.esc(c.name)+'" data-validate="required"><div class="hint">Renaming relabels every product currently in "'+NOIR.esc(c.name)+'" ('+c.prod+' product'+(c.prod===1?'':'s')+').</div><div class="err-msg">Category name is required</div></div>'
   + '<div class="err-msg" id="catErr" style="display:none;">&nbsp;</div>'
   + '<button type="submit" class="btn block" id="catSubmit">Rename Category</button></form>';
  NOIR.openDrawer('Rename Category', body);
  NOIR.bindValidation(document.getElementById('catForm'), async function(){
   var err = document.getElementById('catErr'); err.style.display='none';
   var submit = document.getElementById('catSubmit');
   submit.disabled = true; submit.textContent = 'Saving…';
   try {
    await NoirAdminApi.renameCategory(NOIR.adminSession.accessToken, c.slug, document.getElementById('catName').value);
    await refresh();
    NOIR.closeDrawer(); NOIR.toast('Category renamed');
    NOIR.pages.categories.init();
   } catch(e){
    err.textContent = e.message || 'Could not rename category'; err.style.display='block';
   } finally { submit.disabled = false; submit.textContent = 'Rename Category'; }
  });
 }
})();
