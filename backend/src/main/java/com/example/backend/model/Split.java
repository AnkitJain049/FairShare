package com.example.backend.model;

import java.math.BigDecimal;
import java.math.RoundingMode;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Split {
    private String userId;
    private BigDecimal owedAmount;
    private Double percentage;

    public void setOwedAmount(BigDecimal owedAmount) {
        this.owedAmount = normalizeAmount(owedAmount);
    }

    private BigDecimal normalizeAmount(BigDecimal amount) {
        if (amount == null) {
            return null;
        }
        if (amount.scale() > 2) {
            throw new IllegalArgumentException("Split amount must not have more than 2 decimal places");
        }
        return amount.setScale(2, RoundingMode.HALF_UP);
    }
}
