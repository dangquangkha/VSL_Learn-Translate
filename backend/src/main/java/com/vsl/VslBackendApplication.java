package com.vsl;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@EnableCaching
@SpringBootApplication
public class VslBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(VslBackendApplication.class, args);
    }
}
