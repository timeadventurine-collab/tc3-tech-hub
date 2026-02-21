# TC3 TECH-HUB 11A1 — Hướng Dẫn Cài Đặt & Chạy Dự Án

## 📁 Cấu Trúc File
```
tc3-techhub/
├── server.js              ← Backend toàn bộ (Node.js + Express + Socket.io)
├── package.json           ← Dependencies
├── serviceAccountKey.json ← Firebase Admin Key (bạn tự tải về)
└── public/
    └── index.html         ← Frontend toàn bộ (HTML/CSS/JS)
```

---

## 🔥 BƯỚC 1 — Chuẩn bị Firebase

1. Vào **Firebase Console** → https://console.firebase.google.com
2. Tạo project mới (hoặc dùng project hiện tại)
3. Bật **Firestore Database** (chọn chế độ Test mode để bắt đầu)
4. Vào **Project Settings** → **Service Accounts** → **Generate new private key**
5. Tải file `.json` về, đổi tên thành `serviceAccountKey.json`
6. Đặt file đó vào cùng thư mục với `server.js`

### Cấu hình Firestore Security Rules (paste vào Firebase Console)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Chỉ dùng cho dev — đổi lại sau
    }
  }
}
```

---

## 📦 BƯỚC 2 — Cài đặt Dependencies

```bash
# Di chuyển vào thư mục dự án
cd tc3-techhub

# Cài các package cần thiết
npm install
```

---

## ▶️ BƯỚC 3 — Chạy Backend

```bash
# Chạy bình thường
npm start

# Hoặc chạy với auto-reload (khuyến nghị khi dev)
npm run dev
```

→ Backend sẽ chạy tại: `http://localhost:4000`

---

## 🌐 BƯỚC 4 — Chạy Frontend

### Option A — Chạy từ backend (khuyến nghị)
Di chuyển `index.html` vào thư mục `public/`:
```
tc3-techhub/
├── server.js
├── package.json
├── serviceAccountKey.json
└── public/
    └── index.html    ← đặt vào đây
```

Sau đó mở trình duyệt: `http://localhost:4000`

### Option B — Mở trực tiếp
Mở file `index.html` trực tiếp trong trình duyệt.
(Chat realtime sẽ không hoạt động nếu backend chưa chạy)

---

## ⚙️ Cấu hình trong index.html

Mở `index.html`, tìm và sửa phần này (dòng ~420):
```javascript
const API_BASE = 'http://localhost:4000'; // URL backend của bạn
const SOCKET_URL = 'http://localhost:4000';
```

Nếu deploy lên server thật, thay `localhost:4000` bằng domain/IP thật.

---

## 🚀 Deploy lên Internet (tùy chọn)

### Backend → Railway / Render / Fly.io
1. Tạo tài khoản tại https://railway.app (miễn phí)
2. Connect GitHub repo
3. Thêm biến môi trường `PORT=4000`
4. Upload `serviceAccountKey.json` dưới dạng secret file

### Frontend → Netlify / Vercel
1. Sửa `API_BASE` và `SOCKET_URL` thành URL của backend đã deploy
2. Deploy thư mục `public/` lên Netlify

---

## 📡 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | /api/posts | Đăng bài mới |
| GET | /api/posts | Lấy danh sách bài (pagination + filter tag) |
| GET | /api/posts/:id | Chi tiết bài + comments |
| POST | /api/posts/:id/comments | Thêm comment |
| POST | /api/posts/:id/comments/:cid/like | Like comment |
| POST | /api/posts/:id/like | Like bài viết |
| GET | /api/timeline | Lấy timeline (20 gần nhất) |
| POST | /api/projects/:id/like | Like dự án |
| POST | /api/projects/:id/rate | Đánh giá sao (1-5) |
| POST | /api/projects/:id/share | Chia sẻ dự án lên cộng đồng |
| GET | /api/leaderboard | Top 5 leaderboard tháng |

## ⚡ Socket.io Events

| Event | Chiều | Mô tả |
|-------|-------|-------|
| chat:send | Client → Server | Gửi tin nhắn |
| chat:message | Server → Client | Nhận tin nhắn (broadcast) |
| chat:history | Server → Client | 50 tin nhắn gần nhất khi kết nối |
| timeline:new | Server → Client | Timeline record mới |
| timeline:batch | Server → Client | Batch 5 record mỗi 10 giây |
| post:new | Server → Client | Có bài viết mới |
| project:liked | Server → Client | Dự án được like |

---

## 🔐 Thêm Firebase Auth (nâng cấp)

Thêm vào `index.html` sau thẻ `<body>`:
```html
<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-auth-compat.js"></script>
<script>
  firebase.initializeApp({ /* config của bạn */ });
  // Khi gọi API, thêm token:
  // const token = await firebase.auth().currentUser.getIdToken();
  // headers: { 'Authorization': 'Bearer ' + token }
</script>
```

---

## 💡 Lưu ý

- Frontend hiện chạy **Demo Mode** khi backend chưa kết nối — dữ liệu giả sẽ hiển thị
- Realtime Chat hoạt động ngay khi backend chạy
- Leaderboard cần tháng đúng format `YYYY-MM` trong Firestore
- Xóa các comment `// Demo` sau khi kết nối backend thật

---

Made with ❤️ by TC3 TECH-HUB — Lớp 11A1
