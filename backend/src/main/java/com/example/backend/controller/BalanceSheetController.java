package com.example.backend.controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.SimplifyDebtAlgo.DebtSimplifierFactory;
import com.example.backend.dto.SimplifiedTransactionDTO;
import com.example.backend.dto.UserBalanceSheetDTO;
import com.example.backend.service.BalanceSheetService;

@RestController
@RequestMapping("/api/balances")
public class BalanceSheetController {
    private final BalanceSheetService balanceSheetService;
    private final DebtSimplifierFactory debtSimplifierFactory;

    public BalanceSheetController(BalanceSheetService balanceSheetService, DebtSimplifierFactory debtSimplifierFactory) {
        this.balanceSheetService = balanceSheetService;
        this.debtSimplifierFactory = debtSimplifierFactory;
    }

    @GetMapping("/group/{groupId}/user/{userId}")
    public ResponseEntity<UserBalanceSheetDTO> getGroupBalances(@PathVariable String groupId,
                                                                @PathVariable String userId) {
        UserBalanceSheetDTO balanceSheet = balanceSheetService.calculateGroupBalances(groupId, userId);
        return ResponseEntity.ok(balanceSheet);
    }

    @GetMapping("/group/{groupId}/simplify")
    public ResponseEntity<List<SimplifiedTransactionDTO>> simplifyGroupDebts(@PathVariable String groupId,
                                                                              @RequestParam(defaultValue = "GREEDY") String algo) {
        Map<String, BigDecimal> rawBalances = balanceSheetService.getRawGroupBalancesMap(groupId);
        List<SimplifiedTransactionDTO> simplifiedTransactions = debtSimplifierFactory
                .getSimplifier(algo)
                .simplify(rawBalances);

        return ResponseEntity.ok(simplifiedTransactions);
    }
}
