/**
 * Định nghĩa cấu trúc dữ liệu mà PayOS trả về qua Query Parameters trên returnUrl.
 * Dữ liệu này được gửi đến trình duyệt của người dùng sau khi họ hoàn tất (hoặc hủy) thanh toán.
 */
export interface PayosReturnData {
  /**
   * Mã lỗi của giao dịch. Giá trị "00" có nghĩa là thành công.
   * @example "00"
   */
  code: string;

  /**
   * Mã định danh của link thanh toán (paymentLinkId).
   * @example "c789b1b519e44b92b6a782a8561d3319"
   */
  id: string;

  /**
   * Trạng thái hủy giao dịch. `true` nếu người dùng chủ động hủy.
   * @example true
   */
  cancel: boolean;

  /**
   * Trạng thái của link thanh toán.
   */
  status: 'PAID' | 'CANCELLED' | 'EXPIRED' | 'PENDING';

  /**
   * Mã đơn hàng do bạn cung cấp khi tạo link.
   * @example 123456
   */
  orderCode: number;

  /**
   * Chữ ký bảo mật để xác thực tính toàn vẹn của dữ liệu trả về.
   * Bạn cần tự tạo lại chữ ký từ các tham số và so sánh với giá trị này.
   * Công thức: HMAC_SHA256(data, checksumKey)
   * với data = "code=<code>&id=<id>&cancel=<cancel>&status=<status>&orderCode=<orderCode>"
   */
  signature: string;
}
