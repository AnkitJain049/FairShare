package com.example.backend.controller;

import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class HealthController {
    private final MongoTemplate mongoTemplate;

    public HealthController(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @GetMapping("/db")
    public ResponseEntity<String> testDbConnection() {
        Document pingResult = mongoTemplate.executeCommand(new Document("ping", 1));
        return ResponseEntity.ok("MongoDB connection is healthy: " + pingResult.toJson());
    }
}
