// // src/pages/contacts/GroupInvitePage.tsx
// // Trang hiển thị lời mời vào nhóm (join requests dành cho LEADER/DEPUTY)
// // và cho phép người dùng gửi yêu cầu tham gia nhóm.

// import { useState, useEffect, useCallback } from "react";
// import {
//   EnvelopeOpenIcon,
//   CheckIcon,
//   TrashIcon,
//   UserGroupIcon,
//   XMarkIcon,
//   ShieldCheckIcon,
//   ClockIcon,
//   ArrowPathIcon,
// } from "@heroicons/react/24/outline";
// import {
//   getMyGroups,
//   getJoinRequests,
//   approveJoinRequest,
//   rejectJoinRequest,
//   type IGroup,
//   type IJoinRequest,
// } from "../../api/group.api";

// // ===========================
// // CONFIG: Thay bằng auth context thực tế
// // ===========================
// const CURRENT_USER_ID = localStorage.getItem("userId") || "demo-user-id";
// const AUTH_TOKEN = localStorage.getItem("token") || undefined;

// // ===========================
// // TYPE: Request với thông tin nhóm kèm theo
// // ===========================
// interface EnrichedRequest {
//   id: string; // join request userId
//   groupId: string;
//   groupName: string;
//   groupAvatar: string;
//   memberCount: number;
//   isApprovalRequired: boolean;
//   isLinkEnabled: boolean;
//   requestedAt: string;
// }

// // ===========================
// // MODAL XEM CHI TIẾT YÊU CẦU
// // ===========================
// const RequestPreviewModal = ({
//   request,
//   onClose,
//   onApprove,
//   onReject,
//   loading,
// }: {
//   request: EnrichedRequest | null;
//   onClose: () => void;
//   onApprove: (groupId: string, userId: string) => void;
//   onReject: (groupId: string, userId: string) => void;
//   loading: boolean;
// }) => {
//   if (!request) return null;

//   return (
//     <div
//       onClick={onClose}
//       className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in"
//     >
//       <div
//         onClick={(e) => e.stopPropagation()}
//         className="bg-white w-full max-w-sm flex flex-col rounded-[28px] shadow-2xl overflow-hidden relative animate-in zoom-in-95"
//       >
//         {/* Cover */}
//         <div className="h-24 relative bg-black shrink-0">
//           {request.groupAvatar ? (
//             <img
//               src={request.groupAvatar}
//               className="w-full h-full object-cover opacity-50"
//               alt="cover"
//             />
//           ) : (
//             <div className="w-full h-full flex items-center justify-center text-4xl font-black text-white/30">
//               {request.groupName.charAt(0).toUpperCase()}
//             </div>
//           )}
//           <button
//             onClick={onClose}
//             className="absolute top-4 right-4 p-1.5 bg-black/40 hover:bg-black/60 rounded-full text-white transition backdrop-blur-md"
//           >
//             <XMarkIcon className="w-5 h-5 stroke-2" />
//           </button>
//         </div>

//         <div className="px-6 pb-6 relative flex-1">
//           {/* Avatar Nhóm */}
//           <div className="flex justify-center -mt-12 mb-4">
//             <div className="w-24 h-24 rounded-[24px] border-[4px] border-white overflow-hidden shadow-lg bg-gray-100">
//               {request.groupAvatar ? (
//                 <img
//                   src={request.groupAvatar}
//                   className="w-full h-full object-cover"
//                   alt="Group"
//                 />
//               ) : (
//                 <div className="w-full h-full flex items-center justify-center text-3xl font-black text-gray-400">
//                   {request.groupName.charAt(0).toUpperCase()}
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Info */}
//           <div className="text-center mb-6">
//             <h3 className="font-black text-[20px] text-gray-900 tracking-tight leading-tight mb-1">
//               {request.groupName}
//             </h3>
//             <div className="flex items-center justify-center gap-2 text-[12px] font-bold text-gray-400 uppercase tracking-wide">
//               <UserGroupIcon className="w-4 h-4" />
//               {request.memberCount} thành viên
//               <span>•</span>
//               {request.isApprovalRequired ? (
//                 <span className="text-orange-400">Có phê duyệt</span>
//               ) : (
//                 <span className="text-green-500">Mở</span>
//               )}
//             </div>
//           </div>

//           {/* Request info */}
//           <div className="bg-[#F8F9FA] p-4 rounded-2xl mb-6 relative">
//             <div className="absolute -top-2.5 left-4 px-2 bg-[#F8F9FA] text-[10px] font-black text-gray-400 uppercase tracking-widest">
//               Yêu cầu từ User ID
//             </div>
//             <p className="text-[13px] font-bold text-gray-700 text-center font-mono">
//               {request.id}
//             </p>
//             <p className="text-[11px] text-gray-400 text-center mt-1">
//               {new Date(request.requestedAt).toLocaleString("vi-VN")}
//             </p>
//           </div>

