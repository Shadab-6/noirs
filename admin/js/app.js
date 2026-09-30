/* NOIR admin bootstrap */
window.NOIR = window.NOIR || {};
document.addEventListener('DOMContentLoaded', async function(){
  var page = document.body.getAttribute('data-page');

  var session = await NOIR.requireAdmin();
  if (!session) return; // guard already redirected to the login page

  try {
    await NOIR.loadData();
  } catch (error) {
    console.error('Failed to load admin data:', error);
    document.getElementById('page-root').innerHTML =
      '<div class="card"><div class="card-body"><div class="empty">Couldn\'t reach the database. Please check your connection and refresh.</div></div></div>';
    return;
  }

  NOIR.mountSidebar(page);
  NOIR.mountHeader(page);
  /* wire shared switch toggles (page modules that need real writes bind their own
     handler on the specific switch's id first; this only covers decorative ones) */
  document.addEventListener('click', function(e){
    var sw = e.target.closest('.switch');
    if(sw && !sw.id){
      e.stopPropagation();
      sw.classList.toggle('on');
      if(NOIR.toast) NOIR.toast(sw.classList.contains('on') ? 'Enabled' : 'Disabled');
    }
  });
  /* page modules register themselves via NOIR.pages */
  if(NOIR.pages && NOIR.pages[page] && NOIR.pages[page].init){
    NOIR.pages[page].init();
  }
});
