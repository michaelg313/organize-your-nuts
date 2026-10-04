/**
 * contact-form.js — the contact form on /about (Phase 6).
 *
 * 1. Checks the three fields in the browser, the way the hi-fi's "Contact form
 *    — validation errors" state shows: a red box at the top that says how many
 *    fields need attention and links to the first, plus a line under each.
 * 2. Sends. How depends on src/lib/business.js (the page writes it into
 *    data-mode):
 *      "formspree" → posts to Formspree, which emails the operator
 *      "email"     → opens the shopper's email app with the message pre-written
 *      ""          → not connected; the button is disabled and the page says so
 *
 * Failures: the shopper sees one plain sentence (and the email address, if
 * there is one). The real reason goes to the browser console on a line
 * starting "[contact]" — right-click → Inspect → Console.
 */
const form = document.querySelector("[data-contact]");
if (form && form.dataset.mode) init(form);

function init(form) {
  const mode = form.dataset.mode;
  const email = form.dataset.email || null;
  const alertBox = form.querySelector("[data-contact-alert]");
  const alertText = form.querySelector("[data-contact-alert-text]");
  const note = form.querySelector("[data-contact-note]");
  const noteText = form.querySelector("[data-contact-note-text]");
  const submit = form.querySelector("[data-contact-submit]");
  const sent = document.querySelector("[data-contact-sent]");

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

  function alertForSendFailure(reason) {
    const nodes = [`This didn’t send. ${reason} `];
    if (email) {
      const a = document.createElement("a");
      a.href = `mailto:${email}`;
      a.textContent = email;
      nodes.push("Please email us at ", a, " instead.");
    } else {
      nodes.push("Please try again in a few minutes.");
    }
    showAlert(nodes);
  }

  // Once a field has been flagged, clear its message as soon as it's fixed.
  for (const f of fields) {
    f.input.addEventListener("input", () => {
      if (f.input.getAttribute("aria-invalid") === "true" && !f.check(f.input.value.trim())) mark(f, null);
    });
  }

  // ---- sending ------------------------------------------------------------------

  function showSent() {
    form.hidden = true;
    sent.hidden = false;
    sent.focus();
  }

  async function sendToFormspree() {
    submit.disabled = true;
    submit.textContent = "Sending…";
    try {
      let res;
      try {
        res = await fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
      } catch (e) {
        console.error(`[contact] Couldn't reach Formspree (${e.message}). The shopper may be offline, or Formspree is down — check status.formspree.io.`);
        return alertForSendFailure("We couldn’t reach our message service just now.");
      }
      if (res.ok) return showSent();
      const body = await res.json().catch(() => ({}));
      const why = (body.errors ?? []).map((e) => e.message).join(" | ");
      console.error(
        `[contact] Formspree refused the message (HTTP ${res.status}${why ? `: ${why}` : ""}). ` +
        "Check contactFormEndpoint in src/lib/business.js against the form's address in your Formspree dashboard, and that the form is active and under its monthly limit.",
      );
      alertForSendFailure("Something went wrong on our side.");
    } finally {
      submit.disabled = false;
      submit.textContent = "Send message";
    }
  }

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
    if (mode === "formspree") sendToFormspree();
    else if (mode === "email") openEmail();
  });
}
