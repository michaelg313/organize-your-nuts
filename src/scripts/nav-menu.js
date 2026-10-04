/**
 * nav-menu.js — the ☰ button at phone width (Phase 6).
 *
 * site.css hides the nav links and shows ☰ below 768px, but the hi-fi never
 * designed what ☰ opens. Tapping it opens the same four links as a panel under
 * the bar (styles: src/styles/shared/site-additions.css). It's a disclosure,
 * not a dialog: tapping ✕, pressing Esc, or tapping anywhere outside the nav
 * closes it. Following a link loads a new page, which starts closed.
 */
const nav = document.querySelector(".nav");
const button = nav?.querySelector(".hamburger");

if (nav && button) {
  const isOpen = () => nav.classList.contains("menu-open");

  function set(open) {
    nav.classList.toggle("menu-open", open);
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    button.textContent = open ? "✕" : "☰";
  }

  button.addEventListener("click", () => set(!isOpen()));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) {
      set(false);
      button.focus();
    }
  });

  document.addEventListener("click", (e) => {
    if (isOpen() && !nav.contains(e.target)) set(false);
  });

  // Window widened past phone width (tablet rotated, window resized): the bar
  // shows the links itself and ☰ disappears, so drop the open state with it.
  const page = document.querySelector(".page");
  if (page && "ResizeObserver" in window) {
    new ResizeObserver(() => {
      if (isOpen() && button.offsetParent === null) set(false);
    }).observe(page);
  }
}
