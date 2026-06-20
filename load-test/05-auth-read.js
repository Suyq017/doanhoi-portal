// ============================================================
// 05-auth-read.js — Load test ĐỌC DỮ LIỆU CÓ XÁC THỰC (qua được guard)
// ------------------------------------------------------------
// VÌ SAO QUAN TRỌNG:
//   Đây là loại request phổ biến nhất của người dùng thật: đăng nhập rồi
//   xem thông tin. Khác với /api/auth/profile khi không token (bị guard chặn
//   TRƯỚC interceptor, KHÔNG được đếm), request CÓ token đi tới handler nên
//   ĐƯỢC ghi vào metric doanhoi_http_requests_total -> hiện đúng trên Grafana.
//
// CÁCH CHẠY (cần 1 tài khoản thật trên prod):
//   k6 run -e TEST_EMAIL=you@hcmut.edu.vn -e TEST_PASSWORD=secret 05-auth-read.js
//
// SIDE-EFFECT: login() ghi refreshToken 1 lần cho tài khoản test (ghi đè cùng
//   1 dòng, không tạo rác). Ta login MỘT lần trong setup() rồi tái dùng token.
// ============================================================
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE, TEST_EMAIL, TEST_PASSWORD, login, authHeaders, humanThinkTime } from './lib/helpers.js';

export const options = {
  insecureSkipTLSVerify: true,

  stages: [
    { duration: '1m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '1m', target: 0 },
  ],

  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '10s' }],
  },
};

// Chạy 1 lần trước test: đăng nhập lấy token dùng chung cho mọi VU
export function setup() {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error(
      'Thiếu tài khoản test. Chạy: k6 run -e TEST_EMAIL=... -e TEST_PASSWORD=... 05-auth-read.js',
    );
  }
  const token = login(TEST_EMAIL, TEST_PASSWORD);
  if (!token) {
    throw new Error('Đăng nhập thất bại — kiểm tra lại TEST_EMAIL/TEST_PASSWORD.');
  }
  return { token };
}

export default function (data) {
  const opts = { ...authHeaders(data.token) };

  // 1) Xem profile (chỉ JwtAuthGuard -> tới handler -> ĐƯỢC đếm)
  const profile = http.get(`${BASE}/api/auth/profile`, {
    ...opts,
    tags: { name: 'profile' },
  });
  check(profile, { 'profile 200': (r) => r.status === 200 });

  sleep(humanThinkTime());

  // 2) Xem quyền của user (đụng DB: getUserRoles -> đo tải đọc DB thật)
  const perms = http.get(`${BASE}/api/auth/me/permissions`, {
    ...opts,
    tags: { name: 'permissions' },
  });
  check(perms, { 'permissions 200': (r) => r.status === 200 });

  sleep(humanThinkTime());
}
