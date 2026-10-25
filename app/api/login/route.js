import { cookies } from 'next/headers';
import { checkLogin, configured, makeToken, sessionOpts, SESSION_SEC, ip, locked, fail, clear, json, sameOrigin, body } from '../../../lib/auth';

export async function POST(req) {
  if (!sameOrigin(req)) return json({ error: 'Sai origin' }, 403);
  if (!configured()) return json({ error: 'Chưa cấu hình ADMIN_USER / ADMIN_PASS / SESSION_SECRET' }, 500);
  const k = ip(req);
  if (locked(k)) return json({ error: 'Sai quá nhiều lần, thử lại sau 15 phút' }, 429);
  const b = await body(req);
  if (!checkLogin(b.user, b.pass)) { fail(k); return json({ error: 'Sai tài khoản hoặc mật khẩu' }, 401); }
  clear(k);
  (await cookies()).set('dk_sess', makeToken(), sessionOpts(req, SESSION_SEC));
  return json({ ok: true });
}
