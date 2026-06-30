package com.example.backend.splitter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

import com.example.backend.model.Split;

public class EqualSplitStrategy implements ISplitStrategy {
    @Override
    public List<Split> validateAndProcessSplits(BigDecimal totalAmount, List<Split> splitDetails) {
        if (splitDetails == null || splitDetails.isEmpty()) {
            throw new IllegalArgumentException("At least one split detail is required");
        }

        int size = splitDetails.size();
        BigDecimal baseShare = totalAmount.divide(BigDecimal.valueOf(size), 2, RoundingMode.HALF_UP);
        BigDecimal remainder = totalAmount.subtract(baseShare.multiply(BigDecimal.valueOf(size)));

        List<Split> processed = new ArrayList<>();
        for (int i = 0; i < size; i++) {
            Split original = splitDetails.get(i);
            BigDecimal amount = baseShare;
            if (i == 0) {
                amount = amount.add(remainder);
            }
            Split processedSplit = new Split();
            processedSplit.setUserId(original.getUserId());
            processedSplit.setOwedAmount(amount);
            processedSplit.setPercentage(null);
            processed.add(processedSplit);
        }
        return processed;
    }
}
