package com.example.backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.model.Group;
import com.example.backend.model.GroupType;
import com.example.backend.service.GroupService;

@RestController
@RequestMapping("/api/groups")
public class GroupController {
    private final GroupService groupService;

    public GroupController(GroupService groupService) {
        this.groupService = groupService;
    }

    @PostMapping
    public ResponseEntity<Group> createGroup(@RequestBody Map<String, Object> payload) {
        String name = (String) payload.get("name");
        String typeValue = (String) payload.get("type");
        List<String> memberIds = (List<String>) payload.get("memberIds");

        GroupType type = GroupType.valueOf(typeValue.toUpperCase());
        Group createdGroup = groupService.createGroup(name, type, memberIds);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdGroup);
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<Group> getGroupById(@PathVariable String groupId) {
        return ResponseEntity.ok(groupService.getGroupById(groupId));
    }

    @GetMapping
    public ResponseEntity<List<Group>> getUserGroups(@RequestParam String userId) {
        return ResponseEntity.ok(groupService.getUserGroups(userId));
    }
}
