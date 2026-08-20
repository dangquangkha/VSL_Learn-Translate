package com.vsl.modelregistry;

import com.vsl.participant.ParticipantDirectory.ParticipantProfile;

import java.util.LinkedHashMap;
import java.util.Map;

public final class MetricsFixture {

    private MetricsFixture() {
    }

    public static String validMetrics() {
        return """
                {
                  "top1AccuracyTestA": 0.90,
                  "top3AccuracyTestA": 0.96,
                  "top1AccuracyTestB": 0.82,
                  "top3AccuracyTestB": 0.91,
                  "worstClassRecall": 0.70,
                  "idleFalsePositivesPer60s": 0.2,
                  "browserLatencyMs": 42.0,
                  "throughputPredictionsPerSecond": 24.0,
                  "quantization": "fp32",
                  "goldenSampleCount": 20,
                  "goldenMaxLogitDiff": 0.0005,
                  "benchmarkEnvironment": {
                    "browser": "Edge",
                    "browserVersion": "140.0",
                    "os": "Windows 11",
                    "cpu": "test-cpu",
                    "wasmThreads": 4,
                    "measuredAt": "2026-08-20T02:00:00Z"
                  },
                  "datasetManifestSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                  "splitManifestSha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                  "trainingCodeCommit": "cccccccccccccccccccccccccccccccccccccccc",
                  "trainedAt": "2026-08-20T02:00:00Z",
                  "subjectSplitAssignments": [
                    {"participantCode": "TEAM-01", "split": "TRAIN"},
                    {"participantCode": "EXT-A", "split": "TEST_A"},
                    {"participantCode": "EXT-B", "split": "TEST_B"}
                  ],
                  "perSubjectAccuracy": [
                    {"participantCode": "EXT-A", "split": "TEST_A", "top1Accuracy": 0.90, "top3Accuracy": 0.96, "sampleCount": 10},
                    {"participantCode": "EXT-B", "split": "TEST_B", "top1Accuracy": 0.82, "top3Accuracy": 0.91, "sampleCount": 8}
                  ],
                  "accuracyByMetadata": {
                    "handedness": [{"key": "RIGHT", "accuracy": 0.87, "sampleCount": 18}],
                    "knowsVsl": [{"key": "false", "accuracy": 0.90, "sampleCount": 10}],
                    "ageGroup": [{"key": "18-24", "accuracy": 0.87, "sampleCount": 18}],
                    "region": [{"key": "SOUTH", "accuracy": 0.87, "sampleCount": 18}]
                  },
                  "knownLimitations": ["Isolated signs only"],
                  "modelSizeBytes": 999999999
                }
                """;
    }

    public static Map<String, ParticipantProfile> participants() {
        Map<String, ParticipantProfile> participants = new LinkedHashMap<>();
        participants.put("TEAM-01", new ParticipantProfile(
                "TEAM-01", true, false, false, true, "SOUTH", "RIGHT", "18-24"));
        participants.put("EXT-A", new ParticipantProfile(
                "EXT-A", false, false, true, true, "SOUTH", "RIGHT", "18-24"));
        participants.put("EXT-B", new ParticipantProfile(
                "EXT-B", false, true, false, true, "CENTRAL", "LEFT", "25-34"));
        return participants;
    }
}
