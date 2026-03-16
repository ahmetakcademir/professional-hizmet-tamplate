import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const srcPagesDir = path.join(rootDir, "src", "pages");
const distDir = path.join(rootDir, "dist");
const siteJsonPath = path.join(rootDir, "src", "content", "site.json");

const distPages = [
  "index.html",
  "about.html",
  "services.html",
  "contact.html",
  "privacy.html",
  "terms.html"
];

const indexRequiredSectionIds = [
  "top",
  "hero",
  "trust",
  "about",
  "services",
  "process",
  "testimonials",
  "faq",
  "contact",
  "footer"
];

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function getJson(filePath) {
  return JSON.parse(readText(filePath));
}

function getByPath(object, keyPath) {
  const clean = String(keyPath || "").replace(/^\$\./, "");
  const segments = clean.split(".").filter(Boolean);
  let current = object;
  for (const segment of segments) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function isExternalReference(value) {
  return (
    !value ||
    value.startsWith("#") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:") ||
    value.startsWith("javascript:")
  );
}

function collectHtmlRefs(html) {
  const refs = [];
  for (const match of html.matchAll(/\s(?:href|src)="([^"]+)"/gi)) {
    refs.push(match[1]);
  }
  return refs;
}

function resolveDistReference(ref, currentHtmlFile) {
  const cleaned = ref.split("?")[0].split("#")[0];
  if (!cleaned) {
    return null;
  }
  if (cleaned.startsWith("/")) {
    return path.join(distDir, cleaned.slice(1));
  }
  return path.resolve(path.dirname(currentHtmlFile), cleaned);
}

function hasModuleAndCssHeadTags(html) {
  const css = /<link\s+rel="stylesheet"\s+href="assets\/css\/main\.css"/i.test(html);
  const js = /<script\s+type="module"\s+src="assets\/js\/main\.js"/i.test(html);
  return css && js;
}

function runChecks() {
  const issues = [];

  if (!exists(siteJsonPath)) {
    issues.push("Missing src/content/site.json");
    return issues;
  }
  const site = getJson(siteJsonPath);

  for (const pageName of distPages) {
    const pagePath = path.join(distDir, pageName);
    if (!exists(pagePath)) {
      issues.push(`Missing dist page: ${pageName}`);
      continue;
    }

    const html = readText(pagePath);

    if (/@include/.test(html)) {
      issues.push(`${pageName}: unresolved include marker found`);
    }

    if (!hasModuleAndCssHeadTags(html)) {
      issues.push(`${pageName}: missing main.css or main.js tag`);
    }

    for (const ref of collectHtmlRefs(html)) {
      if (isExternalReference(ref)) {
        continue;
      }
      const target = resolveDistReference(ref, pagePath);
      if (target && !exists(target)) {
        issues.push(`${pageName}: broken local ref -> ${ref}`);
      }
    }

    if (!/class="nav-toggle"/.test(html) || !/class="nav-menu"/.test(html)) {
      issues.push(`${pageName}: nav toggle/menu hook missing`);
    }

    const waCount = (html.match(/data-whatsapp-link/g) || []).length;
    if (waCount < 2) {
      issues.push(`${pageName}: expected at least 2 WhatsApp links (nav + float)`);
    }
  }

  const distIndexPath = path.join(distDir, "index.html");
  if (exists(distIndexPath)) {
    const indexHtml = readText(distIndexPath);
    for (const id of indexRequiredSectionIds) {
      if (!new RegExp(`\\sid="${id}"`, "i").test(indexHtml)) {
        issues.push(`index.html: missing required section id '${id}'`);
      }
    }
  }

  const srcPageFiles = fs.readdirSync(srcPagesDir).filter((file) => file.endsWith(".html"));
  for (const srcFile of srcPageFiles) {
    const html = readText(path.join(srcPagesDir, srcFile));
    const pageKeyMatch = html.match(/<body[^>]*data-page="([^"]+)"/i);
    const pageKey = pageKeyMatch?.[1];
    if (!pageKey) {
      issues.push(`${srcFile}: missing body data-page`);
      continue;
    }
    if (getByPath(site, `seo.pages.${pageKey}`) === undefined) {
      issues.push(`${srcFile}: site.json missing seo.pages.${pageKey}`);
    }
    if (pageKey !== "home" && getByPath(site, `pages.${pageKey}`) === undefined) {
      issues.push(`${srcFile}: site.json missing pages.${pageKey}`);
    }
  }

  for (const pageName of distPages) {
    const htmlPath = path.join(distDir, pageName);
    if (!exists(htmlPath)) {
      continue;
    }
    const html = readText(htmlPath);

    for (const match of html.matchAll(/data-repeat="([^"]+)"/gi)) {
      const repeatPath = match[1];
      const value = getByPath(site, repeatPath);
      if (!Array.isArray(value)) {
        issues.push(`${pageName}: data-repeat path is not an array -> ${repeatPath}`);
      }
    }

    for (const block of html.matchAll(/data-repeat="([^"]+)"[\s\S]*?<template[^>]*>([\s\S]*?)<\/template>/gi)) {
      const repeatPath = block[1];
      const templateHtml = block[2];
      const arr = getByPath(site, repeatPath);
      if (!Array.isArray(arr)) {
        continue;
      }
      const sample = arr[0] || {};
      for (const bind of templateHtml.matchAll(/data-bind(?:-[a-z-]+)?="([^"]+)"/gi)) {
        const key = bind[1];
        if (!key || key === "." || key === "_index") {
          continue;
        }
        if (key.startsWith("$.") || key.includes(".")) {
          if (getByPath(site, key) === undefined) {
            issues.push(`${pageName}: missing root bind key in template -> ${key}`);
          }
        } else if (!(key in sample)) {
          issues.push(`${pageName}: missing local bind key '${key}' for repeat '${repeatPath}'`);
        }
      }
    }
  }

  return [...new Set(issues)];
}

const issues = runChecks();

if (issues.length) {
  console.error("QA check failed:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exitCode = 1;
} else {
  console.log("QA check passed.");
}
