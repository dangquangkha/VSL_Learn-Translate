package com.vsl.participant;

import java.util.Map;
import java.util.Set;

public interface ParticipantDirectory {

    Map<String, ParticipantProfile> findByCodes(Set<String> codes);

    record ParticipantProfile(
            String code,
            boolean teamMember,
            boolean knowsVsl,
            boolean publishDataset,
            boolean useInProject,
            String region,
            String handedness,
            String ageGroup
    ) {
    }
}
