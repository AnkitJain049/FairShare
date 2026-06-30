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
import com.example.backend.model.Split;
import com.example.backend.repository.ExpenseRepository;
import com.example.backend.repository.GroupRepository;

@Service
public class BalanceSheetService {
    private final ExpenseRepository expenseRepository;
    private final GroupRepository groupRepository;

    public BalanceSheetService(ExpenseRepository expenseRepository, GroupRepository groupRepository) {
        this.expenseRepository = expenseRepository;
        this.groupRepository = groupRepository;
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

        List<Expense> expenses = expenseRepository.findByGroupId(groupId);
        Map<String, BigDecimal> balances = new LinkedHashMap<>();

        for (String memberId : group.getMemberIds()) {
            balances.put(memberId, BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        }

        for (Expense expense : expenses) {
            if (expense.getPaidById() != null && expense.getPaidById().equals(currentUserId)) {
                for (Split split : expense.getSplitDetails()) {
                    if (split.getUserId() != null && !split.getUserId().equals(currentUserId)) {
                        String userId = split.getUserId();
                        BigDecimal owedAmount = normalizeAmount(split.getOwedAmount());
                        balances.put(userId, balances.getOrDefault(userId, BigDecimal.ZERO).add(owedAmount));
                    }
                }
            } else if (expense.getPaidById() != null && !expense.getPaidById().equals(currentUserId)) {
                Split currentUserSplit = expense.getSplitDetails().stream()
                        .filter(split -> currentUserId.equals(split.getUserId()))
                        .findFirst()
                        .orElse(null);

                if (currentUserSplit != null) {
                    String payerId = expense.getPaidById();
                    BigDecimal owedAmount = normalizeAmount(currentUserSplit.getOwedAmount());
                    balances.put(payerId, balances.getOrDefault(payerId, BigDecimal.ZERO).subtract(owedAmount));
                }
            }
        }

        BigDecimal totalYouAreOwed = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalYouOwe = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        for (Map.Entry<String, BigDecimal> entry : balances.entrySet()) {
            BigDecimal normalizedBalance = normalizeAmount(entry.getValue());
            if (normalizedBalance.compareTo(BigDecimal.ZERO) > 0) {
                totalYouAreOwed = totalYouAreOwed.add(normalizedBalance);
            } else if (normalizedBalance.compareTo(BigDecimal.ZERO) < 0) {
                totalYouOwe = totalYouOwe.add(normalizedBalance.abs());
            }
            balances.put(entry.getKey(), normalizedBalance);
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
