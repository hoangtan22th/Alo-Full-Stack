// // src/pages/groups/GroupListPage.tsx
// import { useState, useEffect, useCallback } from "react";
// import {
//   AdjustmentsHorizontalIcon,
//   BellSlashIcon,
//   MapPinIcon,
//   MagnifyingGlassIcon,
//   ChevronRightIcon,
//   ArrowRightOnRectangleIcon,
//   DocumentIcon,
//   DocumentTextIcon,
//   TableCellsIcon,
//   PlusIcon,
//   XMarkIcon,
//   CheckIcon,
//   CameraIcon,
// } from "@heroicons/react/24/outline";
// import { StarIcon } from "@heroicons/react/24/solid";
// import { toast } from "sonner";
// import { useAuthStore } from "@/store/useAuthStore";
// import axiosClient from "@/config/axiosClient";
// import {
//   getMyGroups,
//   getGroupById,
//   leaveGroup,
//   createGroup,
//   updateApprovalSetting,
//   updateLinkSetting,
//   type IGroup,
// } from "@/api/group.api";

// function useAuth() {
//   const { token, userId } = useAuthStore();
//   return { token: token || undefined, userId: userId || "" };
// }

// const mockFiles = [
//   {
//     id: 1,
//     name: "deployment_flow.pdf",
//     size: "2.4 MB",
//     time: "2 giờ trước",
//     type: "pdf",
//   },
//   {
//     id: 2,
//     name: "api_docs_v2.docx",
//     size: "1.1 MB",
//     time: "Hôm qua",
//     type: "doc",
//   },
//   {
//     id: 3,
//     name: "infrastructure_costs.xlsx",
//     size: "850 KB",
//     time: "3 ngày trước",
//     type: "xls",
//   },
// ];

// interface Friend {
//   displayId: string;
//   displayName: string;
//   displayAvatar: string;
// }

// const GroupCardSkeleton = () => (
//   <div className="p-6 rounded-[32px] bg-gray-50 animate-pulse flex flex-col items-center">
//     <div className="w-20 h-20 rounded-full bg-gray-200 mb-4" />
//     <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
//     <div className="h-3 w-16 bg-gray-100 rounded mb-5" />
//     <div className="h-9 w-3/4 bg-gray-200 rounded-full" />
//   </div>
// );

// // ===========================
// // MODAL TẠO NHÓM
// // ===========================
// const CreateGroupModal = ({
//   onClose,
//   onCreated,
// }: {
//   onClose: () => void;
//   onCreated: () => void;
// }) => {
//   const { token, userId } = useAuth();
//   const [name, setName] = useState("");
//   const [avatarFile, setAvatarFile] = useState<File | null>(null);
//   const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
//   const [friends, setFriends] = useState<Friend[]>([]);
//   const [selectedIds, setSelectedIds] = useState<string[]>([]);
//   const [friendsLoading, setFriendsLoading] = useState(true);
//   const [search, setSearch] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     const load = async () => {
//       try {
//         // ✅ Tối ưu: Dùng thẳng userId từ Store, bỏ gọi /auth/me
//         const res: any = await axiosClient.get("/contacts/friends");
//         const rawData = Array.isArray(res) ? res : res?.data || [];

//         const formatted: Friend[] = rawData.map((f: any) => {
//           const isMeRequester = f.requesterId === userId;
//           return {
//             displayId: isMeRequester ? f.recipientId : f.requesterId,
//             displayName: isMeRequester ? f.recipientName : f.requesterName,
//             displayAvatar: isMeRequester
//               ? f.recipientAvatar
//               : f.requesterAvatar,
//           };
//         });
//         setFriends(formatted);
//       } catch {
//         toast.error("Không thể tải danh sách bạn bè");
//       } finally {
//         setFriendsLoading(false);
//       }
//     };
//     if (userId) load();
//   }, [userId]);

//   const toggleFriend = (id: string) =>
//     setSelectedIds((prev) =>
//       prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
//     );

