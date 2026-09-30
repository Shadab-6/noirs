/* NOIR icon sprite + SVG helpers (injected once per page) */
window.NOIR = window.NOIR || {};
NOIR.ICONS = {
 home:'<path d="M3 11l9-7 9 7"/><path d="M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9"/>',
 bag:'<path d="M6 8h12l1 13H5L6 8z"/><path d="M9 8V6a3 3 0 016 0v2"/>',
 box:'<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
 grid:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 010 6.8"/><path d="M17.5 14.6c2.4.7 4 2.6 4 5.4"/>',
 archive:'<rect x="3" y="4" width="18" height="4"/><path d="M5 8v11a1 1 0 001 1h12a1 1 0 001-1V8"/><path d="M10 13h4"/>',
 tag:'<path d="M20 12l-8 8-9-9V4h7l10 8z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
 star:'<path d="M12 3l2.7 5.9 6.3.6-4.7 4.3 1.3 6.2L12 17l-5.6 3 1.3-6.2-4.7-4.3 6.3-.6L12 3z"/>',
 chart:'<path d="M4 20V10M12 20V4M20 20v-7"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
 bell:'<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
 down:'<path d="M6 9l6 6 6-6"/>',
 export:'<path d="M12 3v12M7 8l5-5 5 5"/><path d="M4 17v3a1 1 0 001 1h14a1 1 0 001-1v-3"/>',
 import:'<path d="M12 15V3M7 10l5 5 5-5"/><path d="M4 17v3a1 1 0 001 1h14a1 1 0 001-1v-3"/>',
 x:'<path d="M18 6L6 18M6 6l12 12"/>',
 dots:'<circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
 menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 check:'<path d="M20 6L9 17l-5-5"/>',
 eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
 eyeoff:'<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22"/>',
 copy:'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>',
 edit:'<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>',
 trash:'<path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
 mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/>',
 phone:'<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z"/>',
 pin:'<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 cal:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
 truck:'<rect x="1" y="7" width="14" height="10" rx="1"/><path d="M15 10h4l3 3v4h-7"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',
 printer:'<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
 filter:'<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>',
 sort:'<path d="M11 5h10M11 9h7M11 13h4"/><path d="M3 17l3 3 3-3"/><path d="M6 18V4"/>',
 rupee:'<path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3a6 6 0 006-5"/>',
 cart:'<circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M2 3h3l2.6 12.4a2 2 0 002 1.6h7.9a2 2 0 002-1.6L21 7H6"/>',
 truck2:'<path d="M1 8h13v9H1zM14 11h4l3 3v3h-7"/><circle cx="6" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/>',
 hourglass:'<path d="M6 2h12M6 22h12M7 2v4l5 6 5-6V2M7 22v-4l5-6 5 6v4"/>',
 heart:'<path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z"/>',
 shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
 lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
 wallet:'<path d="M20 7H4a2 2 0 01-2-2 2 2 0 012-2h14v4"/><path d="M2 5v13a2 2 0 002 2h16a1 1 0 001-1V8a1 1 0 00-1-1"/><circle cx="17" cy="14" r="1.2" fill="currentColor" stroke="none"/>',
 percent:'<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
 gift:'<rect x="3" y="8" width="18" height="4"/><path d="M12 8v13M5 12v9h14v-9"/><path d="M12 8a3 3 0 10-3-3c0 1.5 1 3 3 3zM12 8a3 3 0 113-3c0 1.5-1 3-3 3z"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18"/>',
 file:'<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/>',
 reply:'<path d="M9 17l-5-5 5-5"/><path d="M4 12h9a7 7 0 017 7v1"/>',
 download:'<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v3a1 1 0 001 1h14a1 1 0 001-1v-3"/>',
 upload:'<path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 17v3a1 1 0 001 1h14a1 1 0 001-1v-3"/>',
 history:'<path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
 moon:'<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>',
 external:'<path d="M18 13v6a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h6"/><path d="M15 3h6v6M10 14L21 3"/>',
 store:'<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9h18v2a3 3 0 01-6 0 3 3 0 01-6 0 3 3 0 01-6 0V9z"/><path d="M5 14v7h14v-7"/>',
 repeat:'<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/>',
 warning:'<path d="M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.7 3.86a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
 send:'<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>',
 monitor:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
 mobile:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M12 18h.01"/>',
 tablet:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M12 18h.01"/>',
 trend:'<path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>',
 camera:'<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>',
 laptop:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/>',
};
NOIR.icon = function(name, size){
  size = size || 18;
  return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+(NOIR.ICONS[name]||'')+'</svg>';
};
/* garment silhouettes for product imagery */
NOIR.GARMENTS = {
 hoodie:'<path d="M9 4L5 6l-2.6 5 2.2 1L6 10.4V20h12v-9.6l1.4 1.6 2.2-1L19 6l-4-2a4 4 0 01-6 0z" fill="currentColor" opacity=".75"/><path d="M10.5 20v-4h3v4" stroke="#fff" stroke-width="1" opacity=".4"/>',
 tee:'<path d="M9 3L4 5.5 2 10l3 1.5L6 9.6V21h12V9.6l1 1.9L22 10l-2-4.5L15 3a3 3 0 01-6 0z" fill="currentColor" opacity=".75"/>',
 cap:'<path d="M4 15a8 8 0 0116 0v1H4v-1z" fill="currentColor" opacity=".75"/><path d="M4 16c-2 0-3 .8-3 1.6S2 19 4 19h16c2 0 3-.6 3-1.4S20 16 18 16" fill="currentColor" opacity=".45"/>',
 pants:'<path d="M8 3h8l1.5 18h-5L12 9l-.5 12h-5L8 3z" fill="currentColor" opacity=".7"/>',
 sweatshirt:'<path d="M9 4L5 6l-2.6 5 2.2 1L6 10.4V20h12v-9.6l1.4 1.6 2.2-1L19 6l-4-2a4 4 0 01-6 0z" fill="currentColor" opacity=".75"/><path d="M10.2 9.5h3.6v5h-3.6z" stroke="#fff" stroke-width="1" fill="none" opacity=".45"/>',
 jacket:'<path d="M9 3L4.5 5.5 2 11l2.5 1.2L6 10.5V21h12v-10.5l1.5 1.7L22 11l-2.5-5.5L15 3a3 3 0 01-6 0z" fill="currentColor" opacity=".75"/><path d="M12 4v17" stroke="#fff" stroke-width="1" opacity=".4"/>',
 shorts:'<path d="M7 4h10l1.5 10H14l-2-5-2 5H5.5L7 4z" fill="currentColor" opacity=".7"/>',
 generic:'<path d="M9 3L4 5.5 2 10l3 1.5L6 9.6V21h12V9.6l1 1.9L22 10l-2-4.5L15 3a3 3 0 01-6 0z" fill="currentColor" opacity=".75"/>'
};
NOIR.garment = function(cat, size){
  var key = (cat||'').toLowerCase();
  var g = key.indexOf('hoodie')>-1 ? NOIR.GARMENTS.hoodie
        : key.indexOf('tee')>-1||key.indexOf('shirt')>-1&&key.indexOf('sweat')<0 ? NOIR.GARMENTS.tee
        : key.indexOf('cap')>-1||key.indexOf('access')>-1 ? NOIR.GARMENTS.cap
        : key.indexOf('jogger')>-1||key.indexOf('cargo')>-1||key.indexOf('pant')>-1||key.indexOf('bottom')>-1 ? NOIR.GARMENTS.pants
        : key.indexOf('sweat')>-1 ? NOIR.GARMENTS.sweatshirt
        : key.indexOf('jacket')>-1 ? NOIR.GARMENTS.jacket
        : key.indexOf('short')>-1 ? NOIR.GARMENTS.shorts
        : NOIR.GARMENTS.generic;
  return '<svg width="'+(size||22)+'" height="'+(size||22)+'" viewBox="0 0 24 24" fill="none" stroke="none">'+g+'</svg>';
};
