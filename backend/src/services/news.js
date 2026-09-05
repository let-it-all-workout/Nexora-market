import axios from 'axios';
import { yahooNewsPublishTimeIso } from '../utils/normalize.js';

function decodeXml(text = '') {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripCdata(text = '') {
  return text.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
}

function pickTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeXml(stripCdata(match[1].trim())) : '';
}

function parseRssItems(xml = '') {
  const matches = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)];
  return matches.map((match) => {
    const block = match[1];
    const pubDate = pickTag(block, 'pubDate');
    const source = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] || '';
    return {
      title: pickTag(block, 'title'),
      link: pickTag(block, 'link'),
      publisher: decodeXml(stripCdata(source.trim())) || 'Google News',
      date: pubDate ? new Date(pubDate).toISOString() : null,
      thumbnail: null,
    };
  }).filter((item) => item.title && item.link);
}

function normalizeYahooNews(items = []) {
  return items
    .map((item) => ({
      title: item.title,
      link: item.link,
      publisher: item.publisher || 'Yahoo Finance',
      date: yahooNewsPublishTimeIso(item.providerPublishTime),
      thumbnail: item.thumbnail?.resolutions?.[0]?.url || null,
    }))
    .filter((item) => item.title && item.link);
}

function sortAndDedupe(items = [], limit = 10) {
  const seen = new Set();
  return items
    .filter((item) => {
      const key = `${item.title}|${item.link}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const aTime = a.date ? Date.parse(a.date) : 0;
      const bTime = b.date ? Date.parse(b.date) : 0;
      return bTime - aTime;
    })
    .slice(0, limit);
}

async function fetchGoogleNewsRss(query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const { data } = await axios.get(url, {
    timeout: 4000,
    headers: { Accept: 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8' },
  });
  return parseRssItems(data);
}

export async function fetchMergedNews({ yahooSearch, queryVariants = [], limit = 10 }) {
  const variants = queryVariants.filter(Boolean);
  const tasks = [];

  if (yahooSearch) tasks.push(yahooSearch().then(normalizeYahooNews).catch(() => []));
  variants.slice(0, 2).forEach((query) => {
    tasks.push(fetchGoogleNewsRss(query).catch(() => []));
  });

  const settled = await Promise.allSettled(tasks);
  const merged = [];
  settled.forEach((result) => {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      merged.push(...result.value);
    }
  });

  return sortAndDedupe(merged, limit);
}