//           {/* Actions */}
//           <div className="space-y-2.5">
//             <button
//               onClick={() => onApprove(request.groupId, request.id)}
//               disabled={loading}
//               className="w-full bg-black text-white py-3.5 rounded-xl font-bold text-[14px] hover:bg-neutral-800 transition shadow-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
//             >
//               <CheckIcon className="w-5 h-5 stroke-2" /> Phê duyệt
//             </button>
//             <button
//               onClick={() => onReject(request.groupId, request.id)}
//               disabled={loading}
//               className="w-full bg-white text-red-500 hover:bg-red-50 py-3 rounded-xl font-bold text-[14px] border border-red-100 transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
//             >
//               <TrashIcon className="w-5 h-5" /> Từ chối
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// // ===========================
// // TRANG CHÍNH
// // ===========================
// export default function GroupInvitePage() {
//   const [requests, setRequests] = useState<EnrichedRequest[]>([]);
//   const [selectedRequest, setSelectedRequest] =
//     useState<EnrichedRequest | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [actionLoading, setActionLoading] = useState(false);
//   const [error, setError] = useState("");

//   // Tải tất cả join requests từ tất cả nhóm mà user là LEADER/DEPUTY
//   const loadAllRequests = useCallback(async () => {
//     setLoading(true);
//     setError("");
//     try {
//       const groupsRes = await getMyGroups({
//         userId: CURRENT_USER_ID,
//         token: AUTH_TOKEN,
//       });
//       if (groupsRes.error || !groupsRes.data) {
//         setError(groupsRes.error || "Không thể tải danh sách nhóm");
//         return;
//       }

//       const myGroups = groupsRes.data;

//       // Lọc chỉ nhóm mà user là LEADER hoặc DEPUTY
//       const managedGroups = myGroups.filter((g) => {
//         const myMember = g.members.find((m) => m.userId === CURRENT_USER_ID);
//         return (
//           myMember && (myMember.role === "LEADER" || myMember.role === "DEPUTY")
//         );
//       });

//       // Tải join requests cho từng nhóm quản lý
//       const allRequests: EnrichedRequest[] = [];
//       await Promise.all(
//         managedGroups.map(async (group) => {
//           if (!group.joinRequests || group.joinRequests.length === 0) return;
//           group.joinRequests.forEach((req) => {
//             allRequests.push({
//               id: req.userId,
//               groupId: group._id,
//               groupName: group.name,
//               groupAvatar: group.groupAvatar,
//               memberCount: group.members.length,
//               isApprovalRequired: group.isApprovalRequired,
//               isLinkEnabled: group.isLinkEnabled,
//               requestedAt: req.requestedAt,
//             });
//           });
//         }),
//       );

//       setRequests(allRequests);
//     } catch {
//       setError("Không thể tải dữ liệu. Vui lòng thử lại.");
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     loadAllRequests();
//   }, [loadAllRequests]);

