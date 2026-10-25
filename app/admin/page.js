'use client';
import { useCallback, useEffect, useState } from 'react';

const vnd = n => (n > 0 ? n.toLocaleString('vi-VN') + 'đ' : 'Liên hệ');
const CATS = ['Công việc, học tập', 'Giải trí', 'Đặc thù ngành'];

async function api(method, url, body) {
  const r = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d.error || 'Lỗi ' + r.status), { status: r.status });
  return d;
}
// "79k" -> 79000, "1,4tr" -> 1400000, "79.000" -> 79000; rỗng -> null; sai -> NaN
function money(s) {
  s = String(s || '').trim().toLowerCase().replace(/[đ₫\s]/g, '');
  if (!s) return null;
  const m = s.match(/^([\d.,]+)(k|tr|m)?$/);
  if (!m) return NaN;
  return Math.round(m[2] ? parseFloat(m[1].replace(',', '.')) * (m[2] === 'k' ? 1e3 : 1e6) : parseFloat(m[1].replace(/[.,]/g, '')));
}
function parsePlans(text) {
  return text.split('\n').map((l, i) => [l, i]).filter(([l]) => l.trim()).map(([line, i]) => {
    const [label, price, note, cost, stock] = line.split('|').map(s => s.trim());
    const pr = money(price), c = money(cost);
    if (!label || pr == null || Number.isNaN(pr)) throw new Error(`Dòng ${i + 1}: cần "Tên gói | Giá" (giá viết 79k hoặc 79.000)`);
    if (Number.isNaN(c)) throw new Error(`Dòng ${i + 1}: giá nhập không hợp lệ`);
    return { label, price: pr, note: note || '', cost: c, stock: stock === '' || stock == null ? null : Number(stock) };
  });
}
const plansText = plans => plans.map(p => [p.label, p.price, p.note || '', p.cost ?? '', p.stock ?? ''].join(' | ').replace(/( \| )+$/, '')).join('\n');

const EMPTY_P = { name: '', category: CATS[0], badge: '', image: '', fit: 'cover', tagline: '', benefits: '', audience: '', plans: '', icon: '', color: '#4f46e5' };
const EMPTY_C = { title: '', tool: 'Claude', badge: '', image: '', fit: 'cover', tagline: '', level: '', format: '', topics: '', outcomes: '', modules: '', price: '', note: '' };

function Field({ label, children, hint }) {
  return <div className="f"><label>{label}</label>{children}{hint && <small>{hint}</small>}</div>;
}
function Preview({ image, fit }) {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [image]);
  if (!image.trim()) return null;
  return <div className="f"><div className="media prev-m">
    {bad ? <span className="media-ico" style={{ fontSize: 16 }}>Link ảnh lỗi</span> : <img src={image} alt="" referrerPolicy="no-referrer" className={fit === 'contain' ? 'fit-contain' : 'fit-cover'} onError={() => setBad(true)} />}
  </div></div>;
}
function Thumb({ src }) {
  const [bad, setBad] = useState(false);
  return src && !bad ? <img className="thumb" src={src} alt="" referrerPolicy="no-referrer" onError={() => setBad(true)} /> : null;
}

export default function Admin() {
  const [me, setMe] = useState(null); // null = đang kiểm tra
  const [tab, setTab] = useState('products');
  const [toast, setToast] = useState('');
  const say = m => { setToast(m); setTimeout(() => setToast(''), 2200); };

  const refresh = useCallback(() => api('GET', '/api/me').then(setMe).catch(() => setMe({ admin: false })), []);
  useEffect(() => { refresh(); }, [refresh]);

  if (!me) return null;
  if (!me.admin) return <Login onOk={refresh} />;
  return (
    <main className="wrap">
      <div className="adm-top"><h1>Quản lý DK AI Shop</h1>
        <div className="row">
          <a className="btn ghost sm" href="/" target="_blank">Xem trang bán</a>
          <button className="btn ghost sm" type="button" onClick={async () => { await api('POST', '/api/logout'); refresh(); }}>Đăng xuất</button>
        </div></div>
      {!me.db && <div className="panel" style={{ borderColor: '#f2c4c0', color: '#d93025' }}>⚠ Chưa gắn database nên <b>không lưu được thay đổi</b>. Vercel → Storage → tạo Upstash Redis → Connect Project → Redeploy.</div>}
      <div className="tabs">
        {[['products', 'Tài khoản AI'], ['courses', 'Khóa học'], ['settings', 'Cài đặt']].map(([k, n]) =>
          <button key={k} type="button" className="chip" aria-pressed={tab === k} onClick={() => setTab(k)}>{n}</button>)}
      </div>
      {tab === 'settings' ? <Settings say={say} /> : <Manager key={tab} coll={tab} say={say} onAuthLost={refresh} />}
      <div className={'toast' + (toast ? ' show' : '')} role="status">{toast}</div>
    </main>
  );
}

