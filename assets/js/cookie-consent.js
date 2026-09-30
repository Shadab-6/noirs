/*
 * NOIR cookie consent banner.
 *
 * The site doesn't use advertising or tracking cookies (see cookies.html) — this is a simple,
 * honest notice about the essential browser storage we do use (bag, wishlist, sign-in), shown
 * once to a new visitor. Accepting just remembers not to show the banner again; it doesn't turn
 * any feature on or off, since there's nothing non-essential to opt into here.
 */
(function () {
  var STORAGE_KEY = "noirCookieConsent";

  function alreadyDecided() {
    try {
      return Boolean(localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      return true; // storage unavailable — don't show a banner we can't remember the answer to
    }
  }

  function remember() {
    try { localStorage.setItem(STORAGE_KEY, "accepted"); } catch (error) { /* ignore */ }
  }

  function showBanner() {
    var el = document.createElement("div");
    el.className = "n-consent";
    el.setAttribute("role", "region");
    el.setAttribute("aria-label", "Cookie notice");
    el.innerHTML =
      '<p>We use essential browser storage to keep your bag, wishlist and sign-in working. No advertising or tracking cookies. See our <a href="cookies.html">Cookie Policy</a>.</p>' +
      '<div class="n-consent__actions">' +
      '<button type="button" class="n-btn n-btn--solid" id="noirConsentAccept">Accept</button>' +
      '<a class="n-btn n-btn--line" href="cookies.html">Learn more</a>' +
      "</div>";
    document.body.appendChild(el);

    // Two frames so the initial (off-screen) transform is painted before adding .show,
    // which is what makes the transition actually animate instead of snapping into place.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { el.classList.add("show"); });
    });

    document.getElementById("noirConsentAccept").addEventListener("click", function () {
      remember();
      el.classList.remove("show");
      setTimeout(function () { el.remove(); }, 500);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (alreadyDecided()) return;
    showBanner();
  });
})();
