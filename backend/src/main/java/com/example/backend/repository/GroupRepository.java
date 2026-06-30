package com.example.backend.repository;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.example.backend.model.Group;

@Repository
public interface GroupRepository extends MongoRepository<Group, String> {
    List<Group> findByMemberIdsContaining(String userId);
}
