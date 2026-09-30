/* Coupons page */
window.NOIR = window.NOIR || {};
NOIR.pages = NOIR.pages || {};
(function(){
 var state = {tab:'All', page:1, perPage:10, search:''};

 async function refresh(){
  var rows = await NoirAdminApi.listCoupons(NOIR.adminSession.accessToken);
  NOIR.DATA.coupons = (rows||[]).map(NOIR.mapCoupon);
 }

 function counts(){
  var all = NOIR.DATA.coupons;
  return {
   All: all.length,
   Active: all.filter(function(c){ return c.status==='Active'; }).length,
   Inactive: all.filter(function(c){ return c.status==='Inactive'; }).length,
   Expired: all.filter(function(c){ return c.status==='Expired'; }).length
  };
 }

 NOIR.pages.coupons = {
  init: function(){
   var root = document.getElementById('page-root');
   var n = counts();
   var totalUses = NOIR.DATA.coupons.reduce(function(s,c){ return s+c.used; },0);
   root.innerHTML =
    NOIR.pageHead('Coupons', 'Create and manage discount coupons to boost your sales.',
     '<button class="btn" id="createBtn">'+NOIR.icon('plus',15)+'<span>Create Coupon</span></button>')
    + '<div class="stats">'
    + NOIR.statCard({icon:'tag', label:'Total Coupons', value:String(n.All), sub:'All coupons'})
    + NOIR.statCard({icon:'percent', label:'Active Coupons', value:String(n.Active), sub:NOIR.fmt.pct(n.Active,n.All)+' of total'})
    + NOIR.statCard({icon:'users', label:'Total Uses', value:String(totalUses), sub:'Across all coupons'})
    + NOIR.statCard({icon:'rupee', label:'Expired', value:String(n.Expired), sub:'No longer usable'})
    + '</div>'
    + '<div id="cpTabs"></div>'
    + '<div class="filters">'
    + '<div class="fsearch" style="margin-left:auto">'+NOIR.icon('search',14)+'<input data-filter="__search" placeholder="Search coupons..."></div>'
    + '</div>'
    + '<div class="card"><div class="tablewrap"><table><thead><tr>'
    + '<th>Code</th><th>Type</th><th>Value</th><th>Min. Order</th><th>Usage</th><th>Validity</th><th>Status</th><th>Actions</th>'
    + '</tr></thead><tbody id="cpBody"></tbody></table></div>'
    + '<div id="cpPager"></div></div>';

   document.getElementById('createBtn').addEventListener('click', openCouponForm);
   document.getElementById('cpTabs').innerHTML = NOIR.tabsHtml(['All Coupons ('+n.All+')','Active ('+n.Active+')','Inactive ('+n.Inactive+')','Expired ('+n.Expired+')'], 'All Coupons');
   NOIR.bindTabs(document.getElementById('cpTabs'), function(tab){ state.tab = tab; state.page = 1; render(); });
   var search = root.querySelector('input[data-filter="__search"]');
   search.addEventListener('input', NOIR.debounce(function(){ state.search = search.value.trim(); state.page = 1; render(); }, 200));
   NOIR.bindPagination(document.getElementById('cpPager'), state, render);
   render();
  }
 };
 function filtered(){
  return NOIR.DATA.coupons.filter(function(c){
   if(state.tab === 'Active' && c.status !== 'Active') return false;
   if(state.tab === 'Inactive' && c.status !== 'Inactive') return false;
   if(state.tab === 'Expired' && c.status !== 'Expired') return false;
   if(state.search){
    var q = state.search.toLowerCase();
    if(c.code.toLowerCase().indexOf(q) < 0 && c.type.toLowerCase().indexOf(q) < 0) return false;
   }
   return true;
  });
 }
 function render(){
  var list = filtered();
  var from = (state.page - 1) * state.perPage;
  var pageItems = list.slice(from, from + state.perPage);
  var body = document.getElementById('cpBody');
  body.innerHTML = pageItems.length ? pageItems.map(function(c){
   return '<tr data-code="'+NOIR.esc(c.code)+'"><td><span class="code-chip">'+NOIR.esc(c.code)+'</span></td>'
    + '<td>'+NOIR.badge(c.type)+'</td><td class="cell-main">'+c.value+'</td><td>'+NOIR.fmt.inr(c.min)+'</td>'
    + '<td>'+c.used+' / '+(c.limit === 0 ? '\u221E' : c.limit)+'</td><td>'+c.valid+'</td>'
    + '<td>'+NOIR.badge(c.status)+'</td>'
    + '<td><div class="flex" style="gap:6px">'
    + '<span class="switch '+(c.isActive?'on':'')+'" data-code="'+NOIR.esc(c.code)+'" title="Active"></span>'
    + '<button class="iconbtn" title="Delete" data-del="'+NOIR.esc(c.code)+'">'+NOIR.icon('trash',14)+'</button>'
    + '</div></td></tr>';
  }).join('') : '<tr><td colspan="8"><div class="empty">No coupons found.</div></td></tr>';
  var total = list.length;
  var to = Math.min(from + state.perPage, total);
  document.getElementById('cpPager').innerHTML = NOIR.pagination({
   total: total, perPage: state.perPage, page: state.page,
   from: total ? from + 1 : 0, to: to, noun: 'coupons'
  });
  body.querySelectorAll('.switch[data-code]').forEach(function(sw){
   sw.addEventListener('click', async function(){
    var code = sw.getAttribute('data-code');
    var c = NOIR.DATA.coupons.find(function(x){ return x.code === code; });
    var next = !c.isActive;
    sw.classList.toggle('on', next);
    try { await NoirAdminApi.setCouponActive(NOIR.adminSession.accessToken, code, next); await refresh(); render(); NOIR.toast(next?'Coupon enabled':'Coupon disabled'); }
    catch(e){ sw.classList.toggle('on', !next); NOIR.toast(e.message || 'Could not update coupon'); }
   });
  });
  body.querySelectorAll('[data-del]').forEach(function(btn){
   btn.addEventListener('click', function(){
    var code = btn.getAttribute('data-del');
    NOIR.confirm({title:'Delete coupon '+code+'?', message:'This cannot be undone.', okLabel:'Delete', danger:true, onOk: async function(){
     try { await NoirAdminApi.deleteCoupon(NOIR.adminSession.accessToken, code); await refresh(); render(); NOIR.toast('Coupon deleted'); }
     catch(e){ NOIR.toast(e.message || 'Could not delete coupon'); }
    }});
   });
  });
 }
 function genCode(){
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = '';
  for(var i=0;i<8;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
 }
 function openCouponForm(){
  var body =
    '<form id="coupForm" novalidate>'
    + '<div class="field"><label>Coupon Code <span class="req">*</span></label><div class="flex"><input id="coupCode" placeholder="e.g. WELCOME10" data-validate="required|code"><button type="button" class="btn outline sm" id="genBtn">'+NOIR.icon('repeat',13)+'<span>Generate</span></button></div><div class="err-msg">Enter a valid code (3–32 letters/numbers)</div></div>'
    + '<div class="field"><label>Discount Type <span class="req">*</span></label><div class="seg" id="dtypeSeg">'
    + '<button type="button" class="active" data-v="percent">'+NOIR.icon('percent',15)+'<span>Percentage</span></button>'
    + '<button type="button" data-v="fixed">'+NOIR.icon('rupee',15)+'<span>Fixed Amount</span></button></div></div>'
    + '<div class="field"><label>Discount Value <span class="req">*</span></label><input id="coupValue" placeholder="e.g. 10" data-validate="required|min:1"><div class="err-msg">Enter a valid value</div></div>'
    + '<div class="field"><label>Minimum Order Amount (Optional)</label><input id="coupMin" placeholder="e.g. 999"></div>'
    + '<div class="field"><label>Usage Limit (Optional)</label><input id="coupMax" placeholder="e.g. 500 (leave empty for unlimited)"></div>'
    + '<div class="two"><div class="field"><label>Starts</label><input type="date" id="coupStart"></div><div class="field"><label>Expires</label><input type="date" id="coupEnd"></div></div>'
    + '<div class="switch-row"><div><div class="sn">Status</div><div class="sd">Coupon will be available for use</div></div><span class="switch on" id="coupStatus"></span></div>'
    + '<div class="err-msg" id="coupErr" style="display:none;">&nbsp;</div>'
    + '<button type="submit" class="btn block mt10" id="coupSubmit">Create Coupon</button></form>';
  NOIR.openDrawer('Create New Coupon', body);
  document.getElementById('genBtn').addEventListener('click', function(){
   document.getElementById('coupCode').value = genCode();
  });
  var dtype = 'percent';
  document.querySelectorAll('#dtypeSeg button').forEach(function(b){
   b.addEventListener('click', function(){
    document.querySelectorAll('#dtypeSeg button').forEach(function(x){ x.classList.remove('active'); });
    b.classList.add('active'); dtype = b.getAttribute('data-v');
   });
  });
  document.getElementById('coupStatus').addEventListener('click', function(){ this.classList.toggle('on'); });
  NOIR.bindValidation(document.getElementById('coupForm'), async function(){
   var err = document.getElementById('coupErr'); err.style.display='none';
   var submit = document.getElementById('coupSubmit');
   submit.disabled = true; submit.textContent = 'Saving…';
   try {
    var payload = {
     code: document.getElementById('coupCode').value, discountType: dtype,
     discountValue: Number(document.getElementById('coupValue').value),
     minSubtotal: Number(document.getElementById('coupMin').value) || 0,
     maxUses: Number(document.getElementById('coupMax').value) || null,
     startsAt: document.getElementById('coupStart').value ? new Date(document.getElementById('coupStart').value).toISOString() : null,
     expiresAt: document.getElementById('coupEnd').value ? new Date(document.getElementById('coupEnd').value).toISOString() : null,
     isActive: document.getElementById('coupStatus').classList.contains('on')
    };
    await NoirAdminApi.upsertCoupon(NOIR.adminSession.accessToken, payload);
    await refresh();
    NOIR.closeDrawer(); NOIR.toast('Coupon created'); render();
   } catch(e){
    err.textContent = e.message || 'Could not create coupon'; err.style.display='block';
   } finally { submit.disabled = false; submit.textContent = 'Create Coupon'; }
  });
 }
})();
