import crypto from 'node:crypto';
import { guard, json, body } from '../../../../lib/auth';
import { read, write } from '../../../../lib/store';
import { CLEAN } from '../../../../lib/clean';

export async function GET(req, { params }) {
  const { coll } = await params;
  if (!CLEAN[coll]) return json({ error: 'Không có API này' }, 404);
  return (await guard(req)) || json(await read(coll));
}
export async function POST(req, { params }) {
  const { coll } = await params;
  if (!CLEAN[coll]) return json({ error: 'Không có API này' }, 404);
  const g = await guard(req, true); if (g) return g;
  try {
    const { error, value } = CLEAN[coll](await body(req));
    if (error) return json({ error }, 400);
    const list = await read(coll);
    const item = { id: crypto.randomBytes(5).toString('hex'), ...value, updatedAt: new Date().toISOString() };
    list.push(item); await write(coll, list);
    return json(item, 201);
  } catch (e) { return json({ error: e.message }, 400); }
}
