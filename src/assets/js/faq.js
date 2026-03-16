export function initFaq() {
  const questions = document.querySelectorAll(".faq-question");
  if (!questions.length) {
    return;
  }

  questions.forEach((button) => {
    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));

      const item = button.closest(".faq-item");
      const answer = item?.querySelector(".faq-answer");
      if (!answer) {
        return;
      }
      answer.hidden = expanded;
    });
  });
}
