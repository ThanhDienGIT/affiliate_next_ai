import { cookies } from 'next/headers';
import { sessionOpts, json, sameOrigin } from '../../../lib/auth';

export async function POST(req) {
  if (!sameOrigin(req)) return json({ error: 'Sai origin' }, 403);
  (await cookies()).set('dk_sess', '', sessionOpts(req, 0));
  return json({ ok: true });
}
