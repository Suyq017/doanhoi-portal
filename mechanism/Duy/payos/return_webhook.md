# Webhook thông tin thanh toán

[![payOS Logo](https://payos.vn/wp-content/uploads/2025/06/Casso-payOSLogo-1.svg)](https://payos.vn)

* Webhook thanh toán
  * EventWebhook nhận thông tin thanh toán

[API docs by Redocly](https://redocly.com/redoc/)

# payOS Payment Webhook API<!-- --> (<!-- -->latest<!-- -->)

payOS support

<!-- -->

:

<!-- -->

<support@payos.vn> URL: <https://payos.vn>

<!-- -->

[Terms of Service](https://payos.vn/thoa-thuan-su-dung/)

Webhook API cho hệ thống thanh toán payOS.

### Trước khi bắt đầu

* Bạn đã tạo một tài khoản <https://my.payos.vn>.
* Bạn đã xác thực một doanh nghiệp hoặc cá nhân trên <https://my.payos.vn>, [xem hướng dẫn](https://payos.vn/docs/huong-dan-su-dung/xac-thuc-to-chuc/)
* Bạn đã tạo một kênh thanh toán, [xem hướng dẫn](https://payos.vn/docs/huong-dan-su-dung/tao-kenh-thanh-toan/).

### Môi trường

* Production: <https://api-merchant.payos.vn>

Đăng ký chương trình đối tác tích hợp payOS [Tại đây](https://payos.vn/chuong-trinh-doi-tac-tich-hop/)

## [](#tag/payment-webhook)Webhook thanh toán

Webhook thanh toán

## [](#tag/payment-webhook/operation/payment-webhook)Webhook nhận thông tin thanh toán<!-- --> <!-- -->Webhook

Webhook của cửa hàng dùng để nhận dữ liệu thanh toán từ payOS, [Dữ liệu mẫu](https://payos.vn/docs/tich-hop-webhook/kiem-tra-du-lieu-voi-signature/)

##### Request Body schema: application/json

|                   |                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| coderequired      | stringMã lỗi                                                                                                                       |
| descrequired      | stringThông tin lỗi                                                                                                                |
| successrequired   | boolean                                                                                                                            |
| datarequired      | object                                                                                                                             |
| signaturerequired | stringChữ kí để kiểm tra thông tin, [chi tiết dữ liệu mẫu](https://payos.vn/docs/tich-hop-webhook/kiem-tra-du-lieu-voi-signature/) |

### Responses

**200<!-- -->**

Phản hồi trạng thái mã 2XX để xác nhận webhook gửi thành công

### <!-- -->Request samples<!-- -->

* Payload

Content type

application/json

Copy

Expand all  Collapse all

`{
"code": "00",
"desc": "success",
"success": true,
"data": {
"orderCode": 123,
"amount": 3000,
"description": "VQRIO123",
"accountNumber": "12345678",
"reference": "TF230204212323",
"transactionDateTime": "2023-02-04 18:25:00",
"currency": "VND",
"paymentLinkId": "124c33293c43417ab7879e14c8d9eb18",
"code": "00",
"desc": "Thành công",
"counterAccountBankId": "",
"counterAccountBankName": "",
"counterAccountName": "",
"counterAccountNumber": "",
"virtualAccountName": "",
"virtualAccountNumber": ""
},
"signature": "8d8640d802576397a1ce45ebda7f835055768ac7ad2e0bfb77f9b8f12cca4c7f"
}`

# Return URL

Sau khi thực hiện thanh toán trình duyệt sẽ điều hướng về trang mà người dùng đã khai báo ở `returnUrl` đã được khai báo trong [API tạo link thanh toán](/docs/api/.md). Ngược lại, nếu người dùng hủy thanh toán, trình duyệt sẽ điều hướng về `cancelUrl`.

`returnUrl` và `cancelUrl` sẽ được gắn các query params chứa thông tin thanh toán phục vụ cho việc xử lý ở phía giao diện người dùng.

### Ví dụ về Return URL:[​](#ví-dụ-về-return-url "Đường dẫn trực tiếp đến Ví dụ về Return URL:")

thông tin

`https://your-website.com/return-url/?code=00&id=2e4acf1083304877bf1a8c108b30cccd&cancel=true&status=CANCELLED&orderCode=803347`

### Mô tả dữ liệu trả về qua Query Params:[​](#mô-tả-dữ-liệu-trả-về-qua-query-params "Đường dẫn trực tiếp đến Mô tả dữ liệu trả về qua Query Params:")

| Tên       | Giá trị                          | Mô tả                 | Tập giá trị                                                                                                     |
| --------- | -------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------- |
| code      | 00                               | Mã lỗi                | - 00 - Thành công<br />- 01 - Invalid Params                                                                    |
| id        | 2e4acf1083304877bf1a8c108b30cccd | Payment Link Id       | string                                                                                                          |
| cancel    | true                             | Trạng thái hủy        | - true - Đã hủy thanh toán<br />- false - Đã thanh toán hoặc chờ thanh toán                                     |
| status    | CANCELLED                        | Trạng thái thanh toán | - PAID - Đã thanh toán<br />- PENDING - Chờ thanh toán<br />- PROCESSING - Đang xử lý<br />- CANCELLED - Đã hủy |
| orderCode | 803347                           | Mã đơn hàng           | number                                                                                                          |