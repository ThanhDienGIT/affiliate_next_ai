export const CATEGORIES = ['Công việc, học tập', 'Giải trí', 'Đặc thù ngành'];
export const TOOLS = ['Claude', 'Gemini', 'Khác'];
const str = (v, max) => String(v ?? '').trim().slice(0, max);
const int = (v, min, max) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= min && n <= max ? n : null; };
const lines = (v, max = 200, n = 12) => (Array.isArray(v) ? v : String(v || '').split('\n')).map(s => str(s, max)).filter(Boolean).slice(0, n);
const imgUrl = v => { try { const u = new URL(str(v, 500)); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch { return ''; } };
const fitOf = v => (v === 'contain' ? 'contain' : 'cover');

export function cleanProduct(b) {
  const name = str(b.name, 80);
  if (!name) return { error: 'Thiếu tên AI' };
  if (!CATEGORIES.includes(b.category)) return { error: 'Nhóm không hợp lệ' };
  const plans = (Array.isArray(b.plans) ? b.plans : []).slice(0, 20).map(p => ({
    label: str(p.label, 120), price: int(p.price, 0, 1e9), note: str(p.note, 160),
    cost: p.cost === '' || p.cost == null ? null : int(p.cost, 0, 1e9),
    stock: p.stock === '' || p.stock == null ? null : int(p.stock, 0, 1e7), // null = vô hạn
  }));
  if (!plans.length) return { error: 'Cần ít nhất 1 gói giá' };
  if (plans.some(p => !p.label || p.price === null)) return { error: 'Mỗi gói cần tên và giá hợp lệ' };
  return { value: {
    name, category: b.category, tagline: str(b.tagline, 140), summary: str(b.summary, 500),
    benefits: lines(b.benefits), audience: str(b.audience, 160), image: imgUrl(b.image), fit: fitOf(b.fit),
    badge: str(b.badge, 24), icon: str(b.icon, 4) || name.slice(0, 1).toUpperCase(),
    color: /^#[0-9a-fA-F]{6}$/.test(b.color || '') ? b.color : '#4f46e5', hidden: !!b.hidden, plans,
  } };
}
export function cleanCourse(b) {
  const title = str(b.title, 120);
  if (!title) return { error: 'Thiếu tên khóa học' };
  if (!TOOLS.includes(b.tool)) return { error: 'Công cụ không hợp lệ' };
  const price = b.price === '' || b.price == null ? 0 : int(b.price, 0, 1e9);
  if (price === null) return { error: 'Giá không hợp lệ' };
  return { value: {
    title, tool: b.tool, tagline: str(b.tagline, 160), badge: str(b.badge, 24), image: imgUrl(b.image), fit: fitOf(b.fit),
    level: str(b.level, 60), format: str(b.format, 100),
    topics: (Array.isArray(b.topics) ? b.topics : String(b.topics || '').split(',')).map(s => str(s, 40)).filter(Boolean).slice(0, 8),
    outcomes: lines(b.outcomes), modules: lines(b.modules, 160, 20), price, note: str(b.note, 160), hidden: !!b.hidden,
  } };
}
export const CLEAN = { products: cleanProduct, courses: cleanCourse };
// bỏ giá nhập khỏi dữ liệu công khai
export const publicProducts = list => list.filter(p => !p.hidden).map(p => ({ ...p, plans: p.plans.map(({ cost, ...r }) => r) }));
export const publicCourses = list => list.filter(k => !k.hidden);
