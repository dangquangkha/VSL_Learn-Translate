package com.vsl.modelregistry;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vsl.modelregistry.validation.LabelCatalog;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LabelCatalogTest {

    @Test
    void loadsAllLabelsAndMatchesTheCrossLanguageCanonicalHash() {
        LabelCatalog catalog = new LabelCatalog(new ObjectMapper());

        assertThat(catalog.labels()).hasSize(51);
        assertThat(catalog.labels().getFirst().id()).isZero();
        assertThat(catalog.labels().getFirst().code()).isEqualTo("idle");
        assertThat(catalog.canonicalHash())
                .isEqualTo("927342372dcfb1c70d8afb2867324932d3171f30bb6a0cdc24aaea4971a2bf2f");
    }

    @Test
    void canonicalHashIgnoresWhitespaceAndObjectKeyOrderButKeepsArrayOrder() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        String first = LabelCatalog.canonicalize(mapper.readTree("{\"b\":2,\"a\":[1,2]}"));
        String reordered = LabelCatalog.canonicalize(mapper.readTree(" { \"a\" : [1, 2], \"b\": 2 } "));
        String arrayChanged = LabelCatalog.canonicalize(mapper.readTree("{\"a\":[2,1],\"b\":2}"));

        assertThat(first).isEqualTo(reordered);
        assertThat(arrayChanged).isNotEqualTo(first);
    }
}
