import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import hljs from 'highlight.js';
import MarkdownIt from 'markdown-it';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const articleDir = __dirname;
const outputDir = path.join(repoRoot, 'site', 'article');

const articleSourcePath = path.join(articleDir, 'article.md');
const templatePath = path.join(articleDir, 'template.html');
const outputHtmlPath = path.join(outputDir, 'index.html');
const articleFontsDir = path.join(articleDir, 'fonts');
const outputFontsDir = path.join(outputDir, 'fonts');
const frontendFaviconPath = path.join(repoRoot, 'frontend', 'public', 'favicon.png');
const outputFaviconPath = path.join(outputDir, 'favicon.png');

const assetExtensions = new Set([
  '.png',
  '.webp',
  '.svg',
  '.jpg',
  '.jpeg',
  '.gif',
  '.apng',
  '.avif',
]);

const fontExtensions = new Set([
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
]);

const articleMeta = {
  author: 'Antoine Pultier',
  publishedDate: '2026-03-29',
  repoUrl: 'https://github.com/fungiboletus/chess-potato-ai-3000',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  appUrl: '../',
  canonicalUrl: 'https://chesspotatoai3000.sct.sintef.no/article/',
  ogImage: './premium-screenshot.webp',
};

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight(code, language) {
    const normalizedLanguage = language ? language.trim().toLowerCase() : '';

    if (normalizedLanguage && hljs.getLanguage(normalizedLanguage)) {
      return `<pre class="hljs"><code>${hljs.highlight(code, { language: normalizedLanguage }).value}</code></pre>`;
    }

    if (normalizedLanguage) {
      return `<pre class="hljs"><code>${hljs.highlightAuto(code).value}</code></pre>`;
    }

    return `<pre class="hljs"><code>${md.utils.escapeHtml(code)}</code></pre>`;
  },
});

function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Chess Potato AI 3000 Article';
}

function stripFirstHeading(markdown) {
  return markdown.replace(/^#\s+.+\n+/, '');
}

function toPlainText(value) {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDescription(markdown) {
  const text = toPlainText(stripFirstHeading(markdown));
  return text.slice(0, 220);
}

function escapeHtmlAttribute(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function formatDisplayTitle(title) {
  const quotedBreak = title.match(/^(["“][^"”]+["”])\s+(—\s+.+)$/u);
  if (!quotedBreak) {
    return escapeHtmlAttribute(title);
  }

  return `${escapeHtmlAttribute(quotedBreak[1])}<br />${escapeHtmlAttribute(quotedBreak[2])}`;
}

function decorateExternalLinks(html) {
  return html.replace(/<a href="https?:\/\//g, '<a target="_blank" rel="noreferrer" href="https://');
}

async function copyArticleAssets() {
  const entries = await readdir(articleDir, { withFileTypes: true });

  await Promise.all(entries.map(async (entry) => {
    if (!entry.isFile()) {
      return;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!assetExtensions.has(ext)) {
      return;
    }

    await cp(path.join(articleDir, entry.name), path.join(outputDir, entry.name));
  }));

  await mkdir(outputFontsDir, { recursive: true });

  const fontEntries = await readdir(articleFontsDir, { withFileTypes: true });
  await Promise.all(fontEntries.map(async (entry) => {
    if (!entry.isFile()) {
      return;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!fontExtensions.has(ext)) {
      return;
    }

    await cp(path.join(articleFontsDir, entry.name), path.join(outputFontsDir, entry.name));
  }));

  await cp(frontendFaviconPath, outputFaviconPath);
}

async function buildArticle() {
  const [markdown, template] = await Promise.all([
    readFile(articleSourcePath, 'utf8'),
    readFile(templatePath, 'utf8'),
  ]);

  const title = extractTitle(markdown);
  const displayTitle = formatDisplayTitle(title);
  const description = extractDescription(markdown);
  const contentHtml = decorateExternalLinks(md.render(stripFirstHeading(markdown)));

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  await copyArticleAssets();

  const rendered = template
    .replaceAll('{{TITLE_ATTR}}', escapeHtmlAttribute(title))
    .replaceAll('{{DESCRIPTION_ATTR}}', escapeHtmlAttribute(description))
    .replaceAll('{{TITLE}}', title)
    .replaceAll('{{DISPLAY_TITLE}}', displayTitle)
    .replaceAll('{{DESCRIPTION}}', description)
    .replaceAll('{{AUTHOR}}', articleMeta.author)
    .replaceAll('{{PUBLISHED_DATE}}', articleMeta.publishedDate)
    .replaceAll('{{REPOSITORY_URL}}', articleMeta.repoUrl)
    .replaceAll('{{LICENSE_URL}}', articleMeta.licenseUrl)
    .replaceAll('{{APP_URL}}', articleMeta.appUrl)
    .replaceAll('{{CANONICAL_URL}}', articleMeta.canonicalUrl)
    .replaceAll('{{OG_IMAGE}}', articleMeta.ogImage)
    .replace('{{CONTENT}}', contentHtml);

  await writeFile(outputHtmlPath, rendered, 'utf8');
}

buildArticle().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});