// src/controllers/group.controller.ts
import { Request, Response } from "express";
import Conversation from "../models/Conversation";

// 1. Tạo Nhóm mới (Tạo nhóm từ 3 người)
export const createGroup = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { name, groupAvatar, userIds } = req.body; // userIds là mảng ID các thành viên muốn mời
    const creatorId = req.headers["x-user-id"] as string;

    // Kiểm tra số lượng: Người tạo + Danh sách mời phải >= 3
    if (!userIds || !Array.isArray(userIds) || userIds.length < 2) {
      res.status(400).json({
        error: "Nhóm phải có ít nhất 3 thành viên (bao gồm người tạo)",
      });
      return;
    }

    // Tạo danh sách members ban đầu
    const initialMembers = [
      { userId: creatorId, role: "LEADER" },
      ...userIds.map((id) => ({ userId: id, role: "MEMBER" })),
    ];

    const newGroup = await Conversation.create({
      name,
      groupAvatar,
      isGroup: true,
      members: initialMembers,
    });

    res.status(201).json({ message: "Tạo nhóm thành công", data: newGroup });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Thêm Thành viên (Chỉ thêm người chưa có trong nhóm)
export const addMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId } = req.params;
    const { newUserId } = req.body;

    // Tìm nhóm và kiểm tra xem user đã tồn tại chưa
    const group = await Conversation.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Không tìm thấy nhóm" });
      return;
    }

    const isExist = group.members.some((m) => m.userId === newUserId);
    if (isExist) {
      res
        .status(400)
        .json({ error: "Người dùng này đã là thành viên của nhóm" });
      return;
    }

    group.members.push({
      userId: newUserId,
      role: "MEMBER",
      joinedAt: new Date(),
    });
    await group.save();

    res.status(200).json({ message: "Đã thêm thành viên", data: group });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Kick / Rời nhóm (Phân quyền Kick & Rời nhóm)
export const removeMember = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { groupId, userId } = req.params; // userId bị kick hoặc tự rời
    const requesterId = req.headers["x-user-id"] as string; // Người bấm nút

    const group = await Conversation.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Không tìm thấy nhóm" });
      return;
    }

    const requester = group.members.find((m) => m.userId === requesterId);
    const target = group.members.find((m) => m.userId === userId);

    if (!requester || !target) {
      res.status(400).json({ error: "Thành viên không hợp lệ" });
      return;
    }

    // TRƯỜNG HỢP 1: TỰ RỜI NHÓM (userId === requesterId)
    if (userId === requesterId) {
      if (requester.role === "LEADER") {
        res.status(400).json({
          error:
            "Trưởng nhóm không thể rời đi. Hãy trao quyền Trưởng nhóm cho người khác trước.",
        });
        return;
      }
      // Cho phép rời nhóm bình thường
    }
    // TRƯỜNG HỢP 2: BỊ KICK (userId !== requesterId)
    else {
      // Chỉ LEADER hoặc DEPUTY mới được kick
      if (requester.role === "MEMBER") {
        res.status(403).json({ error: "Bạn không có quyền kick thành viên" });
        return;
      }
      // DEPUTY không thể kick LEADER hoặc DEPUTY khác
      if (requester.role === "DEPUTY" && target.role !== "MEMBER") {
        res
          .status(403)
          .json({ error: "Phó nhóm chỉ có thể kick Thành viên thường" });
        return;
      }
    }

    // Thực hiện xóa
    group.members = group.members.filter((m) => m.userId !== userId);
    await group.save();

    res.status(200).json({ message: "Thao tác thành công", data: group });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 4. Trao quyền (Phó nhóm / Trưởng nhóm)
// Bổ nhiệm phó nhóm
export const updateRole = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { groupId, userId } = req.params;
    const { newRole } = req.body;
    const requesterId = req.headers["x-user-id"] as string;

    const group = await Conversation.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Nhóm không tồn tại" });
      return;
    }

    // Chỉ Trưởng nhóm mới có quyền bổ nhiệm Phó nhóm
    const requester = group.members.find((m) => m.userId === requesterId);
    if (!requester || requester.role !== "LEADER") {
      res.status(403).json({ error: "Chỉ Trưởng nhóm mới có quyền bổ nhiệm" });
      return;
    }

    if (newRole === "LEADER") {
      res
        .status(400)
        .json({ error: "Dùng API chuyển nhượng để thay đổi Trưởng nhóm" });
      return;
    }

    await Conversation.findOneAndUpdate(
      { _id: groupId, "members.userId": userId } as any,
      { $set: { "members.$.role": newRole } } as any,
    );

    res.status(200).json({ message: "Cập nhật quyền thành công" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Chuyển nhượng Trưởng nhóm
export const assignNewLeader = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { groupId, newLeaderId } = req.body;
    const currentLeaderId = req.headers["x-user-id"] as string;

    const group = await Conversation.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Nhóm không tồn tại" });
      return;
    }

    const leader = group.members.find((m) => m.userId === currentLeaderId);
    if (!leader || leader.role !== "LEADER") {
      res.status(403).json({ error: "Bạn không phải Trưởng nhóm" });
      return;
    }

    // 1. Hạ cấp Trưởng nhóm cũ thành MEMBER (hoặc DEPUTY tùy bạn)
    // 2. Nâng cấp Trưởng nhóm mới thành LEADER
    await Conversation.updateOne(
      { _id: groupId, "members.userId": currentLeaderId },
      { $set: { "members.$.role": "MEMBER" } } as any,
    );
    await Conversation.updateOne(
      { _id: groupId, "members.userId": newLeaderId },
      { $set: { "members.$.role": "LEADER" } } as any,
    );

    res.status(200).json({ message: "Đã chuyển nhượng quyền Trưởng nhóm" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 5. Xoá nhóm
export const deleteGroup = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { groupId } = req.params;
    const requesterId = req.headers["x-user-id"] as string;

    const group = await Conversation.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Nhóm không tồn tại" });
      return;
    }

    const leader = group.members.find((m) => m.userId === requesterId);
    if (!leader || leader.role !== "LEADER") {
      res
        .status(403)
        .json({ error: "Chỉ Trưởng nhóm mới có quyền giải tán nhóm" });
      return;
    }

    await Conversation.findByIdAndDelete(groupId);
    res.status(200).json({ message: "Nhóm đã được giải tán vĩnh viễn" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
