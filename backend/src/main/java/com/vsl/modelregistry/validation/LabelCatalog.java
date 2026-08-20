package com.vsl.modelregistry.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vsl.common.api.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
public final class LabelCatalog {

    private static final Comparator<String> CODE_POINT_ORDER = LabelCatalog::compareCodePoints;
    private static final ObjectMapper STRING_WRITER = new ObjectMapper();

    private final List<Label> labels;
    private final String canonicalHash;

    public LabelCatalog(ObjectMapper objectMapper) {
        JsonNode root = loadLabels(objectMapper);
        this.labels = parseAndValidate(root);
        this.canonicalHash = sha256(canonicalize(root));
    }

    public List<Label> labels() {
        return labels;
    }

    public String canonicalHash() {
        return canonicalHash;
    }

    public static String canonicalize(JsonNode node) {
        StringBuilder result = new StringBuilder();
        appendCanonical(node, result, 0);
        return result.toString();
    }

    private static JsonNode loadLabels(ObjectMapper objectMapper) {
        try (InputStream stream = LabelCatalog.class.getResourceAsStream("/shared/labels.json")) {
            if (stream == null) {
                throw new IllegalStateException("shared/labels.json is not available on the classpath");
            }
            return objectMapper.readTree(stream);
        } catch (IOException exception) {
            throw new IllegalStateException("shared/labels.json cannot be parsed", exception);
        }
    }

    private static List<Label> parseAndValidate(JsonNode root) {
        JsonNode labelNodes = root.path("labels");
        if (!root.isObject() || !labelNodes.isArray()
                || root.path("total_classes").asInt(-1) != 51 || labelNodes.size() != 51) {
            throw new IllegalStateException("shared/labels.json must define exactly 51 labels");
        }

        List<Label> parsed = new ArrayList<>(51);
        Set<String> codes = new HashSet<>();
        for (int index = 0; index < labelNodes.size(); index++) {
            JsonNode node = labelNodes.get(index);
            int id = node.path("id").asInt(-1);
            String code = node.path("code").asText("");
            String displayNameVi = node.path("display_name_vi").asText("");
            String dictionarySource = node.path("dictionary_source").asText("");
            if (id != index || code.isBlank() || displayNameVi.isBlank()
                    || dictionarySource.isBlank() || !codes.add(code)) {
                throw new IllegalStateException("shared/labels.json has an invalid or duplicate label at index " + index);
            }
            parsed.add(new Label(id, code, displayNameVi, dictionarySource));
        }
        if (!"idle".equals(parsed.getFirst().code())) {
            throw new IllegalStateException("Label 0 must be idle");
        }
        return List.copyOf(parsed);
    }

    private static void appendCanonical(JsonNode node, StringBuilder output, int depth) {
        if (node.isObject()) {
            List<Map.Entry<String, JsonNode>> fields = new ArrayList<>();
            Iterator<Map.Entry<String, JsonNode>> iterator = node.fields();
            iterator.forEachRemaining(fields::add);
            fields.sort(Map.Entry.comparingByKey(CODE_POINT_ORDER));
            if (fields.isEmpty()) {
                output.append("{}");
                return;
            }
            output.append("{\n");
            for (int index = 0; index < fields.size(); index++) {
                indent(output, depth + 1);
                appendJsonString(fields.get(index).getKey(), output);
                output.append(": ");
                appendCanonical(fields.get(index).getValue(), output, depth + 1);
                output.append(index + 1 == fields.size() ? '\n' : ",\n");
            }
            indent(output, depth);
            output.append('}');
            return;
        }
        if (node.isArray()) {
            if (node.isEmpty()) {
                output.append("[]");
                return;
            }
            output.append("[\n");
            for (int index = 0; index < node.size(); index++) {
                indent(output, depth + 1);
                appendCanonical(node.get(index), output, depth + 1);
                output.append(index + 1 == node.size() ? '\n' : ",\n");
            }
            indent(output, depth);
            output.append(']');
            return;
        }
        if (node.isTextual()) {
            appendJsonString(node.textValue(), output);
        } else {
            output.append(node.toString());
        }
    }

    private static void appendJsonString(String value, StringBuilder output) {
        try {
            output.append(STRING_WRITER.writeValueAsString(value));
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to canonicalize JSON string", exception);
        }
    }

    private static void indent(StringBuilder output, int depth) {
        output.append("  ".repeat(depth));
    }

    private static int compareCodePoints(String first, String second) {
        int firstIndex = 0;
        int secondIndex = 0;
        while (firstIndex < first.length() && secondIndex < second.length()) {
            int firstPoint = first.codePointAt(firstIndex);
            int secondPoint = second.codePointAt(secondIndex);
            if (firstPoint != secondPoint) {
                return Integer.compare(firstPoint, secondPoint);
            }
            firstIndex += Character.charCount(firstPoint);
            secondIndex += Character.charCount(secondPoint);
        }
        return Integer.compare(first.length() - firstIndex, second.length() - secondIndex);
    }

    private static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    public ApiException mismatch(String actualHash) {
        return new ApiException(HttpStatus.BAD_REQUEST, "LABELS_HASH_MISMATCH",
                "The model label hash does not match shared/labels.json",
                Map.of("expectedHash", canonicalHash, "actualHash", actualHash == null ? "missing" : actualHash));
    }

    public record Label(int id, String code, String displayNameVi, String dictionarySource) {
    }
}
