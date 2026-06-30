package com.example.backend.SimplifyDebtAlgo;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import com.example.backend.dto.SimplifiedTransactionDTO;

public class DFSDebtSimplifier implements IDebtSimplifier {

    @Override
    public List<SimplifiedTransactionDTO> simplify(Map<String, BigDecimal> rawBalances) {
        if (rawBalances == null || rawBalances.isEmpty()) {
            return new ArrayList<>();
        }

        List<String> userIds = new ArrayList<>();
        List<BigDecimal> balances = new ArrayList<>();
        for (Map.Entry<String, BigDecimal> entry : rawBalances.entrySet()) {
            BigDecimal amount = normalize(entry.getValue());
            if (amount.compareTo(BigDecimal.ZERO) != 0) {
                userIds.add(entry.getKey());
                balances.add(amount);
            }
        }

        if (userIds.isEmpty()) {
            return new ArrayList<>();
        }

        List<SimplifiedTransactionDTO> bestTransactions = new ArrayList<>();
        int[] bestCount = {Integer.MAX_VALUE};
        List<SimplifiedTransactionDTO> current = new ArrayList<>();
        dfs(userIds, balances, current, bestTransactions, bestCount);
        return bestTransactions;
    }

    private void dfs(List<String> userIds, List<BigDecimal> balances,
                     List<SimplifiedTransactionDTO> current,
                     List<SimplifiedTransactionDTO> bestTransactions, int[] bestCount) {
        if (current.size() >= bestCount[0]) {
            return;
        }

        if (isBalanced(balances)) {
            if (current.size() < bestCount[0]) {
                bestCount[0] = current.size();
                bestTransactions.clear();
                bestTransactions.addAll(current);
            }
            return;
        }

        for (int debtorIndex = 0; debtorIndex < balances.size(); debtorIndex++) {
            BigDecimal debtorAmount = balances.get(debtorIndex);
            if (debtorAmount.compareTo(BigDecimal.ZERO) >= 0) {
                continue;
            }

            for (int creditorIndex = 0; creditorIndex < balances.size(); creditorIndex++) {
                if (creditorIndex == debtorIndex) {
                    continue;
                }

                BigDecimal creditorAmount = balances.get(creditorIndex);
                if (creditorAmount.compareTo(BigDecimal.ZERO) <= 0) {
                    continue;
                }

                BigDecimal settleAmount = debtorAmount.abs().min(creditorAmount.abs()).setScale(2, RoundingMode.HALF_UP);
                if (settleAmount.compareTo(BigDecimal.ZERO) <= 0) {
                    continue;
                }

                List<BigDecimal> nextBalances = new ArrayList<>(balances);
                nextBalances.set(debtorIndex, debtorAmount.add(settleAmount));
                nextBalances.set(creditorIndex, creditorAmount.subtract(settleAmount));

                current.add(SimplifiedTransactionDTO.builder()
                        .fromUserId(userIds.get(debtorIndex))
                        .toUserId(userIds.get(creditorIndex))
                        .amount(settleAmount)
                        .build());

                dfs(userIds, nextBalances, current, bestTransactions, bestCount);
                current.remove(current.size() - 1);
            }
        }
    }

    private boolean isBalanced(List<BigDecimal> balances) {
        for (BigDecimal balance : balances) {
            if (balance.compareTo(BigDecimal.ZERO) != 0) {
                return false;
            }
        }
        return true;
    }

    private BigDecimal normalize(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.setScale(2, RoundingMode.HALF_UP);
    }
}
