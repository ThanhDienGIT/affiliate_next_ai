import { guard, json, body } from '../../../../lib/auth';
import { read, write, defaults } from '../../../../lib/store';

export async function GET(req) { return (await guard(req)) || json({ ...defaults, ...(await read('settings')) }); }
const str = (v, n) => String(v ?? '').trim().slice(0, n);
export async function PUT(req) {
  const g = await guard(req, true); if (g) return g;
  try {
    const b = await body(req);
    const s = { siteName: str(b.siteName, 40) || defaults.siteName, tagline: str(b.tagline, 140), zalo: str(b.zalo, 20).replace(/[^\d+]/g, '') || defaults.zalo };
    await write('settings', s); return json(s);
  } catch (e) { return json({ error: e.message }, 400); }
}
