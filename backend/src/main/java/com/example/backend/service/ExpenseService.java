package com.example.backend.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import com.example.backend.model.Expense;
import com.example.backend.model.Group;
import com.example.backend.model.Split;
import com.example.backend.model.SplitType;
import com.example.backend.repository.ExpenseRepository;
import com.example.backend.repository.GroupRepository;
import com.example.backend.repository.PaymentRepository;
import com.example.backend.splitter.ISplitStrategy;
import com.example.backend.splitter.SplitStrategyFactory;

@Service
public class ExpenseService {
    private final ExpenseRepository expenseRepository;
    private final GroupRepository groupRepository;
    private final SplitStrategyFactory splitStrategyFactory;
    private final PaymentRepository paymentRepository;

    public ExpenseService(ExpenseRepository expenseRepository, GroupRepository groupRepository,
                          SplitStrategyFactory splitStrategyFactory, PaymentRepository paymentRepository) {
        this.expenseRepository = expenseRepository;
        this.groupRepository = groupRepository;
        this.splitStrategyFactory = splitStrategyFactory;
        this.paymentRepository = paymentRepository;
    }

    public Expense createExpense(String groupId, String description, BigDecimal totalAmount,
                                 String paidById, SplitType splitType, List<Split> splitDetails) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + groupId));

        if (!group.getMemberIds().contains(paidById)) {
            throw new IllegalArgumentException("User does not belong to this group");
        }

        for (Split split : splitDetails) {
            if (!group.getMemberIds().contains(split.getUserId())) {
                throw new IllegalArgumentException("User does not belong to this group");
            }
        }

        ISplitStrategy splitStrategy = splitStrategyFactory.resolve(splitType);
        List<Split> processedSplits = splitStrategy.validateAndProcessSplits(totalAmount, splitDetails);

        Expense expense = Expense.builder()
                .groupId(groupId)
                .description(description)
                .totalAmount(totalAmount)
                .paidById(paidById)
                .splitType(splitType)
                .splitDetails(processedSplits)
                .createdAt(LocalDateTime.now())
                .build();

        return expenseRepository.save(expense);
    }

    public Expense updateExpense(String expenseId, String description, BigDecimal totalAmount,
                                 String paidById, SplitType splitType, List<Split> splitDetails) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + expenseId));

        Group group = groupRepository.findById(expense.getGroupId())
                .orElseThrow(() -> new ResourceNotFoundException("Group not found with id: " + expense.getGroupId()));

        if (!group.getMemberIds().contains(paidById)) {
            throw new IllegalArgumentException("Paid by user does not belong to this group");
        }

        for (Split split : splitDetails) {
            if (!group.getMemberIds().contains(split.getUserId())) {
                throw new IllegalArgumentException("Split user does not belong to this group");
            }
        }

        ISplitStrategy splitStrategy = splitStrategyFactory.resolve(splitType);
        List<Split> processedSplits = splitStrategy.validateAndProcessSplits(totalAmount, splitDetails);

        expense.setDescription(description);
        expense.setTotalAmount(totalAmount);
        expense.setPaidById(paidById);
        expense.setSplitType(splitType);
        expense.setSplitDetails(processedSplits);

        return expenseRepository.save(expense);
    }

    public void deleteExpense(String expenseId) {
        if (!expenseRepository.existsById(expenseId)) {
            throw new ResourceNotFoundException("Expense not found with id: " + expenseId);
        }
        // Delete all payments associated with this specific expense
        paymentRepository.deleteByRelatedExpenseId(expenseId);
        expenseRepository.deleteById(expenseId);
    }
}
