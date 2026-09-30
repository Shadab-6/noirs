/* shared table/chip/builder helpers */
window.NOIR = window.NOIR || {};
NOIR.badgeColor = {
  Delivered:'green', Shipped:'blue', Processing:'amber', Pending:'gray', Cancelled:'red', Returned:'gray',
  Paid:'green', COD:'gray', Unpaid:'red',
  Active:'green', Inactive:'red', Expired:'gray', Hidden:'red', Scheduled:'blue',
  'In Stock':'green', 'Low Stock':'amber', 'Out of Stock':'red',
  Approved:'green', Rejected:'red', Draft:'gray',
  Percentage:'green', 'Fixed Amount':'purple', 'Free Shipping':'blue',
  Active2:'green'
};
NOIR.badge = function(s){ return '<span class="badge '+(NOIR.badgeColor[s]||'gray')+'">'+NOIR.esc(s)+'</span>'; };
NOIR.stars = function(n){
  var full = '', empty = '';
  for(var i=0;i<5;i++){ if(i<n) full+='\u2605'; else empty+='\u2606'; }
  return '<span class="stars">'+full+'<span style="opacity:.35">'+empty+'</span></span>';
};
NOIR.statCard = function(o){
  var chg = o.chg || '';
  var flat = o.flat ? ' flat' : '';
  var chgHtml = chg
    ? '<div class="chg'+flat+'">'+(!flat?NOIR.icon('trend',12):'')+'<span>'+NOIR.esc(chg)+'</span></div>'
    : (o.sub ? '<div class="chg flat">'+NOIR.esc(o.sub)+'</div>' : '');
  var spark = o.spark ? '<div class="spark">'+o.spark+'</div>' : '';
  return '<div class="stat"><div class="ic '+(o.icCls||'')+'">'+NOIR.icon(o.icon||'box',20)+'</div>'
    + '<div class="grow"><div class="lbl">'+o.label+'</div><div class="val">'+o.value+'</div>'+chgHtml+'</div>'+spark+'</div>';
};
NOIR.pageHead = function(title, sub, actionsHtml){
  return '<div class="page-head"><div><h1>'+title+'</h1><p class="sub">'+sub+'</p></div>'
    + '<div class="page-actions">'+(actionsHtml||'')+'</div></div>';
};
NOIR.tabsHtml = function(tabs, active){
  return '<div class="tabs">'+tabs.map(function(t){
    var key = t.split(' (')[0];
    return '<button data-tab="'+NOIR.esc(key)+'" class="'+(key===active?'active':'')+'">'+NOIR.esc(t)+'</button>';
  }).join('')+'</div>';
};
NOIR.bindTabs = function(container, onTab){
  container.addEventListener('click', function(e){
    var b = e.target.closest('button'); if(!b) return;
    container.querySelectorAll('button').forEach(function(x){x.classList.remove('active');});
    b.classList.add('active');
    onTab && onTab(b.getAttribute('data-tab'));
  });
};
NOIR.filterRow = function(items){
  return '<div class="filters">'+items.map(function(it){
    if(it.type === 'select'){
      return '<select class="fselect" data-filter="'+it.key+'" aria-label="'+NOIR.esc(it.label)+'">'
        + it.options.map(function(o){ return '<option>'+NOIR.esc(o)+'</option>'; }).join('') + '</select>';
    }
    if(it.type === 'search'){
      return '<div class="fsearch">'+NOIR.icon('search',14)+'<input data-filter="__search" placeholder="'+NOIR.esc(it.placeholder||'Search...')+'"></div>';
    }
    if(it.type === 'clear'){
      return '<button class="clear-btn" data-filter="__clear">'+NOIR.icon('filter',13)+'<span>Clear Filters</span></button>';
    }
    return '';
  }).join('')+'</div>';
};
