package com.vsl.stats;

import com.vsl.participant.JdbcParticipantDirectory;
import com.vsl.stats.repository.DatasetStatsRepository;
import com.vsl.stats.repository.JdbcDatasetStatsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class JdbcDatasetStatsRepositoryTest {

    private JdbcTemplate jdbc;
    private JdbcDatasetStatsRepository repository;

    @BeforeEach
    void setUp() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:stats-" + java.util.UUID.randomUUID() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
                "sa", "");
        jdbc = new JdbcTemplate(dataSource);
        repository = new JdbcDatasetStatsRepository(jdbc);
        createP3ContractSchema();
        insertConsentFixture();
    }

    @Test
    void latestPublishConsentScopesEveryPublicAggregate() {
        DatasetStatsRepository.DatasetSnapshot result =
                repository.load(DatasetStatsRepository.Scope.PUBLIC_CONSENTED);

        assertThat(result.counts().total()).isEqualTo(3);
        assertThat(result.counts().accepted()).isEqualTo(1);
        assertThat(result.counts().rejected()).isEqualTo(1);
        assertThat(result.counts().pending()).isEqualTo(1);
        assertThat(result.counts().contributors()).isEqualTo(1);
        assertThat(result.acceptedByLabel()).containsEntry(1, 1L).doesNotContainKey(2);
        assertThat(result.metadataDistribution().get("region"))
                .containsExactly(new DatasetStatsRepository.DistributionCount("SOUTH", 1));
    }

    @Test
    void latestInternalConsentUsesADifferentScopeAndDirectoryReadsTheSameConsent() {
        DatasetStatsRepository.DatasetSnapshot result =
                repository.load(DatasetStatsRepository.Scope.ADMIN_INTERNAL);
        JdbcParticipantDirectory directory = new JdbcParticipantDirectory(new NamedParameterJdbcTemplate(jdbc));

        assertThat(result.counts().total()).isEqualTo(1);
        assertThat(result.counts().accepted()).isEqualTo(1);
        assertThat(result.acceptedByLabel()).containsEntry(2, 1L);
        assertThat(directory.findByCodes(Set.of("PUBLIC-1", "INTERNAL-1")).get("PUBLIC-1").publishDataset())
                .isTrue();
        assertThat(directory.findByCodes(Set.of("PUBLIC-1", "INTERNAL-1")).get("INTERNAL-1").useInProject())
                .isTrue();
    }

    private void createP3ContractSchema() {
        jdbc.execute("""
                CREATE TABLE participants (
                    id BIGINT PRIMARY KEY,
                    code VARCHAR(64) NOT NULL UNIQUE,
                    handedness VARCHAR(32),
                    knows_vsl BOOLEAN NOT NULL,
                    age_group VARCHAR(32),
                    is_team_member BOOLEAN NOT NULL,
                    region VARCHAR(32)
                )
                """);
        jdbc.execute("""
                CREATE TABLE consents (
                    id BIGINT PRIMARY KEY,
                    participant_id BIGINT NOT NULL,
                    use_in_project BOOLEAN NOT NULL,
                    publish_dataset BOOLEAN NOT NULL,
                    consent_version INTEGER NOT NULL,
                    signed_at TIMESTAMP WITH TIME ZONE NOT NULL
                )
                """);
        jdbc.execute("CREATE TABLE recording_sessions (id BIGINT PRIMARY KEY, participant_id BIGINT NOT NULL)");
        jdbc.execute("CREATE TABLE signs (id BIGINT PRIMARY KEY, label_index INTEGER NOT NULL UNIQUE)");
        jdbc.execute("""
                CREATE TABLE clips (
                    id BIGINT PRIMARY KEY,
                    session_id BIGINT NOT NULL,
                    sign_id INTEGER NOT NULL,
                    quality_status VARCHAR(32) NOT NULL
                )
                """);
    }

    private void insertConsentFixture() {
        jdbc.update("INSERT INTO participants VALUES (1, 'PUBLIC-1', 'RIGHT', FALSE, '18-24', FALSE, 'SOUTH')");
        jdbc.update("INSERT INTO participants VALUES (2, 'INTERNAL-1', 'LEFT', TRUE, '25-34', FALSE, 'CENTRAL')");
        jdbc.update("INSERT INTO consents VALUES (1, 1, FALSE, FALSE, 1, TIMESTAMP WITH TIME ZONE '2026-08-18 00:00:00+00')");
        jdbc.update("INSERT INTO consents VALUES (2, 1, FALSE, TRUE, 2, TIMESTAMP WITH TIME ZONE '2026-08-19 00:00:00+00')");
        jdbc.update("INSERT INTO consents VALUES (3, 2, TRUE, FALSE, 1, TIMESTAMP WITH TIME ZONE '2026-08-19 00:00:00+00')");
        jdbc.update("INSERT INTO recording_sessions VALUES (11, 1)");
        jdbc.update("INSERT INTO recording_sessions VALUES (22, 2)");
        jdbc.update("INSERT INTO signs VALUES (1001, 1)");
        jdbc.update("INSERT INTO signs VALUES (1002, 2)");
        jdbc.update("INSERT INTO clips VALUES (101, 11, 1001, 'ACCEPTED')");
        jdbc.update("INSERT INTO clips VALUES (102, 11, 1001, 'REJECTED')");
        jdbc.update("INSERT INTO clips VALUES (103, 11, 1002, 'PENDING')");
        jdbc.update("INSERT INTO clips VALUES (201, 22, 1002, 'ACCEPTED')");
    }
}
