export function initNav() {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector(".nav-menu");

  if (!header || !toggle || !menu) {
    return;
  }

  const setOpen = (isOpen) => {
    toggle.setAttribute("aria-expanded", String(isOpen));
    menu.classList.toggle("is-open", isOpen);
  };

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    setOpen(!isOpen);
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });

  document.addEventListener("click", (event) => {
    if (!menu.classList.contains("is-open")) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    if (!menu.contains(target) && !toggle.contains(target)) {
      setOpen(false);
    }
  });

  const onScroll = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}
