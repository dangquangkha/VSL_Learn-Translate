package com.vsl.modelregistry.validation;

import com.google.protobuf.CodedInputStream;
import com.google.protobuf.InvalidProtocolBufferException;
import com.google.protobuf.WireFormat;
import com.vsl.common.api.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public final class OnnxModelInspector {

    private static final int FLOAT32_ENUM = 1;

    public Inspection inspect(byte[] artifact) {
        if (artifact == null || artifact.length == 0 || artifact.length > ModelContract.MAX_MODEL_BYTES) {
            throw invalidArtifact("The ONNX artifact must be between 1 byte and 5 MiB");
        }
        try {
            ParsedModel parsed = parseModel(CodedInputStream.newInstance(artifact));
            if (parsed.graph == null || parsed.graph.nodeCount == 0) {
                throw invalidArtifact("The ONNX graph is missing or empty");
            }
            Long opset = parsed.opsets.getOrDefault("", parsed.opsets.get("ai.onnx"));
            if (opset == null || opset != ModelContract.REQUIRED_OPSET) {
                throw invalidArtifact("The ONNX model must use default-domain Opset 17");
            }
            ModelContract.InputSignature signature = signatureOf(parsed.graph);
            if (!ModelContract.requiredSignature().equals(signature)) {
                throw invalidArtifact("The ONNX tensor contract does not match FR-007");
            }
            return new Inspection(opset.intValue(), parsed.metadata.get("label_hash"), signature);
        } catch (ApiException exception) {
            throw exception;
        } catch (InvalidProtocolBufferException exception) {
            throw invalidArtifact("The uploaded file is not a parseable ONNX protobuf");
        } catch (IOException | RuntimeException exception) {
            throw invalidArtifact("The uploaded file is not a valid ONNX model");
        }
    }

    public void requireCanonicalLabelHash(Inspection inspection, String expectedHash) {
        if (inspection.labelHash() == null || !inspection.labelHash().equals(expectedHash)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "LABELS_HASH_MISMATCH",
                    "The model label hash does not match shared/labels.json",
                    Map.of("expectedHash", expectedHash,
                            "actualHash", inspection.labelHash() == null ? "missing" : inspection.labelHash()));
        }
    }

    private static ParsedModel parseModel(CodedInputStream input) throws IOException {
        ParsedModel model = new ParsedModel();
        int tag;
        while ((tag = input.readTag()) != 0) {
            int field = WireFormat.getTagFieldNumber(tag);
            if (field == 7) {
                model.graph = parseGraph(CodedInputStream.newInstance(input.readByteArray()));
            } else if (field == 8) {
                parseOpset(CodedInputStream.newInstance(input.readByteArray()), model.opsets);
            } else if (field == 14) {
                parseMetadata(CodedInputStream.newInstance(input.readByteArray()), model.metadata);
            } else if (!input.skipField(tag)) {
                break;
            }
        }
        return model;
    }

    private static Graph parseGraph(CodedInputStream input) throws IOException {
        Graph graph = new Graph();
        int tag;
        while ((tag = input.readTag()) != 0) {
            int field = WireFormat.getTagFieldNumber(tag);
            if (field == 1) {
                input.readByteArray();
                graph.nodeCount++;
            } else if (field == 11) {
                graph.inputs.add(parseValueInfo(CodedInputStream.newInstance(input.readByteArray())));
            } else if (field == 12) {
                graph.outputs.add(parseValueInfo(CodedInputStream.newInstance(input.readByteArray())));
            } else if (!input.skipField(tag)) {
                break;
            }
        }
        return graph;
    }

    private static ValueInfo parseValueInfo(CodedInputStream input) throws IOException {
        String name = null;
        TensorType tensorType = null;
        int tag;
        while ((tag = input.readTag()) != 0) {
            int field = WireFormat.getTagFieldNumber(tag);
            if (field == 1) {
                name = input.readStringRequireUtf8();
            } else if (field == 2) {
                tensorType = parseType(CodedInputStream.newInstance(input.readByteArray()));
            } else if (!input.skipField(tag)) {
                break;
            }
        }
        return new ValueInfo(name, tensorType);
    }

    private static TensorType parseType(CodedInputStream input) throws IOException {
        TensorType type = null;
        int tag;
        while ((tag = input.readTag()) != 0) {
            if (WireFormat.getTagFieldNumber(tag) == 1) {
                type = parseTensor(CodedInputStream.newInstance(input.readByteArray()));
            } else if (!input.skipField(tag)) {
                break;
            }
        }
        return type;
    }

    private static TensorType parseTensor(CodedInputStream input) throws IOException {
        int elementType = -1;
        List<Integer> shape = null;
        int tag;
        while ((tag = input.readTag()) != 0) {
            int field = WireFormat.getTagFieldNumber(tag);
            if (field == 1) {
                elementType = input.readEnum();
            } else if (field == 2) {
                shape = parseShape(CodedInputStream.newInstance(input.readByteArray()));
            } else if (!input.skipField(tag)) {
                break;
            }
        }
        return new TensorType(elementType, shape == null ? List.of() : shape);
    }

    private static List<Integer> parseShape(CodedInputStream input) throws IOException {
        List<Integer> dimensions = new ArrayList<>();
        int tag;
        while ((tag = input.readTag()) != 0) {
            if (WireFormat.getTagFieldNumber(tag) == 1) {
                dimensions.add(parseDimension(CodedInputStream.newInstance(input.readByteArray())));
            } else if (!input.skipField(tag)) {
                break;
            }
        }
        return List.copyOf(dimensions);
    }

    private static int parseDimension(CodedInputStream input) throws IOException {
        Long value = null;
        int tag;
        while ((tag = input.readTag()) != 0) {
            int field = WireFormat.getTagFieldNumber(tag);
            if (field == 1) {
                value = input.readInt64();
            } else if (field == 2) {
                input.readStringRequireUtf8();
            } else if (!input.skipField(tag)) {
                break;
            }
        }
        if (value == null || value < 0 || value > Integer.MAX_VALUE) {
            throw invalidArtifact("Dynamic or invalid tensor dimensions are not allowed");
        }
        return value.intValue();
    }

    private static void parseOpset(CodedInputStream input, Map<String, Long> opsets) throws IOException {
        String domain = "";
        Long version = null;
        int tag;
        while ((tag = input.readTag()) != 0) {
            int field = WireFormat.getTagFieldNumber(tag);
            if (field == 1) {
                domain = input.readStringRequireUtf8();
            } else if (field == 2) {
                version = input.readInt64();
            } else if (!input.skipField(tag)) {
                break;
            }
        }
        if (version != null) {
            opsets.put(domain, version);
        }
    }

    private static void parseMetadata(CodedInputStream input, Map<String, String> metadata) throws IOException {
        String key = null;
        String value = null;
        int tag;
        while ((tag = input.readTag()) != 0) {
            int field = WireFormat.getTagFieldNumber(tag);
            if (field == 1) {
                key = input.readStringRequireUtf8();
            } else if (field == 2) {
                value = input.readStringRequireUtf8();
            } else if (!input.skipField(tag)) {
                break;
            }
        }
        if (key != null && value != null) {
            metadata.put(key, value);
        }
    }

    private static ModelContract.InputSignature signatureOf(Graph graph) {
        if (graph.inputs.size() != 3 || graph.outputs.size() != 1) {
            throw invalidArtifact("The ONNX graph must expose exactly three inputs and one output");
        }
        Map<String, ModelContract.TensorSpec> inputs = toTensorMap(graph.inputs);
        Map<String, ModelContract.TensorSpec> outputs = toTensorMap(graph.outputs);
        if (!inputs.keySet().equals(java.util.Set.of("landmarks", "mask", "timestamps"))
                || !outputs.keySet().equals(java.util.Set.of("logits"))) {
            throw invalidArtifact("The ONNX tensor names do not match FR-007");
        }
        return new ModelContract.InputSignature(
                inputs.get("landmarks"), inputs.get("mask"), inputs.get("timestamps"), outputs.get("logits"));
    }

    private static Map<String, ModelContract.TensorSpec> toTensorMap(List<ValueInfo> values) {
        Map<String, ModelContract.TensorSpec> result = new LinkedHashMap<>();
        for (ValueInfo value : values) {
            if (value.name == null || value.name.isBlank() || value.tensorType == null
                    || value.tensorType.elementType != FLOAT32_ENUM
                    || result.put(value.name, new ModelContract.TensorSpec("float32", value.tensorType.shape)) != null) {
                throw invalidArtifact("Every tensor must be uniquely named, typed float32, and have a static shape");
            }
        }
        return result;
    }

    private static ApiException invalidArtifact(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_MODEL_ARTIFACT", message);
    }

    public record Inspection(int opset, String labelHash, ModelContract.InputSignature inputSignature) {
    }

    private static final class ParsedModel {
        private final Map<String, Long> opsets = new LinkedHashMap<>();
        private final Map<String, String> metadata = new LinkedHashMap<>();
        private Graph graph;
    }

    private static final class Graph {
        private final List<ValueInfo> inputs = new ArrayList<>();
        private final List<ValueInfo> outputs = new ArrayList<>();
        private int nodeCount;
    }

    private record ValueInfo(String name, TensorType tensorType) {
    }

    private record TensorType(int elementType, List<Integer> shape) {
    }
}
