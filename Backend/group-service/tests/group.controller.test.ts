jest.mock("uuid", () => ({ v4: jest.fn() }));
jest.mock("../src/services/s3Service", () => ({
  uploadImageToS3: jest.fn(),
  deleteImageFromS3: jest.fn()
}));

import { Request, Response } from "express";
import { getUserYearlyStats } from "../src/controllers/group.controller";
import UserDailyStat from "../src/models/UserDailyStat";

jest.mock("../src/models/UserDailyStat", () => ({
  aggregate: jest.fn(),
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
