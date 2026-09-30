/* Orders page */
window.NOIR = window.NOIR || {};
NOIR.pages = NOIR.pages || {};
(function () {
  var state = { tab: 'All', page: 1, perPage: 10, search: '', status: 'All Status', pay: 'All Payment Status' };
  var STATUSES = ['Pending','Confirmed','Processing','Shipped','Delivered','Cancelled'];

  function base(){ return NOIR.DATA.orders; }

  function counts(){
   var all = base();
   var c = {All: all.length};
   STATUSES.forEach(function(s){ c[s] = all.filter(function(o){ return o.status === s; }).length; });
   return c;
  }

  function filtered() {
    return base().filter(function (o) {
      if (state.tab !== 'All' && o.status !== state.tab) return false;
      if (state.status !== 'All Status' && o.status !== state.status) return false;
      if (state.pay === 'Paid' && o.pay !== 'Paid') return false;
      if (state.search) {
        var q = state.search.toLowerCase();
        if (o.id.toLowerCase().indexOf(q) < 0 && o.cust.toLowerCase().indexOf(q) < 0 && o.email.toLowerCase().indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function itemThumb(it, size) {
    var product = NOIR.DATA.products.find(function (p) { return p.id === it.pid; });
    if (product && product.image) {
      return '<img src="' + NOIR.esc(product.image) + '" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">';
    }
    return NOIR.garment(product ? product.cat : it.cat, size || 30);
  }

  function itemsHtml(o) {
    var rows = o.items.map(function (it) {
      return '<div class="oitem"><div class="thumb">' + itemThumb(it) + '</div>' +
        '<div class="grow"><div class="nm">' + NOIR.esc(it.p) + '</div><div class="mta">' + NOIR.esc(it.meta) + '</div></div>' +
        '<div style="text-align:right"><div class="pr">' + NOIR.fmt.inr(it.price) + '</div><div class="mta">Qty: ' + it.qty + '</div></div></div>';
    }).join('');
    return '<div class="section-title">Order Items</div>' + rows +
      '<div class="totals">' +
      '<div class="dline"><span>Subtotal</span><b>' + NOIR.fmt.inr(o.subtotal) + '</b></div>' +
      '<div class="dline"><span>Shipping</span><b>' + NOIR.fmt.inr(o.shipping) + '</b></div>' +
      (o.discount ? '<div class="dline"><span>Discount</span><b style="color:var(--noir-success)">-' + NOIR.fmt.inr(o.discount) + '</b></div>' : '') +
      '<div class="dline grand"><span>Total</span><b>' + NOIR.fmt.inr(o.amt) + '</b></div></div>';
  }

  function statusPicker(o){
    return '<div class="section-title">Update Status</div><div class="seg" id="statusSeg" style="flex-wrap:wrap;">' +
      STATUSES.map(function(s){ return '<button type="button" class="'+(s===o.status?'active':'')+'" data-v="'+s+'">'+s+'</button>'; }).join('') +
      '</div><button class="btn block mt16" id="statusSave">Save Status</button>';
  }

  function overviewHtml(o) {
    return itemsHtml(o) +
      '<div class="two" style="margin-top:18px;gap:18px;align-items:start;">' +
      '<div><div class="section-title" style="margin-top:0">Shipping Address</div>' +
      '<div style="font-size:13px;line-height:1.6">' + NOIR.esc(o.cust) + '<br>' + NOIR.esc(o.address) + '<br>' + NOIR.esc(o.phone) + '</div></div>' +
      '<div><div class="section-title" style="margin-top:0">Payment Details ' + NOIR.badge(o.pay) + '</div>' +
      '<dl class="kv"><dt>Method</dt><dd>' + NOIR.esc(o.method) + '</dd><dt>Paid on</dt><dd>' + o.date + '</dd></dl></div></div>' +
      '<div class="section-title">Order Actions</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
      '<button class="btn outline" id="oaUpdate">' + NOIR.icon('repeat', 14) + '<span>Update Status</span></button>' +
      (o.status !== 'Cancelled' && o.status !== 'Delivered' ? '<button class="btn danger" id="oaCancel">' + NOIR.icon('trash', 14) + '<span>Cancel Order</span></button>' : '') +
      '</div>';
  }

  async function saveStatus(o, newStatus, done){
    try {
      await NoirAdminApi.updateOrderStatus(NOIR.adminSession.accessToken, o._id, newStatus.toLowerCase());
      o.status = newStatus;
      NOIR.toast('Order status updated');
      if (done) done();
      render();
    } catch (e) {
      NOIR.toast(e.message || 'Could not update order status');
    }
  }

  function bindOverviewActions(o) {
    var u = document.getElementById('oaUpdate');
    if (u) u.addEventListener('click', function () {
      document.getElementById('odTabBody').innerHTML = statusPicker(o);
      document.querySelectorAll('#statusSeg button').forEach(function(b){
        b.addEventListener('click', function(){ document.querySelectorAll('#statusSeg button').forEach(function(x){x.classList.remove('active');}); b.classList.add('active'); });
      });
      document.getElementById('statusSave').addEventListener('click', function(){
        var chosen = document.querySelector('#statusSeg button.active').getAttribute('data-v');
        saveStatus(o, chosen, function(){ NOIR.closeDrawer(); });
      });
    });
    var c = document.getElementById('oaCancel');
    if (c) c.addEventListener('click', function () {
      NOIR.closeDrawer();
      NOIR.confirm({ title: 'Cancel this order?', message: 'Order ' + o.id + ' will be marked cancelled.', okLabel: 'Cancel Order', danger: true, onOk: function () { saveStatus(o, 'Cancelled'); } });
    });
  }

  function openOrder(o) {
    if (!o) return;
    var body = '<div class="dsub">Placed on ' + o.date + ' at ' + o.time + '</div>' +
      '<div id="odTabsHost"></div><div id="odTabBody"></div>';
    NOIR.openDrawer('Order ' + o.id + ' ' + NOIR.badge(o.status), body, { wide: true });
    NOIR.drawerTabs(document.getElementById('odTabsHost'),
      ['Overview', 'Products', 'Customer'],
      function (tab) {
        var tb = document.getElementById('odTabBody');
        if (tab === 'Products') { tb.innerHTML = itemsHtml(o); return; }
        if (tab === 'Customer') {
          tb.innerHTML = '<div class="section-title">Customer</div>' +
            '<div class="dline"><span>Name</span><b>' + NOIR.esc(o.cust) + '</b></div>' +
            '<div class="dline"><span>Email</span><b>' + NOIR.esc(o.email) + '</b></div>' +
            '<div class="dline"><span>Phone</span><b>' + NOIR.esc(o.phone) + '</b></div>';
          return;
        }
        tb.innerHTML = overviewHtml(o);
        bindOverviewActions(o);
      });
  }

  function render() {
    var list = filtered();
    var from = (state.page - 1) * state.perPage;
    var pageItems = list.slice(from, from + state.perPage);
    var body = document.getElementById('ordersBody');
    if (!pageItems.length) {
      body.innerHTML = '<tr><td colspan="8"><div class="empty">No orders match the current filters.</div></td></tr>';
    } else {
      body.innerHTML = pageItems.map(function (o) {
        var imgs = o.items.slice(0, 2).map(function (it) {
          return '<div class="thumb">' + itemThumb(it, 16) + '</div>';
        }).join('');
        return '<tr data-oid="' + o.id + '"><td><input type="checkbox" onclick="event.stopPropagation()"></td>' +
          '<td class="cell-main">' + o.id + '</td>' +
          '<td>' + NOIR.esc(o.cust) + '<div class="cell-sub">' + NOIR.esc(o.email) + '</div></td>' +
          '<td>' + o.date + '<div class="cell-sub">' + o.time + '</div></td>' +
          '<td><div class="flex" style="gap:8px"><span class="txt-gray fs12">' + o.items.length + ' item' + (o.items.length > 1 ? 's' : '') + '</span><div class="mini-imgs">' + imgs + '</div></div></td>' +
          '<td>' + NOIR.fmt.inr(o.amt) + '</td>' +
          '<td>' + NOIR.badge(o.pay) + '</td>' +
          '<td>' + NOIR.badge(o.status) + '</td></tr>';
      }).join('');
    }
    var total = list.length;
    var to = Math.min(from + state.perPage, total);
    document.getElementById('ordersPager').innerHTML = NOIR.pagination({
      total: total, perPage: state.perPage, page: state.page,
      from: total ? from + 1 : 0, to: to, noun: 'orders'
    });
  }

  NOIR.pages.orders = {
    init: function () {
      var root = document.getElementById('page-root');
      var n = counts();
      var S = NOIR.DATA.dashboard || {};
      root.innerHTML =
        NOIR.pageHead('Orders', 'Manage and track all customer orders', '') +
        '<div class="stats">' +
        NOIR.statCard({ icon: 'bag', label: 'Total Orders', value: String(n.All), sub: 'All time' }) +
        NOIR.statCard({ icon: 'rupee', label: 'Total Revenue', value: NOIR.fmt.inr(S.totalRevenue||0), sub: 'All time' }) +
        NOIR.statCard({ icon: 'truck', label: 'Delivered', value: String(n.Delivered||0), sub: NOIR.fmt.pct(n.Delivered||0, n.All)+' of total' }) +
        NOIR.statCard({ icon: 'clock', label: 'Shipped', value: String(n.Shipped||0), sub: NOIR.fmt.pct(n.Shipped||0, n.All)+' of total' }) +
        NOIR.statCard({ icon: 'hourglass', label: 'Processing', value: String(n.Processing||0), sub: NOIR.fmt.pct(n.Processing||0, n.All)+' of total' }) +
        NOIR.statCard({ icon: 'x', label: 'Pending/Cancelled', value: String((n.Pending||0)+(n.Cancelled||0)), sub: NOIR.fmt.pct((n.Pending||0)+(n.Cancelled||0), n.All)+' of total' }) +
        '</div>' +
        '<div id="ordersTabs"></div>' +
        NOIR.filterRow([
          { type: 'select', key: 'status', label: 'Status', options: ['All Status'].concat(STATUSES) },
          { type: 'select', key: 'pay', label: 'Payment', options: ['All Payment Status', 'Paid', 'Pending', 'Failed', 'Refunded'] },
          { type: 'search', placeholder: 'Search by order ID, customer...' },
          { type: 'clear' }
        ]) +
        '<div class="card"><div class="tablewrap"><table><thead><tr>' +
        '<th><input type="checkbox" id="selAll"></th><th>Order ID</th><th>Customer</th><th>Date</th><th>Items</th><th>Amount</th><th>Payment</th><th>Status</th>' +
        '</tr></thead><tbody id="ordersBody"></tbody></table></div>' +
        '<div id="ordersPager"></div></div>';

      document.getElementById('ordersTabs').innerHTML = NOIR.tabsHtml(
        ['All (' + n.All + ')', 'Pending (' + (n.Pending||0) + ')', 'Processing (' + (n.Processing||0) + ')', 'Shipped (' + (n.Shipped||0) + ')', 'Delivered (' + (n.Delivered||0) + ')', 'Cancelled (' + (n.Cancelled||0) + ')'], 'All');
      NOIR.bindTabs(document.getElementById('ordersTabs'), function (tab) { state.tab = tab; state.page = 1; render(); });

      var filters = root.querySelector('.filters');
      filters.addEventListener('change', function (e) {
        var k = e.target.getAttribute('data-filter');
        if (k === 'status') state.status = e.target.value;
        if (k === 'pay') state.pay = e.target.value;
        state.page = 1; render();
      });
      var search = filters.querySelector('input[data-filter="__search"]');
      search.addEventListener('input', NOIR.debounce(function () {
        state.search = search.value.trim(); state.page = 1; render();
      }, 200));
      filters.addEventListener('click', function (e) {
        if (e.target.closest('[data-filter="__clear"]')) {
          state.search = ''; state.status = 'All Status'; state.pay = 'All Payment Status';
          filters.querySelectorAll('select').forEach(function (s) { s.selectedIndex = 0; });
          search.value = ''; state.page = 1; render();
          NOIR.toast('Filters cleared');
        }
      });
      document.getElementById('selAll').addEventListener('change', function (e) {
        document.querySelectorAll('#ordersBody input[type=checkbox]').forEach(function (c) { c.checked = e.target.checked; });
      });
      NOIR.bindPagination(document.getElementById('ordersPager'), state, render);
      root.addEventListener('click', function (e) {
        var row = e.target.closest('tr[data-oid]');
        if (row && !e.target.closest('input')) {
          openOrder(base().find(function (o) { return o.id === row.getAttribute('data-oid'); }));
        }
      });
      render();
    },
    openOrderDrawer: function (o) { openOrder(o); }
  };
})();
