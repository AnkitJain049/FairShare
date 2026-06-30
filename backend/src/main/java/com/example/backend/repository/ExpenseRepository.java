package com.example.backend.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.example.backend.model.Expense;

@Repository
public interface ExpenseRepository extends MongoRepository<Expense, String> {
    List<Expense> findByGroupId(String groupId);

    Page<Expense> findByGroupIdOrderByCreatedAtDesc(String groupId, Pageable pageable);
}
