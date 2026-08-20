package com.vsl.stats.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Repository
public class JdbcDatasetStatsRepository implements DatasetStatsRepository {

    private static final Map<String, String> METADATA_COLUMNS = Map.of(
            "region", "region",
            "handedness", "handedness",
            "knowsVsl", "knows_vsl",
            "ageGroup", "age_group"
    );
    private static final long CONTRIBUTOR_TARGET = 50L;

    private final JdbcTemplate jdbc;

    public JdbcDatasetStatsRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // EARS[FR-013..FR-015, FR-026]: every aggregate starts from latest-consent scoped clips.
    @Override
    public DatasetSnapshot load(Scope scope) {
        String cte = scopedClipsCte(scope);
        Counts counts = jdbc.queryForObject(cte + """
                SELECT COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE quality_status = 'ACCEPTED') AS accepted,
                       COUNT(*) FILTER (WHERE quality_status = 'REJECTED') AS rejected,
                       COUNT(*) FILTER (WHERE quality_status = 'NEEDS_REVIEW') AS needs_review,
                       COUNT(*) FILTER (WHERE quality_status = 'PENDING') AS pending,
                       COUNT(DISTINCT participant_code)
                           FILTER (WHERE quality_status = 'ACCEPTED') AS contributors
                FROM scoped_clips
                """, (row, index) -> new Counts(
                row.getLong("total"), row.getLong("accepted"), row.getLong("rejected"),
                row.getLong("needs_review"), row.getLong("pending"), row.getLong("contributors")));

        Map<Integer, Long> acceptedByLabel = new LinkedHashMap<>();
        List<Map.Entry<Integer, Long>> acceptedRows = jdbc.query(cte + """
                SELECT label_id, COUNT(*) AS accepted_count
                FROM scoped_clips
                WHERE quality_status = 'ACCEPTED'
                GROUP BY label_id
                ORDER BY label_id
                """, (row, index) -> Map.entry(row.getInt("label_id"), row.getLong("accepted_count")));
        acceptedRows.forEach(entry -> acceptedByLabel.put(entry.getKey(), entry.getValue()));

        Map<String, List<DistributionCount>> distribution = new LinkedHashMap<>();
        for (Map.Entry<String, String> axis : METADATA_COLUMNS.entrySet()) {
            String metadataSql = cte + """
                    , eligible_contributors AS (
                        SELECT DISTINCT participant_code, region, handedness, knows_vsl, age_group
                        FROM scoped_clips
                        WHERE quality_status = 'ACCEPTED'
                    )
                    SELECT COALESCE(CAST(%s AS VARCHAR), 'unknown') AS bucket_key, COUNT(*) AS count
                    FROM eligible_contributors
                    GROUP BY %s
                    ORDER BY bucket_key
                    """.formatted(axis.getValue(), axis.getValue());
            List<DistributionCount> values = jdbc.query(metadataSql,
                    (row, index) -> new DistributionCount(row.getString("bucket_key"), row.getLong("count")));
            distribution.put(axis.getKey(), List.copyOf(values));
        }

        List<ContributorProgress> contributors = List.of();
        List<RejectionBySign> rejection = List.of();
        if (scope == Scope.ADMIN_INTERNAL) {
            contributors = jdbc.query(cte + """
                    SELECT participant_code,
                           COUNT(*) FILTER (WHERE quality_status = 'ACCEPTED') AS accepted_count
                    FROM scoped_clips
                    GROUP BY participant_code
                    ORDER BY participant_code
                    """, (row, index) -> new ContributorProgress(
                    row.getString("participant_code"), row.getLong("accepted_count"), CONTRIBUTOR_TARGET));
            rejection = jdbc.query(cte + """
                    SELECT label_id,
                           COUNT(*) FILTER (WHERE quality_status = 'ACCEPTED') AS accepted_count,
                           COUNT(*) FILTER (WHERE quality_status = 'REJECTED') AS rejected_count
                    FROM scoped_clips
                    GROUP BY label_id
                    HAVING COUNT(*) FILTER (WHERE quality_status IN ('ACCEPTED', 'REJECTED')) > 0
                    ORDER BY label_id
                    """, (row, index) -> new RejectionBySign(
                    row.getInt("label_id"), row.getLong("accepted_count"), row.getLong("rejected_count")));
        }

        return new DatasetSnapshot(counts, acceptedByLabel, distribution, contributors, rejection, 0);
    }

    private static String scopedClipsCte(Scope scope) {
        return """
                WITH ranked_consents AS (
                    SELECT c.participant_id,
                           c.use_in_project,
                           c.publish_dataset,
                           ROW_NUMBER() OVER (
                               PARTITION BY c.participant_id
                               ORDER BY c.signed_at DESC, c.consent_version DESC
                           ) AS consent_rank
                    FROM consents c
                ), latest_consents AS (
                    SELECT participant_id, use_in_project, publish_dataset
                    FROM ranked_consents
                    WHERE consent_rank = 1
                ), scoped_clips AS (
                    SELECT c.id,
                           c.sign_id,
                           vocabulary_sign.label_index AS label_id,
                           c.quality_status,
                           p.code AS participant_code,
                           p.region,
                           p.handedness,
                           p.knows_vsl,
                           p.age_group
                    FROM clips c
                    JOIN signs vocabulary_sign ON vocabulary_sign.id = c.sign_id
                    JOIN recording_sessions session ON session.id = c.session_id
                    JOIN participants p ON p.id = session.participant_id
                    JOIN latest_consents consent ON consent.participant_id = p.id
                    WHERE consent.""" + scope.consentColumn() + " = TRUE\n)\n";
    }
}
