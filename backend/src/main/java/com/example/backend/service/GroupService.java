package com.example.backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import com.example.backend.auth.repository.UserRepository;
import com.example.backend.model.Group;
import com.example.backend.model.GroupType;
import com.example.backend.repository.GroupRepository;

@Service
public class GroupService {
    private final GroupRepository groupRepository;
    private final UserRepository userRepository;

    public GroupService(GroupRepository groupRepository, UserRepository userRepository) {
        this.groupRepository = groupRepository;
        this.userRepository = userRepository;
    }

    public Group createGroup(String name, GroupType type, List<String> memberIds) {
        if (memberIds == null || memberIds.isEmpty()) {
            throw new IllegalArgumentException("A group must include at least one member");
        }

        for (String memberId : memberIds) {
            if (!userRepository.existsById(memberId)) {
                throw new IllegalArgumentException("Invalid member id: " + memberId);
            }
        }

        Group group = Group.builder()
                .name(name)
                .type(type)
                .memberIds(memberIds)
                .createdAt(LocalDateTime.now())
                .build();

        return groupRepository.save(group);
    }

    public Group getGroupById(String groupId) {
        return groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));
    }

    public List<Group> getUserGroups(String userId) {
        return groupRepository.findByMemberIdsContaining(userId);
    }
}
