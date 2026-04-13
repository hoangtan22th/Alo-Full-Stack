package edu.iuh.fit.service.impl;

import edu.iuh.fit.dto.request.UserUpdateRequest;
import edu.iuh.fit.dto.response.UserDto;
import edu.iuh.fit.entity.User;
import edu.iuh.fit.repository.UserRepository;
import edu.iuh.fit.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

    @Override
    public UserDto getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
        return UserDto.fromEntity(user);
    }

    @Override
    public List<UserDto> getUsersByIds(List<String> ids) {
        return userRepository.findAllById(ids).stream()
                .map(UserDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    public UserDto updateUser(String id, UserUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));

        if (request.getFullName() != null) user.setFullName(request.getFullName());
        if (request.getAvatar() != null) user.setAvatar(request.getAvatar());
        if (request.getCoverImage() != null) user.setCoverImage(request.getCoverImage());
        if (request.getGender() != null) user.setGender(request.getGender());
        if (request.getDateOfBirth() != null) user.setDateOfBirth(request.getDateOfBirth());

        User updatedUser = userRepository.save(user);
        return UserDto.fromEntity(updatedUser);
    }

    @Override
    public void deleteUser(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
        // Thay vì xóa cứng, ta ban người dùng (xóa mềm tùy hệ thống, ở đây cập nhật isBanned = true)
        user.setIsBanned(true);
        userRepository.save(user);
    }

    @Override
    public Page<UserDto> searchUsersDynamic(String fullName, String email, String phoneNumber, Pageable pageable) {
        return userRepository.searchUsersDynamic(fullName, email, phoneNumber, pageable)
                .map(UserDto::fromEntity);
    }
}
