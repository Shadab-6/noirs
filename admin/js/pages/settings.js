/* Settings page */
window.NOIR = window.NOIR || {};
NOIR.pages = NOIR.pages || {};
NOIR.pages.settings = {
 init: function(){
  var root = document.getElementById('page-root');
  root.innerHTML = NOIR.pageHead('Settings', 'Manage your store settings.') + '<div id="settingsRoot"></div>';
  var host = document.getElementById('settingsRoot');

  function setCard(icon, title, sub, body){
   return '<div class="set-card"><div class="set-head"><div class="sic">'+NOIR.icon(icon,19)+'</div>'
    + '<div><h3>'+title+'</h3><div class="sub">'+sub+'</div></div></div>'
    + '<div class="set-body">'+body+'</div></div>';
  }

  var storeInfo = setCard('store','Store Information','Basic details about your store.',
   '<div class="two"><div class="field"><label>Store Name</label><input value="NOIR."></div>'
   + '<div class="field"><label>Store URL</label><input value="https://noirshop.in"></div></div>'
   + '<div class="field"><label>Store Email</label><input value="support@noirshop.in"></div>'
   + '<div class="field"><label>Store Description</label><textarea>Premium streetwear and minimal clothing for everyday life.</textarea></div>'
   + '<div class="field"><label>Store Logo</label><div class="flex"><div class="logo-preview">NOIR.</div>'
   + '<button class="btn outline" id="logoBtn">'+NOIR.icon('upload',14)+'<span>Change Logo</span></button></div></div>'
   + '<button class="btn" id="saveStore">Save Changes</button>');

  var payment = setCard('wallet','Payment Settings','Manage payment methods.',
   '<div class="pay-row"><div class="pay-logo">R</div><div class="grow"><div class="pn">Razorpay</div><div class="pd">Accept UPI, Cards, Net Banking and more.</div></div>'
   + NOIR.badge('Active') + '<button class="btn outline sm" id="rzpEdit">Edit</button></div>'
   + '<div class="pay-row"><div class="pay-logo">₹</div><div class="grow"><div class="pn">Cash on Delivery</div><div class="pd">Allow customers to pay on delivery.</div></div>'
   + '<span class="switch on"></span></div>');

  var shipping = setCard('truck','Shipping Settings','Configure shipping options.',
   '<div class="field"><label>Default Shipping Method</label><select><option>Standard Shipping (3–7 days)</option><option>Express Shipping (1–2 days)</option></select></div>'
   + '<div class="field"><label>Free Shipping Threshold (₹)</label><input value="999"></div>'
   + '<div class="switch-row"><div><div class="sn">Enable Cash on Delivery (COD)</div><div class="sd">Show COD as a payment option at checkout</div></div><span class="switch on"></span></div>');

  var prefs = setCard('settings','Store Preferences','Basic store preferences.',
   '<div class="field"><label>Default Currency</label><select><option>INR – Indian Rupee (₹)</option></select></div>'
   + '<div class="field"><label>Default Language</label><select><option>English</option></select></div>'
   + '<div class="field"><label>Timezone</label><select><option>(GMT+05:30) Asia/Kolkata</option><option>(GMT+00:00) UTC</option></select></div>');

  var security = setCard('shield','Security','Protect your admin account.',
   '<div class="field"><label>New Password</label><input type="password" id="newPw" placeholder="At least 8 characters"></div>'
   + '<button class="btn outline" id="pwBtn" style="margin-bottom:8px;">Update Password</button>'
   + '<div class="section-title" style="margin-top:4px;">Two-Factor Authentication</div>'
   + '<div id="mfaSection"><div class="empty">Checking…</div></div>');

  var admins = setCard('users','Admin Access','Manage admin users and roles.',
   '<div class="pay-row"><div class="avatar">'+NOIR.initials((NOIR.adminSession.user.email||'A'))+'</div><div class="grow"><div class="pn">You</div><div class="pd">'+NOIR.esc(NOIR.adminSession.user.email)+'</div></div>'
   + '<span class="badge blue plain">Admin</span></div>'
   + '<div class="hint" style="font-size:12px;color:var(--noir-gray);margin-top:10px;">There is no invite flow yet — a new admin currently needs a NOIR account and their user ID added to private.admin_users in Supabase directly. Role-based permissions (Orders / Products / Customers / Analytics / Settings) are not implemented; every admin can access everything.</div>');

  host.innerHTML =
   '<div class="grid2" style="grid-template-columns:1fr 1fr;">' + storeInfo + payment + '</div>'
   + '<div class="grid2" style="grid-template-columns:1fr 1fr;">' + shipping + prefs + '</div>'
   + '<div class="grid2" style="grid-template-columns:1fr 1fr;">' + security + admins + '</div>';

  document.getElementById('saveStore').addEventListener('click', function(){ NOIR.toast('Store settings saved'); });
  document.getElementById('logoBtn').addEventListener('click', function(){ NOIR.toast('Opening logo upload...'); });
  document.getElementById('rzpEdit').addEventListener('click', function(){ NOIR.toast('Editing Razorpay configuration'); });
  document.getElementById('pwBtn').addEventListener('click', async function(){
   var btn = this, pw = document.getElementById('newPw').value;
   if(pw.length < 8){ NOIR.toast('Password must be at least 8 characters'); return; }
   btn.disabled = true; btn.textContent = 'Updating…';
   try {
    var result = await NoirAuth.updatePassword(pw);
    if(result.error){ NOIR.toast(result.error); return; }
    document.getElementById('newPw').value = '';
    NOIR.toast('Password updated');
   } finally { btn.disabled = false; btn.textContent = 'Update Password'; }
  });

  renderMfaSection();
 }
};

