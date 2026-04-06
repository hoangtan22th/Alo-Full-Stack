import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  ComputerDesktopIcon,
  KeyIcon,
  LockClosedIcon,
  TrashIcon,
} from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AccountSecurityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // State cho Toggle Switch (Khóa ứng dụng)
  const [isAppLocked, setIsAppLocked] = useState(false);

  // Mock data cho thông tin tài khoản
  const [accountInfo, setAccountInfo] = useState({
    fullName: "Nguyễn Văn An",
    dob: "12/05/1995",
    gender: "Nam",
    phone: "0901234567",
    email: "an.nguyen@example.com",
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#fff", paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b-[1px] border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ArrowLeftIcon size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">
          Tài khoản và bảo mật
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 px-4 pb-32 bg-[#fafafa]"
      >
        {/* Section 1: THÔNG TIN TÀI KHOẢN */}
        <View className="mt-6 mb-6">
          <Text className="text-[11px] font-bold text-gray-400 tracking-wider mb-4 px-1">
            THÔNG TIN TÀI KHOẢN
          </Text>

          <InputField label="HỌ VÀ TÊN" value={accountInfo.fullName} />
          <InputField label="NGÀY SINH" value={accountInfo.dob} />
          <InputField label="GIỚI TÍNH" value={accountInfo.gender} />
          <InputField label="SỐ ĐIỆN THOẠI" value={accountInfo.phone} />
          <InputField label="EMAIL" value={accountInfo.email} />
        </View>

        {/* Section 2: BẢO MẬT */}
        <View className="mb-6">
          <Text className="text-[11px] font-bold text-gray-400 tracking-wider mb-4 px-1">
            BẢO MẬT
          </Text>

          <View className="bg-white p-4 rounded-2xl flex-row items-center justify-between border-[1px] border-gray-200">
            <View className="flex-row items-center">
              <LockClosedIcon size={20} color="#6b7280" />
              <Text className="text-base font-medium text-gray-900 ml-3">
                Khóa ứng dụng
              </Text>
            </View>
            <Switch
              trackColor={{ false: "#d1d5db", true: "#111827" }}
              thumbColor={"#f4f3f4"}
              ios_backgroundColor="#d1d5db"
              onValueChange={() => setIsAppLocked(!isAppLocked)}
              value={isAppLocked}
            />
          </View>
        </View>

        {/* Section 3: ĐĂNG NHẬP */}
        <View className="mb-6">
          <Text className="text-[11px] font-bold text-gray-400 tracking-wider mb-4 px-1">
            ĐĂNG NHẬP
          </Text>

          <View className="bg-white rounded-2xl border-[1px] border-gray-200 overflow-hidden">
            <MenuItem
              icon={<ComputerDesktopIcon size={20} color="#6b7280" />}
              title="Quản lý thiết bị"
              showBorder
            />
            <MenuItem
              icon={<KeyIcon size={20} color="#6b7280" />}
              title="Mật khẩu"
            />
          </View>
        </View>

        {/* Nút Xóa tài khoản */}
        <TouchableOpacity className="bg-red-50 py-4 rounded-2xl flex-row justify-center items-center mt-4">
          <TrashIcon size={18} color="#dc2626" />
          <Text className="text-red-600 font-bold text-base ml-2">
            Xóa tài khoản
          </Text>
        </TouchableOpacity>

        {/* Cảnh báo xóa tài khoản */}
        <Text className="text-xs text-gray-400 text-center mt-4 mb-10 px-6 leading-5">
          Hành động này không thể hoàn tác. Mọi dữ liệu liên quan đến tài khoản
          này sẽ bị xóa vĩnh viễn khỏi hệ thống.
        </Text>

        <View className="h-28" />
      </ScrollView>
    </View>
  );
}

// Component phụ cho Input Form
function InputField({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-4">
      <Text className="text-[10px] font-bold text-gray-400 tracking-wider mb-2 px-2">
        {label}
      </Text>
      <View className="bg-white px-4 py-4 rounded-2xl border-[1px] border-gray-200">
        <TextInput
          value={value}
          //   editable={false} // Tạm thời disable, có thể mở lại nếu muốn cho phép sửa trực tiếp ở đây
          className="text-base text-gray-900 font-medium"
        />
      </View>
    </View>
  );
}

// Component phụ cho Menu Item có mũi tên
function MenuItem({
  icon,
  title,
  showBorder = false,
}: {
  icon: any;
  title: string;
  showBorder?: boolean;
}) {
  return (
    <TouchableOpacity
      className={`flex-row items-center justify-between p-4 bg-white ${showBorder ? "border-b border-gray-100" : ""}`}
    >
      <View className="flex-row items-center">
        {icon}
        <Text className="text-base font-medium text-gray-900 ml-3">
          {title}
        </Text>
      </View>
      <ChevronRightIcon size={16} color="#d1d5db" />
    </TouchableOpacity>
  );
}
