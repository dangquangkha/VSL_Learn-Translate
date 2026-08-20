package com.vsl.modelregistry.controller;

import com.vsl.modelregistry.dto.ModelAdminDTO;
import com.vsl.modelregistry.service.ModelRegistryService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/models")
public class AdminModelController {

    private final ModelRegistryService registry;

    public AdminModelController(ModelRegistryService registry) {
        this.registry = registry;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ModelAdminDTO> register(
            @RequestPart("model") MultipartFile model,
            @RequestPart("semver") String semver,
            @RequestPart("metrics") String metrics) {
        return ResponseEntity.status(HttpStatus.CREATED).body(registry.register(model, semver, metrics));
    }

    @GetMapping
    public Page<ModelAdminDTO> history(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        int safeSize = Math.max(1, Math.min(size, 100));
        return registry.history(PageRequest.of(Math.max(page, 0), safeSize));
    }

    @PatchMapping("/{id}/activate")
    public ModelAdminDTO activate(@PathVariable UUID id) {
        return registry.activate(id);
    }
}
