/**
 * contact-form.js — the contact form on /about (Phase 6).
 *
 * 1. Checks the three fields in the browser, the way the hi-fi's "Contact form
 *    — validation errors" state shows: a red box at the top that says how many
 *    fields need attention and links to the first, plus a line under each.
 * 2. Opens the shopper's email app with the message pre-written to the
 *    business email (src/lib/business.js; the page writes it into data-email).
 *    Contact is by email only — Formspree was dropped at launch prep.
 *    data-mode is "" when no email is set: not connected; the button is
 *    disabled and the page says so.
 *
 * If the email app doesn't open, the note under the form gives the address
 * to write to directly.
 */
const form = document.querySelector("[data-contact]");
if (form && form.dataset.mode) init(form);

function init(form) {
  const email = form.dataset.email;
  const alertBox = form.querySelector("[data-contact-alert]");
  const alertText = form.querySelector("[data-contact-alert-text]");
  const note = form.querySelector("[data-contact-note]");
  const noteText = form.querySelector("[data-contact-note-text]");

  // A full address: something@something.something, no spaces.
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const fields = [
    { input: form.querySelector('[name="name"]'), check: (v) => (v ? null : "Enter your name.") },
    {
      input: form.querySelector('[name="email"]'),
      check: (v) => (!v ? "Enter your email address — we reply by email." : EMAIL.test(v) ? null : "Enter a full email address — we reply by email."),
    },
    { input: form.querySelector('[name="message"]'), check: (v) => (v ? null : "Tell us the vehicle and what you’re rebuilding.") },
  ].map((f) => ({ ...f, err: document.getElementById(f.input.getAttribute("aria-describedby")) }));

  // ---- the hi-fi's validation state ------------------------------------------

  function mark(f, message) {
    if (message) {
      f.input.setAttribute("aria-invalid", "true");
      f.err.textContent = message;
      f.err.hidden = false;
    } else {
      f.input.removeAttribute("aria-invalid");
      f.err.hidden = true;
    }
  }

  /** Check every field; returns the ones that need attention. */
  function validate() {
    const bad = [];
    for (const f of fields) {
      const message = f.check(f.input.value.trim());
      mark(f, message);
      if (message) bad.push(f);
    }
    return bad;
  }

  const WORDS = ["", "One field needs", "Two fields need", "Three fields need"];

  function showAlert(nodes) {
    alertText.replaceChildren(...nodes);
    alertBox.hidden = false;
  }

  function alertForFields(bad) {
    const link = document.createElement("a");
    link.href = `#${bad[0].input.id}`;
    link.textContent = `start with your ${bad[0].input.dataset.label}`;
    link.addEventListener("click", (e) => {
      e.preventDefault();
      bad[0].input.focus();
    });
    showAlert([`This didn’t send. ${WORDS[bad.length]} attention — `, link, "."]);
    alertBox.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  // Once a field has been flagged, clear its message as soon as it's fixed.
  for (const f of fields) {
    f.input.addEventListener("input", () => {
      if (f.input.getAttribute("aria-invalid") === "true" && !f.check(f.input.value.trim())) mark(f, null);
    });
  }

  // ---- sending ------------------------------------------------------------------

  function openEmail() {
    const get = (n) => form.querySelector(`[name="${n}"]`).value.trim();
    const subject = `Message from ${get("name")} (organizeyournuts.com)`;
    const body = `${get("message")}\n\n— ${get("name")}, ${get("email")}`;
    location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    noteText.textContent = `Your email app should open with your message ready to send. If it didn’t, email us at ${email}.`;
    note.hidden = false;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    alertBox.hidden = true;
    note.hidden = true;
    const bad = validate();
    if (bad.length) return alertForFields(bad);
    openEmail();
  });
}
