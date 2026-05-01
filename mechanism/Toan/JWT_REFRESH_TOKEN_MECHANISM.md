# 🔑 Cơ Chế JWT và Refresh Token

## 📋 Mục Lục
- [Tổng Quan](#tổng-quan)
- [Kiến Trúc JWT Authentication](#kiến-trúc-jwt-authentication)
- [Các Thành Phần Chính](#các-thành-phần-chính)
- [Luồng Hoạt Động](#luồng-hoạt-động)
- [Access Token vs Refresh Token](#access-token-vs-refresh-token)
- [Token Refresh Mechanism](#token-refresh-mechanism)
- [Frontend Implementation](#frontend-implementation)
- [Backend Implementation](#backend-implementation)
- [Security Best Practices](#security-best-practices)
- [Error Handling](#error-handling)

---

## 🎯 Tổng Quan

Hệ thống sử dụng **JWT (JSON Web Token)** với **Refresh Token Pattern** để xác thực và duy trì session người dùng.

### Đặc Điểm Chính:
- ✅ **Stateless Authentication**: Server không lưu session, tất cả thông tin trong JWT
- ✅ **Short-lived Access Token**: Access token có thời gian sống ngắn (30 phút)
- ✅ **Long-lived Refresh Token**: Refresh token tồn tại lâu hơn (7 ngày)
- ✅ **Auto Token Refresh**: Frontend tự động làm mới token khi hết hạn
- ✅ **Secure Storage**: Refresh token được lưu trong database
- ✅ **Multiple Auth Providers**: Hỗ trợ cả local (email/password) và Google OAuth

---

## 🏗️ Kiến Trúc JWT Authentication

### Sơ Đồ Tổng Quan

```
┌─────────────────────────────────────────────────────────────────┐
│                        JWT LIFECYCLE                             │
└─────────────────────────────────────────────────────────────────┘

┌──────────┐    1. Login      ┌──────────┐
│  Client  │ ───────────────> │  Server  │
│          │                  │          │
│          │ <─────────────── │          │
│          │  2. Access Token │          │
│          │     Refresh Token│          │
└──────────┘                  └──────────┘
     │                              ▲
     │ 3. API Request               │
     │    (Access Token)            │
     └─────────────────────────────>│
                                    │
     ┌──────────────────────────────┘
     │ 4. Response
     │    (If 401 → Refresh)
     └────────────────────────────> Client
```

### Token Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      TOKEN STRUCTURE                             │
└─────────────────────────────────────────────────────────────────┘

Access Token (30m):
┌──────────────────────────────────────────────────────────┐
│ Header                                                   │
│ { "alg": "HS256", "typ": "JWT" }                        │
├──────────────────────────────────────────────────────────┤
│ Payload                                                  │
│ {                                                        │
│   "email": "admin@doanhoi.com",                         │
│   "sub": "user-uuid-123",                               │
│   "iat": 1698480000,      ← Issued at                   │
│   "exp": 1698481800       ← Expires in 30 minutes       │
│ }                                                        │
├──────────────────────────────────────────────────────────┤
│ Signature (JWT_SECRET)                                   │
│ HMACSHA256(base64(header) + "." + base64(payload))      │
└──────────────────────────────────────────────────────────┘

Refresh Token (7d):
┌──────────────────────────────────────────────────────────┐
│ Header                                                   │
│ { "alg": "HS256", "typ": "JWT" }                        │
├──────────────────────────────────────────────────────────┤
│ Payload                                                  │
│ {                                                        │
│   "email": "admin@doanhoi.com",                         │
│   "sub": "user-uuid-123",                               │
│   "iat": 1698480000,      ← Issued at                   │
│   "exp": 1699084800       ← Expires in 7 days           │
│ }                                                        │
├──────────────────────────────────────────────────────────┤
│ Signature (JWT_REFRESH_SECRET)                           │
│ HMACSHA256(base64(header) + "." + base64(payload))      │
└──────────────────────────────────────────────────────────┘
```

---

## 🧩 Các Thành Phần Chính

### 1️⃣ JWT Payload Structure

**Interface:** `JwtPayload`

```typescript
export interface JwtPayload {
  sub: string;      // User ID (subject)
  email: string;    // User email
  iat?: number;     // Issued at (timestamp)
  exp?: number;     // Expiration (timestamp)
}
```

**Ý Nghĩa:**
- **`sub`**: User ID, là định danh chính của user
- **`email`**: Email của user, dùng làm fallback
- **`iat`**: Thời điểm token được tạo (Unix timestamp)
- **`exp`**: Thời điểm token hết hạn (Unix timestamp)

### 2️⃣ User Entity - Refresh Token Storage

**File:** `backend/src/entities/user.entity.ts`

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  password: string; // For local auth

  @Column({ nullable: true })
  googleId: string; // For Google OAuth

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  authProvider: AuthProvider; // 'local' | 'google'

  @Column({ nullable: true, type: 'text' })
  refreshToken: string; // ← Lưu refresh token trong DB

  @Column({ nullable: true })
  lastLogin: Date; // Cập nhật khi login

  @Column({ default: true })
  isActive: boolean; // User có active không
}
```

**Tại Sao Lưu Refresh Token Trong Database?**
1. **Revocation**: Có thể thu hồi token khi logout
2. **Security**: Kiểm tra token có hợp lệ không (chống token reuse)
3. **Single Device Login** (tùy chọn): Chỉ cho phép 1 device login
4. **Audit Trail**: Theo dõi ai đang logged in

### 3️⃣ Auth DTOs

#### Login DTO

**File:** `backend/src/auth/dto/login.dto.ts`

```typescript
export class LoginDto {
  @ApiProperty({ example: 'admin@doanhoi.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  @MinLength(6)
  password: string;
}
```

#### Auth Response DTO

**File:** `backend/src/auth/dto/auth-response.dto.ts`

```typescript
export class AuthResponseDto {
  user: Omit<User, 'password' | 'refreshToken'>; // ← Không trả password/refreshToken
  accessToken: string;
  refreshToken: string;
}
```

#### Refresh Token DTO

**File:** `backend/src/auth/dto/refresh-token.dto.ts`

```typescript
export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token'
  })
  @IsString()
  refreshToken: string;
}
```

### 4️⃣ JWT Strategy

**File:** `backend/src/auth/strategies/jwt.strategy.ts`

**Chức Năng:** Validate access token và load user từ database

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // ← Lấy token từ header
      ignoreExpiration: false, // ← Reject expired tokens
      secretOrKey: configService.get<string>('JWT_SECRET'), // ← Secret để verify
    });
  }

  async validate(payload: JwtPayload) {
    // 1. Lấy user từ database bằng ID
    let user = await this.usersService.findOne(payload.sub);
    
    // 2. Fallback to email nếu không tìm thấy bằng ID
    if (!user && payload.email) {
      user = await this.usersService.findByEmail(payload.email);
    }
    
    // 3. Kiểm tra user tồn tại và active
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }
    
    // 4. Remove sensitive data
    const { password, refreshToken, ...userWithoutSensitiveData } = user;
    
    // 5. Return user (sẽ được attach vào request.user)
    return userWithoutSensitiveData;
  }
}
```

**Passport Flow:**
```
Request với Authorization header
    ↓
JwtAuthGuard triggered
    ↓
Passport extracts JWT từ header
    ↓
Passport verifies signature (JWT_SECRET)
    ↓
Passport decodes payload
    ↓
JwtStrategy.validate(payload) called
    ↓
Load user từ database
    ↓
Attach user to request.user
    ↓
Controller handler executed
```

### 5️⃣ JWT Auth Guard

**File:** `backend/src/auth/guards/jwt-auth.guard.ts`

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    console.log('🔒 JwtAuthGuard: Starting JWT authentication...');
    return super.canActivate(context); // Delegate to Passport
  }
}
```

**Cách Sử Dụng:**

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard) // ← Require authentication for all routes
export class UsersController {
  @Get('profile')
  getProfile(@Request() req) {
    return req.user; // user đã được JwtStrategy validate
  }
}
```

### 6️⃣ Auth Service

**File:** `backend/src/auth/auth.service.ts`

**Các Chức Năng Chính:**

```typescript
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private rolesService: RolesService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}
  
  // 1. Validate email & password
  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    
    if (!user || !user.isActive) return null;
    
    const isPasswordValid = await this.usersService.validatePassword(
      user, 
      password
    );
    
    if (!isPasswordValid) return null;
    
    const { password: _, refreshToken, ...result } = user;
    return result;
  }
  
  // 2. Generate tokens & save refresh token
  async login(user: User): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      email: user.email,
      sub: user.id
    };
    
    // Generate access token (30m)
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '30m',
    });
    
    // Generate refresh token (7d)
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });
    
    // Save refresh token to database
    await this.usersService.updateRefreshToken(user.id, refreshToken);
    
    const { password, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }
  
  // 3. Refresh access token
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
      
      const user = await this.usersService.findByEmail(payload.email);
      
      // Check user exists, active, and refresh token matches
      if (!user || !user.isActive || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      
      // Generate new access token
      const newPayload: JwtPayload = {
        email: user.email,
        sub: user.id
      };
      
      const accessToken = this.jwtService.sign(newPayload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '30m',
      });
      
      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
  
  // 4. Logout - invalidate refresh token
  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
  }
  
  // 5. Google OAuth login
  async googleLogin(profile: any): Promise<AuthResponseDto> {
    const { id, emails, name } = profile;
    const email = emails[0].value;
    
    let user = await this.usersService.findByEmail(email);
    
    if (user) {
      // Update Google ID if not set
      if (!user.googleId) {
        await this.usersService.updateGoogleId(user.id, id);
        user.googleId = id;
        user.authProvider = AuthProvider.GOOGLE;
      }
    } else {
      // User không tồn tại → reject (chỉ cho existing users login)
      throw new UnauthorizedException('User not found. Contact admin.');
    }
    
    return this.login(user);
  }
}
```

---

## 🔄 Luồng Hoạt Động

### Flow 1: Login với Email/Password

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 1. POST /auth/login
       │    { email, password }
       ▼
┌──────────────────────────────────┐
│  AuthController.login()          │
│  @UseGuards(LocalAuthGuard)      │
└──────┬───────────────────────────┘
       │ 2. LocalAuthGuard validates credentials
       ▼
┌──────────────────────────────────┐
│  AuthService.validateUser()      │
│  - Find user by email            │
│  - Check password with bcrypt    │
│  - Return user (without password)│
└──────┬───────────────────────────┘
       │ 3. User validated
       ▼
┌──────────────────────────────────┐
│  AuthService.login(user)         │
│  - Create JWT payload            │
│  - Sign access token (30m)       │
│  - Sign refresh token (7d)       │
│  - Save refresh token to DB      │
│  - Update lastLogin              │
└──────┬───────────────────────────┘
       │ 4. Return response
       ▼
┌──────────────────────────────────┐
│  Response: AuthResponseDto       │
│  {                               │
│    user: { id, email, ... },     │
│    accessToken: "eyJ...",        │
│    refreshToken: "eyJ..."        │
│  }                               │
└──────┬───────────────────────────┘
       │ 5. Client saves tokens
       ▼
┌──────────────────────────────────┐
│  Frontend: AuthContext           │
│  - localStorage.setItem(         │
│      'accessToken', token        │
│    )                             │
│  - localStorage.setItem(         │
│      'refreshToken', token       │
│    )                             │
│  - setAuth({ user, token })      │
└──────────────────────────────────┘
```

