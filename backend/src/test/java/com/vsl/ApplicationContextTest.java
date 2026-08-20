package com.vsl;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.web.servlet.MultipartProperties;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:vsl-smoke;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.flyway.enabled=false",
        "jwt.secret=test-only-jwt-key-with-at-least-thirty-two-bytes",
        "r2.endpoint=http://127.0.0.1:9999",
        "r2.access-key=test-access-key",
        "r2.secret-key=test-secret-key",
        "r2.bucket-name=test-bucket"
})
class ApplicationContextTest {

    @Autowired
    private MultipartProperties multipart;

    @Test
    void fullSpringContextLoadsWithAllRequiredConfiguration() {
        assertThat(multipart.getMaxFileSize().toBytes()).isEqualTo(5L * 1024L * 1024L);
        assertThat(multipart.getMaxRequestSize().toBytes()).isEqualTo(6L * 1024L * 1024L);
    }
}
