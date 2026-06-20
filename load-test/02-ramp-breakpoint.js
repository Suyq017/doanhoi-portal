// ============================================================
// 02-ramp-breakpoint.js — Tăng tải dần để TÌM ĐIỂM GÃY (CHỈ ĐỌC)
// Mục tiêu: bậc thang 50 -> 100 -> 250 -> 500 -> 1000 VUs,
// k6 TỰ ĐỘNG DỪNG khi prod bắt đầu đau (abortOnFail).
// Chạy: k6 run 02-ramp-breakpoint.js
//   hoặc đặt mức trần: k6 run -e MAX_VUS=500 02-ramp-breakpoint.js
// ============================================================
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  insecureSkipTLSVerify: true,

  stages: [
    { duration: '1m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 250 },
    { duration: '2m', target: 500 },
    { duration: '2m', target: 1000 },
    { duration: '1m', target: 0 },
  ],

  thresholds: {
    // ABORT tự động khi prod quá tải -> tránh sập thật
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '10s' }],
    http_req_duration: [{ threshold: 'p(95)<2000', abortOnFail: true, delayAbortEval: '10s' }],
  },
};

const BASE = __ENV.BASE_URL || 'https://portal.tuoitrebachkhoa.com';

export default function () {
  // Chỉ đọc, không login, không ghi
  const res = http.get(`${BASE}/`);
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(Math.random() * 3 + 2);
}