### Flow 2: API Request với Access Token

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 1. GET /users
       │    Authorization: Bearer <access-token>
       ▼
┌──────────────────────────────────┐
│  Controller (with @UseGuards)    │
│  @UseGuards(JwtAuthGuard)        │
└──────┬───────────────────────────┘
       │ 2. JwtAuthGuard intercepts
       ▼
┌──────────────────────────────────┐
│  Passport JWT Strategy           │
│  - Extract token from header     │
│  - Verify signature (JWT_SECRET) │
│  - Decode payload                │
└──────┬───────────────────────────┘
       │ 3. Token valid
       ▼
┌──────────────────────────────────┐
│  JwtStrategy.validate(payload)   │
│  - Load user by ID (payload.sub) │
│  - Check user.isActive           │
│  - Remove sensitive data         │
└──────┬───────────────────────────┘
       │ 4. User validated
       ▼
┌──────────────────────────────────┐
│  Request Object                  │
│  req.user = {                    │
│    id: "user-123",               │
│    email: "user@example.com",    │
│    ...                           │
│  }                               │
└──────┬───────────────────────────┘
       │ 5. Controller handler executed
       ▼
┌──────────────────────────────────┐
│  UsersController.findAll()       │
│  - Access req.user               │
│  - Execute business logic        │
│  - Return response               │
└──────────────────────────────────┘
```

### Flow 3: Token Expired → Auto Refresh

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 1. GET /users
       │    Authorization: Bearer <expired-token>
       ▼
┌──────────────────────────────────┐
│  Backend: JwtStrategy            │
│  - Verify token                  │
│  - Token expired → 401           │
└──────┬───────────────────────────┘
       │ 2. Response: 401 Unauthorized
       ▼
┌──────────────────────────────────┐
│  Frontend: ApiClient             │
│  - Detect 401 error              │
│  - Check if isRefreshing         │
│  - If not, start refresh         │
└──────┬───────────────────────────┘
       │ 3. POST /auth/refresh
       │    { refreshToken: "eyJ..." }
       ▼
┌──────────────────────────────────┐
│  AuthService.refreshToken()      │
│  - Verify refresh token          │
│  - Check token in database       │
│  - Generate new access token     │
└──────┬───────────────────────────┘
       │ 4. Return new access token
       ▼
┌──────────────────────────────────┐
│  Frontend: ApiClient             │
│  - Save new access token         │
│  - Retry original request        │
│  - Process queued requests       │
└──────┬───────────────────────────┘
       │ 5. Retry GET /users
       │    Authorization: Bearer <new-token>
       ▼
┌──────────────────────────────────┐
│  Backend: Success                │
│  - New token valid               │
│  - Return data                   │
└──────────────────────────────────┘
```

