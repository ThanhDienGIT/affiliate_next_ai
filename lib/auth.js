import crypto from 'node:crypto';
import { cookies } from 'next/headers';

const DEV = process.env.NODE_ENV !== 'production';
// Dev có mặc định cho tiện; production bắt buộc đặt biến môi trường
const cfg = () => ({
  user: process.env.ADMIN_USER || (DEV ? 'admin_dklab' : ''),
  pass: process.env.ADMIN_PASS || (DEV ? 'Admindklab@123' : ''),
  secret: process.env.SESSION_SECRET || (DEV ? 'dev-secret-khong-dung-o-production' : ''),
});
export const configured = () => { const c = cfg(); return !!(c.user && c.pass && c.secret); };
const SESSION_MS = 12 * 3600e3;
const sign = d => crypto.createHmac('sha256', cfg().secret).update(d).digest('base64url');
const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const same = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));

export const checkLogin = (u, p) => !!(same(u, cfg().user) & same(p, cfg().pass)); // & để không short-circuit
export function makeToken() {
  const d = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_MS })).toString('base64url');
  return d + '.' + sign(d);
}
function verify(t) {
  if (!configured() || !t || !t.includes('.')) return false;
  const [d, s] = t.split('.'); const good = sign(d);
  if (s.length !== good.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(good))) return false;
  try { return JSON.parse(Buffer.from(d, 'base64url').toString()).exp > Date.now(); } catch { return false; }
}
export const isAdmin = async () => verify((await cookies()).get('dk_sess')?.value);
export const sessionOpts = (req, maxAge) => ({
  httpOnly: true, sameSite: 'strict', path: '/', maxAge,
  secure: req.headers.get('x-forwarded-proto') === 'https' || new URL(req.url).protocol === 'https:',
});
export const SESSION_SEC = SESSION_MS / 1000;

// chống dò mật khẩu (chỉ tính trong từng instance khi chạy serverless)
const fails = new Map();
export const ip = req => (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim();
export const locked = k => (fails.get(k)?.until || 0) > Date.now();
export function fail(k) { const f = fails.get(k); const n = (f && f.until <= Date.now() ? 0 : f?.n || 0) + 1; fails.set(k, { n, until: n >= 5 ? Date.now() + 15 * 60e3 : 0 }); }
export const clear = k => fails.delete(k);

// helper cho route
export const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export function sameOrigin(req) { // CSRF: request ghi phải cùng origin
  const o = req.headers.get('origin');
  return !o || new URL(o).host === req.headers.get('host');
}
// trả về Response nếu bị chặn, null nếu hợp lệ
export async function guard(req, write = false) {
  if (write && !sameOrigin(req)) return json({ error: 'Sai origin' }, 403);
  if (!(await isAdmin())) return json({ error: 'Chưa đăng nhập' }, 401);
  return null;
}
export const body = async req => { try { return await req.json(); } catch { return {}; } };
