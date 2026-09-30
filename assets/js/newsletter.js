// NOIR home page: the "Join Our Journey" sign-up form and the free-shipping amount in the trust strip.
(function () {
  const form = document.getElementById("newsForm");
  if (!form) return;

  const input = document.getElementById("newsEmail");
  const submit = document.getElementById("newsSubmit");
  const status = document.getElementById("newsStatus");

  function say(message, kind) {
    status.textContent = message;
    status.className = `n-news__status${kind ? ` is-${kind}` : ""}`;
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const email = input.value.trim();

    if (!NoirShared.isValidEmail(email)) {
      input.setAttribute("aria-invalid", "true");
      say(email ? "Enter a valid email address." : "Enter your email address.", "error");
      input.focus();
      return;
    }

    input.removeAttribute("aria-invalid");
    submit.disabled = true;
    say("Signing you up…");

    const result = await NoirApi.subscribeNewsletter(email);
    submit.disabled = false;

    if (result.ok) {
      form.reset();
      say("You're on the list. Watch your inbox for new arrivals.", "ok");
      return;
    }

    input.setAttribute("aria-invalid", "true");
    say(result.message, "error");
  });

  input.addEventListener("input", () => {
    if (input.getAttribute("aria-invalid")) {
      input.removeAttribute("aria-invalid");
      say("");
    }
  });

  // Free shipping starts at the amount set in the database (falls back to the built-in default).
  const shippingMin = document.getElementById("freeShippingMin");
  if (shippingMin) {
    NoirApi.getShippingMethods().then(rows => {
      NoirShared.setShippingMethods(rows);
      const standard = NoirShared.SHIPPING_METHODS.standard;
      if (standard && standard.freeFrom) shippingMin.textContent = `₹${Number(standard.freeFrom).toLocaleString("en-IN")}`;
    });
  }
})();
