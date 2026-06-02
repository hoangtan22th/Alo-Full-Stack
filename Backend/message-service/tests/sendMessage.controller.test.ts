import { Request, Response } from "express";
import { sendMessage } from "../src/controllers/message.controller";
import messageDataService from "../src/services/message.service";
import rabbitMQProducer from "../src/services/RabbitMQProducerService";

// Mocking dependencies
jest.mock("../src/services/message.service", () => ({
  __esModule: true,
  default: {
    createMessage: jest.fn(),
    getMessageById: jest.fn(),
  },
}));

jest.mock("../src/services/RabbitMQProducerService", () => ({
  __esModule: true,
  default: {
    publishMessageEvent: jest.fn(),
  },
}));

jest.mock("../src/services/s3Service", () => ({
  uploadFileToS3: jest.fn(),
}));

jest.mock("heic-convert", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("MessageController - sendMessage", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = {
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

  // TC01: Gửi tin nhắn có replyTo hợp lệ
  it("TC01 - Gửi tin nhắn có reply (201)", async () => {
    req.headers = { "x-user-id": "id-user" };
    req.body = {
      conversationId: "id-convo",
      content: "Hello",
      type: "text",
      metadata: {},
      replyTo: "id-message",
      senderName: "Nguyen",
      targetUserId: null,
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          _id: "id-convo",
          isGroup: true,
          permissions: { sendMessage: "EVERYONE" },
          members: [{ userId: "id-user", role: "MEMBER" }],
        },
      }),
    });

    (messageDataService.getMessageById as jest.Mock).mockResolvedValue({
      _id: "id-message",
      content: "Tin nhắn cũ",
    });

    const mockCreatedMessage = {
      _id: "msg-111",
      conversationId: "id-convo",
      senderId: "id-user",
      type: "text",
      content: "Hello",
      metadata: {},
      replyTo: "id-message",
      senderName: "Nguyen",
      createdAt: new Date().toISOString(),
    };
    (messageDataService.createMessage as jest.Mock).mockResolvedValue(mockCreatedMessage);

    await sendMessage(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      status: "success",
    }));
  });

  // TC02: Gửi tin nhắn text thường hợp lệ (không replyTo)
  it("TC02 - Gửi tin nhắn thường (201)", async () => {
    req.headers = { "x-user-id": "id-user" };
    req.body = {
      conversationId: "id-convo",
      content: "Hello",
      type: "text",
      metadata: {},
      replyTo: null,
      senderName: "Nguyen",
      targetUserId: null,
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          _id: "id-convo",
          isGroup: false,
        },
      }),
    });

    const mockCreatedMessage = {
      _id: "msg-222",
      conversationId: "id-convo",
      senderId: "id-user",
      type: "text",
      content: "Hello",
      metadata: {},
      senderName: "Nguyen",
      createdAt: new Date().toISOString(),
    };
    (messageDataService.createMessage as jest.Mock).mockResolvedValue(mockCreatedMessage);

    await sendMessage(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      status: "success",
    }));
  });

  // TC03: Chưa đăng nhập (thiếu userId)
  it("TC03 - Chưa đăng nhập (401)", async () => {
    req.headers = {};
    req.body = {
      conversationId: "id-convo",
      content: "Hello",
      type: "text",
      metadata: {},
      replyTo: null,
      senderName: "Nguyen",
      targetUserId: null,
    };

    await sendMessage(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Unauthorized - no user id" });
  });

  // TC04: Không tìm thấy phòng chat
  it("TC04 - Không tìm thấy hội thoại (404)", async () => {
    req.headers = { "x-user-id": "id-user" };
    req.body = {
      conversationId: "dsfsdfsdf",
      content: "Hello",
      type: "text",
      metadata: {},
      replyTo: null,
      senderName: "Nguyen",
      targetUserId: null,
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await sendMessage(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Conversation not found" });
  });

  // TC05: Thiếu nội dung tin nhắn text
  it("TC05 - Thiếu nội dung tin nhắn chữ (400)", async () => {
    req.headers = { "x-user-id": "id-user" };
    req.body = {
      conversationId: "id-convo",
      content: null,
      type: "text",
      metadata: {},
      replyTo: null,
      senderName: "Nguyen",
      targetUserId: null,
    };

    await sendMessage(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Missing conversationId/targetUserId or content" });
  });

  // TC06: Loại tin nhắn không hợp lệ (hàm không xử lý type image)
  it("TC06 - Loại tin nhắn không hợp lệ (400)", async () => {
    req.headers = { "x-user-id": "id-user" };
    req.body = {
      conversationId: "id-convo",
      content: "Hello",
      type: "image",
      metadata: {},
      replyTo: null,
      senderName: "Nguyen",
      targetUserId: null,
    };

    await sendMessage(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Invalid message type" });
  });

  // TC07: Định dạng metadata không hợp lệ
  it("TC07 - Sai định dạng metadata (400)", async () => {
    req.headers = { "x-user-id": "id-user" };
    req.body = {
      conversationId: "id-convo",
      content: "Hello",
      type: "text",
      metadata: "dsdfsdf",
      replyTo: null,
      senderName: "Nguyen",
      targetUserId: null,
    };

    await sendMessage(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Bad request" });
  });

  // TC08: Không tìm thấy tin nhắn được reply
  it("TC08 - Không thấy tin nhắn gốc để reply (404)", async () => {
    req.headers = { "x-user-id": "id-user" };
    req.body = {
      conversationId: "id-convo",
      content: "Hello",
      type: "text",
      metadata: {},
      replyTo: "dsdfsdf",
      senderName: "Nguyen",
      targetUserId: null,
    };

    (messageDataService.getMessageById as jest.Mock).mockResolvedValue(null);

    await sendMessage(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Reply message not found" });
  });

  // TC09: Thiếu tên người gửi
  it("TC09 - Thiếu tên người gửi (400)", async () => {
    req.headers = { "x-user-id": "id-user" };
    req.body = {
      conversationId: "id-convo",
      content: "Hello",
      type: "text",
      metadata: {},
      replyTo: null,
      senderName: "",
      targetUserId: null,
    };

    await sendMessage(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Sender name is required" });
  });

  // TC10: targetUserId không hợp lệ khi tạo hội thoại
  it("TC10 - Sai targetUserId (400)", async () => {
    req.headers = { "x-user-id": "id-user" };
    req.body = {
      conversationId: null,
      content: "Hello",
      type: "text",
      metadata: {},
      replyTo: null,
      senderName: "Nguyen",
      targetUserId: "dsdfsdf",
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
    });

    await sendMessage(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Missing conversationId/targetUserId or content" });
  });

  // TC11: Thiếu cả conversationId và targetUserId
  it("TC11 - Thiếu conversationId và targetUserId (400)", async () => {
    req.headers = { "x-user-id": "id-user" };
    req.body = {
      conversationId: null,
      content: "Hello",
      type: "text",
      metadata: {},
      replyTo: null,
      senderName: "Nguyen",
      targetUserId: null,
    };

    await sendMessage(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Missing conversationId/targetUserId or content" });
  });

  // TC12: Bị chặn gửi tin nhắn (MEMBER gửi vào nhóm phân quyền ADMIN)
  it("TC12 - Bị chặn chat trong nhóm (403)", async () => {
    req.headers = { "x-user-id": "id-user" };
    req.body = {
      conversationId: "id-convo",
      content: "Hello",
      type: "text",
      metadata: {},
      replyTo: null,
      senderName: "Nguyen",
      targetUserId: null,
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          _id: "id-convo",
          isGroup: true,
          permissions: { sendMessage: "ADMIN" },
          members: [
            { userId: "id-user", role: "MEMBER" },
          ],
        },
      }),
    });

    await sendMessage(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({
      error: "Chỉ trưởng/phó nhóm mới có thể gửi tin nhắn trong nhóm này",
    });
  });
});
