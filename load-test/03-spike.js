// ============================================================
// 03-spike.js — Spike test: tải tăng ĐỘT NGỘT (mô phỏng mở đăng ký CTXH)
// Mục tiêu: xem hệ thống phản ứng khi đông người vào cùng lúc trong ít giây.
// Chạy: k6 run 03-spike.js
// CHỈ chạy sau khi 02-ramp đã biết prod chịu được tới mức nào.
// ============================================================
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  insecureSkipTLSVerify: true,

  stages: [
    { duration: '30s', target: 50 },   // nền bình thường
    { duration: '15s', target: 800 },  // SPIKE: vọt lên đột ngột
    { duration: '1m', target: 800 },   // giữ đỉnh
    { duration: '30s', target: 50 },   // hồi phục
    { duration: '30s', target: 0 },
  ],

  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.10', abortOnFail: true, delayAbortEval: '10s' }],
  },
};

const BASE = __ENV.BASE_URL || 'https://portal.tuoitrebachkhoa.com';

export default function () {
  const res = http.get(`${BASE}/`);
  check(res, {
    'status 200': (r) => r.status === 200,
    'recover < 3s': (r) => r.timings.duration < 3000,
  });
  sleep(1);
}
