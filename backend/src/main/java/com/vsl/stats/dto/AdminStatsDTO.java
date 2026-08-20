package com.vsl.stats.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record AdminStatsDTO(
        String scope,
        Instant generatedAt,
        long totalClips,
        long acceptedClips,
        long rejectedClips,
        long needsReviewClips,
        long pendingClips,
        long totalContributors,
        int totalClasses,
        double averageClipsPerContributor,
        double rejectionRate,
        List<PublicStatsDTO.ClassCount> clipsPerClass,
        Map<String, List<PublicStatsDTO.DistributionCount>> metadataDistribution,
        List<ContributorProgress> contributorProgress,
        List<RejectionRateBySign> rejectionRateBySign,
        List<ModelMetricsHistory> modelMetricsHistory
) {

    public record ContributorProgress(
            String participantCode,
            long acceptedCount,
            long targetCount,
            double completionPercentage
    ) {
    }

    public record RejectionRateBySign(
            int labelId,
            String code,
            long acceptedCount,
            long rejectedCount,
            double rejectionRate
    ) {
    }

    public record ModelMetricsHistory(
            UUID id,
            String semver,
            boolean active,
            boolean releaseEligible,
            JsonNode metrics,
            Instant createdAt
    ) {
    }
}
