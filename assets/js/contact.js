const whatsappForm = document.getElementById("whatsappForm");

whatsappForm.addEventListener("submit", function(e){

  e.preventDefault();

  const name = document.getElementById("name").value;

  const email = document.getElementById("email").value;

  const subject = document.getElementById("subject").value;

  const message = document.getElementById("message").value;

  const whatsappNumber = "919136579741";

  const finalMessage =

`Hello NOIR.%0A%0A
Name: ${name}%0A
Email: ${email}%0A
Subject: ${subject}%0A%0A
Message:%0A${message}`;

  window.open(

    `https://wa.me/${whatsappNumber}?text=${finalMessage}`,

    "_blank"

  );

});