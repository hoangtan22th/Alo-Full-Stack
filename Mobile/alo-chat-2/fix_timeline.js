const fs = require('fs');
const path = './app/profile/timeline.tsx';

let content = fs.readFileSync(path, 'utf8');

// Chunk 1: TextInput
content = content.replace(
  /DeviceEventEmitter,\n  Modal,\n} from "react-native";/g,
  `DeviceEventEmitter,\n  Modal,\n  TextInput,\n} from "react-native";`
);

// Chunk 2: State
content = content.replace(
  `const [isFriend, setIsFriend] = useState(false);\n  const [friendshipId, setFriendshipId] = useState<string | null>(null);`,
  `const [relationStatus, setRelationStatus] = useState<\n    "FRIEND" | "NOT_FRIEND" | "I_SENT_REQUEST" | "THEY_SENT_REQUEST" | "LOADING"\n  >("LOADING");\n  const [friendshipId, setFriendshipId] = useState<string | null>(null);\n  const [message, setMessage] = useState("Xin chào, mình muốn kết bạn với bạn!");\n  const [actionLoading, setActionLoading] = useState(false);\n  const isFriend = relationStatus === "FRIEND";`
);

// Chunk 3: loadProfile
content = content.replace(
  `      if (!isMe) {\n        const friendsList = await contactService.getFriendsList();\n        const friendItem = friendsList.find(\n          (f: any) =>\n            f.requesterId === targetUserId || f.recipientId === targetUserId,\n        );\n        if (friendItem) {\n          setIsFriend(true);\n          setFriendshipId(friendItem.id);\n        } else {\n          setIsFriend(false);\n          setFriendshipId(null);\n        }\n      }`,
  `      if (!isMe) {\n        const friendsList = await contactService.getFriendsList();\n        const friendItem = friendsList.find(\n          (f: any) => f.requesterId === targetUserId || f.recipientId === targetUserId,\n        );\n        if (friendItem) {\n          setRelationStatus("FRIEND");\n          setFriendshipId(friendItem.id);\n        } else {\n          const pending = await contactService.getPendingRequests();\n          const receivedReq = pending.find((r: any) => String(r.requesterId) === String(targetUserId));\n          if (receivedReq) {\n            setRelationStatus("THEY_SENT_REQUEST");\n            setFriendshipId(receivedReq.id);\n          } else {\n            const sent = await contactService.getSentRequests();\n            const sentReq = sent.find((r: any) => String(r.recipientId) === String(targetUserId));\n            if (sentReq) {\n              setRelationStatus("I_SENT_REQUEST");\n              setFriendshipId(sentReq.id);\n            } else {\n              setRelationStatus("NOT_FRIEND");\n              setFriendshipId(null);\n            }\n          }\n        }\n      }`
);

// Chunk 4: handleUnfriend
content = content.replace(
  `            try {\n              await contactService.removeFriend(targetUserId);\n              setIsFriend(false);\n              setFriendshipId(null);`,
  `            try {\n              await contactService.removeFriend(targetUserId);\n              setRelationStatus("NOT_FRIEND");\n              setFriendshipId(null);`
);

// Chunk 5: Add action handlers
content = content.replace(
  `  const handleStartChat = () => {`,
  `  const handleSendRequest = async () => {\n    if (!targetUserId) return;\n    setActionLoading(true);\n    try {\n      const res = await contactService.sendFriendRequest(targetUserId, message);\n      if (res) {\n        Alert.alert("Thành công", "Đã gửi lời mời kết bạn");\n        setRelationStatus("I_SENT_REQUEST");\n        loadProfile();\n      } else {\n        Alert.alert("Lỗi", "Gửi lời mời thất bại");\n      }\n    } catch (error) {\n      Alert.alert("Lỗi", "Có lỗi xảy ra");\n    } finally {\n      setActionLoading(false);\n    }\n  };\n\n  const handleRevokeRequest = async () => {\n    if (!targetUserId) return;\n    setActionLoading(true);\n    try {\n      const res = await contactService.revokeRequest(targetUserId);\n      if (res) {\n        Alert.alert("Thành công", "Đã thu hồi lời mời");\n        setRelationStatus("NOT_FRIEND");\n      } else {\n        Alert.alert("Lỗi", "Thu hồi thất bại");\n      }\n    } catch (error) {\n      Alert.alert("Lỗi", "Có lỗi xảy ra");\n    } finally {\n      setActionLoading(false);\n    }\n  };\n\n  const handleAcceptRequest = async () => {\n    if (!friendshipId) return;\n    setActionLoading(true);\n    try {\n      const res = await contactService.acceptRequest(friendshipId);\n      if (res) {\n        Alert.alert("Thành công", "Đã trở thành bạn bè");\n        setRelationStatus("FRIEND");\n      } else {\n        Alert.alert("Lỗi", "Chấp nhận lời mời thất bại");\n      }\n    } catch (error) {\n      Alert.alert("Lỗi", "Không thể chấp nhận lời mời");\n    } finally {\n      setActionLoading(false);\n    }\n  };\n\n  const handleDeclineRequest = async () => {\n    if (!friendshipId) return;\n    setActionLoading(true);\n    try {\n      const res = await contactService.declineRequest(friendshipId);\n      if (res) {\n        Alert.alert("Thành công", "Đã từ chối lời mời");\n        setRelationStatus("NOT_FRIEND");\n        setFriendshipId(null);\n      } else {\n        Alert.alert("Lỗi", "Từ chối thất bại");\n      }\n    } catch (error) {\n      Alert.alert("Lỗi", "Có lỗi xảy ra");\n    } finally {\n      setActionLoading(false);\n    }\n  };\n\n  const handleStartChat = () => {`
);

