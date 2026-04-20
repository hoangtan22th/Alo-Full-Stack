import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, userService } from "@/services/userService";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function UserEditModal({
  user,
  isOpen,
  onClose,
  onUpdateSuccess,
}: {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    bio: "",
    gender: 0,
    dateOfBirth: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        fullName: user.fullName || "",
        phoneNumber: user.phoneNumber || "",
        bio: user.bio || "",
        gender:
          typeof user.gender === "string"
            ? user.gender.toUpperCase() === "MALE"
              ? 1
              : user.gender.toUpperCase() === "FEMALE"
                ? 2
                : 0
            : user.gender || 0,
        dateOfBirth: user.dateOfBirth
          ? new Date(user.dateOfBirth).toISOString().split("T")[0]
          : "",
      });
    }
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      await userService.updateUser(user.id, {
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        bio: formData.bio,
        gender: Number(formData.gender),
        dateOfBirth: formData.dateOfBirth ? formData.dateOfBirth : null,
      });
      toast.success("Thay đổi thông tin thành công!");
      onUpdateSuccess();
      onClose();
    } catch (error) {
      toast.error("Không thể cập nhật người dùng.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-surface-container-lowest border-outline-variant/20 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Chỉnh sửa thông tin {user.email}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-sm">
          <div className="space-y-1">
            <label className="text-on-surface-variant font-medium">
              Họ và tên
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              className="w-full p-2 bg-surface-container-low border border-outline-variant/20 rounded-md focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-on-surface-variant font-medium">
              Số điện thoại
            </label>
            <input
              type="text"
              value={formData.phoneNumber}
              onChange={(e) =>
                setFormData({ ...formData, phoneNumber: e.target.value })
              }
              className="w-full p-2 bg-surface-container-low border border-outline-variant/20 rounded-md focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-on-surface-variant font-medium">
                Giới tính
              </label>
              <select
                value={formData.gender}
                onChange={(e) =>
                  setFormData({ ...formData, gender: Number(e.target.value) })
                }
                className="w-full p-2 bg-surface-container-low border border-outline-variant/20 rounded-md focus:outline-none focus:border-primary"
              >
                <option value={0}>Không xác định</option>
                <option value={1}>Nam</option>
                <option value={2}>Nữ</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-on-surface-variant font-medium">
                Ngày sinh
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) =>
                  setFormData({ ...formData, dateOfBirth: e.target.value })
                }
                className="w-full p-2 bg-surface-container-low border border-outline-variant/20 rounded-md focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-on-surface-variant font-medium">
              Tiểu sử
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) =>
                setFormData({ ...formData, bio: e.target.value })
              }
              className="w-full p-2 bg-surface-container-low border border-outline-variant/20 rounded-md focus:outline-none focus:border-primary h-24 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary text-on-primary hover:bg-primary/90"
            >
              {loading ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