//   const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     setAvatarFile(file);
//     setAvatarPreview(URL.createObjectURL(file));
//   };
//   const handleSubmit = async () => {
//     if (!name.trim()) return setError("Vui lòng nhập tên nhóm");
//     if (selectedIds.length < 2) return setError("Chọn ít nhất 2 bạn bè");
//     if (!userId) return setError("Không xác định được tài khoản.");

//     setLoading(true);
//     setError("");
//     try {
//       const res: any = await createGroup({
//         name: name.trim(),
//         userIds: selectedIds,
//         avatarFile: avatarFile || undefined,
//         userId,
//         token,
//       });

//       // Nếu API tự cấu trúc lỗi
//       if (res && res.error) {
//         setError(res.error);
//         return;
//       }

//       toast.success(`Đã tạo nhóm "${name}" thành công!`);
//       onCreated();
//       onClose();
//     } catch (err: any) {
//       // ✅ IN CHI TIẾT LỖI RA CONSOLE ĐỂ BẮT BỆNH
//       console.error("CHÍNH XÁC LỖI TẠO NHÓM LÀ:", err);

//       // ✅ HIỂN THỊ LỖI CỦA BACKEND LÊN MÀN HÌNH (Nếu có)
//       const backendMsg =
//         err.response?.data?.message || err.response?.data?.error;
//       setError(
//         backendMsg || err.message || "Lỗi hệ thống hoặc Timeout từ Axios!",
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const filteredFriends = friends.filter((f) =>
//     f.displayName.toLowerCase().includes(search.toLowerCase()),
//   );

//   return (
//     <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
//       <div className="bg-white w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
//         <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
//           <h2 className="text-lg font-black text-gray-900">Tạo nhóm mới</h2>
//           <button
//             onClick={onClose}
//             className="p-1.5 rounded-full hover:bg-gray-100 transition"
//           >
//             <XMarkIcon className="w-5 h-5 text-gray-500" />
//           </button>
//         </div>

//         <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-hide">
//           {error && (
//             <p className="text-sm text-red-500 bg-red-50 p-3 rounded-xl font-medium">
//               {error}
//             </p>
//           )}

//           <div className="flex flex-col items-center gap-2">
//             <label className="cursor-pointer group">
//               <div className="w-20 h-20 rounded-[20px] bg-gray-100 overflow-hidden border-2 border-dashed border-gray-300 group-hover:border-black transition flex items-center justify-center">
//                 {avatarPreview ? (
//                   <img
//                     src={avatarPreview}
//                     className="w-full h-full object-cover"
//                     alt=""
//                   />
//                 ) : (
//                   <CameraIcon className="w-7 h-7 text-gray-400 group-hover:text-black transition" />
//                 )}
//               </div>
//               <input
//                 type="file"
//                 accept="image/*"
//                 className="hidden"
//                 onChange={handleAvatarChange}
//               />
//             </label>
//             <p className="text-[11px] text-gray-400 font-medium">
//               Ảnh nhóm (tuỳ chọn)
//             </p>
//           </div>

//           <div>
//             <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider">
//               Tên nhóm *
//             </label>
//             <input
//               className="mt-1.5 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black transition"
//               placeholder="VD: Team Fullstack..."
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//             />
//           </div>

//           <div>
//             <div className="flex items-center justify-between mb-2">
//               <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider">
//                 Chọn thành viên *
//               </label>
//               {selectedIds.length > 0 && (
//                 <span className="text-[11px] font-bold text-black bg-gray-100 px-2 py-0.5 rounded-full">
//                   Đã chọn {selectedIds.length}
//                 </span>
//               )}
//             </div>

//             {selectedIds.length > 0 && (
//               <div className="flex flex-wrap gap-2 mb-3">
//                 {selectedIds.map((id) => {
//                   const f = friends.find((fr) => fr.displayId === id);
//                   return (
//                     <div
//                       key={id}
//                       className="flex items-center gap-1.5 bg-black text-white px-3 py-1 rounded-full text-xs font-bold"
//                     >
//                       <img
//                         src={f?.displayAvatar || "/avt-mac-dinh.jpg"}
//                         className="w-4 h-4 rounded-full object-cover"
//                         alt=""
//                       />
//                       {f?.displayName || id}
//                       <button onClick={() => toggleFriend(id)}>
//                         <XMarkIcon className="w-3 h-3" />
//                       </button>
//                     </div>
//                   );
//                 })}
//               </div>
//             )}

//             <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 mb-3 focus-within:ring-2 focus-within:ring-black transition">
//               <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 shrink-0" />
//               <input
//                 className="bg-transparent flex-1 text-sm font-medium focus:outline-none"
//                 placeholder="Tìm tên bạn bè..."
//                 value={search}
//                 onChange={(e) => setSearch(e.target.value)}
//               />
//             </div>

//             <div className="space-y-1 max-h-52 overflow-y-auto scrollbar-hide pr-1">
//               {friendsLoading ? (
//                 Array.from({ length: 4 }).map((_, i) => (
//                   <div
//                     key={i}
//                     className="flex items-center gap-3 p-3 rounded-xl animate-pulse"
//                   >
//                     <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
//                     <div className="h-4 w-32 bg-gray-100 rounded" />
//                   </div>
//                 ))
//               ) : filteredFriends.length === 0 ? (
//                 <p className="text-center text-gray-400 text-sm py-8 font-medium italic">
//                   {friends.length === 0
//                     ? "Bạn chưa có bạn bè nào để mời."
//                     : "Không tìm thấy."}
//                 </p>
//               ) : (
//                 filteredFriends.map((f) => {
//                   const isSelected = selectedIds.includes(f.displayId);
//                   return (
//                     <div
//                       key={f.displayId}
//                       onClick={() => toggleFriend(f.displayId)}
//                       className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all select-none ${isSelected ? "bg-black text-white" : "hover:bg-gray-50 text-gray-800"}`}
//                     >
//                       <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-gray-200 bg-gray-100">
//                         <img
//                           src={f.displayAvatar || "/avt-mac-dinh.jpg"}
//                           onError={(e) =>
//                             (e.currentTarget.src = "/avt-mac-dinh.jpg")
//                           }
//                           className="w-full h-full object-cover"
//                           alt=""
//                         />
//                       </div>
//                       <span className="flex-1 font-bold text-sm truncate">
//                         {f.displayName}
//                       </span>
//                       <div
//                         className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? "border-white bg-white" : "border-gray-300"}`}
//                       >
//                         {isSelected && (
//                           <CheckIcon className="w-3 h-3 text-black" />
//                         )}
//                       </div>
//                     </div>
//                   );
//                 })
//               )}
//             </div>
//           </div>
//         </div>

//         <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
//           <button
//             onClick={onClose}
//             className="flex-1 py-3 rounded-xl font-bold text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
//           >
//             Huỷ
//           </button>
//           <button
//             onClick={handleSubmit}
//             disabled={loading || selectedIds.length < 2 || !name.trim()}
//             className="flex-1 py-3 rounded-xl font-bold text-sm bg-black text-white hover:bg-neutral-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
//           >
//             {loading
//               ? "Đang tạo..."
//               : `Tạo nhóm (${selectedIds.length + 1} người)`}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// // ===========================
// // TRANG CHÍNH
// // ===========================
// export default function GroupListPage() {
//   const { token, userId } = useAuth();
//   const [groups, setGroups] = useState<IGroup[]>([]);
//   const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
//   const [selectedGroup, setSelectedGroup] = useState<IGroup | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [detailLoading, setDetailLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [showCreateModal, setShowCreateModal] = useState(false);
//   const [leaveLoading, setLeaveLoading] = useState(false);

//   const loadGroups = useCallback(async () => {
//     if (!userId) return;
//     setLoading(true);
//     setError("");
//     try {
//       const res = await getMyGroups({ userId, token });
//       if (res.error) return setError(res.error);
//       const list = res.data || [];
//       setGroups(list);
//       if (list.length > 0 && !selectedGroupId) setSelectedGroupId(list[0]._id);
//     } catch {
//       setError("Không thể tải danh sách nhóm.");
//     } finally {
//       setLoading(false);
//     }
//   }, [userId, token]);

//   useEffect(() => {
//     loadGroups();
//   }, [loadGroups]);

//   useEffect(() => {
//     if (!selectedGroupId || !userId) return;
//     setDetailLoading(true);
//     getGroupById({ groupId: selectedGroupId, userId, token })
//       .then((res) => {
//         if (res.data) setSelectedGroup(res.data);
//       })
//       .finally(() => setDetailLoading(false));
//   }, [selectedGroupId]);

//   const handleLeaveGroup = async () => {
//     if (!selectedGroupId || !userId) return;
//     if (!confirm("Bạn có chắc muốn rời khỏi nhóm này?")) return;
//     setLeaveLoading(true);
//     try {
//       const res = await leaveGroup({ groupId: selectedGroupId, userId, token });
//       if (res.error) return toast.error(res.error);
//       toast.success("Đã rời nhóm");
//       setSelectedGroupId(null);
//       setSelectedGroup(null);
//       loadGroups();
//     } finally {
//       setLeaveLoading(false);
//     }
//   };

//   const myRole = selectedGroup?.members.find((m) => m.userId === userId)?.role;

//   return (
//     <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
//       <div className="flex-1 overflow-y-auto p-6 lg:p-8 border-r border-gray-100 scrollbar-hide">
//         <div className="max-w-4xl mx-auto">
//           <div className="flex items-center justify-between mb-8">
//             <div>
//               <h1 className="text-2xl font-black tracking-tight text-black mb-1">
//                 Danh sách nhóm
//               </h1>
//               <p className="text-sm font-medium text-gray-500">
//                 {loading ? "Đang tải..." : `${groups.length} nhóm của bạn`}
//               </p>
//             </div>
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={() => setShowCreateModal(true)}
//                 className="flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded-full text-sm font-bold hover:bg-neutral-800 transition shadow-md"
//               >
//                 <PlusIcon className="w-4 h-4" /> Tạo nhóm
//               </button>
//               <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
//                 <AdjustmentsHorizontalIcon className="w-5 h-5 text-gray-600" />
//               </button>
//             </div>
//           </div>

//           {error && (
//             <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600 font-medium">
//               {error}
//             </div>
//           )}

//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
//             {loading ? (
//               Array.from({ length: 4 }).map((_, i) => (
//                 <GroupCardSkeleton key={i} />
//               ))
//             ) : groups.length === 0 ? (
//               <div className="col-span-2 text-center py-20 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200">
//                 <p className="text-gray-400 text-sm font-bold">
//                   Bạn chưa tham gia nhóm nào.
//                 </p>
//                 <button
//                   onClick={() => setShowCreateModal(true)}
//                   className="mt-4 px-6 py-2.5 bg-black text-white rounded-full text-sm font-bold hover:bg-neutral-800 transition"
//                 >
//                   Tạo nhóm đầu tiên
//                 </button>
//               </div>
//             ) : (
//               groups.map((group) => {
//                 const isSelected = group._id === selectedGroupId;
//                 const myMember = group.members.find((m) => m.userId === userId);
//                 return (
//                   <div
//                     key={group._id}
//                     onClick={() => setSelectedGroupId(group._id)}
//                     className={`relative p-6 rounded-[32px] flex flex-col items-center text-center cursor-pointer transition-all duration-300 ${isSelected ? "bg-white border-2 border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.08)] scale-[1.02]" : "bg-transparent hover:bg-gray-50 border-2 border-transparent"}`}
//                   >
//                     {myMember?.role === "LEADER" && isSelected && (
//                       <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100">
//                         <StarIcon className="w-3.5 h-3.5 text-black" />
//                       </div>
//                     )}
//                     <div className="w-20 h-20 rounded-full overflow-hidden mb-4 shadow-sm bg-gray-100">
//                       {group.groupAvatar ? (
//                         <img
//                           src={group.groupAvatar}
//                           alt={group.name}
//                           className="w-full h-full object-cover"
//                         />
//                       ) : (
//                         <div className="w-full h-full flex items-center justify-center text-2xl font-black text-gray-400">
//                           {group.name.charAt(0).toUpperCase()}
//                         </div>
//                       )}
//                     </div>
//                     <h3 className="font-bold text-[17px] text-gray-900 mb-1 tracking-tight line-clamp-1">
//                       {group.name}
//                     </h3>
//                     <p className="text-[13px] text-gray-500 font-medium mb-5">
//                       {group.members.length} thành viên
//                     </p>
//                     <button
//                       className={`w-3/4 py-2.5 rounded-full font-bold text-[13px] transition-all ${isSelected ? "bg-black text-white" : "bg-gray-200/60 text-gray-700 hover:bg-gray-300"}`}
//                     >
//                       {isSelected ? "Đang xem" : "Xem nhóm"}
//                     </button>
//                   </div>
//                 );
//               })
//             )}
//           </div>
//         </div>
//       </div>

//       {/* THÔNG TIN CHI TIẾT */}
//       <div className="hidden lg:flex w-[340px] flex-col shrink-0 bg-[#F8F9FA] z-10">
//         <div className="flex-1 overflow-y-auto p-6 scrollbar-hide pb-10">
//           {detailLoading ? (
//             <div className="flex items-center justify-center h-40">
//               <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
//             </div>
//           ) : !selectedGroup ? (
//             <div className="flex items-center justify-center h-40 text-gray-400 text-sm font-medium text-center px-4">
//               Chọn một nhóm để xem chi tiết
//             </div>
//           ) : (
//             <>
//               <div className="flex flex-col items-center mt-6 mb-8 text-center">
//                 <div className="w-24 h-24 rounded-3xl overflow-hidden mb-4 shadow-md bg-white p-1">
//                   {selectedGroup.groupAvatar ? (
//                     <img
//                       src={selectedGroup.groupAvatar}
//                       alt="avatar"
//                       className="w-full h-full object-cover rounded-[20px]"
//                     />
//                   ) : (
//                     <div className="w-full h-full rounded-[20px] bg-gray-100 flex items-center justify-center text-3xl font-black text-gray-400">
//                       {selectedGroup.name.charAt(0).toUpperCase()}
//                     </div>
//                   )}
//                 </div>
//                 <h2 className="text-xl font-black text-gray-900 tracking-tight">
//                   {selectedGroup.name}
//                 </h2>
//                 <p className="text-xs font-medium text-gray-500 mt-1.5 flex items-center gap-1.5 flex-wrap justify-center">
//                   {selectedGroup.members.length} thành viên
//                   {myRole && (
//                     <span className="bg-black text-white px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
//                       {myRole === "LEADER"
//                         ? "Trưởng"
//                         : myRole === "DEPUTY"
//                           ? "Phó"
//                           : "TV"}
//                     </span>
//                   )}
//                 </p>
//               </div>

//               <div className="flex justify-center gap-3 mb-8">
//                 {[
//                   { icon: BellSlashIcon, label: "Mute" },
//                   { icon: MapPinIcon, label: "Pin" },
//                   { icon: MagnifyingGlassIcon, label: "Search" },
//                 ].map(({ icon: Icon, label }) => (
//                   <button
//                     key={label}
//                     className="flex flex-col items-center justify-center w-16 h-16 rounded-[20px] bg-gray-200/50 hover:bg-gray-200 transition"
//                   >
//                     <Icon className="w-5 h-5 text-gray-700 mb-1" />
//                     <span className="text-[10px] font-bold text-gray-700">
//                       {label}
//                     </span>
//                   </button>
//                 ))}
//               </div>

//               {/* Settings — LEADER/DEPUTY only */}
//               {(myRole === "LEADER" || myRole === "DEPUTY") && (
//                 <div className="mb-8 bg-white rounded-3xl p-5 shadow-sm space-y-4">
//                   <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
//                     Cài đặt nhóm
//                   </h3>
//                   {[
//                     {
//                       label: "Yêu cầu phê duyệt",
//                       value: selectedGroup.isApprovalRequired,
//                       toggle: async () => {
//                         const res = await updateApprovalSetting({
//                           groupId: selectedGroup._id,
//                           isApprovalRequired: !selectedGroup.isApprovalRequired,
//                           userId,
//                           token,
//                         });
//                         if (res.data) setSelectedGroup(res.data);
//                         else toast.error(res.error || "Lỗi");
//                       },
//                     },
//                     {
//                       label: "Tham gia bằng link",
//                       value: selectedGroup.isLinkEnabled,
//                       toggle: async () => {
//                         const res = await updateLinkSetting({
//                           groupId: selectedGroup._id,
//                           isLinkEnabled: !selectedGroup.isLinkEnabled,
//                           userId,
//                           token,
//                         });
//                         if (res.data) setSelectedGroup(res.data);
//                         else toast.error(res.error || "Lỗi");
//                       },
//                     },
//                   ].map(({ label, value, toggle }) => (
//                     <div
//                       key={label}
//                       className="flex items-center justify-between"
//                     >
//                       <span className="text-[13px] font-medium text-gray-700">
//                         {label}
//                       </span>
//                       <button
//                         onClick={toggle}
//                         className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${value ? "bg-black" : "bg-gray-300"}`}
//                       >
//                         <span
//                           className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
//                           style={{
//                             left: 2,
//                             transform: value
//                               ? "translateX(20px)"
//                               : "translateX(0)",
//                           }}
//                         />
//                       </button>
//                     </div>
//                   ))}
//                 </div>
//               )}

//               {/* Members */}
//               <div className="mb-8">
//                 <div className="flex items-center justify-between mb-4">
//                   <h3 className="text-[14px] font-bold text-gray-900">
//                     Thành viên ({selectedGroup.members.length})
//                   </h3>
//                   <button className="text-[12px] font-medium text-gray-500 hover:text-black transition">
//                     Xem tất cả
//                   </button>
//                 </div>
//                 <div className="bg-white rounded-3xl p-4 shadow-sm space-y-3">
//                   {selectedGroup.members.slice(0, 5).map((m) => (
//                     <div key={m.userId} className="flex items-center gap-3">
//                       <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
//                       <span className="text-[13px] font-medium text-gray-700 truncate flex-1">
//                         {m.userId === userId ? "Bạn" : m.userId}
//                       </span>
//                       {m.role !== "MEMBER" && (
//                         <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full shrink-0">
//                           {m.role === "LEADER" ? "Trưởng" : "Phó"}
//                         </span>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               <button
//                 onClick={handleLeaveGroup}
//                 disabled={leaveLoading || myRole === "LEADER"}
//                 className="w-full border-2 border-red-50 hover:bg-red-50 text-red-500 py-4 rounded-3xl font-bold text-[14px] transition flex justify-center items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
//               >
//                 <ArrowRightOnRectangleIcon className="w-5 h-5" />
//                 {myRole === "LEADER"
//                   ? "Chuyển quyền trước khi rời"
//                   : leaveLoading
//                     ? "Đang xử lý..."
//                     : "Rời khỏi nhóm"}
//               </button>
//             </>
//           )}
//         </div>
//       </div>

//       {showCreateModal && (
//         <CreateGroupModal
//           onClose={() => setShowCreateModal(false)}
//           onCreated={loadGroups}
//         />
//       )}
//     </div>
//   );
// }
