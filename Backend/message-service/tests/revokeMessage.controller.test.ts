import { Request, Response } from "express";
import { revokeMessage } from "../src/controllers/message.controller";
import messageDataService from "../src/services/message.service";
import rabbitMQProducer from "../src/services/RabbitMQProducerService";

// Mocking dependencies
jest.mock("../src/services/message.service", () => ({
  __esModule: true,
  default: {
    getMessageById: jest.fn(),
    revokeMessage: jest.fn(),
  },
}));

jest.mock("../src/services/RabbitMQProducerService", () => ({
  __esModule: true,
  default: {
    publishMessageRevokedEvent: jest.fn(),
  },
}));

jest.mock("../src/services/s3Service", () => ({
  uploadFileToS3: jest.fn(),
}));

jest.mock("heic-convert", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("MessageController - revokeMessage", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = {
      params: {},
      headers: {},
      body: {},
    };
    res = {
      status: statusMock,
      json: jsonMock,
    };
    next = jest.fn();
    global.fetch = jest.fn();
    jest.clearAllMocks();
  });

  // TC01 - Thu hồi thành công < 24h
  it("TC01 - Thu hồi thành công < 24h", async () => {
    req.params = { messageId: "507f1f77bcf86cd799439011" };
    req.headers = { "x-user-id": "id-user" };

    const mockMessage = {
      _id: "507f1f77bcf86cd799439011",
      senderId: "id-user",
      createdAt: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
      conversationId: "convo-123",
    };

    (messageDataService.getMessageById as jest.Mock).mockResolvedValue(mockMessage);
    (messageDataService.revokeMessage as jest.Mock).mockResolvedValue(mockMessage);

    await revokeMessage(req as Request, res as Response, next);

    expect(statusMock).not.toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      status: "success",
      messageId: "507f1f77bcf86cd799439011",
    });
  });

  // TC02 - Tin nhắn không tồn tại (404)
  it("TC02 - Tin nhắn không tồn tại (404)", async () => {
    req.params = { messageId: "507f1f77bcf86cd799439022" }; // Sử dụng ID hợp lệ định dạng nhưng không tồn tại
    req.headers = { "x-user-id": "id-user" };

    (messageDataService.getMessageById as jest.Mock).mockResolvedValue(null);

    await revokeMessage(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Message not found" });
  });

  // TC03 - Thiếu messageId (400)
  it("TC03 - Thiếu messageId (400)", async () => {
    req.params = { messageId: undefined };
    req.headers = { "x-user-id": "id-user" };

    await revokeMessage(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Invalid or missing messageId" });
  });

  // TC04 - Chưa đăng nhập (401)
  it("TC04 - Chưa đăng nhập (401)", async () => {
    req.params = { messageId: "507f1f77bcf86cd799439011" };
    req.headers = {}; // thiếu userId

    await revokeMessage(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Unauthorized - no user id" });
  });

  // TC05 - Không phải chủ tin nhắn (403)
  it("TC05 - Không phải chủ tin nhắn (403)", async () => {
    req.params = { messageId: "507f1f77bcf86cd799439011" };
    req.headers = { "x-user-id": "id-user" };

    const mockMessage = {
      _id: "507f1f77bcf86cd799439011",
      senderId: "id-orther",
      createdAt: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
      conversationId: "convo-123",
    };

    (messageDataService.getMessageById as jest.Mock).mockResolvedValue(mockMessage);

    await revokeMessage(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Forbidden - you are not the message owner" });
  });

  // TC06 - Quá thời hạn >24h
  it("TC06 - Quá thời hạn >24h", async () => {
    req.params = { messageId: "507f1f77bcf86cd799439011" };
    req.headers = { "x-user-id": "id-user" };

    const mockMessage = {
      _id: "507f1f77bcf86cd799439011",
      senderId: "id-user",
      createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
      conversationId: "convo-123",
    };

    (messageDataService.getMessageById as jest.Mock).mockResolvedValue(mockMessage);

    await revokeMessage(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      error: "Chỉ có thể thu hồi tin nhắn trong vòng 24 giờ kể từ khi gửi",
    });
  });

  // TC07 - Thu hồi thành công mốc 24 giờ (200)
  it("TC07 - Thu hồi thành công mốc 24 giờ (200)", async () => {
    req.params = { messageId: "507f1f77bcf86cd799439011" };
    req.headers = { "x-user-id": "id-user" };

    const mockMessage = {
      _id: "507f1f77bcf86cd799439011",
      senderId: "id-user",
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 5000).toISOString(),
      conversationId: "convo-123",
    };

    (messageDataService.getMessageById as jest.Mock).mockResolvedValue(mockMessage);
    (messageDataService.revokeMessage as jest.Mock).mockResolvedValue(mockMessage);

    await revokeMessage(req as Request, res as Response, next);

    expect(jsonMock).toHaveBeenCalledWith({
      status: "success",
      messageId: "507f1f77bcf86cd799439011",
    });
  });

  // TC08 - Thu hồi thành công 23:59:59
  it("TC08 - Thu hồi thành công 23:59:59", async () => {
    req.params = { messageId: "507f1f77bcf86cd799439011" };
    req.headers = { "x-user-id": "id-user" };

    // 23h 59m 01s trước (86341000 ms)
    const mockMessage = {
      _id: "507f1f77bcf86cd799439011",
      senderId: "id-user",
      createdAt: new Date(Date.now() - 86341000).toISOString(),
      conversationId: "convo-123",
    };

    (messageDataService.getMessageById as jest.Mock).mockResolvedValue(mockMessage);
    (messageDataService.revokeMessage as jest.Mock).mockResolvedValue(mockMessage);

    await revokeMessage(req as Request, res as Response, next);

    expect(jsonMock).toHaveBeenCalledWith({
      status: "success",
      messageId: "507f1f77bcf86cd799439011",
    });
  });

  // TC09 - Quá thời hạn 24:00:01
  it("TC09 - Quá thời hạn 24:00:01", async () => {
    req.params = { messageId: "507f1f77bcf86cd799439011" };
    req.headers = { "x-user-id": "id-user" };

    // 24h 00m 01s trước (86401000 ms)
    const mockMessage = {
      _id: "507f1f77bcf86cd799439011",
      senderId: "id-user",
      createdAt: new Date(Date.now() - 86401000).toISOString(),
      conversationId: "convo-123",
    };

    (messageDataService.getMessageById as jest.Mock).mockResolvedValue(mockMessage);

    await revokeMessage(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      error: "Chỉ có thể thu hồi tin nhắn trong vòng 24 giờ kể từ khi gửi",
    });
  });
});
