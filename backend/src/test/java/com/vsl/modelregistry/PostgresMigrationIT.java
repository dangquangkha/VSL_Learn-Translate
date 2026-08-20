package com.vsl.modelregistry;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PostgresMigrationIT {

    @Test
    void allMigrationsApplyAndDatabaseEnforcesModelRegistryInvariants() {
        String url = System.getProperty("vsl.it.jdbcUrl", "jdbc:postgresql://127.0.0.1:55432/vsl_test");
        String user = System.getProperty("vsl.it.user", "vsl_test");
        String password = System.getProperty("vsl.it.password", "vsl_test");
        Flyway flyway = Flyway.configure()
                .dataSource(url, user, password)
                .cleanDisabled(false)
                .locations("classpath:db/migration")
                .load();
        flyway.clean();

        assertThat(flyway.migrate().migrationsExecuted).isEqualTo(3);

        JdbcTemplate jdbc = new JdbcTemplate(new DriverManagerDataSource(url, user, password));
        Integer requiredColumns = jdbc.queryForObject("""
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'model_versions'
                  AND column_name IN (
                    'id', 'semver', 'r2_key', 'labels_hash', 'artifact_sha256',
                    'input_signature', 'metrics', 'release_eligible',
                    'validation_results', 'is_active', 'created_at'
                  )
                """, Integer.class);
        assertThat(requiredColumns).isEqualTo(11);

        insertModel(jdbc, "1.0.0", true, true);
        assertThatThrownBy(() -> insertModel(jdbc, "1.1.0", true, true))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> insertModel(jdbc, "2.0.0", false, true))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private static void insertModel(JdbcTemplate jdbc, String semver,
                                    boolean releaseEligible, boolean active) {
        String hash = "a".repeat(64);
        jdbc.update("""
                INSERT INTO model_versions (
                    id, semver, r2_key, labels_hash, artifact_sha256,
                    input_signature, metrics, release_eligible,
                    validation_results, is_active
                ) VALUES (?, ?, ?, ?, ?, CAST(? AS jsonb), CAST(? AS jsonb), ?, CAST(? AS jsonb), ?)
                """, UUID.randomUUID(), semver, "models/" + semver + "/model.onnx", hash, hash,
                "{}", "{}", releaseEligible, "{}", active);
    }
}
