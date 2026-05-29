import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
  StyleSheet,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { groupService } from "../services/groupService";
import { userService, UserProfileDTO } from "../services/userService";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SLIDE_DURATION = 5000; // ms per slide

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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const SLIDES = 5;

const SLIDE_COLORS = [
  ["#1F1C2C", "#352055", "#923CB5"], // 0: Intro – Cosmos Purple
  ["#FF416C", "#9F1239", "#8A2387"], // 1: Volume – Hot Pink
  ["#0F2027", "#203A43", "#2C5364"], // 2a: Night Owl (overridden dynamically)
  ["#11998e", "#10B981", "#38bdf8"], // 3: Bestie – Teal
  ["#8A2387", "#E94057", "#F27121"], // 4: Summary – Sunset
];

function linearGradientStyle(colors: string[]) {
  // React Native doesn't have CSS gradients; we simulate with multiple overlapping Views
  // Use a solid top color as BG, lighter overlay for feel
  return { backgroundColor: colors[0] };
}

export default function YearInReviewModal({ isOpen, onClose, userId }: Props) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [bestie, setBestie] = useState<UserProfileDTO | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const progressAnims = useRef(
    Array.from({ length: SLIDES }, () => new Animated.Value(0))
  ).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
      setStats(null);
      setBestie(null);
      setLoading(true);
      progressAnims.forEach((a) => a.setValue(0));
      fetchStats();
    }
  }, [isOpen]);

  const fetchStats = async () => {
    try {
      const res = await groupService.getUserYearlyStats(userId, 2026);
      if (res) {
        setStats(res);
        if (res.yearlyTopChatPartnerId) {
          const profile = await userService.getUserById(res.yearlyTopChatPartnerId);
          if (profile) setBestie(profile);
        }
      }
    } catch (e) {
      console.error("Wrapped fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  // ── Progress bar timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || loading || !stats) return;
    // Slide 0 is manual (Start button), slide 4 stays at end
    if (currentSlide === 0 || currentSlide === SLIDES - 1) return;
    if (isPaused) return;

    progressAnims[currentSlide].setValue(0);
    const anim = Animated.timing(progressAnims[currentSlide], {
      toValue: 1,
      duration: SLIDE_DURATION,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished) goNext();
    });

    return () => anim.stop();
  }, [isOpen, loading, currentSlide, isPaused, stats]);

  const goNext = () => {
    if (currentSlide < SLIDES - 1) {
      progressAnims[currentSlide].setValue(1);
      setCurrentSlide((p) => p + 1);
    }
  };

  const goPrev = () => {
    if (currentSlide > 0) {
      progressAnims[currentSlide].setValue(0);
      setCurrentSlide((p) => p - 1);
    }
  };

  // ── Habit classification ─────────────────────────────────────────────────────
  const getHabit = () => {
    const h = stats?.yearlyMostActiveHour;
    if (h === null || h === undefined) {
      return { isNight: false, title: "Thành Viên Tích Cực", hourText: "ban ngày", emoji: "🌅", colors: ["#f59e0b", "#ea580c", "#9f1239"] };
    }
    if (h >= 20 || h < 5) {
      return { isNight: true, title: "Cú Đêm Bất Khuất", hourText: `${h}:00 đêm`, emoji: "🦉", colors: ["#0F2027", "#203A43", "#2C5364"] };
    }
    return { isNight: false, title: "Cánh Chim Sớm", hourText: `${h}:00 sáng`, emoji: "🌅", colors: ["#f59e0b", "#ea580c", "#9f1239"] };
  };

  const habit = getHabit();
  const slideColors = [
    SLIDE_COLORS[0],
    SLIDE_COLORS[1],
    habit.colors,
    SLIDE_COLORS[3],
    SLIDE_COLORS[4],
  ];

  if (!isOpen) return null;

  const bgColor = slideColors[currentSlide][0];

  return (
    <Modal visible={isOpen} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: bgColor }]}>

        {/* ── Progress bars ── */}
        {!loading && stats && (
          <View style={styles.progressRow}>
            {Array.from({ length: SLIDES }).map((_, i) => (
              <View key={i} style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width:
                        i < currentSlide
                          ? "100%"
                          : i === currentSlide
                          ? progressAnims[i].interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] })
                          : "0%",
                    },
                  ]}
                />
              </View>
            ))}
          </View>
        )}

        {/* ── Close button ── */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={26} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>

        {/* ── Tap zones (left / right) ── */}
        {!loading && stats && (
          <>
            <TouchableOpacity
              style={styles.tapLeft}
              onPress={goPrev}
              onPressIn={() => setIsPaused(true)}
              onPressOut={() => setIsPaused(false)}
            />
            <TouchableOpacity
              style={styles.tapRight}
              onPress={() => { if (currentSlide > 0) goNext(); }}
              onPressIn={() => setIsPaused(true)}
              onPressOut={() => setIsPaused(false)}
            />
          </>
        )}

        {/* ── Main content ── */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="white" />
              <Text style={styles.loadingText}>Đang tổng hợp khoảnh khắc của bạn...</Text>
            </View>
          ) : !stats ? (
            <NoDataSlide onClose={onClose} />
          ) : (
            <>
              {currentSlide === 0 && <SlideIntro onStart={goNext} />}
              {currentSlide === 1 && <SlideVolume stats={stats} />}
              {currentSlide === 2 && <SlideHabit habit={habit} />}
              {currentSlide === 3 && <SlideBestie bestie={bestie} />}
              {currentSlide === 4 && <SlideSummary stats={stats} habit={habit} bestie={bestie} onClose={onClose} />}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Slide components ─────────────────────────────────────────────────────────

function SlideIntro({ onStart }: { onStart: () => void }) {
  return (
    <View style={styles.slideCenter}>
      <View style={styles.iconBox}>
        <Text style={{ fontSize: 52 }}>✨</Text>
      </View>
      <Text style={styles.mainTitle}>Alo-Chat{"\n"}
        <Text style={styles.yearText}>2026</Text>{"\n"}Wrapped
      </Text>
      <Text style={styles.subText}>
        Sẵn sàng nhìn lại một hành trình trò chuyện đầy cảm xúc và những người bạn thân thiết nhất?
      </Text>
      <TouchableOpacity style={styles.startBtn} onPress={onStart}>
        <Text style={styles.startBtnText}>Khám phá ngay  →</Text>
      </TouchableOpacity>
    </View>
  );
}

function SlideVolume({ stats }: { stats: StatsData }) {
  return (
    <View style={styles.slideCenter}>
      <View style={styles.iconBox}>
        <Text style={{ fontSize: 44 }}>💬</Text>
      </View>
      <Text style={styles.labelText}>TẦN SUẤT TRÒ CHUYỆN</Text>
      <Text style={styles.bigNumber}>{stats.totalMessagesSent.toLocaleString()}</Text>
      <Text style={styles.bigNumberSub}>tin nhắn đã gửi!</Text>
      <Text style={styles.subText}>
        {stats.totalMessagesSent > 500
          ? "Ngón tay của bạn hoạt động hết công suất! Bạn đã chia sẻ biết bao câu chuyện trong năm nay."
          : "Những cuộc trò chuyện ấm cúng, tinh tế. Mỗi tin nhắn đều chứa đựng sự quan tâm chân thành!"}
      </Text>
    </View>
  );
}

function SlideHabit({ habit }: { habit: ReturnType<() => ReturnType<typeof Object>> & any }) {
  return (
    <View style={styles.slideCenter}>
      <View style={styles.iconBox}>
        <Text style={{ fontSize: 52 }}>{habit.emoji}</Text>
      </View>
      <Text style={styles.labelText}>THÓI QUEN HOẠT ĐỘNG</Text>
      <Text style={[styles.mainTitle, { fontSize: 30 }]}>{habit.title}</Text>
      <View style={styles.infoPill}>
        <Text style={styles.infoPillLabel}>Lúc hoạt động nhiều nhất</Text>
        <Text style={styles.infoPillValue}>{habit.hourText}</Text>
      </View>
      <Text style={styles.subText}>
        {habit.isNight
          ? "Khi cả thế giới đã say giấc nồng, ngọn lửa kết nối của bạn vẫn sáng bừng!"
          : "Bạn luôn là người mang lại năng lượng tích cực buổi sáng cho tất cả mọi người!"}
      </Text>
    </View>
  );
}

function SlideBestie({ bestie }: { bestie: UserProfileDTO | null }) {
  const avatarUri = bestie?.avatar
    ? bestie.avatar.startsWith("http")
      ? bestie.avatar
      : `http://localhost:8888${bestie.avatar.startsWith("/") ? "" : "/"}${bestie.avatar}`
    : null;

  return (
    <View style={styles.slideCenter}>
      <View style={styles.iconBox}>
        <Text style={{ fontSize: 44 }}>❤️</Text>
      </View>
      <Text style={styles.labelText}>TRI KỶ ĐỒNG HÀNH</Text>
      <Text style={[styles.mainTitle, { fontSize: 28 }]}>Người Bạn Tri Kỷ</Text>
      {bestie ? (
        <View style={styles.bestieCard}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.bestieAvatar} />
          ) : (
            <View style={[styles.bestieAvatar, styles.bestieAvatarFallback]}>
              <Text style={{ color: "#6b7280", fontSize: 28, fontWeight: "bold" }}>
                {bestie.fullName?.charAt(0) || "?"}
              </Text>
            </View>
          )}
          <Text style={styles.bestieName}>{bestie.fullName}</Text>
          <Text style={styles.bestieLabel}>Bạn Thân Nhất</Text>
        </View>
      ) : (
        <View style={styles.bestieCard}>
          <View style={[styles.bestieAvatar, styles.bestieAvatarFallback]}>
            <Text style={{ fontSize: 36 }}>👤</Text>
          </View>
          <Text style={styles.bestieName}>Tri Kỷ Bí Ẩn</Text>
          <Text style={styles.bestieLabel}>Hoạt động trò chuyện riêng tư</Text>
        </View>
      )}
    </View>
  );
}

