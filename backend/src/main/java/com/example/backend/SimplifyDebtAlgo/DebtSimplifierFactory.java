package com.example.backend.SimplifyDebtAlgo;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Component;

@Component
public class DebtSimplifierFactory {
    private final Map<String, IDebtSimplifier> registry = new LinkedHashMap<>();

    public DebtSimplifierFactory() {
        registry.put("GREEDY", new GreedyDebtSimplifier());
        registry.put("DFS", new DFSDebtSimplifier());
    }

    public IDebtSimplifier getSimplifier(String algoType) {
        if (algoType == null || algoType.trim().isEmpty()) {
            return registry.getOrDefault("GREEDY", new GreedyDebtSimplifier());
        }

        String normalized = algoType.trim().toUpperCase();
        return registry.getOrDefault(normalized, registry.get("GREEDY"));
    }
}
