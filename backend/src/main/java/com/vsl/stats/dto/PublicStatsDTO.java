package com.vsl.stats.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record PublicStatsDTO(
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
        List<ClassCount> clipsPerClass,
        Map<String, List<DistributionCount>> metadataDistribution,
        String modelEvaluationStatus,
        int publishedTestSubjectCount,
        int withheldTestSubjectCount,
        ActiveModelEvaluation activeModelEvaluation
) {

    public record ClassCount(int labelId, String code, long count) {
    }

    public record DistributionCount(String key, long count) {
    }

    public record SubjectAccuracy(
            String evaluationAlias,
            String split,
            double top1Accuracy,
            double top3Accuracy,
            int sampleCount
    ) {
    }

    public record MetadataAccuracy(String key, double accuracy, long sampleCount) {
    }

    public record ActiveModelEvaluation(
            String semver,
            Double top1AccuracyTestA,
            Double top3AccuracyTestA,
            Double top1AccuracyTestB,
            Double top3AccuracyTestB,
            double browserLatencyMs,
            double throughputPredictionsPerSecond,
            long modelSizeBytes,
            String quantization,
            int goldenSampleCount,
            double goldenMaxLogitDiff,
            List<SubjectAccuracy> perSubjectAccuracy,
            Map<String, List<MetadataAccuracy>> accuracyByMetadata,
            List<String> knownLimitations
    ) {
    }
}