### Flow 4: Logout

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 1. POST /auth/logout
       │    Authorization: Bearer <access-token>
       ▼
┌──────────────────────────────────┐
│  AuthController.logout()         │
│  @UseGuards(JwtAuthGuard)        │
└──────┬───────────────────────────┘
       │ 2. Extract user from JWT
       ▼
┌──────────────────────────────────┐
│  AuthService.logout(userId)      │
│  - Set user.refreshToken = null  │
│  - Update database               │
└──────┬───────────────────────────┘
       │ 3. Refresh token invalidated
       ▼
┌──────────────────────────────────┐
│  Frontend: AuthContext           │
│  - Clear localStorage            │
│  - Reset auth state              │
│  - Redirect to /login            │
└──────────────────────────────────┘
```

---

## ⚖️ Access Token vs Refresh Token

### Bảng So Sánh

| Aspect | Access Token | Refresh Token |
|--------|-------------|---------------|
| **Mục đích** | Truy cập API | Làm mới access token |
| **Thời gian sống** | 30 phút | 7 ngày |
| **Secret key** | `JWT_SECRET` | `JWT_REFRESH_SECRET` |
| **Lưu trữ** | localStorage (client) | localStorage (client) + Database (server) |
| **Gửi kèm request** | Mọi API call (header) | Chỉ khi refresh |
| **Có thể revoke?** | Không (stateless) | Có (lưu DB) |
| **Payload** | user.id, user.email | user.id, user.email |
| **Bảo mật** | Medium risk (short-lived) | High risk (long-lived) |

### Tại Sao Cần 2 Loại Token?

**Vấn Đề Nếu Chỉ Dùng 1 Loại:**

```
❌ Chỉ dùng Access Token (long-lived):
┌──────────────────────────────────────────────────────┐
│ Access Token expires in 7 days                       │
│                                                      │
│ Pros:                                                │
│ - User không cần login lại thường xuyên             │
│                                                      │
│ Cons:                                                │
│ - Nếu token bị đánh cắp → hacker có 7 ngày để xài   │
│ - Không thể revoke token (stateless)                │
│ - Logout không hiệu quả (token vẫn valid)           │
└──────────────────────────────────────────────────────┘

