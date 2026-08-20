# AGENTS.md — backend/

Bổ sung cho `AGENTS.md` ở gốc repo (theo cơ chế phân cấp §2). Chỉ áp dụng trong `backend/`.

---

## 1. Biến môi trường BẮT BUỘC — app không khởi động được nếu thiếu

| Biến | Dùng cho | Ghi chú |
|---|---|---|
| `JWT_SECRET` | Khoá ký JWT (`JwtTokenProvider`) | **Bắt buộc.** Tối thiểu 32 ký tự (HS256 cần khoá ≥ 256 bit, thiếu thì `Keys.hmacShaKeyFor` ném `WeakKeyException`) |

Các biến khác có giá trị mặc định dùng được cho môi trường local: `SPRING_DATASOURCE_*`
(Postgres local), `R2_*` (giá trị giả, không gọi được R2 thật).

### Chạy local

Repo **chưa có Maven wrapper** (`mvnw`), nên dùng `mvn` cài sẵn trên máy.

PowerShell:

```powershell
$env:JWT_SECRET = "doi-chuoi-nay-thanh-chuoi-ngau-nhien-it-nhat-32-ky-tu"
cd backend ; mvn spring-boot:run
```

Bash:

```bash
export JWT_SECRET="doi-chuoi-nay-thanh-chuoi-ngau-nhien-it-nhat-32-ky-tu"
cd backend && mvn spring-boot:run
```

Sinh chuỗi ngẫu nhiên đủ mạnh (trên Windows gọi Python bằng `py`, không phải `python`):

```bash
py -c "import secrets; print(secrets.token_urlsafe(48))"
```

Nếu app báo lỗi kiểu `Could not resolve placeholder 'jwt.secret'` lúc khởi động thì
**đó là hành vi đúng** — bạn chưa đặt `JWT_SECRET`. Đừng "sửa" bằng cách thêm giá trị
mặc định (xem mục 2).

---

## 2. TUYỆT ĐỐI KHÔNG thêm giá trị mặc định cho secret

Cấm viết `${JWT_SECRET:mot_chuoi_nao_do}` trong `application.properties`, và cấm
`@Value("${jwt.secret:mot_chuoi_nao_do}")` trong code Java.

**Repo này PUBLIC trên GitHub.** Một giá trị mặc định cho khoá ký token nghĩa là:
chỉ cần môi trường nào đó quên đặt biến, hệ thống sẽ chạy với khoá mà bất kỳ ai đọc
repo cũng biết — và họ tự ký được token hợp lệ cho **bất kỳ tài khoản nào, kể cả
ADMIN**. Không có log nào báo, không có test nào đỏ.

Đây từng là lỗi thật trong repo (khoá mặc định
`vsl_learn_translate_super_secret_jwt_key_256bits_minimum_length!` nằm ở cả
`application.properties` lẫn `JwtTokenProvider.java`), đã gỡ. Đừng đưa lại.

Nguyên tắc chung: **thà app chết lúc khởi động còn hơn chạy với secret công khai.**
Lỗi khởi động thì thấy ngay trong 5 giây; secret rò rỉ thì không ai biết cho tới lúc
bị chiếm tài khoản.

Áp dụng cho mọi secret về sau: khoá ký, mật khẩu DB thật, khoá R2 thật, API key bên
thứ ba. Riêng giá trị **giả rõ ràng** cho môi trường local (`dummy_access_key`,
Postgres `vsl_password` chạy trên `localhost`) thì chấp nhận được, vì lộ ra cũng không
mở được gì.

---

## 3. Nhắc lại hai điều từ AGENTS.md gốc, hay bị quên trong backend

- **Cấm endpoint `/predict` hoặc bất kỳ logic AI inference nào ở backend.** Toàn bộ
  suy luận chạy client-side (Web Worker + ONNX Runtime Web). Backend chỉ lưu trữ,
  điều phối, cấp presigned URL.
- **Không xoá hay sửa file migration Flyway đã commit.** Đánh số tiếp `V4__`, `V5__`…
  File đã merge coi như đã chạy ở máy người khác; sửa nó làm lệch checksum và Flyway
  sẽ từ chối khởi động.
