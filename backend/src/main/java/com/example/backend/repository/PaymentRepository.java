package com.example.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.example.backend.model.Payment;

@Repository
public interface PaymentRepository extends MongoRepository<Payment, String> {
    List<Payment> findByGroupId(String groupId);
    
    List<Payment> findByGroupIdAndStatus(String groupId, String status);
    
    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);
    
    void deleteByGroupId(String groupId);
    
    void deleteByRelatedExpenseId(String relatedExpenseId);
}