❌ Chỉ dùng Access Token (short-lived):
┌──────────────────────────────────────────────────────┐
│ Access Token expires in 30 minutes                   │
│                                                      │
│ Pros:                                                │
│ - Bảo mật cao (token nhanh hết hạn)                 │
│                                                      │
│ Cons:                                                │
│ - User phải login lại mỗi 30 phút → UX tệ           │
└──────────────────────────────────────────────────────┘
```

**✅ Giải Pháp: 2 Token Pattern**

```
Access Token (30m) + Refresh Token (7d)
┌──────────────────────────────────────────────────────┐
│ Pros:                                                │
│ - Access token ngắn → an toàn khi bị đánh cắp       │
│ - Refresh token dài → UX tốt (không login thường)   │
│ - Có thể revoke refresh token → logout hiệu quả     │
│ - Auto refresh → seamless user experience            │
└──────────────────────────────────────────────────────┘

Trade-off:
- Tăng độ phức tạp code (phải handle refresh logic)
- Cần lưu refresh token trong DB
```

---

## 🔄 Token Refresh Mechanism

### Frontend Auto Refresh (ApiClient)

**File:** `frontend/src/shared/services/apiClient.ts`

**Cơ Chế:**

```typescript
class ApiClient {
  private isRefreshing = false; // Đang refresh hay không
  private failedQueue: Array<{  // Queue các request bị 401
    resolve: Function;
    reject: Function;
  }> = [];
  
