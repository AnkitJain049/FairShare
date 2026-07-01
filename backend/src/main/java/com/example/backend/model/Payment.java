package com.example.backend.model;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "payments")
public class Payment {
    @Id
    private String id;

    @Indexed
    private String groupId;

    private String payerId;
    private String receiverId;
    private BigDecimal amount;
    private String paymentMethod; // "CASH", "RAZORPAY"
    private String status; // "PENDING", "AWAITING_APPROVAL", "COMPLETED", "REJECTED"
    private String relatedExpenseId; // optional link to a single expense

    private String razorpayOrderId; // optional tracking field for Razorpay
    private String razorpayPaymentId; // optional tracking field
    private String razorpaySignature; // optional verification signature

    private LocalDateTime createdAt;

    public void setAmount(BigDecimal amount) {
        this.amount = normalizeAmount(amount);
    }

    private BigDecimal normalizeAmount(BigDecimal amount) {
        if (amount == null) {
            return null;
        }
        if (amount.scale() > 2) {
            throw new IllegalArgumentException("Payment amount must not have more than 2 decimal places");
        }
        return amount.setScale(2, RoundingMode.HALF_UP);
    }
}
