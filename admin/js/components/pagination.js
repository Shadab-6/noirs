/* pagination component */
window.NOIR = window.NOIR || {};
NOIR.pagination = function(o){
  /* o: {total, perPage, page, from, to, onPage, showPerPage} */
  var pages = Math.max(1, Math.ceil(o.total / o.perPage));
  var nums = [];
  var lo = Math.max(1, Math.min(o.page - 2, pages - 4));
  var hi = Math.min(pages, lo + 4);
  for(var i=lo;i<=hi;i++) nums.push(i);
  var html = '<div class="pager"><span class="info">Showing '+o.from+'\u2013'+o.to+' of '+o.total+' '+o.noun+'</span>';
  html += '<span class="n'+(o.page<=1?' off':'')+'" data-pg="'+(o.page-1)+'">&lsaquo;</span>';
  if(lo>1){ html += '<span class="n" data-pg="1">1</span>'; if(lo>2) html += '<span class="n off">...</span>'; }
  nums.forEach(function(n){ html += '<span class="n'+(n===o.page?' active':'')+'" data-pg="'+n+'">'+n+'</span>'; });
  if(hi<pages){ if(hi<pages-1) html += '<span class="n off">...</span>'; html += '<span class="n" data-pg="'+pages+'">'+pages+'</span>'; }
  html += '<span class="n'+(o.page>=pages?' off':'')+'" data-pg="'+(o.page+1)+'">&rsaquo;</span>';
  if(o.showPerPage !== false){
    html += '<span class="perpage"><select id="perPageSel">'
      + [10,20,50].map(function(n){ return '<option'+(n===o.perPage?' selected':'')+'>'+n+'</option>'; }).join('')
      + '</select><span>per page</span></span>';
  }
  html += '</div>';
  return html;
};
NOIR.bindPagination = function(el, state, render){
  el.addEventListener('click', function(e){
    var n = e.target.closest('[data-pg]');
    if(!n || n.classList.contains('off')) return;
    state.page = Number(n.getAttribute('data-pg'));
    render();
  });
  var sel = el.querySelector('#perPageSel');
  if(sel) sel.addEventListener('change', function(){
    state.perPage = Number(sel.value); state.page = 1; render();
  });
};
