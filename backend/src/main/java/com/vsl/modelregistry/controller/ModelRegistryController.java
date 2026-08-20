package com.vsl.modelregistry.controller;

import com.vsl.modelregistry.dto.ActiveModelDTO;
import com.vsl.modelregistry.service.ModelRegistryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/model")
public class ModelRegistryController {

    private final ModelRegistryService registry;

    public ModelRegistryController(ModelRegistryService registry) {
        this.registry = registry;
    }

    @GetMapping("/active")
    public ActiveModelDTO active() {
        return registry.getActiveModel();
    }
}
