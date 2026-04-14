import { Request, Response } from "express";
import mongoose from "mongoose";
import Label, { ILabel } from "../models/Label";
import ConversationLabel, { IConversationLabel } from "../models/ConversationLabel";

const DEFAULT_LABELS = [
  { name: "Bạn bè", color: "#10b981" },     // Emerald
  { name: "Công việc", color: "#3b82f6" },   // Blue
  { name: "Gia đình", color: "#f59e0b" },    // Amber
  { name: "Đồng nghiệp", color: "#8b5cf6" }, // Violet
  { name: "Trả lời sau", color: "#ef4444" }, // Red
];

// Helper check ObjectId
const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

// 1. Lấy danh sách nhãn (Tự động tạo mặc định nếu chưa có)
export const getLabels = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.headers["x-user-id"] || "").toString();
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    let labels: ILabel[] = await Label.find({ userId });

    if (labels.length === 0) {
      const seededLabels = DEFAULT_LABELS.map((l) => ({ ...l, userId }));
      const result = await Label.insertMany(seededLabels);
      labels = result as unknown as ILabel[];
    }

    res.json(labels);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Tạo nhãn mới
export const createLabel = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.headers["x-user-id"] || "").toString();
    const { name, color } = req.body;

    if (!name) {
      res.status(400).json({ error: "Tên nhãn là bắt buộc" });
      return;
    }

    const newLabel = new Label({ name, color, userId });
    await newLabel.save();

    res.status(201).json(newLabel);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Cập nhật nhãn
export const updateLabel = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.headers["x-user-id"] || "").toString();
    const id = (req.params["id"] || "").toString();
    const { name, color } = req.body;

    if (!id || !isValidId(id)) {
      res.status(400).json({ error: "ID nhãn không hợp lệ" });
      return;
    }

    const updatedLabel = await Label.findOneAndUpdate(
      { _id: id, userId },
      { name, color },
      { new: true }
    );

    if (!updatedLabel) {
      res.status(404).json({ error: "Không tìm thấy nhãn hoặc bạn không có quyền" });
      return;
    }

    res.json(updatedLabel);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 4. Xóa nhãn
export const deleteLabel = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.headers["x-user-id"] || "").toString();
    const id = (req.params["id"] || "").toString();

    if (!id || !isValidId(id)) {
      res.status(400).json({ error: "ID nhãn không hợp lệ" });
      return;
    }

    const deletedLabel = await Label.findOneAndDelete({ _id: id, userId });

    if (!deletedLabel) {
      res.status(404).json({ error: "Không tìm thấy nhãn" });
      return;
    }

    // Xóa tất cả các liên kết liên quan đến nhãn này
    await ConversationLabel.deleteMany({ labelId: id, userId });

    res.json({ message: "Đã xóa nhãn thành công" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 5. Gán nhãn cho cuộc hội thoại
export const assignLabel = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.headers["x-user-id"] || "").toString();
    const conversationId = (req.params["conversationId"] || "").toString();
    const { labelId } = req.body;

    if (!conversationId || !isValidId(conversationId)) {
      res.status(400).json({ error: "ID hội thoại không hợp lệ" });
      return;
    }

    if (!labelId) {
      await ConversationLabel.findOneAndDelete({ conversationId, userId });
      res.json({ message: "Đã gỡ nhãn" });
      return;
    }

    const labelIdStr = labelId.toString();
    if (!isValidId(labelIdStr)) {
      res.status(400).json({ error: "ID nhãn không hợp lệ" });
      return;
    }

    const label = await Label.findOne({ _id: labelIdStr, userId });
    if (!label) {
      res.status(404).json({ error: "Nhãn không tồn tại" });
      return;
    }

    const assignment = await ConversationLabel.findOneAndUpdate(
      { conversationId, userId },
      { labelId: labelIdStr },
      { upsert: true, new: true }
    );

    res.json(assignment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 6. Lấy tất cả các gán nhãn của user
export const getConversationLabels = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.headers["x-user-id"] || "").toString();
    const assignments = await ConversationLabel.find({ userId }).populate<{ labelId: ILabel }>("labelId");
    res.json(assignments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};



