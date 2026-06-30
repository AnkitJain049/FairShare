package com.example.backend.splitter;

import java.math.BigDecimal;
import java.util.List;

import com.example.backend.model.Split;

public interface ISplitStrategy {
    List<Split> validateAndProcessSplits(BigDecimal totalAmount, List<Split> splitDetails);
}