//   const handleApprove = async (groupId: string, userId: string) => {
//     setActionLoading(true);
//     try {
//       const res = await approveJoinRequest({
//         groupId,
//         targetUserId: userId,
//         userId: CURRENT_USER_ID,
//         token: AUTH_TOKEN,
//       });
//       if (res.error) {
//         alert(res.error);
//         return;
//       }
//       setRequests((prev) =>
//         prev.filter((r) => !(r.groupId === groupId && r.id === userId)),
//       );
//       setSelectedRequest(null);
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   const handleReject = async (groupId: string, userId: string) => {
//     setActionLoading(true);
//     try {
//       const res = await rejectJoinRequest({
//         groupId,
//         targetUserId: userId,
//         userId: CURRENT_USER_ID,
//         token: AUTH_TOKEN,
//       });
//       if (res.error) {
//         alert(res.error);
//         return;
//       }
//       setRequests((prev) =>
//         prev.filter((r) => !(r.groupId === groupId && r.id === userId)),
//       );
//       setSelectedRequest(null);
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   return (
//     <div className="flex-1 h-screen bg-[#fafafa] p-4 lg:p-6 overflow-y-auto scrollbar-hide">
//       <div className="max-w-5xl mx-auto">
//         {/* Header */}
//         <div className="flex items-center justify-between mb-8 pb-5 border-b border-gray-200/60">
//           <div className="flex items-center gap-3">
//             <div className="p-2.5 bg-black rounded-2xl text-white shadow-lg">
//               <EnvelopeOpenIcon className="w-6 h-6 stroke-2" />
//             </div>
//             <div>
//               <h1 className="text-xl lg:text-2xl font-black text-gray-900 tracking-tight">
//                 Yêu cầu tham gia nhóm
//               </h1>
//               <p className="text-[12px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
//                 {loading
//                   ? "Đang tải..."
//                   : `${requests.length} yêu cầu chờ duyệt`}
//               </p>
//             </div>
//           </div>

//           {/* Refresh button */}
//           <button
//             onClick={loadAllRequests}
//             disabled={loading}
//             className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition disabled:opacity-50"
//           >
//             <ArrowPathIcon
//               className={`w-5 h-5 text-gray-600 ${loading ? "animate-spin" : ""}`}
//             />
//           </button>
//         </div>

//         {/* Error */}
//         {error && (
//           <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600 font-medium">
//             {error}
//           </div>
//         )}

//         {/* Loading skeletons */}
//         {loading && (
//           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
//             {Array.from({ length: 3 }).map((_, i) => (
//               <div
//                 key={i}
//                 className="bg-white rounded-[28px] p-5 animate-pulse shadow-sm"
//               >
//                 <div className="flex items-start justify-between mb-4">
//                   <div className="w-14 h-14 rounded-[14px] bg-gray-200" />
//                   <div className="h-6 w-20 bg-gray-100 rounded-lg" />
//                 </div>
//                 <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
//                 <div className="h-3 w-1/2 bg-gray-100 rounded mb-3" />
//                 <div className="h-16 bg-gray-50 rounded-xl mb-4" />
//                 <div className="flex gap-2">
//                   <div className="flex-1 h-10 bg-gray-200 rounded-xl" />
//                   <div className="flex-1 h-10 bg-gray-100 rounded-xl" />
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}

//         {/* Empty State */}
//         {!loading && requests.length === 0 && (
//           <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-gray-200 shadow-sm flex flex-col items-center">
//             <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
//               <EnvelopeOpenIcon className="w-8 h-8 text-gray-300" />
//             </div>
//             <p className="text-gray-400 text-sm font-bold">
//               {error
//                 ? "Không thể tải dữ liệu."
//                 : "Không có yêu cầu tham gia nào đang chờ duyệt."}
//             </p>
//             {!error && (
//               <p className="text-gray-300 text-xs font-medium mt-1">
//                 Bạn chỉ thấy yêu cầu từ các nhóm bạn là Trưởng nhóm hoặc Phó
//                 nhóm.
//               </p>
//             )}
//           </div>
//         )}

//         {/* Grid Danh sách yêu cầu */}
//         {!loading && requests.length > 0 && (
//           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
//             {requests.map((req) => (
//               <div
//                 key={`${req.groupId}-${req.id}`}
//                 onClick={() => setSelectedRequest(req)}
//                 className="bg-white border-2 border-transparent hover:border-black rounded-[28px] p-5 flex flex-col shadow-sm hover:shadow-xl transition-all cursor-pointer group"
//               >
//                 {/* Header Card */}
//                 <div className="flex items-start justify-between mb-4">
//                   <div className="relative">
//                     <div className="w-14 h-14 rounded-[14px] border border-gray-100 overflow-hidden shadow-sm bg-gray-100">
//                       {req.groupAvatar ? (
//                         <img
//                           src={req.groupAvatar}
//                           className="w-full h-full object-cover"
//                           alt=""
//                         />
//                       ) : (
//                         <div className="w-full h-full flex items-center justify-center text-xl font-black text-gray-400">
//                           {req.groupName.charAt(0).toUpperCase()}
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                   <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
//                     <ClockIcon className="w-3 h-3 text-gray-400" />
//                     <span className="text-[10px] font-bold text-gray-500">
//                       {new Date(req.requestedAt).toLocaleDateString("vi-VN")}
//                     </span>
//                   </div>
//                 </div>

//                 {/* Thông tin */}
//                 <div className="flex-1">
//                   <h3 className="font-black text-[16px] text-gray-900 leading-tight mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
//                     {req.groupName}
//                   </h3>
//                   <p className="text-[12px] font-medium text-gray-500 mb-3">
//                     {req.memberCount} thành viên •{" "}
//                     {req.isApprovalRequired ? (
//                       <span className="text-orange-500">Có phê duyệt</span>
//                     ) : (
//                       <span className="text-green-500">Nhóm mở</span>
//                     )}
//                   </p>
//                   <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
//                     <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
//                       User ID yêu cầu
//                     </p>
//                     <p className="text-[13px] text-gray-700 font-mono font-bold truncate">
//                       {req.id}
//                     </p>
//                   </div>
//                 </div>

//                 {/* Quick Actions */}
//                 <div className="flex gap-2 mt-5">
//                   <button
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       handleApprove(req.groupId, req.id);
//                     }}
//                     disabled={actionLoading}
//                     className="flex-1 bg-black text-white py-2.5 rounded-xl font-bold text-[12px] hover:bg-neutral-800 transition active:scale-95 flex items-center justify-center gap-1 disabled:opacity-50"
//                   >
//                     <CheckIcon className="w-3.5 h-3.5 stroke-2" /> Duyệt
//                   </button>
//                   <button
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       handleReject(req.groupId, req.id);
//                     }}
//                     disabled={actionLoading}
//                     className="flex-1 bg-white text-gray-600 py-2.5 rounded-xl font-bold text-[12px] border border-gray-200 hover:border-black hover:text-black transition active:scale-95 flex items-center justify-center gap-1 disabled:opacity-50"
//                   >
//                     <TrashIcon className="w-3.5 h-3.5" /> Từ chối
//                   </button>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       {/* Modal chi tiết */}
//       <RequestPreviewModal
//         request={selectedRequest}
//         onClose={() => setSelectedRequest(null)}
//         onApprove={handleApprove}
//         onReject={handleReject}
//         loading={actionLoading}
//       />
//     </div>
//   );
// }
