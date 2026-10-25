# DK AI Shop (Next.js tối giản)

3 dependency: `next`, `react`, `react-dom`. Không TypeScript/Tailwind/ORM.

## Chạy local
```bash
npm i
npm run dev        # http://localhost:3000  | admin: /admin
```
Dev mặc định: `admin_dklab` / `Admindklab@123` (chỉ khi NODE_ENV != production). Dữ liệu lưu ở `data/*.json`.

## Lên Vercel
1. Push repo lên GitHub → Vercel → Import.
2. Vercel → Storage → tạo **Upstash Redis** → Connect Project (tự thêm env `KV_REST_API_URL/TOKEN`).
3. Settings → Environment Variables, thêm:
   - `ADMIN_USER` (vd admin_dklab)
   - `ADMIN_PASS` (mật khẩu mạnh)
   - `SESSION_SECRET` (chuỗi ngẫu nhiên ≥ 32 ký tự: `openssl rand -hex 32`)
4. Redeploy. Vào `/admin` để thêm sản phẩm/khóa học/ảnh.

Không gắn Redis: trang vẫn chạy với dữ liệu mẫu nhưng admin báo lỗi khi lưu.

## VPS / máy riêng
`npm i && npm run build && ADMIN_USER=... ADMIN_PASS=... SESSION_SECRET=... npm start` (ghi vào `data/`).

## Cấu trúc
- `app/page.js` + `app/Shop.js`: trang bán (SSR, cache 60s, tự làm mới khi admin lưu)
- `app/admin/page.js`: quản trị
- `app/api/*`: login, CRUD
- `lib/`: store (Redis REST/file), auth (cookie ký HMAC), clean (kiểm tra dữ liệu)
