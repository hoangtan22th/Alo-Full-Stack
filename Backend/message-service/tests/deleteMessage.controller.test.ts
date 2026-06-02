import { Request, Response } from "express";
import { deleteMessageForMe } from "../src/controllers/message.controller";
import messageDataService from "../src/services/message.service";

// Mocking dependencies
jest.mock("../src/services/message.service", () => ({
  __esModule: true,
  default: {
    deleteMessageForMe: jest.fn(),
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

describe("MessageController - deleteMessageForMe", () => {
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

  // TC01 - Xóa phía tôi thành công (200)
  it("TC01 - Xóa phía tôi thành công (200)", async () => {
    req.params = { messageId: "507f1f77bcf86cd799439011" };
    req.headers = { "x-user-id": "id-user" };

    (messageDataService.deleteMessageForMe as jest.Mock).mockResolvedValue(undefined);

    await deleteMessageForMe(req as Request, res as Response, next);

    expect(messageDataService.deleteMessageForMe).toHaveBeenCalledWith("507f1f77bcf86cd799439011", "id-user");
    expect(jsonMock).toHaveBeenCalledWith({
      status: "success",
      messageId: "507f1f77bcf86cd799439011",
    });
  });

  // TC02 - Sai định dạng messageId (400)
  it("TC02 - Sai định dạng messageId (400)", async () => {
    req.params = { messageId: "dfdfgdfg" };
    req.headers = { "x-user-id": "id-user" };

    await deleteMessageForMe(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Invalid or missing messageId" });
  });

  // TC03 - Thiếu messageId (400)
  it("TC03 - Thiếu messageId (400)", async () => {
    req.params = { messageId: undefined };
    req.headers = { "x-user-id": "id-user" };

    await deleteMessageForMe(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Invalid or missing messageId" });
  });

  // TC04 - Chưa đăng nhập (401)
  it("TC04 - Chưa đăng nhập (401)", async () => {
    req.params = { messageId: "507f1f77bcf86cd799439011" };
    req.headers = {}; // thiếu userId

    await deleteMessageForMe(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Unauthorized" });
  });
});
