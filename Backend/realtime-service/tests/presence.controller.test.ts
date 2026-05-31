import { Request, Response } from "express";
import { getBulkPresence } from "../src/controllers/presence.controller";
import { presenceClient } from "../src/config/redis";

jest.mock("../src/config/redis", () => ({
  presenceClient: {
    hGet: jest.fn(),
  },
}));

describe("PresenceController - getBulkPresence", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = {
      body: {},
    };
    res = {
      status: statusMock,
    };
    jest.clearAllMocks();
  });

  // TC01: VP - Lấy trạng thái hợp lệ (Có online/offline)
  it("TC01 - should return 200 OK with correct online/offline statuses", async () => {
    req.body = { userIds: ["id-online", "id-offline"] };

    (presenceClient.hGet as jest.Mock).mockImplementation(async (key, id) => {
      if (id === "id-online") return JSON.stringify({ status: "online", last_active: 1700000000 });
      return null;
    });

    await getBulkPresence(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      status: 200,
      data: {
        "id-online": { isOnline: true, lastActiveAt: 1700000000 },
        "id-offline": { isOnline: false, lastActiveAt: 0 },
      },
    });
  });

  // TC02: VP - Lấy trạng thái hợp lệ (Tất cả online)
  it("TC02 - should return 200 OK with all users online", async () => {
    req.body = { userIds: ["id-1", "id-2"] };

    (presenceClient.hGet as jest.Mock).mockResolvedValue(JSON.stringify({ status: "online", last_active: 1700000001 }));

    await getBulkPresence(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      status: 200,
      data: {
        "id-1": { isOnline: true, lastActiveAt: 1700000001 },
        "id-2": { isOnline: true, lastActiveAt: 1700000001 },
      },
    });
  });

  // TC03: IP - Không truyền userIds (Null/Undefined)
  it("TC03 - should return 400 Bad Request when userIds is missing", async () => {
    req.body = {};

    await getBulkPresence(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "userIds must be an array",
    });
  });

  // TC04: IP - Truyền userIds sai kiểu (String)
  it("TC04 - should return 400 Bad Request when userIds is a string", async () => {
    req.body = { userIds: "id-1,id-2" };

    await getBulkPresence(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "userIds must be an array",
    });
  });

  // TC05: IP - Truyền userIds sai kiểu (Object)
  it("TC05 - should return 400 Bad Request when userIds is an object", async () => {
    req.body = { userIds: { id: "1" } };

    await getBulkPresence(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "userIds must be an array",
    });
  });

  // TC06: IP - Dữ liệu Redis bị hỏng (JSON.parse error)
  it("TC06 - should return 500 Internal Server Error when Redis data is corrupted", async () => {
    req.body = { userIds: ["id-corrupt"] };

    (presenceClient.hGet as jest.Mock).mockResolvedValue("not-json");

    await getBulkPresence(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "Internal server error",
    });
  });

  // TC07: IP - Redis sập (Redis Crash)
  it("TC07 - should return 500 Internal Server Error when Redis throws", async () => {
    req.body = { userIds: ["id-1"] };

    (presenceClient.hGet as jest.Mock).mockRejectedValue(new Error("Redis connection error"));

    await getBulkPresence(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "Internal server error",
    });
  });

  // TC08: VB - Mảng userIds rỗng
  it("TC08 - should return 200 OK with empty data when userIds is an empty array", async () => {
    req.body = { userIds: [] };

    await getBulkPresence(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      status: 200,
      data: {},
    });
  });

  // TC09: IB - Mảng userIds cực lớn
  it("TC09 - should return 200 OK and handle a very large array of userIds", async () => {
    const largeArray = Array.from({ length: 1000 }, (_, i) => `id-${i}`);
    req.body = { userIds: largeArray };

    (presenceClient.hGet as jest.Mock).mockResolvedValue(null);

    await getBulkPresence(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(200);
    // Just verifying that it returns successfully without timeout or crash
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      status: 200,
    }));
  });
});
