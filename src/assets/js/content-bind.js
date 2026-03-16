const CONTENT_CANDIDATES = ["/content/site.json", "./content/site.json", "content/site.json"];
let cachedContent;

function resolvePath(path, context, rootData) {
  if (!path) {
    return undefined;
  }

  if (path === ".") {
    return context;
  }

  const isRootPath = path.startsWith("$.");
  const cleanPath = isRootPath ? path.slice(2) : path;
  const segments = cleanPath.split(".").filter(Boolean);

  const readFrom = (source) => {
    let current = source;
    for (const segment of segments) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[segment];
    }
    return current;
  };

  if (isRootPath) {
    return readFrom(rootData);
  }

  const fromContext = readFrom(context);
  if (fromContext !== undefined) {
    return fromContext;
  }
  return readFrom(rootData);
}

function applyScalarBinding(element, context, rootData) {
  if (!element.hasAttribute("data-bind")) {
    return;
  }

  const path = element.getAttribute("data-bind");
  const value = resolvePath(path, context, rootData);
  if (value === undefined || value === null) {
    return;
  }

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    element.value = String(value);
    return;
  }
  element.textContent = String(value);
}

function applyAttributeBinding(element, context, rootData) {
  for (const attr of Array.from(element.attributes)) {
    if (!attr.name.startsWith("data-bind-") || attr.name === "data-bind") {
      continue;
    }

    const targetAttr = attr.name.replace("data-bind-", "");
    const value = resolvePath(attr.value, context, rootData);
    if (value === undefined || value === null) {
      continue;
    }
    element.setAttribute(targetAttr, String(value));
  }
}

function clearRepeatContainer(container, template) {
  for (const child of Array.from(container.children)) {
    if (child !== template) {
      child.remove();
    }
  }
}

function bindTree(node, context, rootData) {
  if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    for (const child of Array.from(node.childNodes)) {
      bindTree(child, context, rootData);
    }
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const element = node;

  if (element.hasAttribute("data-repeat")) {
    const listPath = element.getAttribute("data-repeat");
    const items = resolvePath(listPath, context, rootData);
    const template = Array.from(element.children).find(
      (child) => child.tagName === "TEMPLATE"
    );

    if (!(template instanceof HTMLTemplateElement)) {
      return;
    }

    clearRepeatContainer(element, template);

    if (!Array.isArray(items)) {
      return;
    }

    items.forEach((item, index) => {
      const clone = template.content.cloneNode(true);
      const localContext =
        item && typeof item === "object"
          ? { ...item, _index: index + 1 }
          : { value: item, _index: index + 1 };

      bindTree(clone, localContext, rootData);
      element.appendChild(clone);
    });
    return;
  }

  applyScalarBinding(element, context, rootData);
  applyAttributeBinding(element, context, rootData);

  for (const child of Array.from(element.childNodes)) {
    bindTree(child, context, rootData);
  }
}

function ensureMetaByName(name, content) {
  if (!content) {
    return;
  }
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", name);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

function ensureMetaByProperty(property, content) {
  if (!content) {
    return;
  }
  let meta = document.querySelector(`meta[property="${property}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("property", property);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

export async function loadSiteContent() {
  if (cachedContent) {
    return cachedContent;
  }

  for (const url of CONTENT_CANDIDATES) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        continue;
      }
      cachedContent = await response.json();
      return cachedContent;
    } catch (error) {
      continue;
    }
  }

  return null;
}

export function applyContentBindings(siteContent) {
  if (!siteContent || !document.body) {
    return;
  }
  bindTree(document.body, siteContent, siteContent);

  const year = document.querySelector("[data-current-year]");
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }
}

export function applySeo(siteContent) {
  if (!siteContent) {
    return;
  }

  const pageKey = document.body?.dataset.page || "home";
  const pageSeo = siteContent?.seo?.pages?.[pageKey];
  const siteUrl = (siteContent?.seo?.siteUrl || "").replace(/\/$/, "");

  if (pageSeo?.title) {
    document.title = pageSeo.title;
    ensureMetaByProperty("og:title", pageSeo.ogTitle || pageSeo.title);
  }
  if (pageSeo?.description) {
    ensureMetaByName("description", pageSeo.description);
    ensureMetaByProperty("og:description", pageSeo.ogDescription || pageSeo.description);
  }
  ensureMetaByProperty("og:type", "website");
  ensureMetaByProperty("og:image", siteContent?.seo?.defaultImage || "assets/images/og-default.jpg");
  ensureMetaByName("twitter:card", "summary_large_image");

  const canonicalPath = pageSeo?.path || "/";
  const canonicalUrl = siteUrl ? `${siteUrl}${canonicalPath}` : canonicalPath;
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", canonicalUrl);
  ensureMetaByProperty("og:url", canonicalUrl);

  const schemaScript = document.getElementById("schema-json");
  if (schemaScript) {
    const org = siteContent?.seo?.organization || {};
    const schema = {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      name: org.name || siteContent?.brand?.name || "Profesyonel Hizmet",
      url: siteUrl || "https://example.com",
      telephone: org.telephone || siteContent?.contact?.channels?.phone || "",
      address: org.address || siteContent?.contact?.channels?.address || "",
      image: siteContent?.seo?.defaultImage || "assets/images/og-default.jpg"
    };
    schemaScript.textContent = JSON.stringify(schema);
  }
}
