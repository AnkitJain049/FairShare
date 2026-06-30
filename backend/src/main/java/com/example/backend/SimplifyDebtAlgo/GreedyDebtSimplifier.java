package com.example.backend.SimplifyDebtAlgo;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;

import com.example.backend.dto.SimplifiedTransactionDTO;

public class GreedyDebtSimplifier implements IDebtSimplifier {

    @Override
    public List<SimplifiedTransactionDTO> simplify(Map<String, BigDecimal> rawBalances) {
        if (rawBalances == null || rawBalances.isEmpty()) {
            return new ArrayList<>();
        }

        PriorityQueue<BalanceEntry> debtors = new PriorityQueue<>((left, right) -> right.getAmount().compareTo(left.getAmount()));
        PriorityQueue<BalanceEntry> creditors = new PriorityQueue<>((left, right) -> left.getAmount().compareTo(right.getAmount()));

        for (Map.Entry<String, BigDecimal> entry : rawBalances.entrySet()) {
            BigDecimal amount = normalize(entry.getValue());
            if (amount.compareTo(BigDecimal.ZERO) > 0) {
                creditors.add(new BalanceEntry(entry.getKey(), amount));
            } else if (amount.compareTo(BigDecimal.ZERO) < 0) {
                debtors.add(new BalanceEntry(entry.getKey(), amount.abs()));
            }
        }

        List<SimplifiedTransactionDTO> transactions = new ArrayList<>();
        while (!debtors.isEmpty() && !creditors.isEmpty()) {
            BalanceEntry debtor = debtors.poll();
            BalanceEntry creditor = creditors.poll();

            if (debtor == null || creditor == null) {
                break;
            }

            BigDecimal settleAmount = debtor.getAmount().min(creditor.getAmount());
            settleAmount = settleAmount.setScale(2, RoundingMode.HALF_UP);

            if (settleAmount.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            transactions.add(SimplifiedTransactionDTO.builder()
                    .fromUserId(debtor.getUserId())
                    .toUserId(creditor.getUserId())
                    .amount(settleAmount)
                    .build());

            debtor.setAmount(debtor.getAmount().subtract(settleAmount));
            creditor.setAmount(creditor.getAmount().subtract(settleAmount));

            if (debtor.getAmount().compareTo(BigDecimal.ZERO) > 0) {
                debtors.add(debtor);
            }
            if (creditor.getAmount().compareTo(BigDecimal.ZERO) > 0) {
                creditors.add(creditor);
            }
        }

        return transactions;
    }

    private BigDecimal normalize(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.setScale(2, RoundingMode.HALF_UP);
    }

    private static class BalanceEntry {
        private final String userId;
        private BigDecimal amount;

        private BalanceEntry(String userId, BigDecimal amount) {
            this.userId = userId;
            this.amount = amount;
        }

        public String getUserId() {
            return userId;
        }

        public BigDecimal getAmount() {
            return amount;
        }

        public void setAmount(BigDecimal amount) {
            this.amount = amount;
        }
    }
}
