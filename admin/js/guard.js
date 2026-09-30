/* NOIR admin route guard. Included on every page under admin/pages/ — runs before app.js
 * mounts the sidebar/header/page. Redirects to the login page unless the visitor is signed in
 * to a NOIR account AND that account is in private.admin_users (checked by the database via
 * public.am_i_admin(), not by anything in this file — this only decides where to send the browser). */
window.NOIR = window.NOIR || {};

(function () {
  // Hide the page immediately so a non-admin never sees a flash of real admin content
  // before the redirect fires.
  var style = document.createElement("style");
  style.id = "noirAdminGate";
  style.textContent = "body{visibility:hidden}";
  document.head.appendChild(style);

  function goToLogin(reason) {
    var here = encodeURIComponent(location.pathname.split("/").pop() || "");
    location.replace("../index.html" + (reason ? "?denied=" + reason + "&from=" + here : "?from=" + here));
  }

  NOIR.requireAdmin = async function () {
    try {
      var session = await NoirAuth.getSession();
      if (!session) { goToLogin(); return null; }

      var isAdmin = await NoirAdminApi.amIAdmin(session.accessToken);
      if (!isAdmin) {
        // Only ever promotes anyone when private.admin_users is still empty (first-run bootstrap).
        // For every account after the first, this call is a no-op and isAdmin stays false.
        isAdmin = await NoirAdminApi.bootstrapAdmin(session.accessToken).catch(() => false);
      }
      if (!isAdmin) { goToLogin("not_admin"); return null; }

      if (NoirAuth.needsMfaStepUp(session)) {
        // This account has 2FA enabled but this particular session never completed the code
        // challenge (e.g. an old tab, or a session started before 2FA was turned on). Sending it
        // back to the login page lets index.html's own "already signed in" check pick this same
        // session up and show the code screen — the database would reject these calls anyway.
        goToLogin();
        return null;
      }

      NOIR.adminSession = session;
      var gate = document.getElementById("noirAdminGate");
      if (gate) gate.remove();
      return session;
    } catch (error) {
      console.error("Admin auth check failed:", error);
      goToLogin("error");
      return null;
    }
  };
})();
