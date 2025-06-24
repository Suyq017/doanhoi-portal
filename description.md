# Hệ thống quản lý Đoàn Thanh niên và Hội Sinh viên

## Mô tả dự án
Xây dựng một hệ thống web để quản lý tổ chức Đoàn Thanh niên và Hội Sinh viên tại Trường Đại học Bách khoa – ĐHQG-HCM.

## A. Công nghệ yêu cầu

### Frontend
- **Framework**: React.js
- **Styling**: Tailwind CSS và Radix UI (https://www.radix-ui.com/)
- **Màu chủ đạo**: 
  - `#030391` (xanh đậm – Đoàn)
  - `#1488D8` (xanh sáng – HSV)
- **Yêu cầu**:
  - Responsive design
  - Hỗ trợ dark mode (điểm cộng)
  - Thiết kế nhẹ nhàng, sang trọng, phù hợp với đối tượng sinh viên

### Backend
- **Framework**: NestJS
- **Database**: PostgreSQL (ERD chi tiết sẽ được cung cấp)
- **Triển khai**: Tách riêng client và server, hỗ trợ Docker hóa sau giai đoạn MVP

## B. Các chức năng của website

### 1. Chức năng quản lý tài khoản / người dùng

Mỗi người dùng có duy nhất 1 tài khoản với các thông tin:

#### Thông tin bắt buộc:
- Mã số định danh (Mã số cán bộ/ Mã số sinh viên)
- Họ tên
- Email
- Số điện thoại

#### Thông tin không bắt buộc:
- Đơn vị quản lý
- Đơn vị Đào tạo
- Lớp
- Mã chi đoàn
- Chi hội

#### Thông tin khác:
- **Đối tượng**: cán bộ/ sinh viên
- **Trạng thái**: đoàn viên, hội viên
- **Vai trò**: nhiều vai trò cùng lúc (sẽ được đề cập rõ ở phần phân quyền)

### 2. Chức năng Xác thực (Authentication)

#### 2.1 Đăng nhập và đăng ký
Cho phép xác thực qua 2 phương thức:
- **Tài khoản nội bộ (local)**: do admin cấp
- **Google OAuth2**: dùng email @hcmut.edu.vn hoặc gmail cá nhân

#### 2.2 Các yêu cầu khác:
- Hỗ trợ JWT token + refresh token
- Backend dùng Passport.js + Guard (NestJS)
- Frontend lưu access token ở cookie hoặc local storage
- Tự động đăng ký tài khoản khi lần đầu đăng nhập qua Google

### 3. Cấu trúc tổ chức cần quản lý

#### 3.1 Hệ thống Đoàn Thanh niên
**Đoàn Trường** > **Đoàn Cơ sở** (theo đơn vị) > **Chi Đoàn** (theo lớp)

*Lưu ý: Mỗi sinh viên nếu là Đoàn viên, chỉ thuộc một chi đoàn duy nhất*

#### 3.2 Hệ thống Hội Sinh viên
- **Hội Sinh viên Trường** > **Liên Chi Hội** (theo đơn vị) > **Chi Hội** (theo lớp)
  - *Mỗi sinh viên nếu là Hội viên, chỉ thuộc một chi hội duy nhất*
  - *Có thể trùng hoặc tách với Chi đoàn*
- **Câu lạc bộ cấp Trường**: trực thuộc Hội Sinh viên Trường – sinh viên tự nguyện tham gia
- **Câu lạc bộ cấp Khoa**: trực thuộc Liên chi Hội – sinh viên tự nguyện tham gia

#### 3.3 Quan hệ tổ chức – người dùng
- **Mỗi tổ chức có**:
  - Danh sách thành viên
  - Danh sách quản trị viên (cán bộ)
  - *Khi thuộc chi đoàn/ chi hội thì mặc định thuộc đơn vị cấp cao hơn*

- **Mỗi người dùng trong hệ thống**:
  - Nếu là **Đoàn viên** → phải thuộc một Chi đoàn
  - Nếu là **Hội viên** → phải thuộc một Chi hội
  - **Tùy chọn**: tham gia các Câu lạc bộ khác nhau
