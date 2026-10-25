import fs from 'node:fs';
import path from 'node:path';
import { unstable_cache, revalidateTag } from 'next/cache';
import products from '../data/seed.json';
import courses from '../data/seed-courses.json';

const SEEDS = {
  products,
  courses,
  settings: { siteName: 'DK AI Shop', tagline: 'Tài khoản AI giá tốt – chọn đúng công cụ cho việc của bạn', zalo: '0949987041' },
};
const url = () => process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
const token = () => process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
export const hasDb = () => !!url() || !process.env.VERCEL; // Vercel mà chưa gắn Redis => không ghi được

async function redis(cmd) {
  const r = await fetch(url(), { method: 'POST', cache: 'no-store', headers: { Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error('Lỗi database: ' + (j.error || r.status));
  return j.result;
}
const file = name => path.join(process.cwd(), 'data', name + '.json');

// Đọc trực tiếp (admin dùng, luôn mới)
export async function read(name) {
  const seed = SEEDS[name];
  if (url()) {
    const v = await redis(['GET', 'dkai:' + name]);
    if (v != null) return typeof v === 'string' ? JSON.parse(v) : v;
    await redis(['SET', 'dkai:' + name, JSON.stringify(seed), 'NX']); // lần đầu: nạp dữ liệu mẫu
    return seed;
  }
  if (process.env.VERCEL) return seed;
  try { return JSON.parse(fs.readFileSync(file(name), 'utf8')); } catch { return seed; }
}
export async function write(name, val) {
  if (url()) await redis(['SET', 'dkai:' + name, JSON.stringify(val)]);
  else if (process.env.VERCEL) throw new Error('Chưa gắn database. Vercel → Storage → tạo Upstash Redis → Redeploy.');
  else fs.writeFileSync(file(name), JSON.stringify(val, null, 2));
  revalidateTag('dk', { expire: 0 }); // xóa cache trang công khai ngay
}
// Đọc cho trang công khai: cache 60s, bị xóa ngay khi admin lưu
export const readCached = name => unstable_cache(() => read(name), ['dk', name], { revalidate: 60, tags: ['dk'] })();
export const defaults = SEEDS.settings;
