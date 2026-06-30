package com.example.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import io.github.cdimascio.dotenv.Dotenv;

@SpringBootApplication
public class BackendApplication {

	public static void main(String[] args) {
		// 1. Load the environment variables from the .env file
		Dotenv dotenv = Dotenv.configure().ignoreIfMissing().systemProperties().load();
		String mongoUri = dotenv.get("MONGO_URI");

		// 2. Strict Protection: Stop execution if MONGO_URI is missing or empty
		if (mongoUri == null || mongoUri.isBlank()) {
			throw new IllegalStateException(
					"CRITICAL ERROR: MONGO_URI is missing from your environment! Aborting startup to prevent localhost execution.");
		}

		SpringApplication.run(BackendApplication.class, args);
	}
}