  async request<T>(endpoint: string, options: RequestInit): Promise<T> {
    const token = getAccessToken();
    
    // 1. Gửi request với access token
    let response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...headers
      }
    });
    
    // 2. Nếu 401 → token expired
    if (response.status === 401 && token) {
      
      // 2a. Nếu đang refresh → queue request này
      if (this.isRefreshing) {
        return new Promise((resolve, reject) => {
          this.failedQueue.push({ resolve, reject });
        }).then(() => {
          // Retry với new token khi refresh xong
          return fetch(url, { 
            headers: { 
              'Authorization': `Bearer ${getNewToken()}` 
            } 
          });
        });
      }
      
      // 2b. Bắt đầu refresh
      this.isRefreshing = true;
      
      try {
        const refreshToken = getRefreshToken();
        
        // 3. Call refresh endpoint
        const refreshResponse = await authService.refreshToken(refreshToken);
        
        // 4. Save new access token
        setAccessToken(refreshResponse.accessToken);
        
        // 5. Process queued requests
        this.processQueue(null, refreshResponse.accessToken);
        
        // 6. Retry original request
        response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${refreshResponse.accessToken}`
          }
        });
        
      } catch (error) {
        // Refresh failed → logout
        this.processQueue(error, null);
        clearTokens();
        window.location.href = '/login';
        throw error;
      } finally {
        this.isRefreshing = false;
      }
    }
    
    return response.json();
  }
  
  private processQueue(error: any, token: string | null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    this.failedQueue = [];
  }
}
```

**Ví Dụ Kịch Bản:**

```
Timeline:
─────────────────────────────────────────────────────────────

T=0s:  User sends Request A → 401 (token expired)
       ├─ isRefreshing = true
       └─ Start refresh process

T=0.5s: User sends Request B → 401
        └─ Add to failedQueue (wait for refresh)

T=1s:   User sends Request C → 401
        └─ Add to failedQueue (wait for refresh)

T=2s:   Refresh completed → new access token
        ├─ Process failedQueue (retry B, C với new token)
        ├─ Retry Request A với new token
        └─ isRefreshing = false

T=2.5s: Request A, B, C đều success với new token
```

### Backend Refresh Validation

**File:** `backend/src/auth/auth.service.ts`

```typescript
async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
  try {
    // 1. Verify refresh token signature
    const payload = this.jwtService.verify(refreshToken, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
    });
    
    // 2. Load user từ database
    const user = await this.usersService.findByEmail(payload.email);
    
    // 3. Kiểm tra 3 điều kiện:
    if (
      !user ||                                    // User tồn tại?
      !user.isActive ||                           // User còn active?
      user.refreshToken !== refreshToken          // Token match DB?
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    
    // 4. Generate new access token
    const newPayload: JwtPayload = {
      email: user.email,
      sub: user.id
    };
    
    const accessToken = this.jwtService.sign(newPayload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '30m',
    });
    
    return { accessToken };
    
  } catch (error) {
    throw new UnauthorizedException('Invalid refresh token');
  }
}
```

**Security Checks:**

```
┌─────────────────────────────────────────────────────────┐
│ Refresh Token Validation Checklist                     │
├─────────────────────────────────────────────────────────┤
│ ✅ Signature valid? (JWT_REFRESH_SECRET)                │
│ ✅ Token not expired? (exp < now)                       │
│ ✅ User exists in database?                             │
│ ✅ User is active?                                      │
│ ✅ Token matches user.refreshToken in DB?              │
│                                                          │
│ Nếu TẤT CẢ đều ✅ → Issue new access token             │
│ Nếu có 1 cái ❌ → Reject with 401                       │
└─────────────────────────────────────────────────────────┘
```

---

## 🖥️ Frontend Implementation

### AuthContext - Token Management

**File:** `frontend/src/features/auth/context/AuthContext.tsx`

```typescript
export const AuthProvider: React.FC = ({ children }) => {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
  });
  
  // Initialize: Load tokens from localStorage
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (token && refreshToken) {
      // Verify token by loading user profile
      authService.getProfile(token)
        .then(user => {
          setAuth({
            user,
            token,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        })
        .catch(() => {
          clearAuth();
        });
    } else {
      setAuth(prev => ({ ...prev, isLoading: false }));
    }
  }, []);
  
  // Login function
  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    
    // Save tokens
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    
    setAuth({
      user: response.user,
      token: response.accessToken,
      refreshToken: response.refreshToken,
      isAuthenticated: true,
      isLoading: false,
    });
    
    return response;
  };
  
  // Logout function
  const logout = () => {
    if (auth.token) {
      authService.logout(auth.token).catch(() => {});
    }
    
    clearAuth();
  };
  
  const clearAuth = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    setAuth({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };
  
  return (
    <AuthContext.Provider value={{ auth, login, logout, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### AuthService - API Calls

**File:** `frontend/src/features/auth/services/authService.ts`

```typescript
class AuthService {
  // Login
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }
  
  // Refresh token
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    return this.request<RefreshTokenResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }
  
  // Logout
  async logout(accessToken: string): Promise<void> {
    return this.request<void>('/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
  }
  
  // Get profile
  async getProfile(accessToken: string): Promise<User> {
    return this.request<User>('/auth/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
  }
  
  // Token helpers
  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }
  
  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }
  
  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }
  
  clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
}
```

### Protected Route Component

```typescript
const ProtectedRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { auth } = useAuth();
  const location = useLocation();
  
  if (auth.isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
};

