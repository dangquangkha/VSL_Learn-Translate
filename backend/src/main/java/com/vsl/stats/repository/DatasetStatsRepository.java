package com.vsl.stats.repository;

import java.util.List;
import java.util.Map;

public interface DatasetStatsRepository {

    DatasetSnapshot load(Scope scope);

    enum Scope {
        PUBLIC_CONSENTED("publish_dataset"),
        ADMIN_INTERNAL("use_in_project");

        private final String consentColumn;

        Scope(String consentColumn) {
            this.consentColumn = consentColumn;
        }

        public String consentColumn() {
            return consentColumn;
        }
    }

    record Counts(
            long total,
            long accepted,
            long rejected,
            long needsReview,
            long pending,
            long contributors
    ) {
    }

    record DistributionCount(String key, long count) {
    }

    record ContributorProgress(String participantCode, long acceptedCount, long targetCount) {
    }

    record RejectionBySign(int labelId, long acceptedCount, long rejectedCount) {
    }

    record DatasetSnapshot(
            Counts counts,
            Map<Integer, Long> acceptedByLabel,
            Map<String, List<DistributionCount>> metadataDistribution,
            List<ContributorProgress> contributorProgress,
            List<RejectionBySign> rejectionRateBySign,
            long consentViolationCount
    ) {
        public DatasetSnapshot {
            acceptedByLabel = Map.copyOf(acceptedByLabel);
            metadataDistribution = Map.copyOf(metadataDistribution);
            contributorProgress = List.copyOf(contributorProgress);
            rejectionRateBySign = List.copyOf(rejectionRateBySign);
        }
    }
}
