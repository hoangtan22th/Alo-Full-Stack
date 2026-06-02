jest.mock("uuid", () => ({ v4: jest.fn() }));
jest.mock("../src/services/s3Service", () => ({
  uploadImageToS3: jest.fn(),
  deleteImageFromS3: jest.fn()
}));

import { Request, Response } from "express";
import { getUserYearlyStats, createGroup } from "../src/controllers/group.controller";
import UserDailyStat from "../src/models/UserDailyStat";
import Conversation from "../src/models/Conversation";
import rabbitMQProducer from "../src/services/rabbitMQProducer";

jest.mock("../src/models/UserDailyStat", () => ({
  aggregate: jest.fn(),
}));

jest.mock("../src/models/Conversation", () => {
  const MockConversation = function(data: any) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(true);
  };
  MockConversation.create = jest.fn();
  MockConversation.findById = jest.fn();
  MockConversation.find = jest.fn();
  MockConversation.findOne = jest.fn();
  MockConversation.updateOne = jest.fn();
  MockConversation.findOneAndUpdate = jest.fn();
  return MockConversation;
});

jest.mock("../src/services/rabbitMQProducer", () => ({
  publishConversationCreated: jest.fn().mockResolvedValue(true),
  publishAddedToGroup: jest.fn().mockResolvedValue(true),
  publishNewJoinRequest: jest.fn().mockResolvedValue(true),
  publishJoinRequestApproved: jest.fn().mockResolvedValue(true),
  publishJoinRequestRejected: jest.fn().mockResolvedValue(true),
  publishNewInvitation: jest.fn().mockResolvedValue(true),
  publishInvitationAccepted: jest.fn().mockResolvedValue(true),
  publishGroupUpdated: jest.fn().mockResolvedValue(true),
}));

// Mock util since it is used inside the controller when length > 0
jest.mock("../src/utils/stats.util", () => ({
  findMostFrequent: jest.fn((arr: any[]) => arr[0] || null),
}));

describe("GroupController - getUserYearlyStats", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = {
      query: {},
    };
    res = {
      status: statusMock,
    };
    jest.clearAllMocks();
  });

  // TC01: Valid VP (Has data - 365 records merged into 1 by aggregation)
  it("TC01 - should return 200 OK and yearly stats when data exists (Has data)", async () => {
    req.query = { userId: "id-user", year: "2026" };

    const mockStats = [
      {
        totalMessagesSent: 3650,
        totalGroupsJoined: 10,
        totalCallMinutes: 500,
        newFriendsAdded: 20,
        dailyTopPartners: ["partner1", "partner1", "partner2"],
        dailyActiveHours: [20, 20, 21],
      },
    ];

    (UserDailyStat.aggregate as jest.Mock).mockResolvedValue(mockStats);

    await getUserYearlyStats(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      status: 200,
      data: expect.objectContaining({
        userId: "id-user",
        year: 2026,
        totalMessagesSent: 3650,
        totalGroupsJoined: 10,
        totalCallMinutes: 500,
        newFriendsAdded: 20,
        yearlyTopChatPartnerId: expect.any(String),
        yearlyMostActiveHour: expect.any(Number),
      }),
    });
  });

  // TC02: Valid VP (1 record only)
  it("TC02 - should return 200 OK and stats when only 1 record exists", async () => {
    req.query = { userId: "id-user", year: "2026" };

    const mockStats = [
      {
        totalMessagesSent: 50,
        totalGroupsJoined: 1,
        totalCallMinutes: 10,
        newFriendsAdded: 2,
        dailyTopPartners: ["partner1"],
        dailyActiveHours: [19],
      },
    ];

    (UserDailyStat.aggregate as jest.Mock).mockResolvedValue(mockStats);

    await getUserYearlyStats(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      status: 200,
      data: expect.objectContaining({
        totalMessagesSent: 50,
        yearlyTopChatPartnerId: "partner1",
      }),
    });
  });

  // TC03: Valid VP (Empty data)
  it("TC03 - should return 200 OK with zero values when no records exist", async () => {
    req.query = { userId: "id-user", year: "2026" };

    (UserDailyStat.aggregate as jest.Mock).mockResolvedValue([]);

    await getUserYearlyStats(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      status: 200,
      data: {
        userId: "id-user",
        year: 2026,
        totalMessagesSent: 0,
        totalGroupsJoined: 0,
        totalCallMinutes: 0,
        newFriendsAdded: 0,
        yearlyTopChatPartnerId: null,
        yearlyMostActiveHour: null,
      },
    });
  });

  // TC04: IP - Missing userId
  it("TC04 - should return 400 Bad Request when userId is missing", async () => {
    req.query = { year: "2026" };

    await getUserYearlyStats(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      error: "Missing required parameters: userId and year",
    });
  });

  // TC05: IP - Missing year
  it("TC05 - should return 400 Bad Request when year is missing", async () => {
    req.query = { userId: "id-user" };

    await getUserYearlyStats(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      error: "Missing required parameters: userId and year",
    });
  });

  // TC06: IP - Invalid year format (NaN)
  it("TC06 - should return 400 Bad Request when year is not a number", async () => {
    req.query = { userId: "id-user", year: "2026abc" };

    await getUserYearlyStats(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      error: "Invalid parameter: year must be a number",
    });
  });

  // TC07: IP - Internal Server Error (DB Crash)
  it("TC07 - should return 500 Internal Server Error if DB throws", async () => {
    req.query = { userId: "id-user", year: "2026" };

    (UserDailyStat.aggregate as jest.Mock).mockRejectedValue(new Error("DB Crash"));

    await getUserYearlyStats(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      error: "DB Crash",
    });
  });

  // TC08: IB - userId is empty string
  it("TC08 - should return 400 Bad Request when userId is empty string", async () => {
    req.query = { userId: "", year: "2026" };

    await getUserYearlyStats(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      error: "Missing required parameters: userId and year",
    });
  });

  // TC09: IB - year is empty string
  it("TC09 - should return 400 Bad Request when year is empty string", async () => {
    req.query = { userId: "id-user", year: "" };

    await getUserYearlyStats(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      error: "Missing required parameters: userId and year",
    });
  });
});

