// ============================================================
// 01-baseline.js — Đo baseline khi tải nhẹ (CHỈ ĐỌC)
// Mục tiêu: biết prod khoẻ cỡ nào ở mức tải thấp, làm mốc so sánh.
// Chạy: k6 run 01-baseline.js
// ============================================================
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  // nginx prod dùng self-signed cert -> bỏ qua verify TLS
  insecureSkipTLSVerify: true,

  stages: [
    { duration: '30s', target: 10 },  // khởi động
    { duration: '1m', target: 20 },   // giữ tải nhẹ
    { duration: '30s', target: 0 },   // hạ tải
  ],

  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE = __ENV.BASE_URL || 'https://portal.tuoitrebachkhoa.com';

export default function () {
  // Endpoint tĩnh + nhẹ, không ghi dữ liệu
  const front = http.get(`${BASE}/`);
  check(front, { 'frontend 200': (r) => r.status === 200 });

  // Qua nginx, /api/ bị cắt tiền tố -> backend route thật là /auth, /users...
  // /api/auth/profile có JwtAuthGuard: không token -> backend trả 401 (sống & nhanh, không đụng dữ liệu)
  // Khai báo 401 là status HỢP LỆ để k6 không tính nhầm vào http_req_failed
  const api = http.get(`${BASE}/api/auth/profile`, {
    responseCallback: http.expectedStatuses(401),
  });
  check(api, { 'api sống (401 = guard hoạt động)': (r) => r.status === 401 });

  sleep(Math.random() * 3 + 2); // think time 2-5s
}
