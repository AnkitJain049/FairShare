package com.example.backend.dto;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserBalanceSheetDTO {
    @Builder.Default
    private Map<String, BigDecimal> userVsBalance = new HashMap<>();

    @Builder.Default
    private BigDecimal totalYouAreOwed = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal totalYouOwe = BigDecimal.ZERO;
}
