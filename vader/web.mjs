import https from 'node:https';
import { lookup } from 'node:dns/promises';

export function isPublicIPv4(address) {
    const parts = address.split('.').map(Number);
    if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
    const [a, b, c] = parts;
    return !(a === 0 || a === 10 || a === 127 || a >= 224
        || (a === 100 && b >= 64 && b <= 127)
        || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
        || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99)))
        || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100)))
        || (a === 203 && b === 0 && c === 113));
}

export async function readPublicPage(rawUrl) {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) {
        throw new Error('Web reading supports public HTTPS pages on port 443.');
    }
    const addresses = await lookup(url.hostname, { family: 4, all: true });
    if (!addresses.length || addresses.some(item => !isPublicIPv4(item.address))) throw new Error('Local/private network address is not a web page.');
    // Pin the checked address while preserving the original TLS hostname.
    const text = await new Promise((resolve, reject) => {
        const request = https.get(url, {
            headers: { 'User-Agent': 'vader-local-companion/0.1', Accept: 'text/html,text/plain,application/json' },
            lookup: (_host, options, done) => options.all
                ? done(null, [addresses[0]]) : done(null, addresses[0].address, 4)
        }, response => {
            if (response.statusCode !== 200) { response.resume(); reject(new Error(`Web page returned HTTP ${response.statusCode}; redirects are not followed.`)); return; }
            const contentType = response.headers['content-type'] || '';
            if (!/text\/|application\/json/.test(contentType)) { response.resume(); reject(new Error('Web reader supports text pages only.')); return; }
            let size = 0;
            const chunks = [];
            response.on('data', chunk => {
                size += chunk.length;
                if (size > 1_000_000) { request.destroy(new Error('Web page exceeds 1 MB.')); return; }
                chunks.push(chunk);
            });
            response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            response.on('error', reject);
        });
        request.setTimeout(15000, () => request.destroy(new Error('Web page timed out.')));
        request.on('error', reject);
    });
    return { url: url.href, retrievedAt: new Date().toISOString(), text: text
        .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ').trim().slice(0, 12000) };
}

export async function searchWeb(query) {
    if (typeof query !== 'string' || !query.trim() || query.length > 300) throw new Error('Search query must contain 1–300 characters.');
    // Wikipedia is a free, keyless first search provider; arbitrary public HTTPS pages can also be read.
    const url = new URL('https://en.wikipedia.org/w/api.php');
    url.search = new URLSearchParams({ action: 'query', list: 'search', srsearch: query, srlimit: '5', format: 'json' }).toString();
    const page = await readPublicPage(url.href);
    const data = JSON.parse(page.text);
    return { provider: 'Wikipedia', retrievedAt: page.retrievedAt, results: (data.query?.search || []).map(item => ({
        title: item.title, url: `https://en.wikipedia.org/?curid=${item.pageid}`, snippet: item.snippet.replace(/<[^>]*>/g, '')
    })) };
}
