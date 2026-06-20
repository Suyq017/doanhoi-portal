// ============================================================
// 04-login-stress.js — Stress LUỒNG LOGIN (phần tốn CPU nhất)
// ------------------------------------------------------------
// VÌ SAO QUAN TRỌNG:
//   Login chạy bcrypt (so khớp mật khẩu) — rất tốn CPU. Backend chỉ có
//   1 container nên đây thường là điểm gãy ĐẦU TIÊN khi đông người đăng nhập
//   cùng lúc (vd đầu giờ sáng, mở đăng ký CTXH).
//
// AN TOÀN TRÊN PROD:
//   Dùng email CÓ THẬT + mật khẩu SAI (PROBE_EMAIL).
//   -> validateUser tìm thấy user -> CHẠY bcrypt (đo đúng phần nặng)
//   -> mật khẩu sai -> trả 401 -> KHÔNG phát token, KHÔNG ghi refreshToken
//   => không tạo rác dữ liệu, chỉ tốn CPU (đúng thứ ta muốn đo).
//
//   Lưu ý: nếu PROBE_EMAIL KHÔNG tồn tại trong DB thì bcrypt sẽ KHÔNG chạy
//   (validateUser return sớm) -> bài test mất ý nghĩa. Hãy truyền 1 email thật:
//     k6 run -e PROBE_EMAIL=real.user@hcmut.edu.vn 04-login-stress.js
// ============================================================
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { BASE, PROBE_EMAIL } from './lib/helpers.js';

const loginDuration = new Trend('login_duration', true);
const loginRejected = new Rate('login_rejected_401'); // mong đợi ~100% (mật khẩu sai)

export const options = {
  insecureSkipTLSVerify: true,

  // Tăng dần để tìm mức login/giây mà CPU backend bắt đầu nghẽn
  stages: [
    { duration: '1m', target: 20 },
    { duration: '2m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '1m', target: 0 },
  ],

  thresholds: {
    // 401 là HỢP LỆ ở đây (mật khẩu cố tình sai) -> không tính là lỗi HTTP
    login_duration: ['p(95)<1500'],
    // ABORT nếu quá nhiều lỗi ngoài 200/401 (vd 500 do CPU pin) -> tránh làm prod đơ
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '10s' }],
  },
};

export default function () {
  const res = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({ email: PROBE_EMAIL, password: 'definitely-wrong-password' }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'login' },
      // 401 là kết quả mong đợi -> không đếm vào http_req_failed
      responseCallback: http.expectedStatuses(200, 401),
    },
  );

  loginDuration.add(res.timings.duration);
  loginRejected.add(res.status === 401);

  check(res, {
    'login phản hồi (200/401)': (r) => r.status === 200 || r.status === 401,
    'latency < 2s': (r) => r.timings.duration < 2000,
  });
  // KHÔNG sleep: ép tải đăng nhập liên tục để dò trần CPU
}