// Chunk 6: Text update
content = content.replace(
  `                <Text\n                  className={\`text-[14px] font-semibold \${isFriend ? "text-blue-600" : "text-gray-400"}\`}\n                >\n                  {isFriend ? "Bạn bè" : "Chưa kết bạn"}\n                </Text>`,
  `                <Text\n                  className={\`text-[14px] font-semibold \${isFriend ? "text-blue-600" : "text-gray-400"}\`}\n                >\n                  {relationStatus === "FRIEND" ? "Bạn bè" :\n                   relationStatus === "I_SENT_REQUEST" ? "Đã gửi lời mời" :\n                   relationStatus === "THEY_SENT_REQUEST" ? "Chờ phản hồi" :\n                   relationStatus === "LOADING" ? "Đang tải..." :\n                   "Chưa kết bạn"}\n                </Text>`
);

// Chunk 7: Inject UI elements
content = content.replace(
  `            </>\n          )}\n        </View>\n\n        {isMe && (`,
  `            </>\n          )}\n        </View>\n\n        {!isMe && relationStatus === "NOT_FRIEND" && (\n          <View className="px-5 mb-4 items-center w-full">\n            <View className="w-full mb-3">\n              <Text className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">\n                Lời nhắn kết bạn\n              </Text>\n              <TextInput\n                value={message}\n                onChangeText={setMessage}\n                placeholder="Nhập lời nhắn..."\n                className="w-full bg-[#f4f5f7] px-4 py-3.5 rounded-2xl text-[15px] text-gray-800"\n                maxLength={150}\n              />\n            </View>\n            <TouchableOpacity\n              className="w-full bg-blue-500 rounded-full py-3.5 items-center justify-center flex-row space-x-2"\n              onPress={handleSendRequest}\n              disabled={actionLoading}\n            >\n              {actionLoading ? (\n                <ActivityIndicator color="#fff" size="small" />\n              ) : (\n                <>\n                  <Ionicons name="person-add" size={18} color="#fff" />\n                  <Text className="text-white font-bold text-[15px] ml-1">\n                    Kết bạn\n                  </Text>\n                </>\n              )}\n            </TouchableOpacity>\n          </View>\n        )}\n\n        {!isMe && relationStatus === "I_SENT_REQUEST" && (\n          <View className="px-5 mb-4 items-center w-full">\n            <View className="bg-gray-100 rounded-full py-3 w-full mb-3 items-center">\n              <Text className="text-gray-600 font-medium">Đã gửi lời mời kết bạn</Text>\n            </View>\n            <TouchableOpacity\n              className="w-full bg-gray-200 rounded-full py-3.5 items-center justify-center"\n              onPress={handleRevokeRequest}\n              disabled={actionLoading}\n            >\n              {actionLoading ? (\n                <ActivityIndicator color="#1f2937" size="small" />\n              ) : (\n                <Text className="text-gray-800 font-bold text-[15px]">Thu hồi lời mời</Text>\n              )}\n            </TouchableOpacity>\n          </View>\n        )}\n\n        {!isMe && relationStatus === "THEY_SENT_REQUEST" && (\n          <View className="px-5 mb-4 items-center w-full">\n            <Text className="text-gray-800 text-[14px] mb-3 text-center">\n              <Text className="font-semibold">{profile?.fullName}</Text> muốn kết bạn với bạn\n            </Text>\n            <View className="flex-row w-full justify-between gap-3">\n              <TouchableOpacity\n                className="flex-1 bg-blue-500 rounded-full py-3 items-center justify-center flex-row"\n                onPress={handleAcceptRequest}\n                disabled={actionLoading}\n              >\n                <Ionicons name="checkmark" size={18} color="#fff" />\n                <Text className="text-white font-bold text-[14px] ml-1">Chấp nhận</Text>\n              </TouchableOpacity>\n              <TouchableOpacity\n                className="flex-1 bg-gray-200 rounded-full py-3 items-center justify-center flex-row"\n                onPress={handleDeclineRequest}\n                disabled={actionLoading}\n              >\n                <Ionicons name="close" size={18} color="#4b5563" />\n                <Text className="text-gray-700 font-bold text-[14px] ml-1">Từ chối</Text>\n              </TouchableOpacity>\n            </View>\n          </View>\n        )}\n\n        {isMe && (`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Update complete!');
