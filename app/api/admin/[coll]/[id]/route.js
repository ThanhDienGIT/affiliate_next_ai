import { guard, json, body } from '../../../../../lib/auth';
import { read, write } from '../../../../../lib/store';
import { CLEAN } from '../../../../../lib/clean';

async function load(req, params) {
  const { coll, id } = await params;
  if (!CLEAN[coll]) return { res: json({ error: 'Không có API này' }, 404) };
  const g = await guard(req, true); if (g) return { res: g };
  const list = await read(coll);
  const i = list.findIndex(x => x.id === id);
  if (i < 0) return { res: json({ error: 'Không tìm thấy' }, 404) };
  return { coll, list, i };
}
const wrap = fn => async (req, ctx) => { try { return await fn(req, ctx); } catch (e) { return json({ error: e.message }, 400); } };

export const PUT = wrap(async (req, { params }) => {
  const c = await load(req, params); if (c.res) return c.res;
  const { error, value } = CLEAN[c.coll](await body(req));
  if (error) return json({ error }, 400);
  c.list[c.i] = { id: c.list[c.i].id, ...value, updatedAt: new Date().toISOString() };
  await write(c.coll, c.list); return json(c.list[c.i]);
});
export const PATCH = wrap(async (req, { params }) => { // bật/tắt ẩn
  const c = await load(req, params); if (c.res) return c.res;
  c.list[c.i].hidden = !c.list[c.i].hidden;
  await write(c.coll, c.list); return json(c.list[c.i]);
});
export const DELETE = wrap(async (req, { params }) => {
  const c = await load(req, params); if (c.res) return c.res;
  c.list.splice(c.i, 1); await write(c.coll, c.list); return json({ ok: true });
});