// Usage
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

---

## 🔐 Backend Implementation

### Auth Module Setup

**File:** `backend/src/auth/auth.module.ts`

```typescript
@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // Dynamic config in service
    UsersModule,
    RolesModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    GoogleStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
```

### Environment Variables

**File:** `.env`

```bash
# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_here
JWT_EXPIRES_IN=30m
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_characters_here
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://doanhoi.hcmut.edu.vn/api/auth/google/callback

# Frontend URL
FRONTEND_URL=https://doanhoi.hcmut.edu.vn
```

### Auth Controller Endpoints

**File:** `backend/src/auth/auth.controller.ts`

```typescript
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  
  // POST /auth/login
  @Post('login')
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Request() req, @Body() loginDto: LoginDto) {
    return this.authService.login(req.user);
  }
  
  // POST /auth/refresh
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }
  
  // POST /auth/logout
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  async logout(@Request() req) {
    await this.authService.logout(req.user.id);
    return { message: 'Logout successful' };
  }
  
  // GET /auth/profile
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req) {
    return req.user;
  }
  
  // GET /auth/me/permissions
  @Get('me/permissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user permissions' })
  async getUserPermissions(
    @Request() req,
    @Query('organizationId') organizationId?: string
  ) {
    return this.authService.getUserPermissions(req.user.id, organizationId);
  }
  
  // Google OAuth routes
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {}
  
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Request() req, @Res() res: Response) {
    const { accessToken, refreshToken } = req.user;
    const frontendUrl = process.env.FRONTEND_URL;
    res.redirect(
      `${frontendUrl}/auth/callback?token=${accessToken}&refresh_token=${refreshToken}`
    );
  }
}
```

---

## 🛡️ Security Best Practices

### 1. Strong Secret Keys

```bash
# ❌ Weak
JWT_SECRET=secret123

# ✅ Strong (min 32 characters)
JWT_SECRET=8f9e7d6c5b4a3210fedcba9876543210abcdef1234567890

# Generate secure key:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. HTTPS Only in Production

```typescript
// Set secure cookie flags
app.use(session({
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only
    httpOnly: true,  // Prevent XSS
    sameSite: 'strict', // CSRF protection
  }
}));
```

### 3. Token Expiration Times

```typescript
// ✅ Recommended
ACCESS_TOKEN: 30 minutes  // Short-lived
REFRESH_TOKEN: 7 days     // Long-lived but revokable

// ❌ Avoid
ACCESS_TOKEN: 7 days      // Too long, can't revoke
REFRESH_TOKEN: 1 year     // Unnecessary long
```

### 4. Validate Refresh Token in Database

```typescript
// ✅ Always check DB
if (user.refreshToken !== providedRefreshToken) {
  throw new UnauthorizedException('Token mismatch');
}

// ❌ Don't just verify JWT signature
// Hacker can reuse old token even after logout
```

### 5. Clear Refresh Token on Logout

```typescript
// ✅ Invalidate token
async logout(userId: string) {
  await this.usersService.updateRefreshToken(userId, null);
}

