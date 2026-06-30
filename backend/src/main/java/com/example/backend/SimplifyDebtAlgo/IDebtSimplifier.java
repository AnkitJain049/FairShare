package com.example.backend.SimplifyDebtAlgo;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import com.example.backend.dto.SimplifiedTransactionDTO;

public interface IDebtSimplifier {
    List<SimplifiedTransactionDTO> simplify(Map<String, BigDecimal> rawBalances);
}
