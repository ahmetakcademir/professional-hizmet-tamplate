function setActiveCard(cards, currentIndex) {
  cards.forEach((card, index) => {
    const active = index === currentIndex;
    card.classList.toggle("is-active", active);
    card.setAttribute("aria-hidden", active ? "false" : "true");
  });
}

export function initTestimonials() {
  const sliders = document.querySelectorAll("[data-testimonials-slider]");
  if (!sliders.length) {
    return;
  }

  sliders.forEach((slider) => {
    const cards = Array.from(slider.querySelectorAll(".testimonial-card"));
    const prev = slider.querySelector("[data-slider-prev]");
    const next = slider.querySelector("[data-slider-next]");

    if (!cards.length || !prev || !next) {
      return;
    }

    slider.classList.add("is-enhanced");
    let current = 0;
    setActiveCard(cards, current);

    prev.addEventListener("click", () => {
      current = (current - 1 + cards.length) % cards.length;
      setActiveCard(cards, current);
    });

    next.addEventListener("click", () => {
      current = (current + 1) % cards.length;
      setActiveCard(cards, current);
    });
  });
}