async function renderMfaSection(){
 var host = document.getElementById('mfaSection');
 if(!host) return;
 var refreshed = await NoirAuth.refreshUser();
 var factors = refreshed.session ? (refreshed.session.user.factors || []) : (NOIR.adminSession.user.factors || []);
 var verified = factors.find(function(f){ return f.status === 'verified'; });

 if(verified){
  host.innerHTML = '<div class="pay-row"><div class="pay-logo">'+NOIR.icon('shield',16)+'</div>'
   + '<div class="grow"><div class="pn">Enabled</div><div class="pd">'+NOIR.esc(verified.friendlyName || 'Authenticator app')+'</div></div>'
   + '<button class="btn danger sm" id="mfaDisable">Disable</button></div>';
  document.getElementById('mfaDisable').addEventListener('click', function(){
   NOIR.confirm({title:'Disable two-factor authentication?', message:'Signing in will only require your password after this.', okLabel:'Disable', danger:true, onOk: async function(){
    var r = await NoirAuth.mfaUnenroll(verified.id);
    if(r.error){ NOIR.toast(r.error); return; }
    NOIR.toast('Two-factor authentication disabled');
    renderMfaSection();
   }});
  });
  return;
 }

 host.innerHTML = '<p class="sd" style="margin-bottom:10px;">Add an authenticator app (Google Authenticator, Authy, 1Password...) as a second step when signing in.</p>'
  + '<button class="btn outline" id="mfaEnable">'+NOIR.icon('shield',14)+'<span>Enable Two-Factor Authentication</span></button>';
 document.getElementById('mfaEnable').addEventListener('click', openMfaEnrollDrawer);
}

async function openMfaEnrollDrawer(){
 // clear out any abandoned unverified factor from a previous attempt before starting a new one
 var refreshed = await NoirAuth.refreshUser();
 var factors = refreshed.session ? (refreshed.session.user.factors || []) : [];
 var stale = factors.filter(function(f){ return f.status === 'unverified'; });
 for(var i=0;i<stale.length;i++){ await NoirAuth.mfaUnenroll(stale[i].id); }

 var body = '<div class="empty">Setting up...</div>';
 NOIR.openDrawer('Set Up Two-Factor Authentication', body);

 var enroll = await NoirAuth.mfaEnroll();
 var host = document.querySelector('.drawer-body');
 if(!host){ return; }
 if(enroll.error){ host.innerHTML = '<div class="err-msg" style="display:block;">'+NOIR.esc(enroll.error)+'</div>'; return; }

 host.innerHTML =
  '<p class="sd">Scan this QR code with your authenticator app.</p>'
  + '<div style="text-align:center;margin:14px 0;"><img src="'+enroll.qrCode+'" alt="QR code" style="width:180px;height:180px;border:1px solid var(--noir-border);border-radius:10px;padding:8px;background:#fff;"></div>'
  + '<div class="field"><label>Can\'t scan it? Enter this code manually</label><input readonly value="'+NOIR.esc(enroll.secret||'')+'" onclick="this.select()"></div>'
  + '<form id="mfaVerifyForm" novalidate>'
  + '<div class="field"><label>6-Digit Code</label><input id="mfaVerifyCode" inputmode="numeric" maxlength="6" placeholder="000000" data-validate="required"><div class="err-msg">Enter the 6-digit code</div></div>'
  + '<div class="err-msg" id="mfaVerifyErr" style="display:none;">&nbsp;</div>'
  + '<button type="submit" class="btn block" id="mfaVerifySubmit">Verify &amp; Enable</button></form>';

 NOIR.bindValidation(document.getElementById('mfaVerifyForm'), async function(){
  var err = document.getElementById('mfaVerifyErr'); err.style.display = 'none';
  var btn = document.getElementById('mfaVerifySubmit');
  var code = document.getElementById('mfaVerifyCode').value.trim();
  btn.disabled = true; btn.textContent = 'Verifying…';
  try {
   var challenge = await NoirAuth.mfaChallenge(enroll.factorId);
   if(challenge.error){ err.textContent = challenge.error; err.style.display = 'block'; return; }
   var result = await NoirAuth.mfaVerify(enroll.factorId, challenge.challengeId, code);
   if(result.error){ err.textContent = result.error; err.style.display = 'block'; return; }
   NOIR.adminSession = result.session;
   NOIR.closeDrawer();
   NOIR.toast('Two-factor authentication enabled');
   renderMfaSection();
  } finally { btn.disabled = false; btn.textContent = 'Verify & Enable'; }
 });
}
