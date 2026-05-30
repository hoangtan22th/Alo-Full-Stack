// @ts-nocheck
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  HeartIcon,
  UserGroupIcon,
  PhoneIcon,
  ArrowRightIcon,
  GiftIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { useAuthStore } from "../../store/useAuthStore";
import { groupService } from "../../services/groupService";
import { userService, UserProfileDTO } from "../../services/userService";

interface YearInReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StatsData {
  userId: string;
  year: number;
  totalMessagesSent: number;
  totalGroupsJoined: number;
  totalCallMinutes: number;
  newFriendsAdded: number;
  yearlyTopChatPartnerId: string | null;
  yearlyMostActiveHour: number | null;
}

export default function YearInReviewModal({ isOpen, onClose }: YearInReviewModalProps) {
  const CURRENT_YEAR = new Date().getFullYear();
  const { userId } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [bestie, setBestie] = useState<UserProfileDTO | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState(0); // -1: prev, 1: next

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const STORY_DURATION = 5000; // 5 seconds per slide
  const UPDATE_INTERVAL = 50; // Update progress bar every 50ms

  // Reset states when modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
      setProgress(0);
      setIsPaused(false);
      setDirection(0);
      fetchStats();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      document.body.style.overflow = "unset";
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  // Fetch yearly statistics
  const fetchStats = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await groupService.getUserYearlyStats(userId, CURRENT_YEAR);
      if (res) {
        setStats(res);
        // If there's a top chat partner, fetch their profile details
        if (res.yearlyTopChatPartnerId) {
          try {
            const partnerProfile = await userService.getUserById(res.yearlyTopChatPartnerId);
            if (partnerProfile) {
              setBestie(partnerProfile);
            }
          } catch (err) {
            console.error("Lỗi khi tải thông tin Bestie:", err);
          }
        }
      }
    } catch (error) {
      console.error("Lỗi khi lấy thống kê Wrapped:", error);
    } finally {
      setLoading(false);
    }
  };

  // Story Progress Timer Engine
  useEffect(() => {
    if (!isOpen || loading || !stats) return;

    // Slide 0 (Intro) does not autoplay, waits for user action
    if (currentSlide === 0) {
      setProgress(0);
      return;
    }

    // Slide 4 (Summary) pauses at 100% and does not auto-advance
    if (currentSlide === 4) {
      setProgress(100);
      return;
    }

    if (isPaused) return;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + (UPDATE_INTERVAL / STORY_DURATION) * 100;
      });
    }, UPDATE_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, loading, currentSlide, isPaused, stats]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentSlide]);

  const handleNext = () => {
    if (currentSlide < 4) {
      setDirection(1);
      setProgress(0);
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setProgress(0);
      setCurrentSlide((prev) => prev - 1);
    }
  };

  // Determine user habit classification
  const getHabitInfo = () => {
    const hour = stats?.yearlyMostActiveHour;
    if (hour === null || hour === undefined) {
      return {
        type: "Early Bird",
        title: "Thành Viên Sớm",
        description: "Bạn luôn bắt đầu ngày mới tràn đầy năng lượng bằng những câu chào ấm áp!",
        gradient: "from-amber-500 via-orange-600 to-rose-700",
        hourText: "thời gian ban ngày",
        isNight: false,
      };
    }

    // If active hour is between 8 PM (20) and 5 AM (5)
    if (hour >= 20 || hour < 5) {
      return {
        type: "Night Owl",
        title: "Cú Đêm Bất Khuất",
        description: "Khi cả thế giới đã say giấc nồng, ngọn lửa kết nối của bạn vẫn sáng bừng!",
        gradient: "from-[#0F2027] via-[#203A43] to-[#2C5364]",
        hourText: `${hour}:00 đêm`,
        isNight: true,
      };
    } else {
      return {
        type: "Early Bird",
        title: "Cánh Chim Sớm",
        description: "Bạn luôn là người mang lại năng lượng tích cực buổi sáng cho tất cả mọi người!",
        gradient: "from-amber-400 via-orange-500 to-rose-600",
        hourText: `${hour}:00 sáng`,
        isNight: false,
      };
    }
  };

  if (!isOpen) return null;

  const habit = getHabitInfo();

  // Slide content custom layout config
  const slideGradients = [
    "from-[#1F1C2C] via-[#352055] to-[#923CB5]", // Slide 0: Cosmos Purple
    "from-[#FF416C] via-[#9F1239] to-[#8A2387]", // Slide 1: Hot Pink Volume
    habit.gradient,                              // Slide 2: Dynamic Habit Gradient
    "from-[#11998e] via-[#10B981] to-[#38bdf8]", // Slide 3: Friendship Green-Blue
    "from-[#8A2387] via-[#E94057] to-[#F27121]", // Slide 4: Summary Sunset
  ];

  // Framer Motion Animation Variants
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: "spring", stiffness: 350, damping: 30 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 },
      },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
      scale: 0.95,
      transition: {
        x: { type: "spring", stiffness: 350, damping: 30 },
        opacity: { duration: 0.2 },
      },
    }),
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-0 md:p-4">
      {/* Outer Click Boundary to Close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Instagram Story Container */}
      <div
        className={`relative w-full max-w-[440px] h-full md:h-[90vh] md:max-h-[820px] md:rounded-3xl shadow-2xl flex flex-col justify-between overflow-hidden transition-all bg-gradient-to-br ${slideGradients[currentSlide]} text-white border border-white/10 z-10 animate-in zoom-in-95 duration-300`}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Close Button on Desktop/Mobile */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-8 right-6 p-2 bg-black/30 hover:bg-black/55 backdrop-blur-md rounded-full z-[70] text-white/80 hover:text-white transition-all cursor-pointer active:scale-90"
        >
          <XMarkIcon className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Progress Indicator Segmented Bars at top */}
        {!loading && stats && (
          <div className="absolute top-5 left-0 right-0 px-6 flex gap-1.5 z-50">
            {[0, 1, 2, 3, 4].map((index) => (
              <div key={index} className="h-1 flex-1 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full bg-white transition-all rounded-full"
                  style={{
                    width:
                      index < currentSlide
                        ? "100%"
                        : index === currentSlide
                          ? `${progress}%`
                          : "0%",
                    transitionDuration: index === currentSlide && progress > 0 ? `${UPDATE_INTERVAL}ms` : "0ms",
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Invisible Tapping Areas (Left 25% / Right 25%) */}
        {!loading && stats && (
          <>
            {currentSlide > 0 && (
              <div
                className="absolute top-16 bottom-16 left-0 w-[25%] z-40 cursor-w-resize"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                title="Quay lại"
              />
            )}
            <div
              className="absolute top-16 bottom-16 right-0 w-[25%] z-40 cursor-e-resize"
              onClick={(e) => {
                e.stopPropagation();
                // Slide 0 starts with the button; right clicking slide 4 does nothing
                if (currentSlide === 0) return;
                handleNext();
              }}
              title="Tiếp theo"
            />
          </>
        )}

        {/* Story Core Display Views */}
        <div className="flex-1 flex flex-col justify-center items-center px-8 relative py-12">
          {loading ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              <p className="font-semibold text-lg text-white/90 animate-pulse tracking-wide">
                Đang tổng hợp khoảnh khắc của bạn...
              </p>
            </div>
          ) : !stats ? (
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="p-4 bg-white/10 rounded-full">
                <GiftIcon className="w-16 h-16 text-yellow-300" />
              </div>
              <h2 className="text-2xl font-black">Chưa sẵn sàng!</h2>
              <p className="text-white/70 text-sm">
                Bạn chưa có đủ hoạt động trong năm {CURRENT_YEAR} để tổng hợp Nhìn lại Wrapped. Hãy nhắn tin và chia sẻ nhiều hơn nhé!
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-white text-black font-extrabold rounded-xl shadow-lg hover:bg-gray-100 transition-all active:scale-95 text-xs"
              >
                Đóng lại
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentSlide}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full h-full flex flex-col justify-between items-center text-center py-6"
              >
                {/* SLIDE 0: INTRO */}
                {currentSlide === 0 && (
                  <div className="my-auto flex flex-col items-center gap-8">
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                      className="p-5 bg-white/15 rounded-3xl backdrop-blur-md shadow-xl border border-white/10"
                    >
                      <SparklesIcon className="w-16 h-16 text-yellow-300 filter drop-shadow-[0_0_10px_rgba(253,224,71,0.5)]" />
                    </motion.div>
                    <div className="space-y-4">
                      <h1 className="text-4xl font-extrabold tracking-tight uppercase">
                        Alo-Chat <span className="text-yellow-300 block text-5xl mt-2 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.3)]">{CURRENT_YEAR}</span> Wrapped
                      </h1>
                      <p className="text-white/80 font-medium text-base px-2 max-w-sm leading-relaxed">
                        Sẵn sàng nhìn lại một hành trình trò chuyện đầy cảm xúc, thói quen thú vị và những người bạn thân thiết nhất của bạn chứ?
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNext();
                      }}
                      className="mt-4 px-10 py-4 bg-white text-indigo-950 font-black text-base rounded-full shadow-2xl hover:scale-105 hover:shadow-yellow-400/20 active:scale-95 transition-all flex items-center gap-3 z-50 cursor-pointer"
                    >
                      Khám phá ngay
                      <ArrowRightIcon className="w-5 h-5 stroke-[2.5]" />
                    </button>
                  </div>
                )}

                {/* SLIDE 1: TOTAL MESSAGES VOLUME */}
                {currentSlide === 1 && (
                  <div className="my-auto flex flex-col items-center gap-6">
                    <div className="p-4 bg-white/10 rounded-full">
                      <ChatBubbleLeftRightIcon className="w-14 h-14 text-white" />
                    </div>
                    <h3 className="text-xl font-bold uppercase tracking-widest text-pink-200">
                      Tần Suất Trò Chuyện
                    </h3>
                    <div className="space-y-2">
                      <motion.h2
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="text-6xl font-black text-yellow-200 font-mono tracking-tight filter drop-shadow-[0_4px_10px_rgba(254,240,138,0.4)]"
                      >
                        {stats.totalMessagesSent.toLocaleString()}
                      </motion.h2>
                      <p className="text-2xl font-extrabold tracking-tight">tin nhắn đã gửi!</p>
                    </div>
                    <p className="text-white/80 text-base max-w-[280px] leading-relaxed font-semibold">
                      {stats.totalMessagesSent > 500
                        ? "Ngón tay của bạn hoạt động hết công suất! Bạn đã chia sẻ biết bao câu chuyện và cảm xúc trong năm nay."
                        : "Những cuộc trò chuyện ấm cúng, tinh tế. Mỗi tin nhắn của bạn đều chứa đựng sự quan tâm chân thành!"}
                    </p>
                  </div>
                )}

                {/* SLIDE 2: MOST ACTIVE HOUR & HABIT */}
                {currentSlide === 2 && (
                  <div className="my-auto flex flex-col items-center gap-6">
                    <div className="p-5 bg-white/10 rounded-full relative">
                      {habit.isNight ? (
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
                          className="text-5xl block"
                        >
                          🦉
                        </motion.span>
                      ) : (
                        <motion.span
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                          className="text-5xl block"
                        >
                          🌅
                        </motion.span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold uppercase tracking-widest text-orange-200">
                        Thói Quen Hoạt Động
                      </h4>
                      <h2 className="text-4.5xl font-black tracking-tight">{habit.title}</h2>
                    </div>
                    <div className="bg-white/10 px-6 py-3.5 rounded-2xl border border-white/10 shadow-lg">
                      <span className="text-white/70 text-xs font-bold block uppercase tracking-wider">Lúc hoạt động nhiều nhất</span>
                      <span className="text-2xl font-black text-yellow-300 font-mono">{habit.hourText}</span>
                    </div>
                    <p className="text-white/90 text-sm max-w-[280px] leading-relaxed font-medium">
                      {habit.description}
                    </p>
                  </div>
                )}

                {/* SLIDE 3: BESTIE */}
                {currentSlide === 3 && (
                  <div className="my-auto flex flex-col items-center gap-6 w-full px-4">
                    <div className="p-4 bg-white/10 rounded-full">
                      <HeartIcon className="w-12 h-12 text-rose-300 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold uppercase tracking-widest text-teal-100">
                        Tri Kỷ Đồng Hành
                      </h4>
                      <h2 className="text-3xl font-extrabold tracking-tight">Người Bạn Tri Kỷ</h2>
                    </div>

                    {bestie ? (
                      <motion.div
                        initial={{ rotate: -5, scale: 0.9 }}
                        animate={{ rotate: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 150 }}
                        className="bg-white p-4 pb-6 rounded-2xl shadow-2xl text-gray-900 w-full max-w-[240px] flex flex-col items-center border-4 border-white relative"
                      >
                        <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-100 mb-3 border border-gray-200">
                          <img
                            src={
                              bestie.avatar?.startsWith("http")
                                ? bestie.avatar
                                : bestie.avatar
                                  ? `http://localhost:8888${bestie.avatar.startsWith("/") ? "" : "/"}${bestie.avatar}`
                                  : "https://ui-avatars.com/api/?name=B&background=E5E7EB&color=374151"
                            }
                            alt={bestie.fullName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(bestie.fullName)}&background=E5E7EB&color=374151`;
                            }}
                          />
                        </div>
                        <h3 className="font-extrabold text-[15px] tracking-tight truncate w-full text-center">
                          {bestie.fullName}
                        </h3>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                          Bạn Thân Nhất
                        </span>
                      </motion.div>
                    ) : (
                      <div className="bg-white/10 p-6 rounded-2xl shadow-xl w-full max-w-[240px] flex flex-col items-center border border-white/15 text-center">
                        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-3 text-3xl">
                          👤
                        </div>
                        <h3 className="font-extrabold text-sm text-white">Tri Kỷ Bí Ẩn</h3>
                        <p className="text-[10px] text-white/50 font-semibold mt-1">
                          Hoạt động trò chuyện riêng tư
                        </p>
                      </div>
                    )}

                    <p className="text-white/80 text-sm max-w-[280px] leading-relaxed font-semibold">
                      Hai bạn đã cùng chia sẻ vô vàn câu chuyện, cảm xúc và đồng hành qua những cột mốc đáng nhớ suốt năm {CURRENT_YEAR}!
                    </p>
                  </div>
                )}

                {/* SLIDE 4: SUMMARY CARD */}
                {currentSlide === 4 && (
                  <div className="my-auto w-full flex flex-col items-center gap-6 px-4">
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-white/10 rounded-full">
                        <SparklesIcon className="w-8 h-8 text-yellow-300" />
                      </div>
                      <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                        Alo-Chat {CURRENT_YEAR} Wrapped
                      </h2>
                    </div>

                    <div className="w-full bg-white/12 backdrop-blur-md rounded-2xl p-5 space-y-4 border border-white/15 shadow-xl text-left">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-white/50 text-[10px] font-bold uppercase tracking-wider block">Tin nhắn đã gửi</span>
                          <span className="text-lg font-black text-yellow-300 font-mono">
                            {stats.totalMessagesSent.toLocaleString()}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-white/50 text-[10px] font-bold uppercase tracking-wider block">Thời lượng gọi thoại</span>
                          <span className="text-lg font-black text-yellow-300 font-mono">
                            {stats.totalCallMinutes} phút
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-white/50 text-[10px] font-bold uppercase tracking-wider block">Nhóm đã tham gia</span>
                          <span className="text-lg font-black text-yellow-300 font-mono">
                            {stats.totalGroupsJoined} nhóm
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-white/50 text-[10px] font-bold uppercase tracking-wider block">Kết nối bạn bè mới</span>
                          <span className="text-lg font-black text-yellow-300 font-mono">
                            {stats.newFriendsAdded} bạn bè
                          </span>
                        </div>
                      </div>

                      <div className="h-px bg-white/10 my-1" />

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-white/50 text-[10px] font-bold uppercase tracking-wider block">Hình mẫu hoạt động</span>
                          <span className="text-sm font-extrabold text-white flex items-center gap-1.5 mt-0.5">
                            {habit.type === "Night Owl" ? "🦉" : "🌅"} {habit.title}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-white/50 text-[10px] font-bold uppercase tracking-wider block">Người bạn thân nhất</span>
                          <span className="text-sm font-extrabold text-white flex items-center gap-1.5 justify-end mt-0.5">
                            {bestie ? `❤️ ${bestie.fullName}` : "👤 Bí ẩn"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                      }}
                      className="px-12 py-3.5 bg-white text-gray-950 font-black text-sm rounded-xl shadow-2xl hover:bg-gray-100 transition-all active:scale-95 cursor-pointer z-50 mt-4"
                    >
                      Kết thúc hành trình
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
