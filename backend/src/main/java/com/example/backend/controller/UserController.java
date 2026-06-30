package com.example.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.auth.model.User;
import com.example.backend.auth.repository.UserRepository;
import com.example.backend.dto.UserLookupResponseDTO;
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
        User user = userRepository.findByEmailOrPhoneNumber(identifier, identifier)
                .orElseThrow(() -> new ResourceNotFoundException("User with identifier " + identifier + " not found"));

        UserLookupResponseDTO response = UserLookupResponseDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .build();

        return ResponseEntity.ok(response);
    }
}
