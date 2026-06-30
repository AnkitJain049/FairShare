package com.example.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.auth.model.User;
import com.example.backend.auth.repository.UserRepository;
import com.example.backend.dto.UserLookupResponseDTO;
import com.example.backend.dto.UserProfileDTO;
import com.example.backend.dto.UserProfileUpdateDTO;
import com.example.backend.service.ResourceNotFoundException;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/lookup")
    public ResponseEntity<UserLookupResponseDTO> lookupUser(@RequestParam("identifier") String identifier) {
        String trimmedIdentifier = identifier != null ? identifier.trim() : "";
        String emailQuery = trimmedIdentifier.toLowerCase();
        
        User user = userRepository.findByEmailOrPhoneNumber(emailQuery, trimmedIdentifier)
                .orElseThrow(() -> new ResourceNotFoundException("User with identifier " + identifier + " not found"));

        UserLookupResponseDTO response = UserLookupResponseDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .build();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserLookupResponseDTO> getUserById(@PathVariable String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id " + userId));

        UserLookupResponseDTO response = UserLookupResponseDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .build();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/profile")
    public ResponseEntity<UserProfileDTO> getUserProfile(@AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }

        UserProfileDTO profile = UserProfileDTO.builder()
                .id(currentUser.getId())
                .name(currentUser.getName())
                .email(currentUser.getEmail())
                .phoneNumber(currentUser.getPhoneNumber())
                .createdAt(currentUser.getCreatedAt())
                .build();

        return ResponseEntity.ok(profile);
    }

    @PutMapping("/profile")
    public ResponseEntity<UserProfileDTO> updateUserProfile(
            @AuthenticationPrincipal User currentUser,
            @RequestBody UserProfileUpdateDTO updateRequest) {
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }

        User dbUser = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (updateRequest.getName() != null && !updateRequest.getName().isBlank()) {
            dbUser.setName(updateRequest.getName());
        }
        if (updateRequest.getPhoneNumber() != null && !updateRequest.getPhoneNumber().isBlank()) {
            dbUser.setPhoneNumber(updateRequest.getPhoneNumber());
        }

        User savedUser = userRepository.save(dbUser);

        UserProfileDTO profile = UserProfileDTO.builder()
                .id(savedUser.getId())
                .name(savedUser.getName())
                .email(savedUser.getEmail())
                .phoneNumber(savedUser.getPhoneNumber())
                .createdAt(savedUser.getCreatedAt())
                .build();

        return ResponseEntity.ok(profile);
    }
}
