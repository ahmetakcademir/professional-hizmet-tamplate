import fs from "node:fs/promises";
import path from "node:path";

const contentPath = path.join(process.cwd(), "src", "content", "site.json");

function assertCondition(condition, message, errors) {
  if (!condition) {
    errors.push(message);
  }
}

async function validate() {
  const errors = [];

  const raw = await fs.readFile(contentPath, "utf8");
  const content = JSON.parse(raw);

  const requiredTopLevel = [
    "brand",
    "seo",
    "hero",
    "trustStats",
    "about",
    "services",
    "process",
    "testimonials",
    "faq",
    "contact",
    "footer"
  ];

  requiredTopLevel.forEach((key) => {
    assertCondition(content[key] !== undefined, `Missing top-level key: ${key}`, errors);
  });

  const whatsAppNumber = content?.contact?.whatsapp?.number;
  assertCondition(
    typeof whatsAppNumber === "string" && /^\d{10,15}$/.test(whatsAppNumber),
    "contact.whatsapp.number must be 10-15 digits without + character",
    errors
  );

  const fields = content?.contact?.form?.fields;
  assertCondition(Array.isArray(fields) && fields.length > 0, "contact.form.fields must be a non-empty array", errors);

  if (Array.isArray(fields)) {
    fields.forEach((field, index) => {
      assertCondition(typeof field.name === "string" && field.name.length > 0, `Field[${index}] missing name`, errors);
      assertCondition(typeof field.label === "string" && field.label.length > 0, `Field[${index}] missing label`, errors);
      assertCondition(typeof field.type === "string" && field.type.length > 0, `Field[${index}] missing type`, errors);
    });
  }

  assertCondition(
    typeof content?.contact?.whatsapp?.messageTemplate === "string" &&
      content.contact.whatsapp.messageTemplate.includes("{{fullName}}"),
    "contact.whatsapp.messageTemplate should include {{fullName}} placeholder",
    errors
  );

  if (errors.length) {
    console.error("Content validation failed:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  console.log("Content validation passed.");
}

validate().catch((error) => {
  console.error("Validation failed:", error.message);
  process.exitCode = 1;
});
