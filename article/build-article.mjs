import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const articleDir = __dirname;
const outputDir = path.join(repoRoot, 'site', 'article');

const articleSourcePath = path.join(articleDir, 'article.md');
const templatePath = path.join(articleDir, 'template.html');
const outputHtmlPath = path.join(outputDir, 'index.html');

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
}

async function buildArticle() {
  const [markdown, template] = await Promise.all([
    readFile(articleSourcePath, 'utf8'),
    readFile(templatePath, 'utf8'),
  ]);

  const title = extractTitle(markdown);
  const description = extractDescription(markdown);
  const contentHtml = decorateExternalLinks(md.render(stripFirstHeading(markdown)));

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  await copyArticleAssets();

  const rendered = template
    .replaceAll('{{TITLE_ATTR}}', escapeHtmlAttribute(title))
    .replaceAll('{{DESCRIPTION_ATTR}}', escapeHtmlAttribute(description))
    .replaceAll('{{TITLE}}', title)
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