#!/usr/bin/env node

import { load } from 'cheerio';
import { Agent, fetch as undiciFetch } from 'undici';
import { readFile } from 'node:fs/promises';
import { harvestLinks } from './scraper.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/125.0 Safari/537.36';
const TIMEOUT_MS = 25_000;
const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } });

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node diagnose.js <source-id|https://full.url/path>');
    process.exit(2);
  }

  const sources = JSON.parse(await readFile(new URL('./sources.json', import.meta.url), 'utf8'));
  const configured = sources.find((source) => source.id === target);
  const isUrl = /^https?:\/\//i.test(target);
  if (!configured && !isUrl) {
    console.error(`Unknown source id: ${target}`);
    process.exit(2);
  }

  const source = configured || {
    id: 'ad-hoc',
    name: 'Ad-hoc URL',
    url: target,
    enabled: true,
    insecureTLS: process.argv.includes('--insecure'),
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const response = await undiciFetch(source.url, {
      signal: ctrl.signal,
      redirect: 'follow',
      dispatcher: source.insecureTLS ? insecureAgent : undefined,
      headers: {
        'user-agent': UA,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-IN,en;q=0.9,hi;q=0.8',
      },
    });
    const html = await response.text();
    const $ = load(html);
    const anchors = $('a[href]').length;
    const usable = harvestLinks(html, response.url, source);
    const visibleText = $('body').text().replace(/\s+/g, ' ').trim();
    const scripts = $('script[src]').length + $('script:not([src])').length;
    const looksSpa =
      response.ok &&
      usable.length === 0 &&
      visibleText.length < 1200 &&
      scripts >= 3 &&
      (/<(?:app-root|root|main-app)\b/i.test(html) ||
        /(?:webpack|main\.[a-f0-9]+\.js|runtime\.[a-f0-9]+\.js|__NEXT_DATA__)/i.test(html));

    console.log(`SOURCE: ${source.id}`);
    console.log(`HTTP STATUS: ${response.status}`);
    console.log(`FINAL URL: ${response.url}`);
    console.log(`HTML BYTES: ${Buffer.byteLength(html)}`);
    console.log(`ANCHOR LINKS: ${anchors}`);
    console.log(`TOTAL USABLE LINKS: ${usable.length}`);
    for (const item of usable.slice(0, 10)) {
      console.log(`  [${item.type}] ${item.raw_title}`);
      console.log(`    ${item.url}`);
    }

    let diagnosis;
    if (!response.ok) diagnosis = `HTTP ${response.status}; investigate the URL or blocking`;
    else if (looksSpa) diagnosis = 'SPA / JavaScript-rendered page; static HTML has no usable links';
    else if (!usable.length && !anchors) diagnosis = 'No links in static HTML';
    else if (!usable.length) diagnosis = 'Page loaded, but no links passed the scraper filters';
    else diagnosis = `Static HTML works; ${usable.length} usable links`;
    if (response.url !== source.url) diagnosis += `; redirected from ${source.url}`;
    console.log(`DIAGNOSIS: ${diagnosis}`);
    if (!response.ok) process.exitCode = 1;
  } catch (error) {
    console.log(`SOURCE: ${source.id}`);
    console.log('HTTP STATUS: unavailable');
    console.log(`FINAL URL: ${source.url}`);
    console.log('TOTAL USABLE LINKS: 0');
    console.log(`DIAGNOSIS: Request failed: ${error?.cause?.message || error.message}`);
    process.exitCode = 1;
  } finally {
    clearTimeout(timer);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