function SlideSummary({
  stats,
  habit,
  bestie,
  onClose,
}: {
  stats: StatsData;
  habit: any;
  bestie: UserProfileDTO | null;
  onClose: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.slideCenter} showsVerticalScrollIndicator={false}>
      <View style={styles.iconBox}>
        <Text style={{ fontSize: 36 }}>✨</Text>
      </View>
      <Text style={[styles.mainTitle, { fontSize: 22, marginBottom: 16 }]}>Alo-Chat 2026 Wrapped</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryGrid}>
          <SummaryItem label="Tin nhắn đã gửi" value={stats.totalMessagesSent.toLocaleString()} />
          <SummaryItem label="Thời lượng gọi" value={`${stats.totalCallMinutes} phút`} />
          <SummaryItem label="Nhóm đã tham gia" value={`${stats.totalGroupsJoined} nhóm`} />
          <SummaryItem label="Kết nối bạn mới" value={`${stats.newFriendsAdded} người`} />
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryRowLabel}>Hình mẫu</Text>
            <Text style={styles.summaryRowValue}>{habit.emoji} {habit.title}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.summaryRowLabel}>Tri kỷ</Text>
            <Text style={styles.summaryRowValue}>
              {bestie ? `❤️ ${bestie.fullName}` : "👤 Bí ẩn"}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={[styles.startBtn, { backgroundColor: "white", marginTop: 20 }]} onPress={onClose}>
        <Text style={[styles.startBtnText, { color: "#111" }]}>Kết thúc hành trình</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryItemLabel}>{label}</Text>
      <Text style={styles.summaryItemValue}>{value}</Text>
    </View>
  );
}

