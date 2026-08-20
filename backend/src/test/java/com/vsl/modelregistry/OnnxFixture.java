package com.vsl.modelregistry;

import com.google.protobuf.CodedOutputStream;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

final class OnnxFixture {

    private OnnxFixture() {
    }

    static byte[] validModel(String labelHash) {
        return model(17, labelHash, List.of(
                valueInfo("landmarks", 1, 60, 75, 4),
                valueInfo("mask", 1, 60, 3),
                valueInfo("timestamps", 1, 60)
        ), List.of(valueInfo("logits", 1, 51)));
    }

    static byte[] model(long opset, String labelHash, List<byte[]> inputs, List<byte[]> outputs) {
        byte[] graph = message(out -> {
            out.writeByteArray(1, new byte[0]);
            for (byte[] input : inputs) {
                out.writeByteArray(11, input);
            }
            for (byte[] output : outputs) {
                out.writeByteArray(12, output);
            }
        });
        byte[] opsetImport = message(out -> {
            out.writeString(1, "");
            out.writeInt64(2, opset);
        });
        byte[] metadata = message(out -> {
            out.writeString(1, "label_hash");
            out.writeString(2, labelHash);
        });
        return message(out -> {
            out.writeInt64(1, 9);
            out.writeByteArray(7, graph);
            out.writeByteArray(8, opsetImport);
            out.writeByteArray(14, metadata);
        });
    }

    static byte[] valueInfo(String name, long... dimensions) {
        byte[] shape = message(out -> {
            for (long dimension : dimensions) {
                byte[] dim = message(dimOut -> dimOut.writeInt64(1, dimension));
                out.writeByteArray(1, dim);
            }
        });
        byte[] tensor = message(out -> {
            out.writeEnum(1, 1); // TensorProto.FLOAT
            out.writeByteArray(2, shape);
        });
        byte[] type = message(out -> out.writeByteArray(1, tensor));
        return message(out -> {
            out.writeString(1, name);
            out.writeByteArray(2, type);
        });
    }

    private static byte[] message(IoWriter writer) {
        try {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            CodedOutputStream output = CodedOutputStream.newInstance(bytes);
            writer.write(output);
            output.flush();
            return bytes.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException(exception);
        }
    }

    @FunctionalInterface
    private interface IoWriter {
        void write(CodedOutputStream output) throws IOException;
    }
}
