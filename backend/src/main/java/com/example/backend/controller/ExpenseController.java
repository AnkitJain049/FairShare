package com.example.backend.controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.model.Expense;
import com.example.backend.model.Split;
import com.example.backend.model.SplitType;
import com.example.backend.repository.ExpenseRepository;
import com.example.backend.service.ExpenseService;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {
    private final ExpenseService expenseService;
    private final ExpenseRepository expenseRepository;

    public ExpenseController(ExpenseService expenseService, ExpenseRepository expenseRepository) {
        this.expenseService = expenseService;
        this.expenseRepository = expenseRepository;
    }

    @PostMapping
    public ResponseEntity<Expense> createExpense(@RequestBody Map<String, Object> payload) {
        String groupId = (String) payload.get("groupId");
        String description = (String) payload.get("description");
        BigDecimal totalAmount = new BigDecimal(payload.get("totalAmount").toString());
        String paidById = (String) payload.get("paidById");
        SplitType splitType = SplitType.valueOf(((String) payload.get("splitType")).toUpperCase());
        
        // Convert LinkedHashMap to Split objects
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rawSplitDetails = (List<Map<String, Object>>) payload.get("splitDetails");
        List<Split> splitDetails = rawSplitDetails.stream()
            .map(this::mapToSplit)
            .toList();

        Expense createdExpense = expenseService.createExpense(groupId, description, totalAmount, paidById, splitType, splitDetails);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdExpense);
    }

    private Split mapToSplit(Map<String, Object> map) {
        String userId = (String) map.get("userId");
        BigDecimal owedAmount = null;
        if (map.get("owedAmount") != null) {
            owedAmount = new BigDecimal(map.get("owedAmount").toString());
        }
        
        Double percentage = null;
        if (map.get("percentage") != null) {
            percentage = Double.parseDouble(map.get("percentage").toString());
        }
        
        return Split.builder()
            .userId(userId)
            .owedAmount(owedAmount)
            .percentage(percentage)
            .build();
    }

    @GetMapping("/group/{groupId}")
    public ResponseEntity<Page<Expense>> getExpensesByGroup(@PathVariable String groupId,
                                                            @RequestParam(defaultValue = "0") int page,
                                                            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Expense> result = expenseRepository.findByGroupIdOrderByCreatedAtDesc(groupId, pageable);
        return ResponseEntity.ok(result);
    }

    @PutMapping("/{expenseId}")
    public ResponseEntity<Expense> updateExpense(@PathVariable String expenseId, @RequestBody Map<String, Object> payload) {
        String description = (String) payload.get("description");
        BigDecimal totalAmount = new BigDecimal(payload.get("totalAmount").toString());
        String paidById = (String) payload.get("paidById");
        SplitType splitType = SplitType.valueOf(((String) payload.get("splitType")).toUpperCase());
        
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rawSplitDetails = (List<Map<String, Object>>) payload.get("splitDetails");
        List<Split> splitDetails = rawSplitDetails.stream()
            .map(this::mapToSplit)
            .toList();

        Expense updatedExpense = expenseService.updateExpense(expenseId, description, totalAmount, paidById, splitType, splitDetails);
        return ResponseEntity.ok(updatedExpense);
    }

    @DeleteMapping("/{expenseId}")
    public ResponseEntity<Void> deleteExpense(@PathVariable String expenseId) {
        expenseService.deleteExpense(expenseId);
        return ResponseEntity.noContent().build();
    }
}
