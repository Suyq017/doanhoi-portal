# Kế Hoạch Hiện Thực Trang Đóng Phí cho Member

## 1. Tổng Quan

### 1.1 Mục Tiêu
- Tạo trang đóng phí cho thành viên với 2 tab chính
- Tab 1: Danh sách các khoản phí cần đóng
- Tab 2: Lịch sử thanh toán
- Không cần chức năng thống kê

### 1.2 Cấu Trúc Trang
```
Trang Đóng Phí của Tôi
├── Tab 1: Khoản Phí Cần Đóng
│   ├── Danh sách đợt đóng phí đang mở
│   ├── Thông tin mức phí được phân công
│   ├── Trạng thái thanh toán
│   └── Nút thanh toán (tạo QR code)
└── Tab 2: Lịch Sử Thanh Toán
    ├── Danh sách các giao dịch đã thực hiện
    ├── Chi tiết từng giao dịch
    ├── Trạng thái thanh toán
    └── Ngày giờ thanh toán
```

## 2. Chi Tiết Tab 1: Khoản Phí Cần Đóng

### 2.1 Hiển Thị Thông Tin
- **Đợt đóng phí**: Tên đợt, mô tả, thời gian
- **Mức phí**: Số tiền cần đóng, mô tả mức phí
- **Trạng thái**: Chưa đóng / Đã đóng / Quá hạn
- **Hạn đóng**: Ngày hết hạn (nếu có)

### 2.2 Chức Năng Thanh Toán
- Nút "Thanh Toán" cho các khoản chưa đóng
- Popup/Modal hiển thị QR code PayOS
- Theo dõi trạng thái thanh toán real-time
- Thông báo thành công/thất bại

### 2.3 Bộ Lọc & Sắp Xếp
- Lọc theo trạng thái: Tất cả / Chưa đóng / Đã đóng
- Sắp xếp theo: Ngày tạo / Hạn đóng / Số tiền

## 3. Chi Tiết Tab 2: Lịch Sử Thanh Toán

### 3.1 Danh Sách Giao Dịch
- **Thông tin đợt**: Tên đợt đóng phí
- **Số tiền**: Số tiền đã thanh toán
- **Ngày thanh toán**: Thời gian hoàn thành
- **Mã giao dịch**: Mã PayOS transaction
- **Trạng thái**: Thành công / Thất bại / Đang xử lý

### 3.2 Chi Tiết Giao Dịch
- Click vào giao dịch để xem chi tiết
- Thông tin PayOS order code
- Chi tiết mức phí đã đóng
- Thời gian tạo và hoàn thành

### 3.3 Tìm Kiếm & Lọc
- Tìm kiếm theo tên đợt đóng phí
- Lọc theo khoảng thời gian
- Lọc theo trạng thái giao dịch

## 4. Components Cần Phát Triển

### 4.1 Trang Chính
- **MyPaymentPage.tsx**: Trang chính với 2 tabs
- **TabNavigation.tsx**: Navigation giữa 2 tabs

### 4.2 Tab 1 Components
- **PendingPaymentsList.tsx**: Danh sách khoản phí cần đóng
- **PaymentAssignmentCard.tsx**: Card hiển thị từng khoản phí
- **PaymentModal.tsx**: Modal thanh toán với QR code
- **QRCodeDisplay.tsx**: Component hiển thị QR PayOS
- **PaymentStatusBadge.tsx**: Badge trạng thái thanh toán

### 4.3 Tab 2 Components
- **PaymentHistoryList.tsx**: Danh sách lịch sử thanh toán
- **TransactionCard.tsx**: Card hiển thị từng giao dịch
- **TransactionDetailModal.tsx**: Modal chi tiết giao dịch
- **PaymentFilters.tsx**: Bộ lọc và tìm kiếm

### 4.4 Shared Components
- **EmptyState.tsx**: Hiển thị khi không có dữ liệu
- **LoadingSpinner.tsx**: Loading state
- **ErrorMessage.tsx**: Hiển thị lỗi

## 5. Hooks & Services

### 5.1 Custom Hooks
- **useMyPaymentAssignments**: Lấy danh sách khoản phí của user
- **usePaymentHistory**: Lấy lịch sử thanh toán
- **usePaymentProcess**: Xử lý quy trình thanh toán
- **useQRCodePolling**: Polling trạng thái thanh toán

### 5.2 API Services
- **myPaymentService.ts**: API calls cho trang member
  - getMyAssignments(): Lấy khoản phí cần đóng
  - getMyTransactions(): Lấy lịch sử thanh toán
  - createPayment(): Tạo payment link
  - checkPaymentStatus(): Kiểm tra trạng thái

## 6. Routing & Navigation

### 6.1 Route Structure
```
/my-payments
├── /pending (Tab 1 - default)
└── /history (Tab 2)
```

### 6.2 URL State Management
- Tab active được lưu trong URL
- Bộ lọc được sync với query parameters
- Deep linking support

## 7. State Management

### 7.1 Local State
- Tab hiện tại (pending/history)
- Loading states cho từng tab
- Filter/search states
- Modal states (payment, transaction detail)

### 7.2 Data Fetching
- React Query cho caching và sync
- Optimistic updates cho trạng thái thanh toán
- Real-time polling khi có payment active

## 8. User Experience Flow

### 8.1 Flow Thanh Toán
1. User vào tab "Khoản Phí Cần Đóng"
2. Chọn khoản phí cần thanh toán
3. Click "Thanh Toán" → mở Modal
4. Hiển thị QR code PayOS
5. User quét QR và chuyển khoản
6. Polling trạng thái → cập nhật UI
7. Thông báo thành công → chuyển sang tab Lịch sử

### 8.2 Flow Xem Lịch Sử
1. User chuyển sang tab "Lịch Sử Thanh Toán"
2. Hiển thị danh sách giao dịch
3. Có thể filter/search
4. Click vào giao dịch → xem chi tiết

## 9. Timeline Phát Triển

### Giai Đoạn 1: Setup & Layout (2 ngày)
- Tạo component structure
- Setup routing và navigation
- Design layout cơ bản cho 2 tabs

### Giai Đoạn 2: Tab 1 - Khoản Phí (3 ngày)
- API integration cho assignments
- Component hiển thị danh sách
- Payment modal và QR code
- Real-time status updates

### Giai Đoạn 3: Tab 2 - Lịch Sử (2 ngày)
- API integration cho transactions
- Component lịch sử thanh toán
- Filter và search functionality
- Transaction detail modal

### Giai Đoạn 4: Polish & UX (1 ngày)
- Loading states và error handling
- Empty states
- Mobile responsive
- Final testing

## 10. Yêu Cầu Kỹ Thuật

### 10.1 Responsive Design
- Mobile-first approach
- Tablet và desktop optimization
- Touch-friendly UI elements

### 10.2 Performance
- Lazy loading cho danh sách dài
- Virtualization nếu cần
- Image optimization cho QR codes

### 10.3 Accessibility
- Screen reader support
- Keyboard navigation
- High contrast support

### 10.4 Error Handling
- Network errors
- PayOS API errors
- Graceful fallbacks

## 11. Notes

- Không cần implement thống kê/dashboard
- Focus vào 2 tabs chính theo yêu cầu
- Đảm bảo UX mượt mà cho quy trình thanh toán
- Integration với PayOS API đã có sẵn
