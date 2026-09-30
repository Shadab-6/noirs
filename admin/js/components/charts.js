/* SVG chart helpers (frontend-only, no dependencies) */
window.NOIR = window.NOIR || {};
NOIR.charts = {
 line: function(pts, o){
  o = o || {};
  var W = o.width || 660, H = o.height || 210, padL = 44, padB = 26, padT = 12, padR = 12;
  var max = o.max || Math.max.apply(null, pts) * 1.15;
  var n = pts.length;
  function X(i){ return padL + i * (W - padL - padR) / (n - 1); }
  function Y(v){ return padT + (H - padT - padB) * (1 - v / max); }
  var path = pts.map(function(p,i){ return (i?'L':'M') + X(i).toFixed(1) + ',' + Y(p).toFixed(1); }).join(' ');
  var area = path + ' L' + X(n-1) + ',' + (H-padB) + ' L' + padL + ',' + (H-padB) + ' Z';
  var grid = '';
  var rows = o.yLabels || [];
  rows.forEach(function(lbl, i){
    var v = max * i / (rows.length - 1 || 1);
    var y = Y(v);
    grid += '<line x1="'+padL+'" y1="'+y+'" x2="'+(W-padR)+'" y2="'+y+'" stroke="#e8e5dc" stroke-width="1"/>'
      + '<text x="'+(padL-8)+'" y="'+(y+4)+'" text-anchor="end" font-size="10.5" fill="#9a998f">'+lbl+'</text>';
  });
  var dots = pts.map(function(p,i){ return '<circle cx="'+X(i)+'" cy="'+Y(p)+'" r="2.6" fill="#141414"/>'; }).join('');
  var labels = '<text x="'+padL+'" y="'+(H-6)+'" font-size="10.5" fill="#9a998f">Sep 1</text>'
    + '<text x="'+(W-padR)+'" y="'+(H-6)+'" text-anchor="end" font-size="10.5" fill="#9a998f">Sep 30</text>';
  return '<svg class="chart-svg" viewBox="0 0 '+W+' '+H+'">'
    + '<defs><linearGradient id="lcg'+NOIR.uid('g')+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#141414" stop-opacity=".14"/><stop offset="100%" stop-color="#141414" stop-opacity="0"/></linearGradient></defs>'
    + grid
    + '<path d="'+area+'" fill="rgba(20,20,20,.07)"/>'
    + '<path d="'+path+'" fill="none" stroke="#141414" stroke-width="2"/>'
    + dots + labels + '</svg>';
 },
 barsLine: function(bars, line, o){
  o = o || {};
  var W = o.width || 660, H = o.height || 230, padL = 40, padR = 40, padB = 26, padT = 14;
  var maxB = Math.max.apply(null, bars) * 1.2, maxL = Math.max.apply(null, line) * 1.25;
  var n = bars.length, bw = (W - padL - padR) / n * 0.55;
  var out = '', xlabels = '';
  var yl = o.yLabels || ['₹0','₹5K','₹10K','₹15K','₹20K','₹25K'];
  yl.forEach(function(lbl, i){
    var y = padT + (H - padT - padB) * (1 - i / (yl.length - 1));
    out += '<line x1="'+padL+'" y1="'+y+'" x2="'+(W-padR)+'" y2="'+y+'" stroke="#eeece4" stroke-width="1"/>'
      + '<text x="'+(padL-7)+'" y="'+(y+3.5)+'" text-anchor="end" font-size="10" fill="#9a998f">'+lbl+'</text>';
  });
  for(var i=0;i<n;i++){
    var cx = padL + (i + .5) * (W - padL - padR) / n;
    var bh = (H - padT - padB) * bars[i] / maxB;
    out += '<rect x="'+(cx - bw/2)+'" y="'+(H - padB - bh)+'" width="'+bw+'" height="'+bh+'" rx="2.5" fill="#a5b4fc"/>';
    if(i % 3 === 0) xlabels += '<text x="'+cx+'" y="'+(H-8)+'" text-anchor="middle" font-size="9.5" fill="#9a998f">Sep '+(i+1)+'</text>';
  }
  var lp = line.map(function(v,i){
    var cx = padL + (i + .5) * (W - padL - padR) / n;
    var cy = padT + (H - padT - padB) * (1 - v / maxL);
    return (i?'L':'M') + cx.toFixed(1) + ',' + cy.toFixed(1);
  }).join(' ');
  out += '<path d="'+lp+'" fill="none" stroke="#4f46e5" stroke-width="2"/>'
    + line.map(function(v,i){
      var cx = padL + (i + .5) * (W - padL - padR) / n;
      var cy = padT + (H - padT - padB) * (1 - v / maxL);
      return '<circle cx="'+cx+'" cy="'+cy+'" r="2.4" fill="#4f46e5"/>';
    }).join('');
  out += xlabels;
  return '<svg class="chart-svg" viewBox="0 0 '+W+' '+H+'">'+out+'</svg>';
 },
 donut: function(segs, total, centerLabel, o){
  o = o || {};
  var R = 50, C = 2 * Math.PI * R, off = 0, sw = o.thickness || 19;
  var circles = segs.map(function(s){
    var len = C * (s.value / total);
    var c = '<circle cx="70" cy="70" r="'+R+'" fill="none" stroke="'+s.color+'" stroke-width="'+sw+'" stroke-dasharray="'+len.toFixed(1)+' '+(C-len).toFixed(1)+'" stroke-dashoffset="'+(-off).toFixed(1)+'" transform="rotate(-90 70 70)"/>';
    off += len; return c;
  }).join('');
  var withPct = o.withPct !== false;
  var legend = segs.map(function(s){
    return '<div class="li"><span class="sw" style="background:'+s.color+'"></span><span class="nm">'+s.name+'</span><b>'+s.value+'</b>'
      + (withPct ? '<span class="pc">'+NOIR.fmt.pct(s.value, total)+'</span>' : '') + '</div>';
  }).join('');
  return '<div class="donutwrap"><svg width="140" height="140" viewBox="0 0 140 140">'
    + circles
    + '<text x="70" y="68" text-anchor="middle" font-size="21" font-weight="700" font-family="Georgia,serif">'+total+'</text>'
    + '<text x="70" y="84" text-anchor="middle" font-size="9" fill="#9a998f">'+(centerLabel||'')+'</text>'
    + '</svg><div class="legend">'+legend+'</div></div>';
 },
 spark: function(pts, o){
  o = o || {};
  var W = o.width || 74, H = o.height || 30;
  var max = Math.max.apply(null, pts), min = Math.min.apply(null, pts);
  var path = pts.map(function(p,i){
    var x = i * W / (pts.length - 1);
    var y = 3 + (H - 6) * (1 - (p - min) / ((max - min) || 1));
    return (i?'L':'M') + x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
  return '<svg class="spark-line" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'"><path d="'+path+'" fill="none" stroke="'+(o.color||'#1f9d55')+'" stroke-width="1.6"/></svg>';
 },
 area: function(pts, o){
  o = o || {};
  var W = o.width || 320, H = o.height || 110, padB = 18, padT = 8;
  var max = Math.max.apply(null, pts) * 1.15, n = pts.length;
  function X(i){ return i * W / (n - 1); }
  function Y(v){ return padT + (H - padT - padB) * (1 - v / max); }
  var path = pts.map(function(p,i){ return (i?'L':'M') + X(i).toFixed(1) + ',' + Y(p).toFixed(1); }).join(' ');
  var area = path + ' L'+W+','+(H-padB)+' L0,'+(H-padB)+' Z';
  var lbls = (o.labels||[]).map(function(l,i){
    return '<text x="'+X(i * (n-1) / ((o.labels||[]).length - 1))+'" y="'+(H-4)+'" text-anchor="middle" font-size="9" fill="#9a998f">'+l+'</text>';
  }).join('');
  return '<svg class="chart-svg" viewBox="0 0 '+W+' '+H+'"><path d="'+area+'" fill="rgba(79,70,229,.12)"/><path d="'+path+'" fill="none" stroke="#4f46e5" stroke-width="2"/>'+lbls+'</svg>';
 }
};
