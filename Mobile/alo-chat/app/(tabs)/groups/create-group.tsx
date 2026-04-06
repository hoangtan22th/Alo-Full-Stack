import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CameraIcon,
  MagnifyingGlassIcon,
} from "react-native-heroicons/outline";
import { CheckIcon, PlusIcon } from "react-native-heroicons/solid";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Contact = {
  id: string;
  name: string;
  status: string;
  avatar: string | null;
  initials?: string;
};

type ContactSection = {
  title: string;
  data: Contact[];
};

const CONTACT_SECTIONS: ContactSection[] = [
  {
    title: "SUGGESTED",
    data: [
      {
        id: "1",
        name: "Elena Thorne",
        status: "Online",
        avatar:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200",
      },
      {
        id: "2",
        name: "Marcus Aris",
        status: "last seen 2h ago",
        avatar:
          "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200",
      },
      {
        id: "3",
        name: "Julian Vance",
        status: "Available",
        avatar:
          "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=200",
      },
    ],
  },
  {
    title: "B",
    data: [
      {
        id: "4",
        name: "Beatrix Kiddo",
        status: "Away",
        avatar: null,
        initials: "B",
      },
    ],
  },
];

export default function CreateGroupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedContacts, setSelectedContacts] = useState<string[]>([
    "2",
    "4",
  ]);
  const [groupName, setGroupName] = useState("");

  const toggleContact = (id: string) => {
    if (selectedContacts.includes(id)) {
      setSelectedContacts(
        selectedContacts.filter((contactId) => contactId !== id),
      );
    } else {
      setSelectedContacts([...selectedContacts, id]);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "white", paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-50">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-base text-gray-500">Trở về</Text>
        </TouchableOpacity>
        <Text className="text-base font-bold text-gray-900">Tạo nhóm mới</Text>
        <TouchableOpacity>
          <Text className="text-base font-bold text-gray-900">Tạo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="items-center mt-8 mb-6">
          <TouchableOpacity className="w-24 h-24 bg-gray-100 rounded-full items-center justify-center relative">
            <CameraIcon size={32} color="#9ca3af" />
            <View className="absolute bottom-0 right-0 bg-black w-7 h-7 rounded-full items-center justify-center border-[3px] border-white">
              <PlusIcon size={14} color="white" />
            </View>
          </TouchableOpacity>
        </View>

        <View className="items-center px-12 mb-8">
          <TextInput
            placeholder="Tên nhóm"
            placeholderTextColor="#d1d5db"
            value={groupName}
            onChangeText={setGroupName}
            className="text-2xl text-center text-gray-900 w-full pb-2"
          />
          <View className="w-3/5 h-[1px] bg-gray-100" />
        </View>

        <View className="flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 mx-4 mb-6">
          <MagnifyingGlassIcon size={20} color="#9ca3af" />
          <TextInput
            placeholder="Tìm kiếm thành viên"
            placeholderTextColor="#9ca3af"
            className="flex-1 ml-2 text-base text-gray-800"
          />
        </View>

        {CONTACT_SECTIONS.map((section, sectionIndex) => (
          <View key={sectionIndex} className="mb-4">
            <Text className="text-[11px] font-bold text-gray-500 tracking-widest px-5 mb-4">
              {section.title}
            </Text>
            {section.data.map((contact) => {
              const isSelected = selectedContacts.includes(contact.id);
              return (
                <TouchableOpacity
                  key={contact.id}
                  activeOpacity={0.7}
                  onPress={() => toggleContact(contact.id)}
                  className="flex-row items-center px-5 mb-5"
                >
                  {contact.avatar ? (
                    <Image
                      source={{ uri: contact.avatar }}
                      className="w-14 h-14 rounded-full"
                    />
                  ) : (
                    <View className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center">
                      <Text className="text-gray-500 font-bold text-xl">
                        {contact.initials}
                      </Text>
                    </View>
                  )}
                  <View className="flex-1 ml-4 justify-center">
                    <Text className="text-base font-bold text-gray-900 mb-0.5">
                      {contact.name}
                    </Text>
                    <Text className="text-sm text-gray-400">
                      {contact.status}
                    </Text>
                  </View>
                  <View
                    className={`w-6 h-6 rounded-full items-center justify-center ${isSelected ? "bg-black" : "border border-gray-300 bg-transparent"}`}
                  >
                    {isSelected && <CheckIcon size={14} color="white" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Lớp đệm lớn ở cuối để không bị che bởi Bottom Tabs */}
        <View className="h-32" />
      </ScrollView>
    </View>
  );
}
