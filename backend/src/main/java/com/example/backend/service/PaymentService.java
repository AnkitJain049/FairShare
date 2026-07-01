package com.example.backend.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.example.backend.model.Group;
import com.example.backend.model.Payment;
import com.example.backend.repository.GroupRepository;
import com.example.backend.repository.PaymentRepository;
import com.example.backend.auth.repository.UserRepository;

@Service
public class PaymentService {
    private final PaymentRepository paymentRepository;
    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;

    @Value("${razorpay.key-id}")
    private String razorpayKeyId;

    @Value("${razorpay.key-secret}")
    private String razorpayKeySecret;

    public PaymentService(PaymentRepository paymentRepository, GroupRepository groupRepository, UserRepository userRepository) {
        this.paymentRepository = paymentRepository;
        this.groupRepository = groupRepository;
        this.userRepository = userRepository;
        this.restTemplate = new RestTemplate();
    }

    public Payment recordCashPayment(String groupId, String payerId, String receiverId, BigDecimal amount, String relatedExpenseId, String creatorId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));

        if (!group.getMemberIds().contains(payerId) || !group.getMemberIds().contains(receiverId)) {
            throw new IllegalArgumentException("Users do not belong to this group");
        }

        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }

        // If the receiver is the one recording the cash payment, it means they already acknowledge they received it.
        // Thus, we mark it as COMPLETED directly.
        // Otherwise, if the payer records it, it requires receiver's approval, so status is AWAITING_APPROVAL.
        String initialStatus = creatorId.equals(receiverId) ? "COMPLETED" : "AWAITING_APPROVAL";

        Payment payment = Payment.builder()
                .groupId(groupId)
                .payerId(payerId)
                .receiverId(receiverId)
                .amount(amount)
                .paymentMethod("CASH")
                .status(initialStatus)
                .relatedExpenseId(relatedExpenseId)
                .createdAt(LocalDateTime.now())
                .build();

        return paymentRepository.save(payment);
    }

    public Map<String, Object> createRazorpayOrder(String groupId, String payerId, String receiverId, BigDecimal amount, String relatedExpenseId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));

        if (!group.getMemberIds().contains(payerId) || !group.getMemberIds().contains(receiverId)) {
            throw new IllegalArgumentException("Users do not belong to this group");
        }

        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }

        // Amount in paise (1 INR = 100 paise)
        long amountInPaise = amount.multiply(new BigDecimal(100)).longValue();

        // Call Razorpay API
        String url = "https://api.razorpay.com/v1/orders";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBasicAuth(razorpayKeyId, razorpayKeySecret);

        Map<String, Object> body = new HashMap<>();
        body.put("amount", amountInPaise);
        body.put("currency", "INR");
        body.put("receipt", "rcpt_" + System.currentTimeMillis());

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new RuntimeException("Failed to create order with Razorpay");
        }

        String razorpayOrderId = (String) response.getBody().get("id");

        Payment payment = Payment.builder()
                .groupId(groupId)
                .payerId(payerId)
                .receiverId(receiverId)
                .amount(amount)
                .paymentMethod("RAZORPAY")
                .status("PENDING")
                .relatedExpenseId(relatedExpenseId)
                .razorpayOrderId(razorpayOrderId)
                .createdAt(LocalDateTime.now())
                .build();

        paymentRepository.save(payment);

        Map<String, Object> responseData = new HashMap<>();
        responseData.put("orderId", razorpayOrderId);
        responseData.put("amount", amountInPaise);
        responseData.put("currency", "INR");
        responseData.put("keyId", razorpayKeyId);
        responseData.put("paymentId", payment.getId());
        return responseData;
    }

    public Payment verifyRazorpayPayment(String razorpayOrderId, String razorpayPaymentId, String razorpaySignature) {
        Payment payment = paymentRepository.findByRazorpayOrderId(razorpayOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with order id: " + razorpayOrderId));

        if (!payment.getStatus().equals("PENDING")) {
            throw new IllegalStateException("Payment is already processed");
        }

        boolean verified = verifyHmacSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature, razorpayKeySecret);
        if (!verified) {
            payment.setStatus("FAILED");
            paymentRepository.save(payment);
            throw new IllegalArgumentException("Invalid payment signature");
        }

        // Razorpay signature matched! Set payment details and update status to AWAITING_APPROVAL
        payment.setStatus("AWAITING_APPROVAL");
        payment.setRazorpayPaymentId(razorpayPaymentId);
        payment.setRazorpaySignature(razorpaySignature);
        
        return paymentRepository.save(payment);
    }

    public Payment approvePayment(String paymentId, String currentUserId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + paymentId));

        if (!payment.getReceiverId().equals(currentUserId)) {
            throw new IllegalArgumentException("Only the payment receiver can approve this payment");
        }

        if (!payment.getStatus().equals("AWAITING_APPROVAL")) {
            throw new IllegalStateException("Payment cannot be approved from current state: " + payment.getStatus());
        }

        payment.setStatus("COMPLETED");
        return paymentRepository.save(payment);
    }

    public Payment rejectPayment(String paymentId, String currentUserId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + paymentId));

        if (!payment.getReceiverId().equals(currentUserId)) {
            throw new IllegalArgumentException("Only the payment receiver can reject this payment");
        }

        if (!payment.getStatus().equals("AWAITING_APPROVAL")) {
            throw new IllegalStateException("Payment cannot be rejected from current state: " + payment.getStatus());
        }

        payment.setStatus("REJECTED");
        return paymentRepository.save(payment);
    }

    public List<Payment> getGroupPayments(String groupId) {
        return paymentRepository.findByGroupId(groupId);
    }

    private boolean verifyHmacSignature(String orderId, String paymentId, String signature, String secret) {
        try {
            String data = orderId + "|" + paymentId;
            javax.crypto.spec.SecretKeySpec signingKey = new javax.crypto.spec.SecretKeySpec(secret.getBytes(), "HmacSHA256");
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            mac.init(signingKey);
            byte[] rawHmac = mac.doFinal(data.getBytes());
            StringBuilder hexString = new StringBuilder();
            for (byte b : rawHmac) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString().equals(signature);
        } catch (Exception e) {
            return false;
        }
    }
}
