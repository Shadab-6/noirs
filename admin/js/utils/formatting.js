/* formatting helpers */
window.NOIR = window.NOIR || {};
NOIR.fmt = {
  inr: function(n){
    n = Number(n)||0;
    var s = n.toLocaleString('en-IN');
    return '\u20B9' + s;
  },
  compact: function(n){
    n = Number(n)||0;
    if(n >= 100000) return (n/100000).toFixed(1).replace(/\.0$/,'') + 'L';
    if(n >= 1000) return (n/1000).toFixed(1).replace(/\.0$/,'') + 'K';
    return String(n);
  },
  pct: function(part, total){
    if(!total) return '0%';
    return ((part/total)*100).toFixed(1).replace(/\.0$/,'') + '%';
  },
  date: function(d){ return d; }
};
