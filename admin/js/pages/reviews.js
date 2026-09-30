/* Reviews page */
window.NOIR = window.NOIR || {};
NOIR.pages = NOIR.pages || {};
(function(){
 var state = {tab:'All', page:1, perPage:10, search:''};
 NOIR.pages.reviews = {
  init: function(){
   var root = document.getElementById('page-root');
   root.innerHTML =
    NOIR.pageHead('Reviews', 'There is no customer review system on the NOIR storefront yet, so this section has nothing to show. Building it would mean adding a review table and a way for customers to submit reviews first.', '')
    + '<div class="stats">'
    + NOIR.statCard({icon:'star', label:'Total Reviews', value:'0', sub:'No review system yet'})
    + NOIR.statCard({icon:'star', label:'Average Rating', value:'—', sub:'No review system yet'})
    + NOIR.statCard({icon:'check', label:'Approved Reviews', value:'0', sub:'No review system yet'})
    + NOIR.statCard({icon:'clock', label:'Pending Reviews', value:'0', sub:'No review system yet'})
    + '</div>'
    + '<div id="rvTabs"></div>'
    + '<div class="card"><div class="tablewrap"><table><thead><tr>'
    + '<th>Customer</th><th>Product</th><th>Rating</th><th>Review</th><th>Date</th><th>Status</th>'
    + '</tr></thead><tbody id="rvBody"></tbody></table></div>'
    + '<div id="rvPager"></div></div>';

   document.getElementById('rvTabs').innerHTML = NOIR.tabsHtml(['All Reviews (0)'], 'All Reviews');
   NOIR.bindTabs(document.getElementById('rvTabs'), function(tab){ state.tab = tab; state.page = 1; render(); });
   NOIR.bindPagination(document.getElementById('rvPager'), state, render);
   render();
  }
 };
 function filtered(){
  return NOIR.DATA.reviews.filter(function(r){
   if(state.tab !== 'All' && r.status !== state.tab) return false;
   if(state.search){
    var q = state.search.toLowerCase();
    if(r.name.toLowerCase().indexOf(q) < 0 && r.prod.toLowerCase().indexOf(q) < 0 && r.title.toLowerCase().indexOf(q) < 0) return false;
   }
   return true;
  });
 }
 function render(){
  var list = filtered();
  var from = (state.page - 1) * state.perPage;
  var pageItems = list.slice(from, from + state.perPage);
  var body = document.getElementById('rvBody');
  body.innerHTML = pageItems.length ? pageItems.map(function(r){
   var imgs = '';
   if(r.imgs > 0){
    imgs = '<div class="mini-imgs">'
     + '<div class="thumb">'+NOIR.garment(r.cat,16)+'</div>'
     + (r.imgs > 1 ? '<div class="thumb">'+NOIR.garment(r.cat,16)+'</div>' : '')
     + (r.imgs > 2 ? '<span class="more">+'+(r.imgs-2)+'</span>' : '') + '</div>';
   }
   return '<tr data-rid="'+r.id+'"><td><input type="checkbox" onclick="event.stopPropagation()"></td>'
    + '<td><div class="rowflex"><div class="avatar soft">'+NOIR.initials(r.name)+'</div><div><div class="cell-main">'+r.name+'</div><div class="cell-sub">'+r.email+'</div></div></div></td>'
    + '<td><div class="rowflex"><div class="thumb">'+NOIR.garment(r.cat)+'</div><div><div class="cell-main">'+r.prod+'</div><div class="cell-sub">'+r.sku+'</div></div></div></td>'
    + '<td>'+NOIR.stars(r.rating)+'</td>'
    + '<td class="cell-sub" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;">'+r.title+'</td>'
    + '<td>'+(imgs || '<span class="txt-gray fs12">—</span>')+'</td>'
    + '<td>'+r.date+'</td><td>'+NOIR.badge(r.status)+'</td>'
    + '<td><button class="iconbtn" title="Actions" onclick="event.stopPropagation();NOIR.toast(\'Action menu\')">'+NOIR.icon('dots',14)+'</button></td></tr>';
  }).join('') : '<tr><td colspan="9"><div class="empty">No reviews found.</div></td></tr>';
  var total = list.length;
  var to = Math.min(from + state.perPage, total);
  document.getElementById('rvPager').innerHTML = NOIR.pagination({
   total: total, perPage: state.perPage, page: state.page,
   from: total ? from + 1 : 0, to: to, noun: 'reviews'
  });
 }
 function openReviewDrawer(r){
  var imgs = '';
  if(r.imgs > 0){
   var t = '';
   for(var i=0;i<Math.min(r.imgs,3);i++) t += '<div class="thumb">'+NOIR.garment(r.cat,34)+'</div>';
   imgs = '<div class="section-title">Customer Images ('+r.imgs+')</div><div class="review-imgs">'+t+'</div>';
  }
  var body =
   '<div class="flex" style="align-items:flex-start;">'
   + '<div class="avatar lg soft">'+NOIR.initials(r.name)+'</div>'
   + '<div class="grow"><div class="cell-main" style="font-size:15px">'+r.name+'</div><div class="cell-sub">'+r.email+'</div><div class="cell-sub">'+r.date+', '+r.time+'</div></div>'
   + NOIR.badge(r.status)+'</div>'
   + '<div class="section-title">Product</div>'
   + '<div class="flex"><div class="thumb lg">'+NOIR.garment(r.cat,32)+'</div>'
   + '<div class="grow"><div class="cell-main">'+r.prod+'</div><div class="cell-sub">SKU: '+r.sku+'</div></div>'
   + '<button class="btn outline sm" id="rvView">'+NOIR.icon('eye',13)+'<span>View Product</span></button></div>'
   + '<div class="section-title">Rating</div><div class="stars" style="font-size:19px;">'+NOIR.stars(r.rating)+'</div>'
   + '<div class="section-title">Review Title</div><div style="font-size:13.5px;font-weight:600;">'+r.title+'</div>'
   + '<div class="section-title">Review Comment</div><div style="font-size:13.5px;color:#3d3d38;line-height:1.6;">'+r.comment+'</div>'
   + imgs
   + '<div class="section-title">Actions</div>'
   + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
   + '<button class="btn success" id="rvApprove">'+NOIR.icon('check',14)+'<span>Approve</span></button>'
   + '<button class="btn danger" id="rvReject">'+NOIR.icon('x',14)+'<span>Reject</span></button>'
   + '<button class="btn outline" id="rvReply">'+NOIR.icon('reply',14)+'<span>Reply to Customer</span></button>'
   + '<button class="btn outline" id="rvDelete">'+NOIR.icon('trash',14)+'<span>Delete Review</span></button></div>';
  NOIR.openDrawer('Review Details', body, {wide:true});
  document.getElementById('rvView').addEventListener('click', function(){ NOIR.toast('Opening product page...'); });
  document.getElementById('rvApprove').addEventListener('click', function(){ NOIR.closeDrawer(); NOIR.toast('Review approved'); });
  document.getElementById('rvReject').addEventListener('click', function(){ NOIR.closeDrawer(); NOIR.toast('Review rejected'); });
  document.getElementById('rvReply').addEventListener('click', function(){ NOIR.toast('Reply composer opened'); });
  document.getElementById('rvDelete').addEventListener('click', function(){
   NOIR.closeDrawer();
   NOIR.confirm({title:'Delete this review?', message:'This will permanently remove the review by '+r.name+'.', okLabel:'Delete', danger:true, onOk:function(){ NOIR.toast('Review deleted'); }});
  });
 }
})();
