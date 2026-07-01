package com.example.backend.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.example.backend.dto.UserBalanceSheetDTO;
import com.example.backend.model.Expense;
import com.example.backend.model.Group;
import com.example.backend.model.Payment;
import com.example.backend.model.Split;
import com.example.backend.repository.ExpenseRepository;
import com.example.backend.repository.GroupRepository;
import com.example.backend.repository.PaymentRepository;

@Service
public class BalanceSheetService {
    private final ExpenseRepository expenseRepository;
    private final GroupRepository groupRepository;
    private final PaymentRepository paymentRepository;

    public BalanceSheetService(ExpenseRepository expenseRepository, GroupRepository groupRepository, PaymentRepository paymentRepository) {
        this.expenseRepository = expenseRepository;
        this.groupRepository = groupRepository;
        this.paymentRepository = paymentRepository;
    }

    public Map<String, BigDecimal> getRawGroupBalancesMap(String groupId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));

        List<Expense> expenses = expenseRepository.findByGroupId(groupId);
        Map<String, BigDecimal> balances = new LinkedHashMap<>();

        for (String memberId : group.getMemberIds()) {
            balances.put(memberId, BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        }

        for (Expense expense : expenses) {
            if (expense.getPaidById() == null || expense.getSplitDetails() == null) {
                continue;
            }

            for (Split split : expense.getSplitDetails()) {
                if (split.getUserId() == null || split.getUserId().equals(expense.getPaidById())) {
                    continue;
                }

                BigDecimal owedAmount = normalizeAmount(split.getOwedAmount());
                balances.put(split.getUserId(), balances.getOrDefault(split.getUserId(), BigDecimal.ZERO).subtract(owedAmount));
                balances.put(expense.getPaidById(), balances.getOrDefault(expense.getPaidById(), BigDecimal.ZERO).add(owedAmount));
            }
        }

        // Adjust raw balances using completed payments
        List<Payment> payments = paymentRepository.findByGroupIdAndStatus(groupId, "COMPLETED");
        for (Payment payment : payments) {
            BigDecimal amount = normalizeAmount(payment.getAmount());
            balances.put(payment.getPayerId(), balances.getOrDefault(payment.getPayerId(), BigDecimal.ZERO).add(amount));
            balances.put(payment.getReceiverId(), balances.getOrDefault(payment.getReceiverId(), BigDecimal.ZERO).subtract(amount));
        }

        Map<String, BigDecimal> normalizedBalances = new LinkedHashMap<>();
        for (Map.Entry<String, BigDecimal> entry : balances.entrySet()) {
            normalizedBalances.put(entry.getKey(), normalizeAmount(entry.getValue()));
        }

        return normalizedBalances;
    }

    public UserBalanceSheetDTO calculateGroupBalances(String groupId, String currentUserId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));

        if (!group.getMemberIds().contains(currentUserId)) {
            throw new IllegalArgumentException("User does not belong to this group");
        }

        // 1. Get the true net balances of all members in the group (includes all completed payments)
        Map<String, BigDecimal> rawBalances = getRawGroupBalancesMap(groupId);

        // 2. Simplify the raw balances using the GreedyDebtSimplifier
        com.example.backend.SimplifyDebtAlgo.IDebtSimplifier simplifier = new com.example.backend.SimplifyDebtAlgo.GreedyDebtSimplifier();
        List<com.example.backend.dto.SimplifiedTransactionDTO> transactions = simplifier.simplify(rawBalances);

        // 3. Build the individual userVsBalance map relative to currentUserId from the simplified transactions
        Map<String, BigDecimal> balances = new LinkedHashMap<>();
        for (String memberId : group.getMemberIds()) {
            if (!memberId.equals(currentUserId)) {
                balances.put(memberId, BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            }
        }

        BigDecimal totalYouAreOwed = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalYouOwe = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        for (com.example.backend.dto.SimplifiedTransactionDTO tx : transactions) {
            if (tx.getFromUserId().equals(currentUserId)) {
                // Current user owes tx.getToUserId()
                String toUser = tx.getToUserId();
                BigDecimal amount = tx.getAmount().negate(); // negative balance means we owe them
                balances.put(toUser, balances.getOrDefault(toUser, BigDecimal.ZERO).add(amount));
                totalYouOwe = totalYouOwe.add(tx.getAmount());
            } else if (tx.getToUserId().equals(currentUserId)) {
                // tx.getFromUserId() owes current user
                String fromUser = tx.getFromUserId();
                BigDecimal amount = tx.getAmount(); // positive balance means they owe us
                balances.put(fromUser, balances.getOrDefault(fromUser, BigDecimal.ZERO).add(amount));
                totalYouAreOwed = totalYouAreOwed.add(tx.getAmount());
            }
        }

        // Ensure all values are correctly normalized
        for (Map.Entry<String, BigDecimal> entry : balances.entrySet()) {
            balances.put(entry.getKey(), normalizeAmount(entry.getValue()));
        }

        return UserBalanceSheetDTO.builder()
                .userVsBalance(balances)
                .totalYouAreOwed(normalizeAmount(totalYouAreOwed))
                .totalYouOwe(normalizeAmount(totalYouOwe))
                .build();
    }

    private BigDecimal normalizeAmount(BigDecimal amount) {
        if (amount == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return amount.setScale(2, RoundingMode.HALF_UP);
    }
}
