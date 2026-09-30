/* Dashboard page */
window.NOIR = window.NOIR || {};
NOIR.pages = NOIR.pages || {};
NOIR.pages.dashboard = {
 init: function(){
  var D = NOIR.DATA;
  var S = D.dashboard || {};
  var root = document.getElementById('page-root');
  var recent = D.orders.slice(0,5);
  var topProducts = D.topProducts || [];
  var lowStock = D.products.filter(function(p){ return p.status === 'Low Stock' || p.status === 'Out of Stock'; }).slice(0,4);
  var spark = function(pts, color){ return NOIR.charts.spark(pts, {color: color}); };
  var breakdown = S.orderStatusBreakdown || {};
  var statusColor = {delivered:'#141414', shipped:'#a8a49a', processing:'#d8d4c8', pending:'#eae7dd', confirmed:'#c9c4b6', cancelled:'#e0503a'};
  var donutData = Object.keys(breakdown).map(function(k){
   return {value: breakdown[k], color: statusColor[k] || '#9a998f', name: k.charAt(0).toUpperCase()+k.slice(1)};
  });

  root.innerHTML =
   NOIR.pageHead('Dashboard', 'Welcome back! Here\'s what\'s happening with your store.', '')
   + '<div class="stats">'
   + NOIR.statCard({icon:'bag', label:'Total Orders', value:String(S.totalOrders||0), sub:'All time', spark:spark(D.orderCounts && D.orderCounts.length ? D.orderCounts : [0])})
   + NOIR.statCard({icon:'rupee', label:'Total Revenue', value:NOIR.fmt.inr(S.totalRevenue||0), sub:'All time', spark:spark(D.revenue && D.revenue.length ? D.revenue : [0])})
   + NOIR.statCard({icon:'users', label:'Total Customers', value:String(S.totalCustomers||0), sub:'All time', flat:true})
   + NOIR.statCard({icon:'box', label:'Total Products', value:String(S.totalProducts||0), sub:'Active listings', flat:true})
   + '</div>'
   + '<div class="grid2">'
   + '<div class="card"><div class="card-head"><div><h3>Revenue Overview</h3><div class="sub">Last 30 days</div></div></div>'
   + '<div class="card-body" id="revChart"></div></div>'
   + '<div class="card"><div class="card-head"><h3>Order Status</h3></div><div class="card-body">'
   + (donutData.length ? NOIR.charts.donut(donutData, S.totalOrders||0, 'Total Orders') : '<div class="empty">No orders yet.</div>')
   + '</div></div></div>'
   + '<div class="grid2">'
   + '<div class="card"><div class="card-head"><h3>Recent Orders</h3><button class="link" onclick="location.href=\'orders.html\'">View All '+NOIR.icon('arrow',13)+'</button></div>'
   + '<div class="tablewrap"><table><thead><tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>'
   + (recent.length ? recent.map(function(o){
      return '<tr><td class="cell-main">'+o.id+'</td><td>'+NOIR.esc(o.cust)+'</td><td>'+o.date+'</td><td>'+NOIR.fmt.inr(o.amt)+'</td><td>'+NOIR.badge(o.status)+'</td>'
       + '<td><button class="iconbtn" data-order="'+o.id+'" title="View order">'+NOIR.icon('dots',14)+'</button></td></tr>';
     }).join('') : '<tr><td colspan="6"><div class="empty">No orders yet.</div></td></tr>')
   + '</tbody></table></div></div>'
   + '<div class="card"><div class="card-head"><h3>Top Products</h3><button class="link" onclick="location.href=\'products.html\'">View All '+NOIR.icon('arrow',13)+'</button></div>'
   + '<div class="card-body rank-list">'
   + (topProducts.length ? topProducts.map(function(p,i){
      return '<div class="rrow"><span class="rn">'+(i+1)+'</span><div class="thumb">'+NOIR.garment(p.cat)+'</div><div class="grow"><div class="rnm">'+NOIR.esc(p.name)+'</div><div class="rsub">'+p.orders+' orders</div></div><b>'+NOIR.fmt.inr(p.rev)+'</b></div>';
     }).join('') : '<div class="empty">No sales yet.</div>')
   + '</div></div></div>'
   + '<div class="grid2">'
   + '<div class="card"><div class="card-head"><h3>Quick Actions</h3></div><div class="card-body"><div class="qa-grid">'
   + '<div class="qa" data-qa="add-product">'+NOIR.icon('plus',20)+'<span>Add Product</span></div>'
   + '<div class="qa" data-qa="orders">'+NOIR.icon('bag',20)+'<span>Manage Orders</span></div>'
   + '<div class="qa" data-qa="coupon">'+NOIR.icon('tag',20)+'<span>Create Coupon</span></div>'
   + '<div class="qa" data-qa="customers">'+NOIR.icon('users',20)+'<span>View Customers</span></div>'
   + '<div class="qa" data-qa="settings">'+NOIR.icon('settings',20)+'<span>Store Settings</span></div>'
   + '</div></div></div>'
   + '<div class="card"><div class="card-head"><h3>Low Stock Products</h3><button class="link" onclick="location.href=\'inventory.html\'">View All '+NOIR.icon('arrow',13)+'</button></div>'
   + '<div class="tablewrap"><table><thead><tr><th>Product</th><th>Stock</th><th>Status</th></tr></thead><tbody>'
   + (lowStock.length ? lowStock.map(function(p){
      return '<tr><td><div class="rowflex"><div class="thumb">'+NOIR.garment(p.cat)+'</div><span class="cell-main">'+NOIR.esc(p.name)+'</span></div></td><td>'+p.stock+'</td><td>'+NOIR.badge(p.status)+'</td></tr>';
     }).join('') : '<tr><td colspan="3"><div class="empty">Nothing low on stock.</div></td></tr>')
   + '</tbody></table></div></div></div>';

  /* revenue chart */
  document.getElementById('revChart').innerHTML = NOIR.charts.line(D.revenue && D.revenue.length ? D.revenue : [0,0], {
    yLabels: ['₹0','₹'+NOIR.fmt.compact(Math.max.apply(null, D.revenue||[0])||1)]
  });

  root.addEventListener('click', function(e){
   var qa = e.target.closest('[data-qa]');
   if(qa){
    var map = {'add-product':'products.html','orders':'orders.html','coupon':'coupons.html','customers':'customers.html','settings':'settings.html'};
    location.href = map[qa.getAttribute('data-qa')];
    return;
   }
   var ob = e.target.closest('[data-order]');
   if(ob){
    var o = D.orders.find(function(x){ return x.id === ob.getAttribute('data-order'); });
    if (o) NOIR.pages.orders.openOrderDrawer(o);
   }
  });
 }
};
