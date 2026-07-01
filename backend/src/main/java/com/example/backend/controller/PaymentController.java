package com.example.backend.controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.auth.model.User;
import com.example.backend.model.Payment;
import com.example.backend.service.PaymentService;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/cash")
    public ResponseEntity<Payment> recordCashPayment(
            @AuthenticationPrincipal User currentUser,
            @RequestBody Map<String, Object> payload) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String groupId = (String) payload.get("groupId");
        String payerId = (String) payload.get("payerId");
        String receiverId = (String) payload.get("receiverId");
        BigDecimal amount = new BigDecimal(payload.get("amount").toString());
        String relatedExpenseId = (String) payload.get("relatedExpenseId");

        Payment payment = paymentService.recordCashPayment(groupId, payerId, receiverId, amount, relatedExpenseId, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(payment);
    }

    @PostMapping("/razorpay/order")
    public ResponseEntity<Map<String, Object>> createRazorpayOrder(
            @AuthenticationPrincipal User currentUser,
            @RequestBody Map<String, Object> payload) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String groupId = (String) payload.get("groupId");
        String payerId = (String) payload.get("payerId");
        String receiverId = (String) payload.get("receiverId");
        BigDecimal amount = new BigDecimal(payload.get("amount").toString());
        String relatedExpenseId = (String) payload.get("relatedExpenseId");

        Map<String, Object> orderDetails = paymentService.createRazorpayOrder(groupId, payerId, receiverId, amount, relatedExpenseId);
        return ResponseEntity.ok(orderDetails);
    }

    @PostMapping("/razorpay/verify")
    public ResponseEntity<Payment> verifyRazorpayPayment(
            @AuthenticationPrincipal User currentUser,
            @RequestBody Map<String, Object> payload) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String razorpayOrderId = (String) payload.get("razorpayOrderId");
        String razorpayPaymentId = (String) payload.get("razorpayPaymentId");
        String razorpaySignature = (String) payload.get("razorpaySignature");

        Payment payment = paymentService.verifyRazorpayPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);
        return ResponseEntity.ok(payment);
    }

    @PostMapping("/{paymentId}/approve")
    public ResponseEntity<Payment> approvePayment(
            @AuthenticationPrincipal User currentUser,
            @PathVariable String paymentId) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Payment payment = paymentService.approvePayment(paymentId, currentUser.getId());
        return ResponseEntity.ok(payment);
    }

    @PostMapping("/{paymentId}/reject")
    public ResponseEntity<Payment> rejectPayment(
            @AuthenticationPrincipal User currentUser,
            @PathVariable String paymentId) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Payment payment = paymentService.rejectPayment(paymentId, currentUser.getId());
        return ResponseEntity.ok(payment);
    }

    @GetMapping("/group/{groupId}")
    public ResponseEntity<List<Payment>> getGroupPayments(
            @AuthenticationPrincipal User currentUser,
            @PathVariable String groupId) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        List<Payment> payments = paymentService.getGroupPayments(groupId);
        return ResponseEntity.ok(payments);
    }
}