// ❌ Don't just clear client-side
// Token still valid on server
```

### 6. Rate Limiting on Auth Endpoints

```typescript
// Prevent brute force attacks
@Throttle(5, 60) // 5 requests per 60 seconds
@Post('login')
async login(@Body() dto: LoginDto) {
  // ...
}

@Throttle(10, 60) // 10 refreshes per minute
@Post('refresh')
async refreshToken(@Body() dto: RefreshTokenDto) {
  // ...
}
```

### 7. Password Hashing

```typescript
import * as bcrypt from 'bcryptjs';

// Hash password before saving
const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash(password, salt);

// Validate password
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

### 8. Protect Sensitive User Data

```typescript
// ❌ Don't return password/refreshToken
return user;

// ✅ Exclude sensitive fields
const { password, refreshToken, ...safeUser } = user;
return safeUser;
```

---

## 🚨 Error Handling

### Common JWT Errors

```typescript
┌──────────────────────────────────────────────────────────────┐
│ JWT Error Types                                              │
├──────────────────────────────────────────────────────────────┤
│ 1. TokenExpiredError                                         │
│    - Message: "jwt expired"                                  │
│    - Action: Trigger refresh token flow                      │
│                                                              │
│ 2. JsonWebTokenError                                         │
│    - Message: "invalid signature"                            │
│    - Action: Logout user, clear tokens                       │
│                                                              │
│ 3. NotBeforeError                                            │
│    - Message: "jwt not active"                               │
│    - Action: Reject with 401                                 │
│                                                              │
│ 4. UnauthorizedException                                     │
│    - Message: "User not found or inactive"                   │
│    - Action: Redirect to login                               │
└──────────────────────────────────────────────────────────────┘
```

### Backend Error Handling

```typescript
// JwtStrategy
async validate(payload: JwtPayload) {
  try {
    const user = await this.usersService.findOne(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }
    
    return user;
  } catch (error) {
    throw new UnauthorizedException('Invalid token');
  }
}

// AuthService.refreshToken()
async refreshToken(refreshToken: string) {
  try {
    const payload = this.jwtService.verify(refreshToken, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
    });
    
    // ... validation
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedException('Refresh token expired');
    }
    
    if (error.name === 'JsonWebTokenError') {
      throw new UnauthorizedException('Invalid refresh token');
    }
    
    throw new UnauthorizedException('Token refresh failed');
  }
}
```

### Frontend Error Handling

```typescript
// ApiClient
async request<T>(endpoint: string, options: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, options);
    
    if (response.status === 401) {
      // Token expired or invalid
      if (this.isRefreshing) {
        // Queue request
        return this.queueRequest();
      }
      
      // Try refresh
      try {
        await this.refreshAccessToken();
        return this.retryRequest();
      } catch (refreshError) {
        // Refresh failed → logout
        this.handleAuthFailure();
        throw refreshError;
      }
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    return response.json();
    
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

private handleAuthFailure() {
  authService.clearTokens();
  window.location.href = '/login';
  // Show toast notification
  toast.error('Session expired. Please login again.');
}
```

---

## 📊 Token Lifecycle Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   JWT TOKEN LIFECYCLE                            │
└─────────────────────────────────────────────────────────────────┘

Day 0 (Login):
├─ Access Token created (expires Day 0 + 30min)
├─ Refresh Token created (expires Day 7)
└─ Both saved: Access (localStorage), Refresh (localStorage + DB)

Day 0 + 30min (Access Token Expired):
├─ API call fails with 401
├─ Frontend auto-calls /auth/refresh
├─ Backend validates refresh token (DB check)
├─ New access token issued (expires Day 0 + 60min)
└─ Original API call retried with new token

Day 0 + 60min (Access Token Expired Again):
├─ Same refresh flow...
└─ New access token issued

Day 7 (Refresh Token Expired):
├─ Access token expires
├─ Frontend tries to refresh
├─ Backend rejects: "Refresh token expired"
├─ User logged out automatically
└─ Redirect to /login

