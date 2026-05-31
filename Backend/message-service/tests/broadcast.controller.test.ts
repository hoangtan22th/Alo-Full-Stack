import { Request, Response } from "express";
import { createBroadcast } from "../src/controllers/broadcast.controller";
import { BroadcastCampaign } from "../src/models/BroadcastCampaign";
import { processPersistentBroadcast } from "../src/workers/broadcastWorker";

jest.mock("../src/models/BroadcastCampaign", () => ({
  BroadcastCampaign: {
    create: jest.fn(),
  },
}));

jest.mock("../src/workers/broadcastWorker", () => ({
  processPersistentBroadcast: jest.fn(),
}));

describe("BroadcastController - createBroadcast", () => {
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

  // TC01: VP - Tạo chiến dịch Broadcast hợp lệ
  it("TC01 - should return 200 OK when broadcast is valid", async () => {
    req.body = { title: "Thông báo bảo trì", content: "Hệ thống sẽ bảo trì lúc 0h", botType: "SYSTEM" };

    const mockCampaign = { _id: "mockId", status: "PROCESSING" };
    (BroadcastCampaign.create as jest.Mock).mockResolvedValue(mockCampaign);
    (processPersistentBroadcast as jest.Mock).mockResolvedValue(true);

    await createBroadcast(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: "Broadcast is being processed in the background."
    }));
  });

  // TC02 & TC06: VP/IP - Tạo chiến dịch với botType mặc định (fallback về SYSTEM)
  it("TC02 - should return 200 OK and fallback to SYSTEM when botType is unknown", async () => {
    req.body = { title: "Cập nhật tính năng", content: "Có giao diện mới", botType: "HACKER_BOT" };

    const mockCampaign = { _id: "mockId", status: "PROCESSING" };
    (BroadcastCampaign.create as jest.Mock).mockResolvedValue(mockCampaign);
    (processPersistentBroadcast as jest.Mock).mockResolvedValue(true);

    await createBroadcast(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(BroadcastCampaign.create).toHaveBeenCalledWith(expect.objectContaining({
      senderId: "00000000-0000-0000-0000-000000000000" // SYSTEM_BOTS.SYSTEM
    }));
  });

  // TC03: VP - Tạo chiến dịch có URL và Emoji
  it("TC03 - should return 200 OK when content has URL and Emoji", async () => {
    req.body = { title: "Sự kiện mới 🎁", content: "Nhấn vào link: https://alo.com", botType: "EVENT" };

    const mockCampaign = { _id: "mockId", status: "PROCESSING" };
    (BroadcastCampaign.create as jest.Mock).mockResolvedValue(mockCampaign);
    (processPersistentBroadcast as jest.Mock).mockResolvedValue(true);

    await createBroadcast(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(200);
  });

  // TC04: IP - Thiếu Title (Bỏ trống)
  it("TC04 - should return 400 Bad Request when title is missing", async () => {
    req.body = { content: "Nội dung tin nhắn", botType: "SYSTEM" };

    await createBroadcast(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ success: false, message: "Tiêu đề không được rỗng" });
  });

  // TC05: IP - Thiếu Content (Bỏ trống)
  it("TC05 - should return 400 Bad Request when content is missing", async () => {
    req.body = { title: "Tiêu đề", botType: "SYSTEM" };

    await createBroadcast(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ success: false, message: "Nội dung không được rỗng" });
  });

  // TC07: IP - DB Crash khi tạo Campaign
  it("TC07 - should return 500 Internal Server Error when DB crashes", async () => {
    req.body = { title: "Tiêu đề", content: "Nội dung tin nhắn", botType: "SYSTEM" };

    (BroadcastCampaign.create as jest.Mock).mockRejectedValue(new Error("MongoDB bị sập"));

    await createBroadcast(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({ success: false, message: "Internal server error" });
  });

  // TC08: VB - Title min bound (1 char)
  it("TC08 - should return 200 OK when title is exactly 1 char", async () => {
    req.body = { title: "A", content: "Nội dung tin nhắn", botType: "SYSTEM" };

    const mockCampaign = { _id: "mockId" };
    (BroadcastCampaign.create as jest.Mock).mockResolvedValue(mockCampaign);
    (processPersistentBroadcast as jest.Mock).mockResolvedValue(true);

    await createBroadcast(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(200);
  });

  // TC09: VB - Content max bound (2000 chars)
  it("TC09 - should return 200 OK when content is exactly 2000 chars", async () => {
    const longContent = "a".repeat(2000);
    req.body = { title: "Tiêu đề", content: longContent, botType: "SYSTEM" };

    const mockCampaign = { _id: "mockId" };
    (BroadcastCampaign.create as jest.Mock).mockResolvedValue(mockCampaign);
    (processPersistentBroadcast as jest.Mock).mockResolvedValue(true);

    await createBroadcast(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(200);
  });

  // TC10: IB - Title rỗng (0 char)
  it("TC10 - should return 400 Bad Request when title is empty string", async () => {
    req.body = { title: "", content: "Nội dung tin nhắn", botType: "SYSTEM" };

    await createBroadcast(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ success: false, message: "Tiêu đề không được rỗng" });
  });

  // TC11: IB - Content rỗng (0 char)
  it("TC11 - should return 400 Bad Request when content is empty string", async () => {
    req.body = { title: "Tiêu đề", content: "", botType: "SYSTEM" };

    await createBroadcast(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ success: false, message: "Nội dung không được rỗng" });
  });

  // TC12: IB - Title over bound (201 chars)
  it("TC12 - should return 400 Bad Request when title exceeds 200 chars", async () => {
    const longTitle = "A".repeat(201);
    req.body = { title: longTitle, content: "Nội dung tin nhắn", botType: "SYSTEM" };

    await createBroadcast(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ success: false, message: "Vượt quá độ dài tiêu đề" });
  });

  // TC13: IB - Content over bound (2001 chars)
  it("TC13 - should return 400 Bad Request when content exceeds 2000 chars", async () => {
    const longContent = "A".repeat(2001);
    req.body = { title: "Tiêu đề", content: longContent, botType: "SYSTEM" };

    await createBroadcast(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ success: false, message: "Vượt quá độ dài nội dung" });
  });
});
