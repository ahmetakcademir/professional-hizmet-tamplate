function normalizePhone(number) {
  return String(number || "").replace(/[^\d]/g, "");
}

function buildWhatsAppUrl(number, message) {
  const normalizedNumber = normalizePhone(number);
  const encodedMessage = encodeURIComponent(message || "");
  return `https://wa.me/${normalizedNumber}?text=${encodedMessage}`;
}

function createInputField(field) {
  const wrapper = document.createElement("div");
  wrapper.className = "form-field";
  if (field.fullWidth || field.type === "textarea") {
    wrapper.classList.add("form-field--full");
  }

  const id = `field-${field.name}`;
  const label = document.createElement("label");
  label.setAttribute("for", id);
  label.textContent = field.required ? `${field.label} *` : field.label;
  wrapper.appendChild(label);

  let input;
  if (field.type === "select") {
    input = document.createElement("select");
    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = field.placeholder || "Seciniz";
    input.appendChild(placeholderOption);

    for (const option of field.options || []) {
      const optionElement = document.createElement("option");
      optionElement.value = option;
      optionElement.textContent = option;
      input.appendChild(optionElement);
    }
  } else if (field.type === "textarea") {
    input = document.createElement("textarea");
    input.rows = Number(field.rows || 4);
    input.placeholder = field.placeholder || "";
  } else {
    input = document.createElement("input");
    input.type = field.type || "text";
    input.placeholder = field.placeholder || "";
  }

  input.id = id;
  input.name = field.name;
  input.required = Boolean(field.required);
  input.autocomplete = field.autocomplete || "off";
  wrapper.appendChild(input);
  return wrapper;
}

function renderFields(fieldsContainer, fields) {
  fieldsContainer.innerHTML = "";
  const sortedFields = [...fields].sort((a, b) => (a.order || 0) - (b.order || 0));
  sortedFields.forEach((field) => fieldsContainer.appendChild(createInputField(field)));
  return sortedFields;
}

function buildFieldValueMap(form, fields) {
  const values = {};
  fields.forEach((field) => {
    const element = form.elements[field.name];
    const raw = typeof element?.value === "string" ? element.value : "";
    values[field.name] = raw.trim();
  });
  return values;
}

function validateRequired(form, fields) {
  let firstInvalid = null;

  fields.forEach((field) => {
    const element = form.elements[field.name];
    const wrapper = element?.closest(".form-field");
    const value = typeof element?.value === "string" ? element.value.trim() : "";
    const valid = !field.required || value.length > 0;

    if (wrapper) {
      wrapper.classList.toggle("is-invalid", !valid);
    }
    if (element instanceof HTMLElement) {
      element.setAttribute("aria-invalid", String(!valid));
    }
    if (!valid && !firstInvalid) {
      firstInvalid = element;
    }
  });

  return {
    valid: !firstInvalid,
    firstInvalid
  };
}

function composeWhatsAppMessage(template, values, fields) {
  const withTemplate = String(template || "").replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    return values[key] || "-";
  });

  const listText = fields
    .map((field) => `- ${field.label}: ${values[field.name] || "-"}`)
    .join("\n");

  return `${withTemplate}\n\nForm Detaylari:\n${listText}`;
}

function applyGlobalWhatsAppLinks(whatsAppConfig) {
  const quickMessage = whatsAppConfig?.quickMessage || "Merhaba, bilgi almak istiyorum.";
  const number = whatsAppConfig?.number || "";

  document.querySelectorAll("[data-whatsapp-link]").forEach((link) => {
    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }
    const customMessage = link.getAttribute("data-wa-message") || quickMessage;
    link.href = buildWhatsAppUrl(number, customMessage);
  });
}

export function initWhatsAppContact(siteContent) {
  const contact = siteContent?.contact;
  const formConfig = contact?.form;
  const whatsAppConfig = contact?.whatsapp;

  if (!contact || !whatsAppConfig) {
    return;
  }

  applyGlobalWhatsAppLinks(whatsAppConfig);

  const form = document.getElementById("contactForm");
  const fieldsContainer = document.getElementById("contactFields");
  const feedback = document.getElementById("contactFeedback");
  const fallback = document.getElementById("contactFallback");
  const fallbackLink = document.getElementById("contactFallbackLink");

  if (!(form instanceof HTMLFormElement) || !fieldsContainer) {
    return;
  }

  const fields = Array.isArray(formConfig?.fields) ? formConfig.fields : [];
  const sortedFields = renderFields(fieldsContainer, fields);

  const fallbackUrl = buildWhatsAppUrl(
    whatsAppConfig.number,
    whatsAppConfig.quickMessage || "Merhaba, bilgi almak istiyorum."
  );

  if (fallbackLink instanceof HTMLAnchorElement) {
    fallbackLink.href = fallbackUrl;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (feedback) {
      feedback.textContent = "";
      feedback.classList.remove("is-error", "is-success");
    }
    if (fallback) {
      fallback.hidden = true;
    }

    const validation = validateRequired(form, sortedFields);
    if (!validation.valid) {
      if (feedback) {
        feedback.textContent = contact.errorMessage || "Lutfen zorunlu alanlari doldurun.";
        feedback.classList.add("is-error");
      }
      if (validation.firstInvalid instanceof HTMLElement) {
        validation.firstInvalid.focus();
      }
      return;
    }

    const values = buildFieldValueMap(form, sortedFields);
    const message = composeWhatsAppMessage(
      whatsAppConfig.messageTemplate,
      values,
      sortedFields
    );
    const targetUrl = buildWhatsAppUrl(whatsAppConfig.number, message);

    const popup = window.open(targetUrl, "_blank", "noopener,noreferrer");
    if (!popup) {
      if (fallback) {
        fallback.hidden = false;
      }
      if (fallbackLink instanceof HTMLAnchorElement) {
        fallbackLink.href = targetUrl;
      }
      if (feedback) {
        feedback.textContent = contact.successMessage || "WhatsApp baglantisi hazirlandi.";
        feedback.classList.add("is-success");
      }
      window.location.href = targetUrl;
      return;
    }

    if (feedback) {
      feedback.textContent = contact.successMessage || "WhatsApp penceresi acildi.";
      feedback.classList.add("is-success");
    }
  });
}

