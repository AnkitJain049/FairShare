package com.example.backend.splitter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

import com.example.backend.model.Split;

public class PercentageSplitStrategy implements ISplitStrategy {
    @Override
    public List<Split> validateAndProcessSplits(BigDecimal totalAmount, List<Split> splitDetails) {
        if (splitDetails == null || splitDetails.isEmpty()) {
            throw new IllegalArgumentException("At least one split detail is required");
        }

        BigDecimal totalPercentage = BigDecimal.ZERO;
        List<Split> processed = new ArrayList<>();
        for (Split original : splitDetails) {
            Double percentage = original.getPercentage();
            if (percentage == null) {
                throw new IllegalArgumentException("Percentage split requires percentages");
            }
            totalPercentage = totalPercentage.add(BigDecimal.valueOf(percentage));
        }

        if (totalPercentage.compareTo(BigDecimal.valueOf(100)) != 0) {
            throw new IllegalArgumentException("Percentages must add up to 100");
        }

        for (Split original : splitDetails) {
            BigDecimal amount = totalAmount.multiply(BigDecimal.valueOf(original.getPercentage() / 100.0))
                    .setScale(2, RoundingMode.HALF_UP);
            Split processedSplit = new Split();
            processedSplit.setUserId(original.getUserId());
            processedSplit.setOwedAmount(amount);
            processedSplit.setPercentage(original.getPercentage());
            processed.add(processedSplit);
        }

        return processed;
    }
}
