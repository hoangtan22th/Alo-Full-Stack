# Kế hoạch Triển khai: Voting Service (Chức năng Bình chọn)

Dựa trên yêu cầu của bạn và giao diện mẫu (giống Zalo), tôi đề xuất xây dựng một service hoàn toàn mới là `voting-service` (hoặc `poll-service`). Việc tách riêng sẽ giúp hệ thống chịu tải tốt hơn khi có nhiều lượng vote đồng thời và dễ dàng mở rộng các tính năng phức tạp (như cài đặt ẩn danh, tự động đóng,...).

Dưới đây là bản thiết kế chi tiết để bạn xem xét.

## User Review Required

> [!IMPORTANT]
> - \*\*Công nghệ backend\*\*: Tôi đề xuất sử dụng \*\*Node.js + TypeScript + MongoDB\*\* cho service này. Lý do: Tính chất của dữ liệu bình chọn (nhiều thuộc tính lồng nhau, option động) rất phù hợp với NoSQL (MongoDB), tương tự như cách bạn đang làm với `message-service` và `group-service`. Bạn có đồng ý với Stack này không hay muốn dùng Spring Boot (Java)?
> - \*\*Message Service Integration\*\*: Khi một Poll được tạo, `voting-service` sẽ lưu data, sau đó cần gọi sang `message-service` để phát sinh một tin nhắn dạng system/poll vào trong phòng chat.

## 1. Thiết kế Cơ sở Dữ liệu (MongoDB)

Do số lượng thành viên trong một Group Chat thường được kiểm soát (ví dụ: < 1000 người), ta có thể tối ưu bằng cách nhúng (embed) các lượt vote vào thẳng Document của Poll để tăng tốc độ truy vấn (Read), hoặc dùng cấu trúc Collection rời tùy theo giới hạn hệ thống. Ở đây tôi đề xuất cấu trúc kết hợp tối ưu:

### Collection: `polls`
Lưu trữ thông tin cấu hình và nội dung của cuộc bình chọn.

```typescript
{
  _id: ObjectId,
  conversationId: ObjectId, // ID của Group Chat
  creatorId: String,        // ID người tạo (User ID)
  question: String,         // Chủ đề bình chọn (Max 200 ký tự)
  
  options: [{
    _id: ObjectId,         // ID của lựa chọn
    text: String,          // Nội dung lựa chọn
    addedBy: String,       // ID người thêm lựa chọn này (có thể là creator hoặc user khác nếu cho phép thêm)
    createdAt: Date
  }],

  settings: {
    allowMultipleAnswers: Boolean, // Cho phép chọn nhiều phương án
    allowAddOptions: Boolean,      // Cho phép thành viên khác thêm phương án
    hideResultsUntilVoted: Boolean,// Ẩn kết quả nếu chưa vote
    hideVoters: Boolean,           // Bình chọn ẩn danh (Không hiện mặt người vote)
    pinToTop: Boolean              // Xử lý logic ghim (cần gọi qua group-service)
  },

  expiresAt: Date,         // Thời hạn bình chọn (Null nếu không thời hạn)
  status: String,          // Trạng thái: "OPEN", "CLOSED"
  
  createdAt: Date,
  updatedAt: Date
}
```

### Collection: `poll_votes`
Lưu chi tiết từng lượt vote của người dùng. Việc tách ra giúp dễ dàng đếm số lượng và ngăn chặn race condition khi nhiều người vote cùng 1 mili-giây.

```typescript
{
  _id: ObjectId,
  pollId: ObjectId,         // Ref đến polls
  optionId: ObjectId,       // Ref đến option trong polls
  userId: String,           // Người vote
  createdAt: Date
}
```
*(Lưu ý: Nếu cho phép chọn nhiều phương án, một user có thể có nhiều document trong này, hoặc bạn có thể gom lại thành mảng `optionIds` cho 1 user/1 poll).*

---

## 2. Thiết kế API Endpoints (REST)

Các API này sẽ được định tuyến thông qua **API Gateway**.

### Poll Management
- `POST /api/v1/polls`
  * Tạo cuộc bình chọn mới.
  * *Payload*: `conversationId`, `question`, `options` (arr), `settings` (object), `expiresAt`.
  * *Hành vi*: Lưu Poll vào DB, sau đó *bắn event/gọi API* sang `message-service` để tạo một tin nhắn loại `type: "poll"`.

- `GET /api/v1/polls/conversation/{conversationId}`
  * Lấy danh sách các cuộc bình chọn trong nhóm. Hỗ trợ phân trang.

- `GET /api/v1/polls/{pollId}`
  * Lấy chi tiết cuộc bình chọn (bao gồm các options và cấu hình).

- `PUT /api/v1/polls/{pollId}/close`
  * Đóng cuộc bình chọn (Chỉ creator hoặc nhóm trưởng có quyền).

### Voting & Options
- `POST /api/v1/polls/{pollId}/options`
  * Thêm một lựa chọn mới vào cuộc bình chọn (nếu `allowAddOptions` = true).

- `POST /api/v1/polls/{pollId}/vote`
  * Bỏ phiếu. 
  * *Payload*: `[optionId1, optionId2]`
  * *Hành vi*: Xóa các vote cũ của user trong poll này, tạo record mới.

- `GET /api/v1/polls/{pollId}/results`
  * Trả về kết quả bình chọn thực tế (Gom nhóm theo optionId, đếm số vote, và trả về danh sách user đã vote cho từng option).
  * *Hành vi*: Xử lý logic `hideResultsUntilVoted` và `hideVoters` trước khi trả về.

---

## 3. Quy trình Tích hợp (Tương tác giữa các Service)

1. **Khi Client ấn "Tạo bình chọn"**:
   - Gửi Request tới API `POST /api/v1/polls`.
   - `voting-service` lưu Poll Db.
   - `voting-service` gửi RabbitMQ Message (hoặc REST Call) tới `message-service` để tạo 1 `Message` với `type: "poll"` và `content: "Cuộc bình chọn: {question}"`, `metadata.pollId = <id>`.
   - (Tùy chọn) Gửi RabbitMQ Message sang `group-service` nếu có tick "Ghim lên đầu trò chuyện".
   - `realtime-service` tự động nhận message mới và đẩy qua Socket.io.

2. **Khi Client hiển thị tin nhắn bình chọn (Trong Chat)**:
   - UI thấy message có `type: "poll"`.
   - UI gọi lên `GET /api/v1/polls/{pollId}` và `GET /api/v1/polls/{pollId}/results` để render giao diện poll.

3. **Khi ai đó Vote**:
   - UI gọi API `POST .../vote`.
   - `voting-service` lưu dữ liệu.
   - `voting-service` publish một sự kiện vào RabbitMQ (VD: `poll.voted`).
   - `realtime-service` lắng nghe và bắn Socket event (VD: `POLL_UPDATED`) tới đúng `room_{conversationId}` để tất cả các Client cập nhật lại thanh tiến trình ngay lập tức. Cực kì mượt!

## 4. Open Questions

1. Bạn có muốn thực hiện việc này bằng **Node.js + TypeScript** như mình đề xuất không? Mình sẽ chuẩn bị script `npx` hoặc file cấu trúc dự án phù hợp.
2. Về tính năng **"Thời hạn bình chọn"**, lúc hết hạn chúng ta có cần một Job chạy ngầm (Cronjob/Redis TTL) để tự động khóa Poll và bắn thông báo vào group không? Hay chỉ kiểm tra thụ động lúc user nhấn "Vote"?

Vui lòng xác nhận để mình có thể bắt đầu khởi tạo cấu trúc thư mục và code cho `voting-service`!
