# Kế hoạch thiết kế UI Chatbot - Đoàn Hội Portal

## Tổng quan

Chuyển chatbot từ **trang riêng biệt** sang dạng **floating widget** — nút tròn cố định góc dưới bên phải màn hình. Khi bấm vào sẽ mở popup chatbot ngay tại trang hiện tại, không chuyển route.

---

## 1. Floating Button (Nút bấm mở chatbot)

- **Vị trí**: Góc dưới bên phải, cách mép phải `24px`, cách mép dưới `24px`
- **Kích thước**: `56px × 56px`, hình tròn
- **Màu nền**: Xanh dương chủ đạo (`#1E40AF` hoặc `primary` của hệ thống)
- **Icon**: Icon chat (💬) hoặc icon robot, màu trắng
- **Hiệu ứng**:
  - `box-shadow` nhẹ tạo nổi
  - Hover: scale lên `1.1`, đổi shadow đậm hơn
  - Khi chatbot đang mở: icon chuyển thành dấu `✕` (đóng)
- **z-index**: Cao nhất (`z-50` hoặc `9999`) để luôn nổi trên mọi nội dung
- **Badge**: Có thể thêm chấm đỏ nhỏ khi có tin nhắn mới (optional, phase sau)

---

## 2. Chatbot Popup Window

### Kích thước & Vị trí

| Thuộc tính | Giá trị |
|---|---|
| Chiều rộng | `~33vw` (1/3 màn hình), min `360px`, max `480px` |
| Chiều cao | `~66vh` (2/3 màn hình), min `500px`, max `720px` |
| Vị trí | Cố định (`fixed`), góc dưới bên phải, cách mép phải `24px`, cách mép dưới `90px` (trên floating button) |
| Bo góc | `border-radius: 16px` |
| Shadow | `box-shadow: 0 8px 32px rgba(0,0,0,0.15)` |
| z-index | `9998` (ngay dưới floating button) |

### Responsive

- **Desktop** (≥1024px): Width `33vw`, Height `66vh`
- **Tablet** (768px–1023px): Width `50vw`, Height `70vh`
- **Mobile** (< 768px): **Fullscreen** — width `100vw`, height `100vh`, bo góc `0`

### Animation

- Mở: slide up + fade in từ góc dưới phải (`transform: translateY(20px) → 0`, `opacity: 0 → 1`), duration `200ms`
- Đóng: slide down + fade out, duration `150ms`

---

## 3. Cấu trúc bên trong Chatbot Popup

### 3.1. Header (Tiêu đề)

```
┌──────────────────────────────────┐
│ 🟦  Đoàn Hội Chatbot         ✕  │
│     Trợ lý AI Đoàn - Hội ĐHBK  │
├──────────────────────────────────┤
```

- **Logo**: Hình tròn logo Đoàn Hội ĐHBK (hoặc icon mặc định), kích thước `36px`
- **Tên**: **"Đoàn Hội Chatbot"** — font bold, màu xám đậm (`text-gray-800`)
- **Mô tả phụ**: *"Trợ lý AI của Đoàn Thanh niên - Hội Sinh viên ĐHBK"* — font nhỏ, màu xám nhạt (`text-gray-500`)
- **Nút đóng**: Icon `✕` góc trên phải, hover đổi màu
- **Divider**: Đường kẻ ngang mỏng `1px`, màu `gray-200` ngăn cách header với chat area
- **Chiều cao cố định**: `~64px`

### 3.2. Main Chat Area (Khu vực trò chuyện)

```
┌──────────────────────────────────┐
│  🤖 Xin chào! Tôi là trợ lý AI │
│  của Đoàn TN - Hội SV trường    │
│  ĐH Bách khoa. Bạn có câu hỏi  │
│  gì về hoạt động Đoàn Hội       │
│  không?                         │
│                                  │
│              Tin nhắn người dùng │
│                                  │
│  🤖 Câu trả lời từ AI...        │
└──────────────────────────────────┘
```

- **Nền**: Màu xám rất nhạt (`bg-gray-50`)
- **Scroll**: `overflow-y: auto`, chiếm toàn bộ không gian còn lại (flex-grow)
- **Avatar AI**: Hình tròn `32px`, nền xanh dương, chữ **"AI"** trắng ở giữa
- **Tin nhắn AI** (bên trái):
  - Bubble màu trắng, bo góc `12px`, shadow nhẹ
  - Padding `12px 16px`
  - Max-width `85%`
- **Tin nhắn người dùng** (bên phải):
  - Bubble nền xanh dương (`bg-blue-600`), chữ trắng
  - Bo góc `12px`
  - Max-width `85%`
- **Tin nhắn chào mừng mặc định**: *"Xin chào! Tôi là trợ lý AI của Đoàn Thanh niên - Hội Sinh viên trường Đại học Bách khoa TP.HCM. Bạn có câu hỏi gì về hoạt động Đoàn Hội không?"*
- **Loading indicator**: 3 chấm nhảy (typing dots) khi đang chờ response

### 3.3. Suggested Chips (Gợi ý câu hỏi)