describe("GroupController - createGroup (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = {
      body: {},
      headers: {},
      file: undefined,
    };
    res = {
      status: statusMock,
    };
    jest.clearAllMocks();
    
    // Mock global fetch for internal helpers (getUserProfile, postSystemMessage)
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: { fullName: "Test User", avatar: "" } })
      })
    ) as jest.Mock;
  });

  describe("Parameter: name (Tên nhóm)", () => {
    it("VP - Tên nhóm hợp lệ (chữ và số)", async () => {
      req.headers = { "x-user-id": "user1" };
      req.body = { name: "Group 123", userIds: ["id1"] };
      (Conversation.create as jest.Mock).mockResolvedValue({ _id: "g1", name: "Group 123" });
      await createGroup(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(201);
    });
    
    it("VB - Tên nhóm ngắn nhất (1 ký tự)", async () => {
      req.headers = { "x-user-id": "user1" };
      req.body = { name: "A", userIds: ["id1"] };
      (Conversation.create as jest.Mock).mockResolvedValue({ _id: "g1", name: "A" });
      await createGroup(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it("VB - Tên nhóm dài nhất hợp lệ (ví dụ: 100 ký tự)", async () => {
      const longName = "A".repeat(100);
      req.headers = { "x-user-id": "user1" };
      req.body = { name: longName, userIds: ["id1"] };
      (Conversation.create as jest.Mock).mockResolvedValue({ _id: "g1", name: longName });
      await createGroup(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it("IP - name bị null hoặc undefined", async () => {
      req.headers = { "x-user-id": "user1" };
      req.body = { userIds: ["id1"] }; // missing name
      (Conversation.create as jest.Mock).mockRejectedValue(new Error("Path `name` is required."));
      await createGroup(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(500); // Controller returns 500 on DB err
    });

    it("IB - name là chuỗi rỗng (0 ký tự)", async () => {
      req.headers = { "x-user-id": "user1" };
      req.body = { name: "", userIds: ["id1"] };
      (Conversation.create as jest.Mock).mockRejectedValue(new Error("Path `name` is required."));
      await createGroup(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(500);
    });

    it("IB - name vượt quá giới hạn (ví dụ: 101 ký tự)", async () => {
      const tooLongName = "A".repeat(101);
      req.headers = { "x-user-id": "user1" };
      req.body = { name: tooLongName, userIds: ["id1"] };
      (Conversation.create as jest.Mock).mockRejectedValue(new Error("Name too long"));
      await createGroup(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe("Parameter: userIds (Thành viên nhóm)", () => {
    it("VP - userIds là mảng string hợp lệ", async () => {
      req.headers = { "x-user-id": "user1" };
      req.body = { name: "Group", userIds: ["id1", "id2"] };
      (Conversation.create as jest.Mock).mockResolvedValue({ _id: "g1" });
      await createGroup(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it("VP - userIds là JSON string", async () => {
      req.headers = { "x-user-id": "user1" };
      req.body = { name: "Group", userIds: '["id1", "id2"]' };
      (Conversation.create as jest.Mock).mockResolvedValue({ _id: "g1" });
      await createGroup(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it("VP - userIds là string cách nhau bởi dấu phẩy", async () => {
      req.headers = { "x-user-id": "user1" };
      req.body = { name: "Group", userIds: "id1, id2" };
      (Conversation.create as jest.Mock).mockResolvedValue({ _id: "g1" });
      await createGroup(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it("VB - userIds chứa đúng 1 phần tử", async () => {
      req.headers = { "x-user-id": "user1" };
      req.body = { name: "Group", userIds: ["id1"] };
      (Conversation.create as jest.Mock).mockResolvedValue({ _id: "g1" });
      await createGroup(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it("IP - userIds bị missing (null/undefined)", async () => {
      req.headers = { "x-user-id": "user1" };
      req.body = { name: "Group" }; // Missing userIds
      await createGroup(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Danh sách thành viên không hợp lệ" });
    });

    it("IB - userIds là mảng rỗng []", async () => {
      req.headers = { "x-user-id": "user1" };
      req.body = { name: "Group", userIds: [] };
      // Nếu controller chặn rỗng, nó sẽ ném lỗi. Hiện tại hàm backend nếu parse thành [] thì vẫn cho đi qua và chờ DB báo lỗi.
      (Conversation.create as jest.Mock).mockRejectedValue(new Error("Members cannot be empty"));
      await createGroup(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe("Parameter: x-user-id (Header)", () => {
    it("VP - x-user-id truyền vào hợp lệ", async () => {
      req.headers = { "x-user-id": "valid_user" };
      req.body = { name: "Group", userIds: ["id1"] };
      (Conversation.create as jest.Mock).mockResolvedValue({ _id: "g1" });
      await createGroup(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it("IP - x-user-id bị missing", async () => {
      req.headers = {}; // Missing
      req.body = { name: "Group", userIds: ["id1"] };
      (Conversation.create as jest.Mock).mockResolvedValue({ _id: "g1" });
      await createGroup(req as Request, res as Response);
      
      // Do controller gán String(req.headers["x-user-id"] || "") nên nó không chết cứng mà vẫn tạo user với ID rỗng
      // Trừ khi có validation ở trên. Ở đây ta mong muốn status 201 nếu code controller hiện tại đang cho phép, hoặc 400 nếu chặn.
      // Dựa trên code gốc: không chặn ID rỗng.
      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });
});

import { updateGroup } from "../src/controllers/group.controller";
import { uploadImageToS3, deleteImageFromS3 } from "../src/services/s3Service";

describe("GroupController - updateGroup (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = {
      body: {},
      headers: {},
      params: {},
      file: undefined,
    };
    res = {
      status: statusMock,
    };
    jest.clearAllMocks();
  });

  // VP: Đổi tên nhóm hợp lệ
  it("1.6 VP - Đổi tên nhóm hợp lệ bởi LEADER", async () => {
    req.params = { groupId: "group1" };
    req.headers = { "x-user-id": "leader1" };
    req.body = { name: "New Name" };

    const mockGroup = {
      _id: "group1",
      isGroup: true,
      members: [{ userId: "leader1", role: "LEADER" }],
      permissions: { editGroupInfo: "ADMIN" },
      save: jest.fn().mockResolvedValue(true),
    };
    (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

    await updateGroup(req as Request, res as Response);

    expect(mockGroup.name).toBe("New Name");
    expect(mockGroup.save).toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: "Cập nhật thông tin nhóm thành công" }));
    expect(rabbitMQProducer.publishGroupUpdated).toHaveBeenCalledWith(mockGroup);
  });

  // IP: Member bình thường cố gắng cập nhật
  it("1.7 IP - Người gọi không có quyền (MEMBER)", async () => {
    req.params = { groupId: "group1" };
    req.headers = { "x-user-id": "member1" };
    req.body = { name: "New Name" };

    const mockGroup = {
      _id: "group1",
      isGroup: true,
      members: [{ userId: "member1", role: "MEMBER" }],
      permissions: { editGroupInfo: "ADMIN" },
    };
    (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

    await updateGroup(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Chỉ Trưởng nhóm và Phó nhóm mới có quyền cập nhật thông tin" });
  });

  // IP: Nhóm không tồn tại
  it("IP - Nhóm không tồn tại hoặc không phải là nhóm", async () => {
    req.params = { groupId: "invalid" };
    req.headers = { "x-user-id": "user1" };

    (Conversation.findById as jest.Mock).mockResolvedValue(null);

    await updateGroup(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Không tìm thấy nhóm" });
  });

  // IP: User gọi API không nằm trong nhóm
  it("IP - User không phải thành viên của nhóm", async () => {
    req.params = { groupId: "group1" };
    req.headers = { "x-user-id": "stranger" };

    const mockGroup = {
      _id: "group1",
      isGroup: true,
      members: [{ userId: "leader1", role: "LEADER" }],
    };
    (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

    await updateGroup(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Bạn không phải thành viên của nhóm này" });
  });

  // VB: Upload ảnh Avatar thành công (có file)
  it("VB - Upload ảnh nhóm hợp lệ", async () => {
    req.params = { groupId: "group1" };
    req.headers = { "x-user-id": "leader1" };
    req.file = { buffer: Buffer.from("img"), mimetype: "image/png" } as any;

    const mockGroup = {
      _id: "group1",
      isGroup: true,
      groupAvatar: "old-url.png",
      members: [{ userId: "leader1", role: "LEADER" }],
      save: jest.fn().mockResolvedValue(true),
    };
    (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);
    (uploadImageToS3 as jest.Mock).mockResolvedValue("new-url.png");

    await updateGroup(req as Request, res as Response);

    expect(deleteImageFromS3).toHaveBeenCalledWith("old-url.png");
    expect(mockGroup.groupAvatar).toBe("new-url.png");
    expect(statusMock).toHaveBeenCalledWith(200);
  });

  // VP: Phó nhóm cập nhật
  it("VP - Đổi tên nhóm hợp lệ bởi DEPUTY", async () => {
    req.params = { groupId: "group1" };
    req.headers = { "x-user-id": "deputy1" };
    req.body = { name: "New Name Deputy" };

    const mockGroup = {
      _id: "group1",
      isGroup: true,
      members: [{ userId: "deputy1", role: "DEPUTY" }],
      permissions: { editGroupInfo: "ADMIN" },
      save: jest.fn().mockResolvedValue(true),
    };
    (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

    await updateGroup(req as Request, res as Response);

    expect(mockGroup.name).toBe("New Name Deputy");
    expect(statusMock).toHaveBeenCalledWith(200);
  });

  // VP: Member cập nhật khi được cho phép
  it("VP - Đổi tên nhóm hợp lệ bởi MEMBER (được phép)", async () => {
    req.params = { groupId: "group1" };
    req.headers = { "x-user-id": "member1" };
    req.body = { name: "New Name Member" };

    const mockGroup = {
      _id: "group1",
      isGroup: true,
      members: [{ userId: "member1", role: "MEMBER" }],
      permissions: { editGroupInfo: "ALL_MEMBERS" },
      save: jest.fn().mockResolvedValue(true),
    };
    (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

    await updateGroup(req as Request, res as Response);

    expect(mockGroup.name).toBe("New Name Member");
    expect(statusMock).toHaveBeenCalledWith(200);
  });

  // IP: Lỗi S3
  it("IP - Lỗi khi upload ảnh lên S3", async () => {
    req.params = { groupId: "group1" };
    req.headers = { "x-user-id": "leader1" };
    req.file = { buffer: Buffer.from("img"), mimetype: "image/png" } as any;

    const mockGroup = {
      _id: "group1",
      isGroup: true,
      groupAvatar: "old-url.png",
      members: [{ userId: "leader1", role: "LEADER" }],
      save: jest.fn().mockResolvedValue(true),
    };
    (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);
    (uploadImageToS3 as jest.Mock).mockRejectedValue(new Error("S3 Error"));

    await updateGroup(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({ error: "S3 Error" });
  });

  // IP: Lỗi server (DB)
  it("IP - Lỗi Internal Server Error", async () => {
    req.params = { groupId: "group1" };
    req.headers = { "x-user-id": "leader1" };
    req.body = { name: "New Name" };

    (Conversation.findById as jest.Mock).mockRejectedValue(new Error("DB Error"));

    await updateGroup(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({ error: "DB Error" });
  });
});

import { deleteGroup } from "../src/controllers/group.controller";
import groupService from "../src/services/groupService";

jest.mock("../src/services/groupService", () => ({
  disbandGroup: jest.fn().mockResolvedValue(true),
  removeMember: jest.fn().mockResolvedValue(true),
}));

describe("GroupController - deleteGroup (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = {
      params: {},
      headers: {},
    };
    res = {
      status: statusMock,
    };
    jest.clearAllMocks();
  });

  describe("Parameter: groupId (URL Param)", () => {
    it("VP - groupId hợp lệ và nhóm tồn tại", async () => {
      req.params = { groupId: "group1" };
      req.headers = { "x-user-id": "leader1" };
      const mockGroup = { _id: "group1", members: [{ userId: "leader1", role: "LEADER" }] };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await deleteGroup(req as Request, res as Response);

      expect(Conversation.findById).toHaveBeenCalledWith("group1");
      expect(groupService.disbandGroup).toHaveBeenCalledWith("group1", true);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ message: "Nhóm đã được giải tán vĩnh viễn" });
    });

    it("IP - groupId không truyền (undefined/rỗng)", async () => {
      req.params = {}; // missing groupId
      req.headers = { "x-user-id": "leader1" };
      (Conversation.findById as jest.Mock).mockResolvedValue(null); // String("") will yield null in DB

      await deleteGroup(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Nhóm không tồn tại" });
    });

    it("IB - groupId truyền vào nhưng không tìm thấy nhóm trong DB", async () => {
      req.params = { groupId: "fake_group" };
      req.headers = { "x-user-id": "leader1" };
      (Conversation.findById as jest.Mock).mockResolvedValue(null);

      await deleteGroup(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Nhóm không tồn tại" });
    });
  });

  describe("Parameter: x-user-id (Header người gọi API)", () => {
    it("VP - x-user-id là người tạo nhóm (LEADER)", async () => {
      req.params = { groupId: "group1" };
      req.headers = { "x-user-id": "leader1" };
      const mockGroup = { _id: "group1", members: [{ userId: "leader1", role: "LEADER" }] };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await deleteGroup(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it("IP - x-user-id là Phó nhóm (DEPUTY)", async () => {
      req.params = { groupId: "group1" };
      req.headers = { "x-user-id": "deputy1" };
      const mockGroup = { _id: "group1", members: [{ userId: "deputy1", role: "DEPUTY" }] };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await deleteGroup(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Chỉ Trưởng nhóm mới có quyền giải tán nhóm" });
    });

    it("IP - x-user-id là Thành viên thường (MEMBER)", async () => {
      req.params = { groupId: "group1" };
      req.headers = { "x-user-id": "member1" };
      const mockGroup = { _id: "group1", members: [{ userId: "member1", role: "MEMBER" }] };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await deleteGroup(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Chỉ Trưởng nhóm mới có quyền giải tán nhóm" });
    });

    it("IP - x-user-id không nằm trong nhóm (Người lạ)", async () => {
      req.params = { groupId: "group1" };
      req.headers = { "x-user-id": "stranger" };
      const mockGroup = { _id: "group1", members: [{ userId: "leader1", role: "LEADER" }] };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await deleteGroup(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it("IP - x-user-id bị missing (không truyền)", async () => {
      req.params = { groupId: "group1" };
      req.headers = {}; // missing
      const mockGroup = { _id: "group1", members: [{ userId: "leader1", role: "LEADER" }] };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await deleteGroup(req as Request, res as Response);

      // req.headers["x-user-id"] is undefined, so leader will be undefined.
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });
});

import { getGroupById } from "../src/controllers/group.controller";

describe("GroupController - getGroupById (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = {
      params: {},
    };
    res = {
      status: statusMock,
    };
    jest.clearAllMocks();
  });

  describe("Parameter: groupId (URL Param)", () => {
    it("VP - groupId hợp lệ (24 ký tự) và nhóm tồn tại", async () => {
      const validId = "507f1f77bcf86cd799439011";
      req.params = { groupId: validId };
      const mockGroup = { _id: validId, name: "Test Group" };
      
      // Hàm dùng cả findById và findOne, ta mock findById trả về data
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await getGroupById(req as Request, res as Response);

      expect(Conversation.findById).toHaveBeenCalledWith(validId);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ data: mockGroup });
    });

    it("IB - groupId bị thiếu hoặc rỗng", async () => {
      req.params = { groupId: "" }; // rỗng
      await getGroupById(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Mã nhóm không hợp lệ: " });
    });

    it("IB - groupId độ dài sai (ngắn hơn 24 ký tự)", async () => {
      req.params = { groupId: "123" };
      await getGroupById(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Mã nhóm không hợp lệ: 123" });
    });

    it("IB - groupId độ dài sai (dài hơn 24 ký tự)", async () => {
      const tooLongId = "507f1f77bcf86cd799439011X";
      req.params = { groupId: tooLongId };
      await getGroupById(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: `Mã nhóm không hợp lệ: ${tooLongId}` });
    });

    it("IP - groupId hợp lệ 24 ký tự nhưng không tồn tại trong DB", async () => {
      const validId = "507f1f77bcf86cd799439011";
      req.params = { groupId: validId };
      
      (Conversation.findById as jest.Mock).mockResolvedValue(null);
      (Conversation.findOne as jest.Mock).mockResolvedValue(null);

      await getGroupById(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: `Không tìm thấy nhóm với ID: ${validId}` });
    });
  });
});

import { getMyGroups, getCommonGroups, getGroupInfoForLink } from "../src/controllers/group.controller";

describe("GroupController - getMyGroups (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { headers: {}, query: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  describe("Parameter: x-user-id (Header)", () => {
    it("VP - Lấy danh sách hợp lệ", async () => {
      req.headers = { "x-user-id": "user1" };
      req.query = { type: "all" };
      
      const mockGroups = [
        { _id: "g1", isGroup: true, toObject: () => ({ _id: "g1" }) }
      ];
      const sortMock = jest.fn().mockResolvedValue(mockGroups);
      (Conversation.find as jest.Mock).mockReturnValue({ sort: sortMock });

      await getMyGroups(req as Request, res as Response);

      expect(Conversation.find).toHaveBeenCalledWith({
        "members.userId": "user1",
        status: { $ne: "DISBANDED" }
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ data: expect.any(Array) }));
    });

    it("IP - Thiếu Header", async () => {
      req.headers = {};
      req.query = { type: "all" };
      
      const sortMock = jest.fn().mockResolvedValue([]);
      (Conversation.find as jest.Mock).mockReturnValue({ sort: sortMock });

      await getMyGroups(req as Request, res as Response);
      
      // Do String("") truyền vào query
      expect(Conversation.find).toHaveBeenCalledWith({
        "members.userId": "",
        status: { $ne: "DISBANDED" }
      });
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe("Parameter: type (Query)", () => {
    it("VP - type = 'all'", async () => {
      req.headers = { "x-user-id": "user1" };
      req.query = { type: "all" };
      
      const sortMock = jest.fn().mockResolvedValue([]);
      (Conversation.find as jest.Mock).mockReturnValue({ sort: sortMock });

      await getMyGroups(req as Request, res as Response);
      expect(Conversation.find).toHaveBeenCalledWith({
        "members.userId": "user1",
        status: { $ne: "DISBANDED" }
      });
    });

    it("VB - type rỗng / khác 'all'", async () => {
      req.headers = { "x-user-id": "user1" };
      req.query = { type: "group" }; // Khác all
      
      const sortMock = jest.fn().mockResolvedValue([]);
      (Conversation.find as jest.Mock).mockReturnValue({ sort: sortMock });

      await getMyGroups(req as Request, res as Response);
      expect(Conversation.find).toHaveBeenCalledWith(expect.objectContaining({
        isGroup: true
      }));
    });
  });
});

describe("GroupController - getCommonGroups (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { headers: {}, params: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  describe("Parameter: otherUserId (URL Param)", () => {
    it("VP - Hợp lệ, có nhóm chung", async () => {
      req.headers = { "x-user-id": "user1" };
      req.params = { otherUserId: "user2" };
      
      const sortMock = jest.fn().mockResolvedValue([{ _id: "g1" }]);
      (Conversation.find as jest.Mock).mockReturnValue({ sort: sortMock });

      await getCommonGroups(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ data: [{ _id: "g1" }] });
    });

    it("IP - Missing parameter", async () => {
      req.headers = { "x-user-id": "user1" };
      req.params = {}; // missing otherUserId
      
      await getCommonGroups(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Thiếu thông tin người dùng" });
    });
  });

  describe("Parameter: x-user-id (Header)", () => {
    it("VP - Header hợp lệ", async () => {
      req.headers = { "x-user-id": "user1" };
      req.params = { otherUserId: "user2" };
      const sortMock = jest.fn().mockResolvedValue([]);
      (Conversation.find as jest.Mock).mockReturnValue({ sort: sortMock });

      await getCommonGroups(req as Request, res as Response);
      expect(Conversation.find).toHaveBeenCalledWith({
        isGroup: true,
        "members.userId": { $all: ["user1", "user2"] }
      });
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });
});

describe("GroupController - getGroupInfoForLink (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { headers: {}, params: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  describe("Parameter: groupId (URL Param)", () => {
    it("VP - ID đúng định dạng", async () => {
      const validId = "a".repeat(24);
      req.params = { groupId: validId };
      const mockGroup = { _id: validId, members: [], toObject: () => ({ _id: validId }) };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await getGroupInfoForLink(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ data: expect.any(Object) });
    });

    it("IB - Sai định dạng hex", async () => {
      req.params = { groupId: "invalid" };
      await getGroupInfoForLink(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Không tìm thấy nhóm" });
    });

    it("IP - Nhóm không tồn tại", async () => {
      const validId = "a".repeat(24);
      req.params = { groupId: validId };
      (Conversation.findById as jest.Mock).mockResolvedValue(null);

      await getGroupInfoForLink(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Không tìm thấy nhóm" });
    });
  });
});

import { addMember, removeMember } from "../src/controllers/group.controller";

describe("GroupController - addMember (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { params: {}, body: {}, headers: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  describe("Parameter: groupId & x-user-id", () => {
    it("VP - Thêm thành viên thành công bởi LEADER", async () => {
      req.params = { groupId: "g1" };
      req.body = { newUserId: "user2" };
      req.headers = { "x-user-id": "leader1" };

      const mockGroup = {
        _id: "g1",
        members: [{ userId: "leader1", role: "LEADER" }],
        removedMembers: [],
        save: jest.fn().mockResolvedValue(true)
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await addMember(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: "Đã thêm thành viên" }));
    });

    it("IP - Nhóm không tồn tại", async () => {
      req.params = { groupId: "invalid" };
      (Conversation.findById as jest.Mock).mockResolvedValue(null);

      await addMember(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it("IP - Member thường thêm người lạ (lỗi kết bạn)", async () => {
      req.params = { groupId: "g1" };
      req.body = { newUserId: "stranger" };
      req.headers = { "x-user-id": "member1" };

      const mockGroup = {
        _id: "g1",
        members: [{ userId: "member1", role: "MEMBER" }],
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] })
      }) as any;

      await addMember(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Chỉ có thể thêm người đã kết bạn vào nhóm" });
    });

    it("VP - Member thêm bạn bè thành công (không yêu cầu duyệt)", async () => {
      req.params = { groupId: "g1" };
      req.body = { newUserId: "friend1" };
      req.headers = { "x-user-id": "member1" };

      const mockGroup = {
        _id: "g1",
        members: [{ userId: "member1", role: "MEMBER" }],
        isApprovalRequired: false,
        save: jest.fn().mockResolvedValue(true)
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ requesterId: "member1", recipientId: "friend1" }] })
      }) as any;

      await addMember(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(mockGroup.members).toEqual(
        expect.arrayContaining([expect.objectContaining({ userId: "friend1" })])
      );
    });

    it("VP - Member thêm bạn bè (yêu cầu duyệt -> tạo Request)", async () => {
      req.params = { groupId: "g1" };
      req.body = { newUserId: "friend1" };
      req.headers = { "x-user-id": "member1" };

      const mockGroup = {
        _id: "g1",
        members: [{ userId: "member1", role: "MEMBER" }],
        isApprovalRequired: true,
        joinRequests: [],
        save: jest.fn().mockResolvedValue(true)
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ requesterId: "member1", recipientId: "friend1" }] })
      }) as any;

      await addMember(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: "Yêu cầu tham gia đã gửi và đang chờ duyệt" }));
      expect(mockGroup.joinRequests).toHaveLength(1);
    });

    it("IP - Thêm người đã bị cấm (bởi Member)", async () => {
      req.params = { groupId: "g1" };
      req.body = { newUserId: "bannedUser" };
      req.headers = { "x-user-id": "member1" };

      const mockGroup = {
        _id: "g1",
        members: [{ userId: "member1", role: "MEMBER" }],
        removedMembers: [{ userId: "bannedUser", isBanned: true }],
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await addMember(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Người dùng này đã bị cấm tham gia nhóm" });
    });

    it("VP - Thêm người đã bị cấm (bởi Admin -> auto gỡ cấm)", async () => {
      req.params = { groupId: "g1" };
      req.body = { newUserId: "bannedUser" };
      req.headers = { "x-user-id": "leader1" };

      const mockGroup = {
        _id: "g1",
        members: [{ userId: "leader1", role: "LEADER" }],
        removedMembers: [{ userId: "bannedUser", isBanned: true }],
        save: jest.fn().mockResolvedValue(true)
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await addMember(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(mockGroup.removedMembers).toHaveLength(0); // Admin unbanned them
    });
  });

  describe("Parameter: newUserId (Body)", () => {
    it("IP - User đã có trong nhóm", async () => {
      req.params = { groupId: "g1" };
      req.body = { newUserId: "user2" };
      req.headers = { "x-user-id": "leader1" };

      const mockGroup = {
        _id: "g1",
        members: [
          { userId: "leader1", role: "LEADER" },
          { userId: "user2", role: "MEMBER" }
        ],
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await addMember(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Người dùng này đã là thành viên của nhóm" });
    });
  });
});

describe("GroupController - removeMember (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { params: {}, body: {}, headers: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  describe("Parameter: targetUserId & x-user-id", () => {
    it("VP - Leader kick Member", async () => {
      req.params = { groupId: "g1", userId: "member1" };
      req.headers = { "x-user-id": "leader1" };

      const mockGroup = {
        _id: "g1",
        members: [
          { userId: "leader1", role: "LEADER" },
          { userId: "member1", role: "MEMBER" }
        ],
        removedMembers: [],
        save: jest.fn().mockResolvedValue(true)
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await removeMember(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: "Thao tác thành công" }));
    });

    it("IP - Kick người không có trong nhóm", async () => {
      req.params = { groupId: "g1", userId: "stranger" };
      req.headers = { "x-user-id": "leader1" };

      const mockGroup = {
        _id: "g1",
        members: [{ userId: "leader1", role: "LEADER" }],
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await removeMember(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Thành viên không hợp lệ" });
    });

    it("IB - Leader tự Leave mà không chuyển quyền", async () => {
      req.params = { groupId: "g1", userId: "leader1" };
      req.headers = { "x-user-id": "leader1" };

      const mockGroup = {
        _id: "g1",
        members: [
          { userId: "leader1", role: "LEADER" },
          { userId: "member1", role: "MEMBER" }
        ],
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await removeMember(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Trưởng nhóm không thể rời đi. Hãy trao quyền Trưởng nhóm cho người khác trước." });
    });
  });
});

import { assignNewLeader, updateRole } from "../src/controllers/group.controller";

describe("GroupController - assignNewLeader (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { body: {}, headers: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  describe("Parameter: groupId, newLeaderId & x-user-id", () => {
    it("VP - Chuyển quyền Leader thành công", async () => {
      req.body = { groupId: "g1", newLeaderId: "member1" };
      req.headers = { "x-user-id": "leader1" };

      const mockGroup = {
        _id: "g1",
        members: [
          { userId: "leader1", role: "LEADER" },
          { userId: "member1", role: "MEMBER" }
        ],
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);
      (Conversation.updateOne as jest.Mock).mockResolvedValue(true);

      await assignNewLeader(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ message: "Đã chuyển nhượng quyền Trưởng nhóm" });
    });

    it("IP - Người gọi không phải Leader", async () => {
      req.body = { groupId: "g1", newLeaderId: "member2" };
      req.headers = { "x-user-id": "member1" };

      const mockGroup = {
        _id: "g1",
        members: [{ userId: "member1", role: "MEMBER" }],
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await assignNewLeader(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Bạn không phải Trưởng nhóm" });
    });

    it("IP - Nhóm không tồn tại", async () => {
      req.body = { groupId: "invalid", newLeaderId: "member1" };
      (Conversation.findById as jest.Mock).mockResolvedValue(null);

      await assignNewLeader(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });
});

describe("GroupController - updateRole (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { params: {}, body: {}, headers: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  describe("Parameter: newRole & x-user-id", () => {
    it("VP - Leader bổ nhiệm Deputy", async () => {
      req.params = { groupId: "g1", userId: "member1" };
      req.body = { newRole: "DEPUTY" };
      req.headers = { "x-user-id": "leader1" };

      const mockGroup = {
        _id: "g1",
        members: [{ userId: "leader1", role: "LEADER" }],
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);
      (Conversation.findOneAndUpdate as jest.Mock).mockResolvedValue(true);

      await updateRole(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ message: "Cập nhật quyền thành công" });
    });

    it("IP - Truyền newRole là LEADER", async () => {
      req.params = { groupId: "g1", userId: "member1" };
      req.body = { newRole: "LEADER" };
      req.headers = { "x-user-id": "leader1" };

      const mockGroup = {
        _id: "g1",
        members: [{ userId: "leader1", role: "LEADER" }],
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await updateRole(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Dùng API chuyển nhượng để thay đổi Trưởng nhóm" });
    });

    it("IP - Không phải Leader", async () => {
      req.params = { groupId: "g1", userId: "member1" };
      req.body = { newRole: "DEPUTY" };
      req.headers = { "x-user-id": "member2" };

      const mockGroup = {
        _id: "g1",
        members: [{ userId: "member2", role: "MEMBER" }],
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await updateRole(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Chỉ Trưởng nhóm mới có quyền bổ nhiệm" });
    });
  });
});

import { requestJoinGroup } from "../src/controllers/group.controller";

describe("GroupController - requestJoinGroup (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { params: {}, body: {}, headers: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  describe("Parameter: groupId & x-user-id", () => {
    it("VP - Gửi request hợp lệ (cần phê duyệt)", async () => {
      req.params = { groupId: "a".repeat(24) };
      req.headers = { "x-user-id": "user1" };

      const mockGroup = {
        _id: "a".repeat(24),
        isGroup: true,
        isApprovalRequired: true,
        members: [{ userId: "leader1", role: "LEADER" }],
        joinRequests: [],
        save: jest.fn().mockResolvedValue(true)
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await requestJoinGroup(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: "Đã gửi yêu cầu tham gia, vui lòng chờ duyệt" }));
      expect(mockGroup.joinRequests.length).toBe(1);
    });

    it("VP - Tham gia ngay (không cần phê duyệt)", async () => {
      req.params = { groupId: "a".repeat(24) };
      req.headers = { "x-user-id": "user1" };

      const mockGroup = {
        _id: "a".repeat(24),
        isGroup: true,
        isApprovalRequired: false,
        members: [{ userId: "leader1", role: "LEADER" }],
        joinRequests: [],
        save: jest.fn().mockResolvedValue(true)
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await requestJoinGroup(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: "Đã tham gia nhóm thành công" }));
      expect(mockGroup.members.length).toBe(2);
    });

    it("IP - Gửi request 2 lần liên tiếp", async () => {
      req.params = { groupId: "a".repeat(24) };
      req.headers = { "x-user-id": "user1" };

      const mockGroup = {
        _id: "a".repeat(24),
        isGroup: true,
        isApprovalRequired: true,
        members: [{ userId: "leader1", role: "LEADER" }],
        joinRequests: [{ userId: "user1" }],
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await requestJoinGroup(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Bạn đã gửi yêu cầu tham gia rồi" });
    });

    it("IP - Mã nhóm không hợp lệ", async () => {
      req.params = { groupId: "invalid" };
      req.headers = { "x-user-id": "user1" };

      await requestJoinGroup(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Mã nhóm không hợp lệ" });
    });
  });
});

import { unblockMember, getBlockedMembers } from "../src/controllers/group.controller";


describe("GroupController - unblockMember (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { params: {}, headers: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  describe("Parameter: groupId, userId & x-user-id", () => {
    it("VP - Admin gỡ chặn thành công", async () => {
      req.params = { groupId: "g1", userId: "blocked1" };
      req.headers = { "x-user-id": "admin1" };

      const mockGroup = {
        _id: "g1",
        members: [{ userId: "admin1", role: "LEADER" }],
        removedMembers: [{ userId: "blocked1", isBanned: true }],
        save: jest.fn().mockResolvedValue(true)
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await unblockMember(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: "Đã gỡ chặn thành viên" }));
      expect(mockGroup.removedMembers.length).toBe(0);
    });

    it("IP - Không phải admin", async () => {
      req.params = { groupId: "g1", userId: "blocked1" };
      req.headers = { "x-user-id": "member1" };

      const mockGroup = {
        _id: "g1",
        members: [{ userId: "member1", role: "MEMBER" }],
        removedMembers: [{ userId: "blocked1", isBanned: true }],
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await unblockMember(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });
});

describe("GroupController - getBlockedMembers (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { params: {}, headers: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  describe("Parameter: groupId & x-user-id", () => {
    it("VP - Lấy danh sách block (Leader)", async () => {
      req.params = { groupId: "g1" };
      req.headers = { "x-user-id": "admin1" };

      const mockGroup = {
        _id: "g1",
        members: [{ userId: "admin1", role: "LEADER" }],
        removedMembers: [{ userId: "blocked1", isBanned: true, reason: "spam" }],
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await getBlockedMembers(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ data: expect.any(Array) }));
    });

    it("IP - Người gọi là Member thường", async () => {
      req.params = { groupId: "g1" };
      req.headers = { "x-user-id": "member1" };

      const mockGroup = {
        _id: "g1",
        members: [{ userId: "member1", role: "MEMBER" }],
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await getBlockedMembers(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });
});

import { approveJoinRequest, rejectJoinRequest, getJoinRequests, cancelJoinRequest } from "../src/controllers/group.controller";

describe("GroupController - approveJoinRequest (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { params: {}, headers: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  describe("Parameter: groupId, userId & x-user-id", () => {
    it("VP - Leader duyệt request thành công", async () => {
      req.params = { groupId: "g1", userId: "user1" };
      req.headers = { "x-user-id": "leader1" };

      const mockGroup = {
        _id: "g1",
        members: [{ userId: "leader1", role: "LEADER" }],
        joinRequests: [{ userId: "user1" }],
        save: jest.fn().mockResolvedValue(true)
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await approveJoinRequest(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: "Đã phê duyệt yêu cầu" }));
      expect(mockGroup.joinRequests.length).toBe(0);
      expect(mockGroup.members.length).toBe(2);
    });

    it("IP - Người duyệt không phải Leader/Deputy", async () => {
      req.params = { groupId: "g1", userId: "user1" };
      req.headers = { "x-user-id": "member1" };

      const mockGroup = {
        _id: "g1",
        members: [{ userId: "member1", role: "MEMBER" }],
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await approveJoinRequest(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it("IP - Yêu cầu không tồn tại", async () => {
      req.params = { groupId: "g1", userId: "user1" };
      req.headers = { "x-user-id": "leader1" };

      const mockGroup = {
        _id: "g1",
        members: [{ userId: "leader1", role: "LEADER" }],
        joinRequests: [],
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await approveJoinRequest(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });
});

describe("GroupController - rejectJoinRequest (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { params: {}, headers: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  describe("Parameter: groupId, userId & x-user-id", () => {
    it("VP - Từ chối request thành công", async () => {
      req.params = { groupId: "g1", userId: "user1" };
      req.headers = { "x-user-id": "leader1" };

      const mockGroup = {
        _id: "g1",
        name: "Test Group",
        members: [{ userId: "leader1", role: "LEADER" }],
        joinRequests: [{ userId: "user1" }],
        save: jest.fn().mockResolvedValue(true)
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await rejectJoinRequest(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: "Đã từ chối yêu cầu" }));
      expect(mockGroup.joinRequests.length).toBe(0);
    });
  });
});

describe("GroupController - getJoinRequests (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { params: {}, headers: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  it("VP - Leader lấy danh sách", async () => {
    req.params = { groupId: "g1" };
    req.headers = { "x-user-id": "leader1" };
    const mockGroup = {
      _id: "g1",
      members: [{ userId: "leader1", role: "LEADER" }],
      joinRequests: [{ userId: "u1" }],
    };
    (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

    await getJoinRequests(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({ data: mockGroup.joinRequests });
  });
});

describe("GroupController - cancelJoinRequest (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { params: {}, headers: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  it("VP - Hủy request của mình", async () => {
    req.params = { groupId: "g1" };
    req.headers = { "x-user-id": "user1" };
    const mockGroup = {
      _id: "g1",
      joinRequests: [{ userId: "user1" }],
      save: jest.fn().mockResolvedValue(true)
    };
    (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

    await cancelJoinRequest(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(mockGroup.joinRequests.length).toBe(0);
  });
});

import { inviteToGroup, acceptInvitation, declineInvitation, getMyInvitations, getMySentInvitations, getMySentJoinRequests } from "../src/controllers/group.controller";

describe("GroupController - inviteToGroup (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { params: {}, body: {}, headers: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  describe("Parameter: groupId, targetUserId & x-user-id", () => {
    it("VP - Gửi lời mời thành công", async () => {
      req.params = { groupId: "g1".padStart(24, "0") };
      req.body = { targetUserId: "user2" };
      req.headers = { "x-user-id": "member1" };

      const mockGroup = {
        _id: "g1".padStart(24, "0"),
        members: [{ userId: "member1", role: "MEMBER" }],
        invitations: [],
        save: jest.fn().mockResolvedValue(true)
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await inviteToGroup(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: "Đã gửi lời mời tham gia nhóm" }));
      expect(mockGroup.invitations.length).toBe(1);
    });

    it("IP - Mời người đã trong nhóm", async () => {
      req.params = { groupId: "g1".padStart(24, "0") };
      req.body = { targetUserId: "member2" };
      req.headers = { "x-user-id": "member1" };

      const mockGroup = {
        _id: "g1".padStart(24, "0"),
        members: [{ userId: "member1", role: "MEMBER" }, { userId: "member2", role: "MEMBER" }],
      };
      (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

      await inviteToGroup(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Người dùng đã là thành viên của nhóm" });
    });
  });
});

describe("GroupController - acceptInvitation (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { params: {}, headers: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  it("VP - Chấp nhận mời", async () => {
    req.params = { groupId: "g1" };
    req.headers = { "x-user-id": "user1" };

    const mockGroup = {
      _id: "g1",
      name: "Group 1",
      members: [],
      invitations: [{ userId: "user1", invitedBy: "leader1" }],
      save: jest.fn().mockResolvedValue(true)
    };
    (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

    await acceptInvitation(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: "Đã tham gia nhóm thành công" }));
    expect(mockGroup.members.length).toBe(1);
    expect(mockGroup.invitations.length).toBe(0);
  });

  it("IP - Lời mời không tồn tại", async () => {
    req.params = { groupId: "g1" };
    req.headers = { "x-user-id": "user1" };

    const mockGroup = {
      _id: "g1",
      members: [],
      invitations: [],
    };
    (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

    await acceptInvitation(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
  });
});

describe("GroupController - declineInvitation (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { params: {}, headers: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  it("VP - Từ chối lời mời", async () => {
    req.params = { groupId: "g1" };
    req.headers = { "x-user-id": "user1" };

    const mockGroup = {
      _id: "g1",
      invitations: [{ userId: "user1" }],
      save: jest.fn().mockResolvedValue(true)
    };
    (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

    await declineInvitation(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(mockGroup.invitations.length).toBe(0);
  });
});

describe("GroupController - getMyInvitations (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { headers: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  it("VP - Lấy danh sách mời", async () => {
    req.headers = { "x-user-id": "user1" };
    (Conversation.find as jest.Mock).mockResolvedValue([]);

    await getMyInvitations(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({ data: [] });
  });
});

describe("GroupController - getMySentInvitations & getMySentJoinRequests (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { headers: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  it("VP - getMySentInvitations", async () => {
    req.headers = { "x-user-id": "user1" };
    const mockQuery = {
      select: jest.fn().mockResolvedValue([{ _id: "g1", name: "G1", invitations: [{ userId: "u2", invitedBy: "user1", invitedAt: new Date() }] }])
    };
    (Conversation.find as jest.Mock).mockReturnValue(mockQuery);

    await getMySentInvitations(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(200);
  });

  it("VP - getMySentJoinRequests", async () => {
    req.headers = { "x-user-id": "user1" };
    (Conversation.find as jest.Mock).mockResolvedValue([]);

    await getMySentJoinRequests(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(200);
  });
});

import { updateApprovalSetting, updateLinkSetting, updateHistorySetting, updateSettings, getOrCreateDirectConversation, clearConversation, updateConversationFolder } from "../src/controllers/group.controller";

describe("GroupController - updateApprovalSetting (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { params: {}, body: {}, headers: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  it("VP - Cập nhật thiết lập thành công", async () => {
    req.params = { groupId: "g1" };
    req.body = { isApprovalRequired: true };
    req.headers = { "x-user-id": "leader1" };

    const mockGroup = {
      _id: "g1",
      members: [{ userId: "leader1", role: "LEADER" }],
      isApprovalRequired: false,
      save: jest.fn().mockResolvedValue(true)
    };
    (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

    await updateApprovalSetting(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(mockGroup.isApprovalRequired).toBe(true);
  });

  it("IP - Không có quyền", async () => {
    req.params = { groupId: "g1" };
    req.body = { isApprovalRequired: true };
    req.headers = { "x-user-id": "member1" };

    const mockGroup = {
      _id: "g1",
      members: [{ userId: "member1", role: "MEMBER" }],
    };
    (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

    await updateApprovalSetting(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(403);
  });

  it("IP - Sai định dạng", async () => {
    req.params = { groupId: "g1" };
    req.body = { isApprovalRequired: "yes" };
    req.headers = { "x-user-id": "leader1" };

    const mockGroup = {
      _id: "g1",
      members: [{ userId: "leader1", role: "LEADER" }],
    };
    (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

    await updateApprovalSetting(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
  });
});

describe("GroupController - updateLinkSetting (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { params: {}, body: {}, headers: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  it("VP - Cập nhật link nhóm", async () => {
    req.params = { groupId: "g1" };
    req.body = { isLinkEnabled: false };
    req.headers = { "x-user-id": "leader1" };

    const mockGroup = {
      _id: "g1",
      members: [{ userId: "leader1", role: "LEADER" }],
      isLinkEnabled: true,
      save: jest.fn().mockResolvedValue(true)
    };
    (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

    await updateLinkSetting(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(mockGroup.isLinkEnabled).toBe(false);
  });
});

describe("GroupController - updateHistorySetting (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { params: {}, body: {}, headers: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  it("VP - Cập nhật xem lịch sử", async () => {
    req.params = { groupId: "g1" };
    req.body = { isHistoryVisible: true };
    req.headers = { "x-user-id": "leader1" };

    const mockGroup = {
      _id: "g1",
      members: [{ userId: "leader1", role: "LEADER" }],
      isHistoryVisible: false,
      save: jest.fn().mockResolvedValue(true)
    };
    (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

    await updateHistorySetting(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(mockGroup.isHistoryVisible).toBe(true);
  });
});

describe("GroupController - updateSettings (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { params: {}, body: {}, headers: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  it("VP - Cập nhật nhiều settings", async () => {
    req.params = { groupId: "g1" };
    req.body = { isHighlightEnabled: true, permissions: { editGroupInfo: "LEADER" } };
    req.headers = { "x-user-id": "leader1" };

    const mockGroup = {
      _id: "g1",
      members: [{ userId: "leader1", role: "LEADER" }],
      isHighlightEnabled: false,
      permissions: { editGroupInfo: "ADMIN" },
      save: jest.fn().mockResolvedValue(true)
    };
    (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

    await updateSettings(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(mockGroup.isHighlightEnabled).toBe(true);
    expect(mockGroup.permissions.editGroupInfo).toBe("LEADER");
  });
});

describe("GroupController - getOrCreateDirectConversation (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  let sendMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    sendMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock, send: sendMock });
    req = { body: {}, headers: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  it("VP - Tìm thấy", async () => {
    req.body = { targetUserId: "u2" };
    req.headers = { "x-user-id": "u1" };

    const mockGroup = { _id: "g1" };
    (Conversation.findOne as jest.Mock).mockResolvedValue(mockGroup);

    await getOrCreateDirectConversation(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(mockGroup);
  });

  it("VP - Tạo mới", async () => {
    req.body = { targetUserId: "u2" };
    req.headers = { "x-user-id": "u1" };

    (Conversation.findOne as jest.Mock).mockResolvedValue(null);

    await getOrCreateDirectConversation(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(201);
  });

  it("VP - Chỉ kiểm tra", async () => {
    req.body = { targetUserId: "u2", checkOnly: true };
    req.headers = { "x-user-id": "u1" };

    (Conversation.findOne as jest.Mock).mockResolvedValue(null);

    await getOrCreateDirectConversation(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(204);
    expect(sendMock).toHaveBeenCalled();
  });
});

import { findDirectConversation } from "../src/controllers/group.controller";

describe("GroupController - findDirectConversation (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { query: {}, headers: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  it("VP - Tìm thấy (exists = true)", async () => {
    req.query = { targetUserId: "u2" };
    req.headers = { "x-user-id": "u1" };

    const mockGroup = { _id: "g1" };
    (Conversation.findOne as jest.Mock).mockResolvedValue(mockGroup);

    await findDirectConversation(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({ exists: true, conversation: mockGroup });
  });

  it("VP - Không tìm thấy (exists = false)", async () => {
    req.query = { targetUserId: "u2" };
    req.headers = { "x-user-id": "u1" };

    (Conversation.findOne as jest.Mock).mockResolvedValue(null);

    await findDirectConversation(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({ exists: false });
  });

  it("IP - Thiếu targetUserId", async () => {
    req.query = {};
    req.headers = { "x-user-id": "u1" };

    await findDirectConversation(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({ error: "targetUserId is required" });
  });
});

describe("GroupController - clearConversation (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { params: {}, headers: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  it("VP - Xóa lịch sử", async () => {
    req.params = { groupId: "g1" };
    req.headers = { "x-user-id": "u1" };

    const mockMap = new Map();
    const mockGroup = {
      _id: "g1",
      clearedAt: mockMap,
      save: jest.fn().mockResolvedValue(true)
    };
    (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

    await clearConversation(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(mockMap.has("u1")).toBe(true);
  });
});

describe("GroupController - updateConversationFolder (EP & BVA)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { params: {}, body: {}, headers: {} };
    res = { status: statusMock };
    jest.clearAllMocks();
  });

  it("VP - Chuyển sang Other", async () => {
    req.params = { groupId: "g1" };
    req.body = { folder: "other" };
    req.headers = { "x-user-id": "u1" };

    const mockMap = new Map();
    const mockGroup = {
      _id: "g1",
      folders: mockMap,
      save: jest.fn().mockResolvedValue(true)
    };
    (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

    await updateConversationFolder(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(mockMap.get("u1")).toBe("other");
  });

  it("VP - Xóa khỏi Other (về Priority)", async () => {
    req.params = { groupId: "g1" };
    req.body = { folder: "priority" };
    req.headers = { "x-user-id": "u1" };

    const mockMap = new Map();
    mockMap.set("u1", "other");
    const mockGroup = {
      _id: "g1",
      folders: mockMap,
      save: jest.fn().mockResolvedValue(true)
    };
    (Conversation.findById as jest.Mock).mockResolvedValue(mockGroup);

    await updateConversationFolder(req as Request, res as Response);
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(mockMap.has("u1")).toBe(false);
  });
});
