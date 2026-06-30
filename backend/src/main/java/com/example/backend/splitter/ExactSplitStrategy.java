package com.example.backend.splitter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

import com.example.backend.model.Split;

public class ExactSplitStrategy implements ISplitStrategy {
    @Override
    public List<Split> validateAndProcessSplits(BigDecimal totalAmount, List<Split> splitDetails) {
        if (splitDetails == null || splitDetails.isEmpty()) {
            throw new IllegalArgumentException("At least one split detail is required");
        }

        BigDecimal sum = BigDecimal.ZERO;
        List<Split> processed = new ArrayList<>();
        for (Split original : splitDetails) {
            BigDecimal amount = original.getOwedAmount();
            if (amount == null) {
                throw new IllegalArgumentException("Exact split requires owed amounts");
            }
            sum = sum.add(amount.setScale(2, RoundingMode.HALF_UP));
            Split processedSplit = new Split();
            processedSplit.setUserId(original.getUserId());
            processedSplit.setOwedAmount(amount);
            processedSplit.setPercentage(null);
            processed.add(processedSplit);
        }

        if (!sum.equals(totalAmount.setScale(2, RoundingMode.HALF_UP))) {
            throw new IllegalArgumentException("Exact split amounts must equal the total amount");
        }

        return processed;
    }
}
