// ============================================================
// 06-mixed-realistic.js — Mô phỏng người dùng THẬT (trộn nhiều hành vi)
// ------------------------------------------------------------
// VÌ SAO QUAN TRỌNG:
//   Người dùng thật không chỉ làm 1 việc. Test này trộn các hành vi theo tỷ lệ
//   gần thực tế để trả lời câu hỏi "5000 người dùng bình thường thì prod ra sao":
//     - 70% chỉ duyệt trang (ẩn danh, tải nhẹ)
//     - 20% đăng nhập rồi xem dữ liệu (tải vừa, đụng DB)
//     - 10% đăng nhập sai / thử lại (stress bcrypt)
//
// CÁCH CHẠY:
//   Có tài khoản:  k6 run -e TEST_EMAIL=... -e TEST_PASSWORD=... 06-mixed-realistic.js
//   Không có:      k6 run 06-mixed-realistic.js   (scenario auth sẽ tự bỏ qua)
//
//   Chỉnh quy mô: -e PEAK=300  (số VUs đỉnh, mặc định 200)
// ============================================================
import http from 'k6/http';
import { check, sleep } from 'k6';
import {
  BASE, TEST_EMAIL, TEST_PASSWORD, PROBE_EMAIL,
  login, authHeaders, humanThinkTime,
} from './lib/helpers.js';

const PEAK = parseInt(__ENV.PEAK || '200', 10);

export const options = {
  insecureSkipTLSVerify: true,

  scenarios: {
    // 70% — duyệt trang ẩn danh
    browse: {
      executor: 'ramping-vus',
      exec: 'browse',
      startVUs: 0,
      stages: [
        { duration: '1m', target: Math.round(PEAK * 0.7) },
        { duration: '3m', target: Math.round(PEAK * 0.7) },
        { duration: '1m', target: 0 },
      ],
    },
    // 20% — đăng nhập + đọc dữ liệu có xác thực
    authed: {
      executor: 'ramping-vus',
      exec: 'authed',
      startVUs: 0,
      stages: [
        { duration: '1m', target: Math.round(PEAK * 0.2) },
        { duration: '3m', target: Math.round(PEAK * 0.2) },
        { duration: '1m', target: 0 },
      ],
    },
    // 10% — thử đăng nhập (mật khẩu sai) -> stress bcrypt
    loginAttempts: {
      executor: 'ramping-vus',
      exec: 'loginAttempts',
      startVUs: 0,
      stages: [
        { duration: '1m', target: Math.round(PEAK * 0.1) },
        { duration: '3m', target: Math.round(PEAK * 0.1) },
        { duration: '1m', target: 0 },
      ],
    },
  },

  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '15s' }],
  },
};

export function setup() {
  // Token tùy chọn — chỉ cần khi có tài khoản test
  if (TEST_EMAIL && TEST_PASSWORD) {
    const token = login(TEST_EMAIL, TEST_PASSWORD);
    return { token };
  }
  return { token: null };
}

// --- 70% duyệt ẩn danh ---
export function browse() {
  const res = http.get(`${BASE}/`, { tags: { name: 'frontend' } });
  check(res, { 'frontend 200': (r) => r.status === 200 });
  sleep(humanThinkTime());
}

// --- 20% đọc dữ liệu có xác thực ---
export function authed(data) {
  if (!data.token) {
    // Không có tài khoản -> coi như duyệt ẩn danh để vẫn tạo tải
    return browse();
  }
  const opts = { ...authHeaders(data.token) };
  const profile = http.get(`${BASE}/api/auth/profile`, { ...opts, tags: { name: 'profile' } });
  check(profile, { 'profile 200': (r) => r.status === 200 });
  sleep(humanThinkTime());

  const perms = http.get(`${BASE}/api/auth/me/permissions`, { ...opts, tags: { name: 'permissions' } });
  check(perms, { 'permissions 200': (r) => r.status === 200 });
  sleep(humanThinkTime());
}

// --- 10% thử đăng nhập (stress bcrypt, không ghi dữ liệu) ---
export function loginAttempts() {
  const res = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({ email: PROBE_EMAIL, password: 'definitely-wrong-password' }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'login' },
      responseCallback: http.expectedStatuses(200, 401),
    },
  );
  check(res, { 'login phản hồi (200/401)': (r) => r.status === 200 || r.status === 401 });
  sleep(humanThinkTime());
}