User Logout (Anytime):
├─ Frontend calls /auth/logout
├─ Backend sets user.refreshToken = null
├─ Frontend clears localStorage
└─ Old tokens now invalid (can't refresh)
```

---

## 🔍 Debugging Tips

### Backend Logs

```typescript
// Add logging to JwtStrategy
async validate(payload: JwtPayload) {
  console.log('============================================');
  console.log('🔍 JWT Strategy validate called');
  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.log('User ID:', payload.sub);
  console.log('Email:', payload.email);
  
  const user = await this.usersService.findOne(payload.sub);
  console.log('User found:', !!user);
  console.log('User active:', user?.isActive);
  console.log('============================================');
  
  return user;
}
```

### Check Token Expiration

```typescript
// Decode JWT without verifying
import * as jwt from 'jsonwebtoken';

const decoded = jwt.decode(token);
console.log('Token payload:', decoded);
console.log('Issued at:', new Date(decoded.iat * 1000));
console.log('Expires at:', new Date(decoded.exp * 1000));
console.log('Is expired:', Date.now() > decoded.exp * 1000);
```

### Verify Token Manually

```bash
# Using jwt.io
# Paste token vào https://jwt.io/
# Check signature với JWT_SECRET
```

### Database Query

```sql
-- Check user's refresh token
SELECT 
  id, 
  email, 
  refreshToken IS NOT NULL as has_refresh_token,
  lastLogin,
  isActive
FROM users
WHERE email = 'admin@doanhoi.com';

-- Find users with active sessions
SELECT 
  email, 
  lastLogin
FROM users
WHERE refreshToken IS NOT NULL
  AND isActive = true
ORDER BY lastLogin DESC;
```

---

## 📝 Summary

### Key Takeaways

1. **Dual Token System**: Access token (30m) + Refresh token (7d)
2. **Stateless Access Token**: Không cần query DB mỗi request
3. **Stateful Refresh Token**: Lưu DB để có thể revoke
4. **Auto Refresh**: Frontend tự động làm mới token khi hết hạn
5. **Secure Storage**: Tokens trong localStorage + DB
6. **Logout Revocation**: Clear refresh token trong DB

### Security Checklist

```
✅ Strong secret keys (min 32 characters)
✅ HTTPS in production
✅ Short-lived access tokens (15-30 minutes)
✅ Refresh token validation in database
✅ Clear refresh token on logout
✅ Rate limiting on auth endpoints
✅ Password hashing with bcrypt
✅ Exclude sensitive data from responses
✅ Handle token expiration gracefully
✅ Auto refresh mechanism
```

### Common Pitfalls to Avoid

```
❌ Storing tokens in cookies without httpOnly flag
❌ Long-lived access tokens (can't revoke)
❌ Not checking refresh token in database
❌ Exposing password/refreshToken in API responses
❌ Missing error handling for token expiration
❌ No rate limiting on login endpoint
❌ Using weak JWT secrets
❌ Not clearing tokens on logout
```

---

## 📞 API Reference

### Auth Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | ❌ | Login with email/password |
| POST | `/auth/refresh` | ❌ | Refresh access token |
| POST | `/auth/logout` | ✅ | Logout and invalidate token |
| GET | `/auth/profile` | ✅ | Get current user profile |
| GET | `/auth/me/permissions` | ✅ | Get user permissions |
| GET | `/auth/google` | ❌ | Initiate Google OAuth |
| GET | `/auth/google/callback` | ❌ | Google OAuth callback |

### Request/Response Examples

**Login:**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@doanhoi.com",
  "password": "admin123"
}

Response 200:
{
  "user": {
    "id": "uuid-123",
    "email": "admin@doanhoi.com",
    "fullName": "Nguyễn Văn A",
    "isActive": true
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Refresh:**
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response 200:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Logout:**
```http
POST /auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Response 200:
{
  "message": "Logout successful"
}
```

---

## 📚 Related Files

### Backend:
- `backend/src/auth/auth.service.ts` - Core authentication logic
- `backend/src/auth/auth.controller.ts` - Auth endpoints
- `backend/src/auth/strategies/jwt.strategy.ts` - JWT validation
- `backend/src/auth/guards/jwt-auth.guard.ts` - Route protection
- `backend/src/entities/user.entity.ts` - User model with refreshToken

### Frontend:
- `frontend/src/features/auth/context/AuthContext.tsx` - Auth state management
- `frontend/src/features/auth/services/authService.ts` - Auth API calls
- `frontend/src/shared/services/apiClient.ts` - Auto refresh logic
- `frontend/src/shared/hooks/useAuth.tsx` - Auth hook

---

*Tài liệu này được tạo ngày 28/10/2025 - Phiên bản 1.0*
