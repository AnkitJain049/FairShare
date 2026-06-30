package com.example.backend.splitter;

import org.springframework.stereotype.Component;

import com.example.backend.model.SplitType;

@Component
public class SplitStrategyFactory {
    public ISplitStrategy resolve(SplitType splitType) {
        return switch (splitType) {
            case EQUAL -> new EqualSplitStrategy();
            case EXACT -> new ExactSplitStrategy();
            case PERCENTAGE -> new PercentageSplitStrategy();
        };
    }
}
