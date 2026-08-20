package com.vsl.participant;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

@Repository
public class JdbcParticipantDirectory implements ParticipantDirectory {

    private static final String FIND_BY_CODES = """
            WITH ranked_consents AS (
                SELECT c.participant_id,
                       c.publish_dataset,
                       c.use_in_project,
                       ROW_NUMBER() OVER (
                           PARTITION BY c.participant_id
                           ORDER BY c.signed_at DESC, c.consent_version DESC
                       ) AS consent_rank
                FROM consents c
            ), latest_consent AS (
                SELECT participant_id, publish_dataset, use_in_project
                FROM ranked_consents
                WHERE consent_rank = 1
            )
            SELECT p.code,
                   p.is_team_member,
                   p.knows_vsl,
                   COALESCE(latest.publish_dataset, FALSE) AS publish_dataset,
                   COALESCE(latest.use_in_project, FALSE) AS use_in_project,
                   p.region,
                   p.handedness,
                   p.age_group
            FROM participants p
            LEFT JOIN latest_consent latest ON latest.participant_id = p.id
            WHERE p.code IN (:codes)
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public JdbcParticipantDirectory(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Map<String, ParticipantProfile> findByCodes(Set<String> codes) {
        if (codes.isEmpty()) {
            return Map.of();
        }
        Map<String, ParticipantProfile> result = new LinkedHashMap<>();
        jdbc.query(FIND_BY_CODES, new MapSqlParameterSource("codes", codes), row -> {
            String code = row.getString("code");
            result.put(code, new ParticipantProfile(
                    code,
                    row.getBoolean("is_team_member"),
                    row.getBoolean("knows_vsl"),
                    row.getBoolean("publish_dataset"),
                    row.getBoolean("use_in_project"),
                    row.getString("region"),
                    row.getString("handedness"),
                    row.getString("age_group")
            ));
        });
        return Map.copyOf(result);
    }
}