```
┌──────────────────────────────────┐
│ ┌─────────────┐ ┌──────────────┐ │
│ │ Hoạt động   │ │ Điểm CTXH    │ │
│ │ CTXH sắp tới│ │ của tôi?     │ │
│ └─────────────┘ └──────────────┘ │
│ ┌─────────────┐ ┌──────────────┐ │
│ │ Cách đăng ký│ │ Quy đổi điểm│ │
│ │ hoạt động?  │ │ rèn luyện?   │ │
│ └─────────────┘ └──────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ Liên hệ Đoàn - Hội?         │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

- **Hiển thị**: Chỉ hiện khi chưa có tin nhắn nào (hoặc khi conversation rỗng)
- **Thiết kế**: Nút dạng pill-shaped, nền trắng, viền xanh dương `1px`, chữ xanh dương
- **Hover**: Nền chuyển xanh nhạt (`bg-blue-50`)
- **Bố cục**: Flex wrap, gap `8px`, padding `12px`
- **Nội dung gợi ý** (5 câu hỏi phổ biến về Đoàn Hội):
  1. *"Hoạt động CTXH sắp diễn ra?"*
  2. *"Điểm CTXH hiện tại của tôi?"*
  3. *"Cách đăng ký hoạt động CTXH?"*
  4. *"Quy đổi điểm rèn luyện như thế nào?"*
  5. *"Liên hệ Đoàn - Hội?"*
- **Khi bấm**: Tự động điền vào ô input và gửi đi

### 3.4. Input Footer (Khu vực nhập liệu)

```
┌──────────────────────────────────┐
│ ┌────────────────────────── ┌──┐ │
│ │ Hỏi về hoạt động Đoàn... │ ➤ │ │
│ └────────────────────────── └──┘ │
└──────────────────────────────────┘
```

- **Khung input**: Pill-shaped (`border-radius: 24px`), viền `gray-300`, padding `10px 16px`
- **Placeholder**: *"Hỏi về hoạt động Đoàn Hội..."* — màu `gray-400`
- **Focus**: Viền chuyển xanh dương, outline ring
- **Nút gửi**: Hình tròn `36px`, nền xanh dương, icon mũi tên trắng hướng lên
  - Disabled (mờ) khi input rỗng
  - Hover: đậm hơn
- **Gửi bằng Enter**: Nhấn Enter = gửi, Shift+Enter = xuống dòng
- **Chiều cao cố định**: `~56px` (padding included)

---

## 4. Layout tổng thể

```
┌─────────────────────────────────────────────────────┐
│                   TRANG HIỆN TẠI                    │
│                                                     │
│   (Dashboard / Quản lý CTXH / bất kỳ trang nào)    │
│                                                     │
│                                                     │
│                         ┌────────────────────┐      │
│                         │ Header             │      │
│                         ├────────────────────┤      │
│                         │                    │      │
│                         │   Chat Area        │      │
│                         │                    │      │
│                         │                    │      │
│                         ├────────────────────┤      │
│                         │ Suggested Chips    │      │
│                         ├────────────────────┤      │
│                         │ Input Footer       │      │
│                         └────────────────────┘      │
│                                            ┌──┐     │
│                                            │💬│     │
│                                            └──┘     │
└─────────────────────────────────────────────────────┘
```

---

## 5. Kế hoạch implementation

### Phase 1: Floating Button + Popup Shell

- [ ] Tạo component `ChatbotWidget` (floating button + popup container)
- [ ] Đặt vào `App.tsx` hoặc layout chính (hiển thị trên mọi trang)
- [ ] State: `isOpen` toggle mở/đóng
- [ ] Animation mở/đóng (CSS transition hoặc framer-motion)
- [ ] Responsive: fullscreen trên mobile

### Phase 2: Migrate Chat UI vào Popup

- [ ] Di chuyển logic chat hiện tại từ trang riêng vào trong popup
- [ ] Giữ nguyên `ctxh-chat.adapter.ts` (không đổi logic gọi API)
- [ ] Resize chat area cho vừa popup (scroll, max-height)
- [ ] Header mới với logo + tên + nút đóng

### Phase 3: Suggested Chips + Polish

- [ ] Thêm suggested chips component
- [ ] Welcome message mặc định
- [ ] Loading indicator (typing dots)
- [ ] Auto-scroll xuống tin nhắn mới
- [ ] Lưu conversation state khi đóng/mở lại (không mất tin nhắn)

### Phase 4: Xoá trang chatbot cũ

- [ ] Xoá route `/ctxh-chat` (hoặc redirect)
- [ ] Xoá menu sidebar link đến trang chatbot cũ
- [ ] Cleanup code không dùng

---

## 6. Tech Stack

| Thành phần | Công nghệ |
|---|---|
| Component | React + TypeScript |
| Styling | TailwindCSS (đã có trong project) |
| Animation | CSS transitions hoặc `framer-motion` |
| Chat logic | Giữ nguyên `@assistant-ui/react` + `ctxh-chat.adapter.ts` |
| State | `useState` local (isOpen, messages) |
| Icons | Lucide React hoặc Heroicons (đã có) |

---

## 7. Lưu ý

- Chatbot widget hiển thị trên **mọi trang** sau khi đăng nhập
- Không hiển thị cho user chưa login
- Conversation persist trong session (đóng popup không mất tin nhắn, nhưng refresh trang thì reset)
- Không block tương tác với trang phía dưới khi chatbot đang mở (không có overlay/backdrop)
