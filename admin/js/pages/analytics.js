/* Analytics page — every number here comes from real NOIR data. Traffic sources, device
 * usage and geographic breakdowns from the original mock are not shown: the storefront has
 * no visit/traffic tracking at all, so there is nothing real to report for them. */
window.NOIR = window.NOIR || {};
NOIR.pages = NOIR.pages || {};
NOIR.pages.analytics = {
 init: function(){
  var D = NOIR.DATA;
  var S = D.dashboard || {};
  var root = document.getElementById('page-root');
  var spark = function(pts, color){ return NOIR.charts.spark(pts, {color: color, width: 82, height: 30}); };

  var head = NOIR.pageHead('Analytics', 'Track your store performance with real, up-to-date figures.', '');

  var statRow = '<div class="stats">'
   + NOIR.statCard({icon:'cart', label:'Total Sales', value:NOIR.fmt.inr(S.totalRevenue||0), sub:'All time', spark:spark(D.revenue.length?D.revenue:[0],'#1f9d55')})
   + NOIR.statCard({icon:'box', label:'Total Orders', value:String(S.totalOrders||0), sub:'All time', spark:spark(D.orderCounts.length?D.orderCounts:[0],'#4f46e5')})
   + NOIR.statCard({icon:'user', label:'Total Customers', value:String(S.totalCustomers||0), sub:'All time', flat:true})
   + NOIR.statCard({icon:'rupee', label:'Avg. Order Value', value:NOIR.fmt.inr(S.totalOrders ? Math.round((S.totalRevenue||0)/S.totalOrders) : 0), sub:'All time', flat:true})
   + '</div>';

  var maxRev = Math.max.apply(null, D.revenue.length?D.revenue:[0]) || 1;
  var yLabels = [0,.25,.5,.75,1].map(function(f){ return NOIR.fmt.compact(Math.round(maxRev*f)); }).map(function(v){ return '₹'+v; });
  var salesCard = '<div class="card"><div class="card-head"><div><h3>Sales Overview</h3><div class="sub">Last 30 days</div></div></div>'
   + '<div class="card-body">'
   + '<div class="legend" style="flex-direction:row;gap:18px;margin-bottom:8px;">'
   + '<div class="li"><span class="sw" style="background:#4f46e5;width:8px;height:8px;border-radius:2px;"></span><span class="nm">Revenue (₹)</span></div>'
   + '<div class="li"><span class="sw" style="background:#a5b4fc;width:8px;height:8px;border-radius:2px;"></span><span class="nm">Orders</span></div></div>'
   + (D.revenue.length ? NOIR.charts.barsLine(D.orderCounts, D.revenue, {yLabels:yLabels}) : '<div class="empty">No orders yet.</div>')
   + '</div></div>';

  var breakdown = S.orderStatusBreakdown || {};
  var statusColor = {delivered:'#22c55e', shipped:'#3b82f6', processing:'#f59e0b', pending:'#9a998f', confirmed:'#a78bfa', cancelled:'#ef4444'};
  var donutData = Object.keys(breakdown).map(function(k){ return {value: breakdown[k], color: statusColor[k]||'#9a998f', name: k.charAt(0).toUpperCase()+k.slice(1)}; });
  var orderStatus = '<div class="card"><div class="card-head"><h3>Order Status</h3></div><div class="card-body">'
   + (donutData.length ? NOIR.charts.donut(donutData, S.totalOrders||0, 'Total Orders') : '<div class="empty">No orders yet.</div>')
   + '</div></div>';

  var topProducts = '<div class="card"><div class="card-head"><h3>Top Products</h3><button class="link" onclick="location.href=\'products.html\'">View All '+NOIR.icon('arrow',13)+'</button></div>'
   + '<div class="card-body rank-list">'
   + ((D.topProducts||[]).length ? D.topProducts.map(function(p,i){
      return '<div class="rrow"><span class="rn">'+(i+1)+'</span><div class="thumb">'+NOIR.garment(p.cat)+'</div><div class="grow"><div class="rnm">'+NOIR.esc(p.name)+'</div><div class="rsub">'+p.orders+' orders</div></div><b>'+NOIR.fmt.inr(p.rev)+'</b></div>';
     }).join('') : '<div class="empty">No sales yet.</div>')
   + '</div></div>';

  /* top categories: computed client-side from real order items joined back to each product's category */
  var catRev = {}, catOrders = {};
  var prodById = {}; D.products.forEach(function(p){ prodById[p.id] = p; });
  D.orders.forEach(function(o){
   if(o.status === 'Cancelled') return;
   o.items.forEach(function(it){
    var prod = prodById[it.pid];
    var cat = prod ? prod.cat : 'Other';
    catRev[cat] = (catRev[cat]||0) + it.price*it.qty;
    catOrders[cat] = (catOrders[cat]||0) + 1;
   });
  });
  var catList = Object.keys(catRev).map(function(k){ return {name:k, rev:catRev[k], orders:catOrders[k]}; }).sort(function(a,b){ return b.rev-a.rev; }).slice(0,6);
  var maxCatRev = catList.length ? catList[0].rev : 1;
  var palette = ['#141414','#2563eb','#22c55e','#d99a2b','#e0503a','#7c3aed'];
  var topCats = '<div class="card"><div class="card-head"><h3>Top Categories</h3></div><div class="card-body">'
   + (catList.length ? catList.map(function(c,i){
      return '<div class="bar-row"><div class="bt"><b>'+NOIR.esc(c.name)+'</b><span>'+NOIR.fmt.inr(c.rev)+'</span></div>'
       + '<div class="bar-track"><div class="bar-fill" style="width:'+Math.round(c.rev/maxCatRev*100)+'%;background:'+palette[i%palette.length]+';"></div></div>'
       + '<div class="bt" style="margin-top:4px;"><span style="color:var(--noir-gray-2);font-size:12px;">'+c.orders+' items sold</span></div></div>';
     }).join('') : '<div class="empty">No sales yet.</div>')
   + '</div></div>';

  /* new customers per month, from each customer's first order date */
  var byMonth = {};
  D.customers.forEach(function(c){
   if(!c.firstOrderAt) return;
   var d = new Date(c.firstOrderAt); var key = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
   byMonth[key] = (byMonth[key]||0) + 1;
  });
  var monthKeys = Object.keys(byMonth).sort().slice(-6);
  var monthLabels = monthKeys.map(function(k){ var p=k.split('-'); return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(p[1])-1]; });
  var monthSeries = monthKeys.map(function(k){ return byMonth[k]; });
  var custInsights = '<div class="card"><div class="card-head"><h3>New Customers</h3><div class="sub">By month, based on first order date</div></div><div class="card-body">'
   + '<div class="two" style="gap:24px;margin-bottom:10px;">'
   + '<div><div style="font-size:26px;font-weight:700;font-family:var(--noir-serif);">'+(S.totalCustomers||0)+'</div><div class="txt-gray fs12">Total Customers</div></div>'
   + '<div><div style="font-size:26px;font-weight:700;font-family:var(--noir-serif);">'+(monthSeries.length?monthSeries[monthSeries.length-1]:0)+'</div><div class="txt-gray fs12">New This Month</div></div></div>'
   + (monthSeries.length ? NOIR.charts.area(monthSeries, {labels: monthLabels, width: 340, height: 130}) : '<div class="empty">No customers yet.</div>')
   + '</div></div>';

  root.innerHTML = head + statRow
   + '<div class="grid2">' + salesCard + orderStatus + '</div>'
   + '<div class="grid3">' + topProducts + topCats + custInsights + '</div>';
 }
};