function NoDataSlide({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.slideCenter}>
      <Text style={{ fontSize: 64 }}>🎁</Text>
      <Text style={[styles.mainTitle, { fontSize: 26 }]}>Chưa sẵn sàng!</Text>
      <Text style={styles.subText}>
        Bạn chưa có đủ hoạt động trong năm 2026 để tổng hợp Wrapped. Hãy nhắn tin và chia sẻ nhiều hơn nhé!
      </Text>
      <TouchableOpacity style={styles.startBtn} onPress={onClose}>
        <Text style={styles.startBtnText}>Đóng lại</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 56,
  },
  progressRow: {
    position: "absolute",
    top: 52,
    left: 16,
    right: 16,
    flexDirection: "row",
    gap: 4,
    zIndex: 50,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "white",
    borderRadius: 2,
  },
  closeBtn: {
    position: "absolute",
    top: 56,
    right: 20,
    zIndex: 100,
    padding: 6,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 20,
  },
  tapLeft: {
    position: "absolute",
    top: 80,
    bottom: 80,
    left: 0,
    width: "25%",
    zIndex: 40,
  },
  tapRight: {
    position: "absolute",
    top: 80,
    bottom: 80,
    right: 0,
    width: "25%",
    zIndex: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: "center",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 12,
  },
  slideCenter: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 20,
  },
  iconBox: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 38,
    fontWeight: "900",
    color: "white",
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 46,
  },
  yearText: {
    color: "#fde047",
    fontSize: 52,
    fontWeight: "900",
  },
  labelText: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: -4,
  },
  subText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 21,
    fontWeight: "500",
    maxWidth: 300,
  },
  bigNumber: {
    fontSize: 64,
    fontWeight: "900",
    color: "#fde047",
    fontVariant: ["tabular-nums"],
    lineHeight: 72,
  },
  bigNumberSub: {
    fontSize: 22,
    fontWeight: "800",
    color: "white",
    marginTop: -4,
  },
  infoPill: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  infoPillLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  infoPillValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fde047",
    fontVariant: ["tabular-nums"],
  },
  startBtn: {
    backgroundColor: "white",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 50,
    marginTop: 8,
  },
  startBtnText: {
    color: "#1a0533",
    fontWeight: "900",
    fontSize: 16,
  },
  bestieCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    width: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  bestieAvatar: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginBottom: 12,
  },
  bestieAvatarFallback: {
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  bestieName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  bestieLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  summaryItem: {
    width: "47%",
  },
  summaryItemLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  summaryItemValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#fde047",
    fontVariant: ["tabular-nums"],
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  summaryRowLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  summaryRowValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "white",
  },
});
