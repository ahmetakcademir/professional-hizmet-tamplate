import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const srcDir = path.join(rootDir, "src");
const pagesDir = path.join(srcDir, "pages");
const distDir = path.join(rootDir, "dist");

const INCLUDE_REGEX = /<!--\s*@include\s+(.+?)\s*-->/g;
const LOCAL_PATH_PREFIX_REGEX =
  /\b(href|src|data-bind-href)="\/(assets\/|content\/|index\.html|about\.html|services\.html|contact\.html|privacy\.html|terms\.html)/g;

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function emptyDir(dirPath) {
  await fs.rm(dirPath, { recursive: true, force: true });
  await ensureDir(dirPath);
}

async function copyDir(source, target) {
  await fs.cp(source, target, { recursive: true });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveIncludes(filePath, stack = []) {
  const absolutePath = path.resolve(filePath);
  if (stack.includes(absolutePath)) {
    throw new Error(`Include loop detected: ${[...stack, absolutePath].join(" -> ")}`);
  }

  const raw = await fs.readFile(absolutePath, "utf8");
  const nextStack = [...stack, absolutePath];

  const matches = raw.matchAll(INCLUDE_REGEX);
  let rendered = raw;

  for (const match of matches) {
    const includeRaw = match[1].trim();
    const includePath = path.resolve(path.dirname(absolutePath), includeRaw);
    const includeHtml = await resolveIncludes(includePath, nextStack);
    rendered = rendered.replace(match[0], includeHtml);
  }

  return rendered;
}

function normalizeLocalPaths(html) {
  return html.replace(LOCAL_PATH_PREFIX_REGEX, '$1="$2');
}

async function buildPages() {
  const entries = await fs.readdir(pagesDir, { withFileTypes: true });
  const htmlPages = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".html"));

  for (const page of htmlPages) {
    const pagePath = path.join(pagesDir, page.name);
    const compiled = await resolveIncludes(pagePath);
    const normalized = normalizeLocalPaths(compiled);
    const outPath = path.join(distDir, page.name);
    await fs.writeFile(outPath, normalized, "utf8");
    console.log(`Built ${page.name}`);
  }
}

async function build() {
  await emptyDir(distDir);
  await buildPages();

  await copyDir(path.join(srcDir, "assets"), path.join(distDir, "assets"));
  await copyDir(path.join(srcDir, "content"), path.join(distDir, "content"));

  const publicDir = path.join(srcDir, "public");
  if (await fileExists(publicDir)) {
    await copyDir(publicDir, distDir);
  }

  console.log("Build completed.");
}

build().catch((error) => {
  console.error("Build failed:", error.message);
  process.exitCode = 1;
});
