import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pages, render, site } from '../.static-build/static.js';

const template = await readFile('dist/index.html', 'utf8');
const escape = value => value.replace(/[&"<>]/g, char => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[char]);

for (const page of pages) {
  const missing = page.path === '/404.html';
  const title = escape(page.path === '/' ? site.name + ' | ' + page.title : page.title + ' | ' + site.name);
  const description = escape(page.description);
  const url = site.origin && !missing ? escape(new URL(page.path, site.origin).href) : '';
  const metadata = [
    '<title>' + title + '</title>',
    '<meta name="description" content="' + description + '">',
    '<meta property="og:title" content="' + title + '">',
    '<meta property="og:description" content="' + description + '">',
    '<meta property="og:type" content="website">',
    '<meta property="og:locale" content="pt_BR">',
    '<meta property="og:site_name" content="AJ Plugins">',
    url && '<link rel="canonical" href="' + url + '"><meta property="og:url" content="' + url + '">',
    !missing && '<meta property="og:image" content="' + (site.origin ? escape(new URL('/social.png', site.origin).href) : '/social.png') + '">',
    !missing && '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">',
    !missing && '<meta property="og:image:alt" content="AJ Plugins — Ferramentas inteligentes para REAPER">',
    !(missing || page.path === '/moderacao/') && '<meta name="twitter:card" content="summary_large_image">',
    (missing || page.path === '/moderacao/') && '<meta name="robots" content="noindex">',
  ].filter(Boolean).join('\n');
  const file = 'dist' + page.path + (missing ? '' : 'index.html');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, template.replace('<!-- metadata -->', () => metadata).replace('<!-- app -->', () => render(page.path)));
}