function Login({ onOk }) {
  const [u, setU] = useState(''), [p, setP] = useState(''), [err, setErr] = useState('');
  async function go() { setErr(''); try { await api('POST', '/api/login', { user: u, pass: p }); onOk(); } catch (e) { setErr(e.message); } }
  return (
    <div className="login">
      <h1>Đăng nhập admin</h1>
      <Field label="Tài khoản"><input value={u} autoComplete="username" onChange={e => setU(e.target.value)} /></Field>
      <Field label="Mật khẩu"><input type="password" value={p} autoComplete="current-password" onChange={e => setP(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} /></Field>
      <div className="err">{err}</div>
      <button className="btn" type="button" onClick={go}>Đăng nhập</button>
    </div>
  );
}

function Manager({ coll, say, onAuthLost }) {
  const isP = coll === 'products';
  const [list, setList] = useState([]);
  const [form, setForm] = useState(null); // null = đóng
  const [editId, setEditId] = useState(null);
  const [err, setErr] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(() => api('GET', `/api/admin/${coll}`).then(setList).catch(e => e.status === 401 && onAuthLost()), [coll, onAuthLost]);
  useEffect(() => { load(); }, [load]);

  function open(item) {
    setErr(''); setEditId(item?.id || null);
    if (!item) return setForm(isP ? EMPTY_P : EMPTY_C);
    setForm(isP
      ? { ...EMPTY_P, ...item, benefits: item.benefits.join('\n'), plans: plansText(item.plans) }
      : { ...EMPTY_C, ...item, topics: item.topics.join(', '), outcomes: item.outcomes.join('\n'), modules: item.modules.join('\n'), price: item.price || '' });
  }
  async function save() {
    setErr('');
    try {
      if (form.image.trim() && !/^https?:\/\//i.test(form.image.trim())) throw new Error('Link ảnh phải bắt đầu bằng https://');
      const old = list.find(x => x.id === editId);
      let body;
      if (isP) body = { ...form, summary: old?.summary || '', hidden: old?.hidden || false, plans: parsePlans(form.plans) };
      else {
        const price = money(form.price);
        if (Number.isNaN(price)) throw new Error('Học phí không hợp lệ (vd 499k hoặc 499.000)');
        body = { ...form, price: price ?? 0, hidden: old?.hidden || false };
      }
      await api(editId ? 'PUT' : 'POST', `/api/admin/${coll}${editId ? '/' + editId : ''}`, body);
      setForm(null); say('Đã lưu'); load();
    } catch (e) { setErr(e.message); }
  }
  const act = async (fn, msg) => { try { await fn(); msg && say(msg); load(); } catch (e) { say(e.message); } };

  return (
    <>
      <div className="row" style={{ marginBottom: 14 }}><button className="btn sm" type="button" onClick={() => open(null)}>{isP ? '+ Thêm AI mới' : '+ Thêm khóa học'}</button></div>

      {form && (
        <section className="panel">
          <h2>{editId ? 'Sửa' : 'Thêm'} {isP ? 'AI' : 'khóa học'}</h2>
          <div className="cols">
            <Field label={isP ? 'Tên AI *' : 'Tên khóa học *'}><input maxLength={120} value={isP ? form.name : form.title} onChange={e => set(isP ? 'name' : 'title', e.target.value)} /></Field>
            {isP
              ? <Field label="Nhóm *"><select value={form.category} onChange={e => set('category', e.target.value)}>{CATS.map(c => <option key={c}>{c}</option>)}</select></Field>
              : <Field label="Công cụ *"><select value={form.tool} onChange={e => set('tool', e.target.value)}><option>Claude</option><option>Gemini</option><option>Khác</option></select></Field>}
            <Field label="Nhãn nổi bật"><input maxLength={24} placeholder="Hot, Giảm 50%…" value={form.badge} onChange={e => set('badge', e.target.value)} /></Field>
          </div>
          <div className="cols">
            <Field label="Link ảnh (https://…)"><input placeholder="Để trống = dùng nền màu" value={form.image} onChange={e => set('image', e.target.value)} /></Field>
            <Field label="Cách vừa ảnh"><select value={form.fit} onChange={e => set('fit', e.target.value)}><option value="cover">Phủ kín khung (cắt mép)</option><option value="contain">Hiện đủ ảnh (có viền trắng)</option></select></Field>
          </div>
          <Preview image={form.image} fit={form.fit} />
          <Field label="Mô tả ngắn"><input maxLength={160} value={form.tagline} onChange={e => set('tagline', e.target.value)} /></Field>
          {isP ? (<>
            <Field label="Lợi ích mang lại (mỗi dòng 1 ý)"><textarea value={form.benefits} onChange={e => set('benefits', e.target.value)} /></Field>
            <Field label="Phù hợp với"><input maxLength={160} value={form.audience} onChange={e => set('audience', e.target.value)} /></Field>
            <Field label="Gói giá * (mỗi dòng 1 gói)" hint="Định dạng: Tên gói | Giá bán | Ghi chú | Giá nhập | Tồn kho. Chỉ tên + giá là bắt buộc. Giá 79k / 79000 / 79.000 đều được; giá 0 = hiện “Liên hệ”. Tồn kho trống = vô hạn, 0 = hết hàng. Giá nhập chỉ admin thấy.">
              <textarea placeholder={'ChatGPT 1 tháng | 59k\nCanva Pro 1 năm | 149k | | 110k | 68'} value={form.plans} onChange={e => set('plans', e.target.value)} /></Field>
            <div className="cols">
              <Field label="Ký hiệu (1–3 ký tự)"><input maxLength={4} value={form.icon} onChange={e => set('icon', e.target.value)} /></Field>
              <Field label="Màu nền khi chưa có ảnh"><input type="color" value={form.color} onChange={e => set('color', e.target.value)} /></Field>
            </div>
          </>) : (<>
            <div className="cols">
              <Field label="Trình độ"><input maxLength={60} value={form.level} onChange={e => set('level', e.target.value)} /></Field>
              <Field label="Hình thức"><input maxLength={100} value={form.format} onChange={e => set('format', e.target.value)} /></Field>
            </div>
            <Field label="Chủ đề (cách nhau bằng dấu phẩy)"><input placeholder="Lập trình, Edit, Tự động hóa, Tổng hợp báo cáo" value={form.topics} onChange={e => set('topics', e.target.value)} /></Field>
            <Field label="Học xong làm được gì (mỗi dòng 1 ý)"><textarea value={form.outcomes} onChange={e => set('outcomes', e.target.value)} /></Field>
            <Field label="Nội dung từng phần (mỗi dòng 1 phần)"><textarea value={form.modules} onChange={e => set('modules', e.target.value)} /></Field>
            <div className="cols">
              <Field label="Học phí"><input placeholder="vd 499k – để trống = Liên hệ" value={form.price} onChange={e => set('price', e.target.value)} /></Field>
              <Field label="Ghi chú giá"><input maxLength={160} value={form.note} onChange={e => set('note', e.target.value)} /></Field>
            </div>
          </>)}
          <div className="err">{err}</div>
          <div className="row"><button className="btn" type="button" onClick={save}>Lưu</button><button className="btn ghost" type="button" onClick={() => setForm(null)}>Hủy</button></div>
        </section>
      )}

      <section className="panel">
        <table className="tbl">
          <thead><tr><th>{isP ? 'AI' : 'Khóa học'}</th><th className="hide-s">{isP ? 'Nhóm' : 'Công cụ'}</th><th>{isP ? 'Gói giá' : 'Học phí'}</th><th /></tr></thead>
          <tbody>
            {!list.length && <tr><td colSpan={4}>Chưa có dữ liệu.</td></tr>}
            {list.map(x => (
              <tr key={x.id}>
                <td><Thumb src={x.image} /><b>{isP ? x.name : x.title}</b> <span className={'pill' + (x.hidden ? ' off' : '')}>{x.hidden ? 'Đang ẩn' : 'Hiển thị'}</span></td>
                <td className="hide-s">{isP ? x.category : x.tool}</td>
                <td>{isP ? x.plans.map((p, i) => (
                  <div key={i}>{p.label} — {vnd(p.price)}{p.stock === 0 && ' (hết)'}{p.cost != null && p.price > 0 && <span className="margin">  lãi {vnd(p.price - p.cost)}</span>}</div>
                )) : vnd(x.price)}</td>
                <td className="acts">
                  <button className="btn sm ghost" type="button" onClick={() => open(x)}>Sửa</button>{' '}
                  <button className="btn sm ghost" type="button" onClick={() => act(() => api('PATCH', `/api/admin/${coll}/${x.id}`))}>{x.hidden ? 'Hiện' : 'Ẩn'}</button>{' '}
                  <button className="btn sm danger" type="button" onClick={() => confirm(`Xóa "${isP ? x.name : x.title}"? Không khôi phục được.`) && act(() => api('DELETE', `/api/admin/${coll}/${x.id}`), 'Đã xóa')}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function Settings({ say }) {
  const [s, setS] = useState({ siteName: '', zalo: '', tagline: '' });
  const [err, setErr] = useState('');
  useEffect(() => {
    api('GET', '/api/admin/settings').then(setS).catch(() => {});
  }, []);
  return (
    <section className="panel">
      <h2>Cài đặt trang</h2>
      <div className="cols">
        <Field label="Tên shop"><input maxLength={40} value={s.siteName} onChange={e => setS({ ...s, siteName: e.target.value })} /></Field>
        <Field label="Số Zalo nhận đơn"><input maxLength={20} value={s.zalo} onChange={e => setS({ ...s, zalo: e.target.value })} /></Field>
      </div>
      <Field label="Câu giới thiệu đầu trang"><input maxLength={140} value={s.tagline} onChange={e => setS({ ...s, tagline: e.target.value })} /></Field>
      <div className="row"><button className="btn" type="button" onClick={async () => { setErr(''); try { await api('PUT', '/api/admin/settings', s); say('Đã lưu cài đặt'); } catch (e) { setErr(e.message); } }}>Lưu cài đặt</button><span className="err">{err}</span></div>
    </section>
  );
}
