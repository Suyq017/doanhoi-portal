// ============================================================
// lib/helpers.js — Cấu hình & hàm dùng chung cho mọi script load test
// ============================================================
import http from 'k6/http';

// URL mục tiêu (mặc định prod). Override: -e BASE_URL=...
export const BASE = __ENV.BASE_URL || 'https://portal.tuoitrebachkhoa.com';

// Tài khoản test (truyền qua env, KHÔNG hardcode mật khẩu vào repo):
//   k6 run -e TEST_EMAIL=you@example.com -e TEST_PASSWORD=secret 05-auth-read.js
export const TEST_EMAIL = __ENV.TEST_EMAIL || '';
export const TEST_PASSWORD = __ENV.TEST_PASSWORD || '';

// Một email CÓ THẬT trong hệ thống, dùng cho login-stress (mật khẩu cố tình sai).
// Mục đích: kích hoạt bcrypt + truy vấn DB mà KHÔNG đăng nhập thành công
// -> không ghi refreshToken, không tạo rác dữ liệu.
export const PROBE_EMAIL = __ENV.PROBE_EMAIL || TEST_EMAIL || 'admin@hcmut.edu.vn';

/**
 * Đăng nhập, trả về accessToken (hoặc null nếu thất bại).
 */
export function login(email, password) {
  const res = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } },
  );
  if (res.status === 200) {
    try {
      return JSON.parse(res.body).accessToken;
    } catch (_e) {
      return null;
    }
  }
  return null;
}

/** Header Authorization tiện dụng */
export function authHeaders(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

/** Think time giống người thật: nghỉ 2-5s giữa các thao tác */
export function humanThinkTime() {
  return Math.random() * 3 + 2;
}
