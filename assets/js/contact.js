const whatsappForm = document.getElementById("whatsappForm");
const messageField = document.getElementById("message");
const messageCount = document.getElementById("messageCount");
const formError = document.getElementById("contactFormError");

if (whatsappForm) {
  const updateCount = () => {
    if (messageCount && messageField) messageCount.textContent = String(messageField.value.length);
  };

  messageField?.addEventListener("input", updateCount);
  updateCount();

  whatsappForm.addEventListener("submit", function (e) {
    e.preventDefault();

    if (formError) {
      formError.hidden = true;
      formError.textContent = "";
    }

    if (!whatsappForm.checkValidity()) {
      const firstInvalid = whatsappForm.querySelector(":invalid");
      if (firstInvalid) firstInvalid.focus({ preventScroll: false });
      return;
    }

    const name = document.getElementById("name")?.value.trim() || "";
    const email = document.getElementById("email")?.value.trim() || "";
    const phone = document.getElementById("phone")?.value.trim() || "";
    const subject = document.getElementById("subject")?.value || "";
    const message = document.getElementById("message")?.value.trim() || "";

    const whatsappNumber = "919136579741";
    const finalMessage = [
      "Hello NOIR.",
      "",
      `Name: ${name}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : null,
      `Subject: ${subject}`,
      "",
      "Message:",
      message
    ].filter(Boolean).join("\n");

    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(finalMessage)}`;
    const popup = window.open(whatsappUrl, "_blank", "noopener,noreferrer");

    if (!popup && formError) {
      formError.textContent = "Your browser blocked the WhatsApp window. Please allow pop-ups and try again.";
      formError.hidden = false;
    }
  });
}
