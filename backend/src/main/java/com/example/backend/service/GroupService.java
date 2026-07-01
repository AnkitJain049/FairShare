package com.example.backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import com.example.backend.auth.repository.UserRepository;
import com.example.backend.model.Group;
import com.example.backend.repository.ExpenseRepository;
import com.example.backend.repository.GroupRepository;
import com.example.backend.repository.PaymentRepository;

@Service
public class GroupService {
    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final ExpenseRepository expenseRepository;
    private final PaymentRepository paymentRepository;

    public GroupService(GroupRepository groupRepository, UserRepository userRepository, 
                        ExpenseRepository expenseRepository, PaymentRepository paymentRepository) {
        this.groupRepository = groupRepository;
        this.userRepository = userRepository;
        this.expenseRepository = expenseRepository;
        this.paymentRepository = paymentRepository;
    }

    public Group createGroup(String name, List<String> memberIds) {
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

    public Group updateGroupName(String groupId, String name) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));
        group.setName(name);
        return groupRepository.save(group);
    }

    public void deleteGroup(String groupId) {
        if (!groupRepository.existsById(groupId)) {
            throw new ResourceNotFoundException("Group not found with id: " + groupId);
        }
        // Delete all expenses belonging to this group
        expenseRepository.deleteByGroupId(groupId);
        // Delete all payments belonging to this group
        paymentRepository.deleteByGroupId(groupId);
        // Delete the group itself
        groupRepository.deleteById(groupId);
    }
}
