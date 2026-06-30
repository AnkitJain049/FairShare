package com.example.backend.model;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

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
@Document(collection = "expenses")
public class Expense {
    @Id
    private String id;
    @Indexed
    private String groupId;
    private String description;
    private BigDecimal totalAmount;
    private String paidById;
    private SplitType splitType;
    private List<Split> splitDetails;
    private LocalDateTime createdAt;

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = normalizeAmount(totalAmount);
    }

    private BigDecimal normalizeAmount(BigDecimal amount) {
        if (amount == null) {
            return null;
        }
        if (amount.scale() > 2) {
            throw new IllegalArgumentException("Expense amount must not have more than 2 decimal places");
        }
        return amount.setScale(2, RoundingMode.HALF_UP);
    }
}
