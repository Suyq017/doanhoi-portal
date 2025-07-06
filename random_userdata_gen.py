import pandas as pd
import random
import string

# Danh sách tên tiếng Việt phổ biến
ho_list = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Phan", "Vũ", "Đặng", "Bùi", "Đỗ", 
           "Dương", "Lý", "Võ", "Đinh", "Lưu", "Hồ", "Trương", "Đoàn", "Tô", "Cao"]
ten_dem_list = ["Văn", "Thị", "Hữu", "Ngọc", "Quốc", "Gia", "Xuân", "Thanh", "Minh", "Đức",
                "Thế", "Công", "Trọng", "Như", "Thúy", "Hoài", "Bảo", "Tấn", "Khánh", "Diệu"]
ten_list = ["An", "Bình", "Châu", "Dũng", "Hà", "Hạnh", "Hòa", "Hương", "Khôi", "Linh",
            "Mai", "Nam", "Phong", "Quân", "Sơn", "Thảo", "Trang", "Tuấn", "Vy", "Yến",
            "Anh", "Bách", "Cường", "Duy", "Hiếu", "Huyền", "Khánh", "Long", "Nga", "Phúc"]

# Tập email/code duy nhất
used_emails = set()
used_codes = set()

# Các giá trị enum
user_types = ["student", "staff"]
membership_statuses = ["doan_vien", "hoi_vien", "both", "none"]

# Danh sách các mã lớp, khoa, tổ chức
class_names = [f"CS{random.randint(1000,9999)}A", f"IT{random.randint(1000,9999)}B", 
               f"EE{random.randint(1000,9999)}C", f"ME{random.randint(1000,9999)}D"]
management_codes = ["CNTT", "TOAN", "LY", "HOA", "SINH", "ANH", "SU", "VAN", "KINH", "LUAT"]
training_codes = ["CNTT", "TOAN", "LY", "HOA", "SINH", "ANH", "SU", "VAN", "KINH", "LUAT"]
organization_codes = ["ORG001", "ORG002", "ORG003", "ORG004", "ORG005", "ORG006", "ORG007", "ORG008"]

# Hàm bỏ dấu tiếng Việt để tạo email
def remove_vietnamese_accents(text):
    accents = {
        'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a', 'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
        'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
        'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
        'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
        'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o', 'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
        'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
        'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u', 'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
        'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
        'đ': 'd'
    }
    return ''.join(accents.get(c, c) for c in text.lower())

def generate_unique_email(given_name, family_name):
    while True:
        # Bỏ dấu và tạo email
        clean_given = remove_vietnamese_accents(given_name).replace(" ", "")
        clean_family = remove_vietnamese_accents(family_name).replace(" ", "")
        domain = random.choice(["@example.com", "@university.edu", "@mail.vn", "@gmail.com"])
        email = f"{clean_given}.{clean_family}{random.randint(1,999)}{domain}"
        if email not in used_emails:
            used_emails.add(email)
            return email

def generate_unique_code(prefix="SV"):
    while True:
        code = f"{prefix}{random.randint(100000, 999999)}"
        if code not in used_codes:
            used_codes.add(code)
            return code

# Tạo dữ liệu
records = []
for _ in range(500):
    ho = random.choice(ho_list)
    ten_dem = random.choice(ten_dem_list)
    ten = random.choice(ten_list)

    # Dữ liệu bắt buộc
    family_name = f"{ho} {ten_dem}"
    given_name = ten
    email = generate_unique_email(given_name, family_name)
    code_prefix = random.choice(["SV", "CB"])
    code = generate_unique_code(code_prefix)
    
    # Dữ liệu tùy chọn với tỷ lệ trống khác nhau
    password = ''.join(random.choices(string.ascii_letters + string.digits, k=8)) if random.random() > 0.3 else ""
    phone = f"0{random.randint(900000000, 999999999)}" if random.random() > 0.25 else ""
    class_name = random.choice(class_names) if random.random() > 0.4 else ""
    management_code = random.choice(management_codes) if random.random() > 0.3 else ""
    training_code = random.choice(training_codes) if random.random() > 0.3 else ""
    org_codes = ";".join(random.sample(organization_codes, random.randint(1, 3))) if random.random() > 0.5 else ""
    user_type = "student" if code_prefix == "SV" else "staff"
    membership = random.choices(membership_statuses, weights=[0.25, 0.25, 0.15, 0.35])[0]  # none có tỷ lệ cao hơn
    is_active = random.choices([True, False], weights=[0.85, 0.15])[0]  # true có tỷ lệ cao hơn

    records.append({
        "Family Name*": family_name,
        "Given Name*": given_name,
        "Email*": email,
        "Code*": code,
        "Password": password,
        "Phone": phone,
        "Class Name": class_name,
        "Management Department Code": management_code,
        "Training Department Code": training_code,
        "Organization Codes": org_codes,
        "User Type": user_type,
        "Membership Status": membership,
        "Is Active": is_active
    })

# Xuất ra file Excel
df = pd.DataFrame(records)
df.to_excel("users_import_500_rows.xlsx", index=False)
print("✅ File 'users_import_500_rows.xlsx' đã được tạo thành công.")
