/* Products page */
window.NOIR = window.NOIR || {};
NOIR.pages = NOIR.pages || {};
(function(){
 var state = {tab:'All', page:1, perPage:10, search:'', cat:'All Categories', status:'All Status', stock:'All Stock Status', sort:'Latest First'};
 var pendingImageUrl = null;

 function filtered(){
  var list = NOIR.DATA.products.slice();
  if(state.tab === 'Out of Stock') list = list.filter(function(p){ return p.stock === 0; });
  else if(state.tab === 'Active') list = list.filter(function(p){ return p.status === 'Active'; });
  else if(state.tab === 'Draft') list = list.filter(function(p){ return p.status === 'Draft'; });
  else if(state.tab === 'Featured') list = list.filter(function(p){ return p.featured; });
  if(state.cat !== 'All Categories') list = list.filter(function(p){ return p.cat === state.cat; });
  if(state.status !== 'All Status') list = list.filter(function(p){ return p.status === state.status; });
  if(state.stock === 'In Stock') list = list.filter(function(p){ return p.stock > 10; });
  if(state.stock === 'Low Stock') list = list.filter(function(p){ return p.stock > 0 && p.stock <= 10; });
  if(state.stock === 'Out of Stock') list = list.filter(function(p){ return p.stock === 0; });
  if(state.search){
   var q = state.search.toLowerCase();
   list = list.filter(function(p){ return p.name.toLowerCase().indexOf(q) > -1 || p.sku.toLowerCase().indexOf(q) > -1; });
  }
  if(state.sort === 'Price: Low to High') list.sort(function(a,b){ return a.price - b.price; });
  if(state.sort === 'Price: High to Low') list.sort(function(a,b){ return b.price - a.price; });
  if(state.sort === 'Stock: Low to High') list.sort(function(a,b){ return a.stock - b.stock; });
  return list;
 }

 function counts(){
  var all = NOIR.DATA.products;
  return {
   all: all.length,
   active: all.filter(function(p){ return p.status === 'Active'; }).length,
   draft: all.filter(function(p){ return p.status === 'Draft'; }).length,
   oos: all.filter(function(p){ return p.stock === 0; }).length,
   featured: all.filter(function(p){ return p.featured; }).length
  };
 }

 async function refresh(){
  var token = NOIR.adminSession.accessToken;
  var res = await NoirAdminApi.listProducts(token, { limit: 500 });
  NOIR.DATA.products = (res.rows||[]).map(NOIR.mapProduct);
 }

 NOIR.pages.products = {
  init: function(){
   var root = document.getElementById('page-root');
   var cats = ['All Categories'].concat(NOIR.DATA.categories.map(function(c){ return c.name; }));
   var n = counts();
   root.innerHTML =
    NOIR.pageHead('Products', 'Manage your products, inventory, and collections.',
     '<button class="btn" id="addBtn">'+NOIR.icon('plus',15)+'<span>Add Product</span></button>')
    + '<div class="stats">'
    + NOIR.statCard({icon:'box', label:'Total Products', value:String(n.all), sub:'All products'})
    + NOIR.statCard({icon:'cart', label:'Active Products', value:String(n.active), sub:NOIR.fmt.pct(n.active,n.all)+' of total'})
    + NOIR.statCard({icon:'eyeoff', label:'Out of Stock', value:String(n.oos), sub:NOIR.fmt.pct(n.oos,n.all)+' of total'})
    + NOIR.statCard({icon:'tag', label:'Featured Products', value:String(n.featured), sub:NOIR.fmt.pct(n.featured,n.all)+' of total'})
    + '</div>'
    + '<div id="prodTabs"></div>'
    + NOIR.filterRow([
      {type:'select', key:'cat', label:'Category', options:cats},
      {type:'select', key:'status', label:'Status', options:['All Status','Active','Low Stock','Out of Stock','Draft']},
      {type:'select', key:'stock', label:'Stock', options:['All Stock Status','In Stock','Low Stock','Out of Stock']},
      {type:'select', key:'sort', label:'Sort', options:['Latest First','Price: Low to High','Price: High to Low','Stock: Low to High']},
      {type:'search', placeholder:'Search products...'}
     ])
    + '<div class="card"><div class="tablewrap"><table><thead><tr>'
    + '<th><input type="checkbox" id="selAll"></th><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Featured</th><th>Actions</th>'
    + '</tr></thead><tbody id="prodBody"></tbody></table></div>'
    + '<div id="prodPager"></div></div>';

   document.getElementById('addBtn').addEventListener('click', function(){ openProductForm(); });
   document.getElementById('prodTabs').innerHTML = NOIR.tabsHtml(
    ['All Products ('+n.all+')','Active ('+n.active+')','Draft ('+n.draft+')','Out of Stock ('+n.oos+')','Featured ('+n.featured+')'], 'All Products');
   NOIR.bindTabs(document.getElementById('prodTabs'), function(tab){ state.tab = tab; state.page = 1; render(); });
   var filters = root.querySelector('.filters');
   filters.addEventListener('change', function(e){
    var k = e.target.getAttribute('data-filter');
    if(k === 'cat') state.cat = e.target.value;
    if(k === 'status') state.status = e.target.value;
    if(k === 'stock') state.stock = e.target.value;
    if(k === 'sort') state.sort = e.target.value;
    state.page = 1; render();
   });
   var search = filters.querySelector('input[data-filter="__search"]');
   search.addEventListener('input', NOIR.debounce(function(){ state.search = search.value.trim(); state.page = 1; render(); }, 200));
   document.getElementById('selAll').addEventListener('change', function(e){
    document.querySelectorAll('#prodBody input[type=checkbox]').forEach(function(c){ c.checked = e.target.checked; });
   });
   NOIR.bindPagination(document.getElementById('prodPager'), state, render);
   root.addEventListener('click', function(e){
    var sw = e.target.closest('.switch[data-pid]');
    if(sw){
     e.stopPropagation();
     var pid = Number(sw.getAttribute('data-pid'));
     var p = NOIR.DATA.products.find(function(x){ return x.id === pid; });
     var next = !p.featured;
     sw.classList.toggle('on', next);
     NoirAdminApi.setProductFeatured(NOIR.adminSession.accessToken, pid, next).then(function(){
      p.featured = next; NOIR.toast(next ? 'Marked as featured' : 'Removed from featured');
     }).catch(function(err){ sw.classList.toggle('on', !next); NOIR.toast(err.message || 'Could not update product'); });
     return;
    }
    var dots = e.target.closest('[data-pid-actions]');
    if(dots){
     e.stopPropagation();
     var pid2 = Number(dots.getAttribute('data-pid-actions'));
     var p2 = NOIR.DATA.products.find(function(x){ return x.id === pid2; });
     openActionsMenu(p2, dots);
     return;
    }
    var row = e.target.closest('tr[data-pid]');
    if(row && !e.target.closest('input') && !e.target.closest('.switch') && !e.target.closest('[data-pid-actions]')){
     var p3 = NOIR.DATA.products.find(function(x){ return x.id === Number(row.getAttribute('data-pid')); });
     openProductDrawer(p3);
    }
   });
   render();
  }
 };

 function toggleActive(p){
  if(p.isActive){
   NOIR.confirm({title:'Archive '+p.name+'?', message:'It will be hidden from the storefront. You can unarchive it any time.', okLabel:'Archive', danger:true, onOk:function(){
    NoirAdminApi.setProductActive(NOIR.adminSession.accessToken, p.id, false).then(function(){
     p.isActive = false; p.status='Draft';
     render(); NOIR.toast('Product archived');
    }).catch(function(err){ NOIR.toast(err.message || 'Could not archive product'); });
   }});
  } else {
   NoirAdminApi.setProductActive(NOIR.adminSession.accessToken, p.id, true).then(function(){
    p.isActive = true; p.status = p.stock<=0?'Out of Stock':(p.stock<=10?'Low Stock':'Active');
    render(); NOIR.toast('Product unarchived');
   }).catch(function(err){ NOIR.toast(err.message || 'Could not unarchive product'); });
  }
 }

 function deleteProduct(p){
  NOIR.confirm({title:'Delete '+p.name+' permanently?', message:'This removes it completely from NOIR — it will no longer exist anywhere, including the live store. This can\'t be undone. If it has ever been ordered, deletion will be blocked automatically and you\'ll need to archive it instead.', okLabel:'Delete Permanently', danger:true, onOk:function(){
   NoirAdminApi.deleteProduct(NOIR.adminSession.accessToken, p.id).then(function(){
    NOIR.DATA.products = NOIR.DATA.products.filter(function(x){ return x.id !== p.id; });
    render(); NOIR.toast('Product deleted');
   }).catch(function(err){ NOIR.toast(err.message || 'Could not delete product'); });
  }});
 }

 function openActionsMenu(p, anchor){
  document.querySelectorAll('.row-menu').forEach(function(m){ m.remove(); });
  var menu = document.createElement('div');
  menu.className = 'row-menu';
  var rect = anchor.getBoundingClientRect();
  menu.style.top = (rect.bottom + window.scrollY + 6) + 'px';
  menu.style.left = (rect.right + window.scrollX - 190) + 'px';
  menu.innerHTML =
   '<div data-act="toggle">'+(p.isActive ? 'Archive' : 'Unarchive')+'</div>'
   + '<div data-act="delete" class="danger">Delete Permanently</div>';
  document.body.appendChild(menu);

  function close(){ menu.remove(); document.removeEventListener('click', onDoc); }
  function onDoc(e){ if(!menu.contains(e.target) && e.target !== anchor) close(); }
  setTimeout(function(){ document.addEventListener('click', onDoc); }, 0);

  menu.addEventListener('click', function(e){
   var act = e.target.getAttribute('data-act');
   close();
   if(act === 'toggle') toggleActive(p);
   if(act === 'delete') deleteProduct(p);
  });
 }

 function render(){
  var list = filtered();
  var from = (state.page - 1) * state.perPage;
  var pageItems = list.slice(from, from + state.perPage);
  var body = document.getElementById('prodBody');
  if(!pageItems.length){
   body.innerHTML = '<tr><td colspan="8"><div class="empty">No products match the current filters.</div></td></tr>';
  } else {
   body.innerHTML = pageItems.map(function(p){
    return '<tr data-pid="'+p.id+'"><td><input type="checkbox" onclick="event.stopPropagation()"></td>'
     + '<td><div class="rowflex"><div class="thumb">'+(p.image?'<img src="'+NOIR.esc(p.image)+'" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">':NOIR.garment(p.cat))+'</div><div><div class="cell-main">'+NOIR.esc(p.name)+'</div><div class="cell-sub">SKU: '+p.sku+'</div></div></div></td>'
     + '<td>'+NOIR.esc(p.cat)+'</td>'
     + '<td><div class="cell-main">'+NOIR.fmt.inr(p.price)+'</div>'+(p.mrp ? '<div class="cell-sub" style="text-decoration:line-through">'+NOIR.fmt.inr(p.mrp)+'</div>' : '')+'</td>'
     + '<td>'+p.stock+'</td>'
     + '<td>'+NOIR.badge(p.status)+'</td>'
     + '<td><span class="switch '+(p.featured?'on':'')+'" data-pid="'+p.id+'"></span></td>'
     + '<td><button class="iconbtn" title="Actions" data-pid-actions="'+p.id+'">'+NOIR.icon('dots',14)+'</button></td></tr>';
   }).join('');
  }
  var total = list.length;
  var to = Math.min(from + state.perPage, total);
  document.getElementById('prodPager').innerHTML = NOIR.pagination({
   total: total, perPage: state.perPage, page: state.page,
   from: total ? from + 1 : 0, to: to, noun: 'products'
  });
 }

 function uploadZone(id){
  return '<div class="dropzone" id="'+id+'">'+NOIR.icon('camera',22)
   + '<div><b>Click to upload</b> or drag and drop</div><div style="font-size:11.5px;margin-top:2px;">PNG, JPG or WebP (Max 8MB)</div></div>'
   + '<input type="file" accept="image/png,image/jpeg,image/webp" style="display:none" id="'+id+'Input">';
 }
 function bindUpload(zoneId, onFile){
  var zone = document.getElementById(zoneId), input = document.getElementById(zoneId+'Input');
  if(!zone) return;
  zone.addEventListener('click', function(){ input.click(); });
  input.addEventListener('change', function(){
   var f = input.files && input.files[0];
   if(!f) return;
   var r = new FileReader();
   r.onload = function(e){
    zone.innerHTML = '<img src="'+e.target.result+'" alt="preview"><div style="font-size:12px;color:var(--noir-ink)">'+NOIR.esc(f.name)+'</div>';
   };
   r.readAsDataURL(f);
   if(onFile) onFile(f);
  });
 }

 function openProductDrawer(p){
  var cats = NOIR.DATA.categories.map(function(c){ return c.name; });
  var body =
   '<div class="flex" style="align-items:flex-start;">'
   + '<div class="thumb xl">'+(p.image?'<img src="'+NOIR.esc(p.image)+'" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">':NOIR.garment(p.cat,48))+'</div>'
   + '<div class="grow"><div class="cell-main" style="font-size:15px">'+NOIR.esc(p.name)+'</div><div class="cell-sub">SKU: '+p.sku+'</div>'
   + '<div class="mt10">'+NOIR.badge(p.status)+'</div></div>'
   + '</div>'
   + '<div id="pdTabsHost"></div>'
   + '<div id="pdBody"></div>';
  NOIR.openDrawer('', body, {wide:true});
  var editImage = null;
  NOIR.drawerTabs(document.getElementById('pdTabsHost'), ['General','Images'], function(tab){
   var b = document.getElementById('pdBody');
   if(tab === 'Images'){
    b.innerHTML = '<div class="field"><label>Replace Product Image</label>'+uploadZone('peZone')+'</div>';
    bindUpload('peZone', function(f){ editImage = f; });
    return;
   }
   b.innerHTML =
    '<div class="field"><label>Product Name</label><input id="peName" value="'+NOIR.esc(p.name)+'"></div>'
    + '<div class="field"><label>Description</label><textarea id="peDesc" rows="3">'+NOIR.esc(p.desc)+'</textarea></div>'
    + '<div class="two"><div class="field"><label>Category</label><input id="peCat" value="'+NOIR.esc(p.cat)+'" list="peCatList"><datalist id="peCatList">'+cats.map(function(c){return '<option value="'+NOIR.esc(c)+'">';}).join('')+'</datalist></div>'
    + '<div class="field"><label>Status</label><select id="peActive"><option value="1"'+(p.isActive?' selected':'')+'>Active</option><option value="0"'+(!p.isActive?' selected':'')+'>Draft</option></select></div></div>'
    + '<div class="two"><div class="field"><label>Price (₹)</label><input id="pePrice" value="'+p.price+'"></div>'
    + '<div class="field"><label>Compare at Price (₹)</label><input id="peMrp" value="'+(p.mrp||'')+'"></div></div>'
    + '<div class="field"><label>Stock Quantity</label><input id="peStock" value="'+p.stock+'"></div>'
    + '<div class="switch-row" style="border-top:1px solid var(--noir-border-2);margin-top:4px;">'
    + '<div><div class="sn">Featured Product</div><div class="sd">Show on homepage and featured sections</div></div>'
    + '<span class="switch '+(p.featured?'on':'')+'" id="peFeatured"></span></div>'
    + '<div class="err-msg" id="peErr" style="display:none;margin-top:10px;"></div>'
    + '<button class="btn block mt16" id="pUpdate">Update Product</button>';
   document.getElementById('peFeatured').addEventListener('click', function(){ this.classList.toggle('on'); });
   document.getElementById('pUpdate').addEventListener('click', async function(){
    var btn = this; var err = document.getElementById('peErr'); err.style.display='none';
    var imageUrl = null; // only send a new image when one was actually uploaded — otherwise the
                          // database keeps its existing (storefront-relative) path unchanged
    btn.disabled = true; btn.textContent = 'Updating…';
    try {
     if(editImage){
      imageUrl = await NoirAdminApi.uploadProductImage(NOIR.adminSession.accessToken, NOIR.adminSession.user.id, editImage);
     }
     var payload = {
      id: p.id, name: document.getElementById('peName').value, desc: document.getElementById('peDesc').value,
      category: document.getElementById('peCat').value, isActive: document.getElementById('peActive').value === '1',
      price: Number(document.getElementById('pePrice').value), oldPrice: Number(document.getElementById('peMrp').value) || null,
      stock: Number(document.getElementById('peStock').value), image: imageUrl,
      featured: document.getElementById('peFeatured').classList.contains('on'),
      genders: p.genders, sizes: p.sizes
     };
     await NoirAdminApi.upsertProduct(NOIR.adminSession.accessToken, payload);
     await refresh(); render();
     NOIR.closeDrawer(); NOIR.toast('Product updated');
    } catch(e){
     err.textContent = e.message || 'Could not update product'; err.style.display='block';
    } finally { btn.disabled = false; btn.textContent = 'Update Product'; }
   });
  });
 }

 function openProductForm(){
  var cats = NOIR.DATA.categories.map(function(c){ return c.name; });
  var newImage = null;
  var body =
   '<div class="field"><label>Product Image <span class="req">*</span></label>'+uploadZone('npZone')+'</div>'
   + '<form id="npForm" novalidate>'
   + '<div class="field"><label>Product Name <span class="req">*</span></label><input id="npName" placeholder="e.g. Essential Tee" data-validate="required"><div class="err-msg">Product name is required</div></div>'
   + '<div class="field"><label>Description</label><textarea id="npDesc" placeholder="Short description..."></textarea></div>'
   + '<div class="two"><div class="field"><label>Category <span class="req">*</span></label><input id="npCat" placeholder="e.g. hoodies" list="npCatList" data-validate="required"><datalist id="npCatList">'+cats.map(function(c){return '<option value="'+NOIR.esc(c)+'">';}).join('')+'</datalist><div class="err-msg">Enter a category</div></div>'
   + '<div class="field"><label>Stock <span class="req">*</span></label><input id="npStock" placeholder="0" data-validate="required|min:0"><div class="err-msg">Enter a valid stock quantity</div></div></div>'
   + '<div class="two"><div class="field"><label>Price (₹) <span class="req">*</span></label><input id="npPrice" placeholder="0" data-validate="required|min:1"><div class="err-msg">Enter a valid price</div></div>'
   + '<div class="field"><label>Compare at Price (₹)</label><input id="npMrp" placeholder="0"></div></div>'
   + '<div class="err-msg" id="npErr" style="display:none;">&nbsp;</div>'
   + '<div style="display:flex;gap:10px;margin-top:6px;">'
   + '<button type="button" class="btn outline" style="flex:1" onclick="NOIR.closeDrawer()">Cancel</button>'
   + '<button type="submit" class="btn" style="flex:1" id="npSubmit">Save Product</button></div></form>';
  NOIR.openDrawer('Add New Product', body);
  bindUpload('npZone', function(f){ newImage = f; });
  NOIR.bindValidation(document.getElementById('npForm'), async function(){
   var err = document.getElementById('npErr'); err.style.display = 'none';
   var submit = document.getElementById('npSubmit');
   if(!newImage){ err.textContent = 'Upload a product image.'; err.style.display='block'; return; }
   submit.disabled = true; submit.textContent = 'Saving…';
   try {
    var imageUrl = await NoirAdminApi.uploadProductImage(NOIR.adminSession.accessToken, NOIR.adminSession.user.id, newImage);
    var payload = {
     name: document.getElementById('npName').value, desc: document.getElementById('npDesc').value,
     category: document.getElementById('npCat').value, price: Number(document.getElementById('npPrice').value),
     oldPrice: Number(document.getElementById('npMrp').value) || null, stock: Number(document.getElementById('npStock').value),
     image: imageUrl, isActive: true, featured: false, genders: ['men'], sizes: ['S','M','L','XL']
    };
    await NoirAdminApi.upsertProduct(NOIR.adminSession.accessToken, payload);
    await refresh();
    NOIR.closeDrawer(); NOIR.toast('Product created');
    if(NOIR.pages.products.onChange) NOIR.pages.products.onChange();
    render();
   } catch(e){
    err.textContent = e.message || 'Could not create product'; err.style.display='block';
   } finally { submit.disabled = false; submit.textContent = 'Save Product'; }
  });
 }
})();
