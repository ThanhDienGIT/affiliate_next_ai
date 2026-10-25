'use client';
import { useState } from 'react';

const CATS = ['Tất cả', 'Công việc, học tập', 'Giải trí', 'Đặc thù ngành'];
const TOOLS = ['Tất cả', 'Claude', 'Gemini'];
const vnd = n => (n > 0 ? n.toLocaleString('vi-VN') + 'đ' : 'Liên hệ');
const noDia = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();

// Khung 16:9 cố định. Không có ảnh / ảnh lỗi -> nền màu + ký hiệu, card luôn đều nhau.
function Media({ image, fit, label, icon, color }) {
  const [bad, setBad] = useState(false);
  return (
    <div className="media" style={{ '--c': color }}>
      <span className="media-ico">{icon}</span>
      {image && !bad && <img src={image} alt={label} loading="lazy" decoding="async" referrerPolicy="no-referrer"
        className={fit === 'contain' ? 'fit-contain' : 'fit-cover'} onError={() => setBad(true)} />}
    </div>
  );
}

export default function Shop({ products, courses, settings }) {
  const [cat, setCat] = useState('Tất cả');
  const [tool, setTool] = useState('Tất cả');
  const [q, setQ] = useState('');
  const [toast, setToast] = useState('');

  async function order(msg) {
    try { await navigator.clipboard.writeText(msg); setToast('Đã copy tin nhắn – dán vào Zalo nhé'); } catch { setToast(msg); }
    setTimeout(() => setToast(''), 2600);
    window.open('https://zalo.me/' + settings.zalo.replace(/\D/g, ''), '_blank', 'noopener');
  }
  const key = noDia(q.trim());
  const ps = products.filter(p => (cat === 'Tất cả' || p.category === cat) &&
    (!key || noDia([p.name, p.tagline, p.summary, p.audience, ...p.benefits, ...p.plans.map(x => x.label)].join(' ')).includes(key)));
  const cs = courses.filter(k => tool === 'Tất cả' || k.tool === tool);

  return (
    <>
      <header className="top"><div className="wrap">
        <div className="logo">{settings.siteName}</div>
        <nav className="nav" aria-label="Điều hướng"><a href="#tai-khoan">Tài khoản AI</a><a href="#khoa-hoc">Khóa học</a></nav>
        <a className="btn sm" href={'https://zalo.me/' + settings.zalo.replace(/\D/g, '')} target="_blank" rel="noopener">Nhắn Zalo</a>
      </div></header>

      <main className="wrap">
        <section className="hero"><h1>Chọn đúng AI cho việc của bạn</h1><p>{settings.tagline}</p></section>

        <section id="tai-khoan">
          <h2 className="sec">Tài khoản AI</h2>
          <div className="tools">
            <div className="chips" role="group" aria-label="Lọc theo nhóm">
              {CATS.map(c => <button key={c} type="button" className="chip" aria-pressed={c === cat} onClick={() => setCat(c)}>{c}</button>)}
            </div>
            <input className="search" type="search" placeholder="Tìm AI…" aria-label="Tìm AI" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="grid">
            {!ps.length && <div className="empty">Chưa có sản phẩm phù hợp.</div>}
            {ps.map(p => (
              <article className="card" key={p.id}>
                <Media image={p.image} fit={p.fit} label={p.name} icon={p.icon} color={p.color} />
                <div className="card-b">
                  <div className="card-h"><div><h3>{p.name}</h3><div className="cat">{p.category}</div></div>{p.badge && <span className="badge">{p.badge}</span>}</div>
                  {p.tagline && <p className="tag">{p.tagline}</p>}
                  {p.benefits.length > 0 && <ul className="ben">{p.benefits.map((b, i) => <li key={i}>{b}</li>)}</ul>}
                  {p.audience && <div className="aud">Phù hợp: {p.audience}</div>}
                  <div className="plans">
                    {p.plans.map((pl, i) => {
                      const out = pl.stock === 0, ask = pl.price <= 0;
                      return (
                        <div className={'plan' + (out ? ' out' : '')} key={i}>
                          <div className="plan-l"><div className="plan-t">{pl.label}</div>{pl.note && <div className="plan-n">{pl.note}</div>}</div>
                          <div className="plan-r"><div className="plan-p">{vnd(pl.price)}</div>
                            <button type="button" className="btn sm" disabled={out}
                              onClick={() => order(`Mình muốn ${ask ? 'hỏi giá' : 'mua'}: ${p.name} – ${pl.label}` + (ask ? '' : ` (${vnd(pl.price)})`))}>{out ? 'Hết hàng' : ask ? 'Hỏi giá' : 'Mua'}</button></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="khoa-hoc">
          <h2 className="sec">Khóa học</h2>
          <p className="sec-sub">Học cách dùng AI để lập trình, edit, tự động hóa và tự tổng hợp báo cáo.</p>
          <div className="tools"><div className="chips" role="group" aria-label="Lọc khóa học">
            {TOOLS.map(t => <button key={t} type="button" className="chip" aria-pressed={t === tool} onClick={() => setTool(t)}>{t}</button>)}
          </div></div>
          <div className="grid">
            {!cs.length && <div className="empty">Chưa có khóa học.</div>}
            {cs.map(k => {
              const ask = k.price <= 0;
              return (
                <article className="card course" key={k.id}>
                  <Media image={k.image} fit={k.fit} label={k.title} icon={k.tool.slice(0, 2)} color={k.tool === 'Claude' ? '#d97757' : k.tool === 'Gemini' ? '#1a73e8' : '#4f46e5'} />
                  <div className="card-b">
                    <div className="card-h"><div><h3>{k.title}</h3><div className="cat">{[k.tool, k.level].filter(Boolean).join(' · ')}</div></div>{k.badge && <span className="badge">{k.badge}</span>}</div>
                    {k.tagline && <p className="tag">{k.tagline}</p>}
                    {k.topics.length > 0 && <div className="topics">{k.topics.map(t => <span className="topic" key={t}>{t}</span>)}</div>}
                    {k.outcomes.length > 0 && <><div className="sub">Bạn sẽ làm được</div><ul className="ben">{k.outcomes.map((b, i) => <li key={i}>{b}</li>)}</ul></>}
                    {k.modules.length > 0 && <details className="mods"><summary>Nội dung khóa học ({k.modules.length} phần)</summary><ol>{k.modules.map((b, i) => <li key={i}>{b}</li>)}</ol></details>}
                    {k.format && <div className="aud">Hình thức: {k.format}</div>}
                    <div className="plans"><div className="plan">
                      <div className="plan-l">{k.note && <div className="plan-n">{k.note}</div>}</div>
                      <div className="plan-r"><div className="plan-p">{vnd(k.price)}</div>
                        <button type="button" className="btn sm" onClick={() => order(`Mình muốn ${ask ? 'hỏi học phí' : 'đăng ký'} khóa: ${k.title}`)}>{ask ? 'Hỏi học phí' : 'Đăng ký'}</button></div>
                    </div></div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="foot"><div className="wrap">Giá có thể thay đổi theo thời điểm – nhắn Zalo để xác nhận trước khi thanh toán. Mọi tên thương hiệu thuộc về chủ sở hữu tương ứng.</div></footer>
      <div className={'toast' + (toast ? ' show' : '')} role="status">{toast}</div>
    </>
  );
}
