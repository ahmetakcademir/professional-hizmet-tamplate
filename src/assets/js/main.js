import { loadSiteContent, applyContentBindings, applySeo } from "./content-bind.js";
import { initNav } from "./nav.js";
import { initFaq } from "./faq.js";
import { initTestimonials } from "./testimonials.js";
import { initWhatsAppContact } from "./contact-whatsapp.js";

async function bootstrap() {
  const siteContent = await loadSiteContent();

  if (siteContent) {
    applyContentBindings(siteContent);
    applySeo(siteContent);
  }

  initNav();
  initFaq();
  initTestimonials();
  initWhatsAppContact(siteContent);
}

document.addEventListener("DOMContentLoaded", () => {
  bootstrap().catch((error) => {
    console.error("Template initialization failed:", error);
  });
});
