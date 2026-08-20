package com.vsl.stats.controller;

import com.vsl.stats.dto.AdminStatsDTO;
import com.vsl.stats.service.DatasetStatsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// FR-011: Admin stats endpoint — chỉ ADMIN truy cập (SecurityConfig)
@RestController
@RequestMapping("/api/admin/stats")
public class AdminStatsController {

    private final DatasetStatsService statsService;

    public AdminStatsController(DatasetStatsService statsService) {
        this.statsService = statsService;
    }

    /**
     * GET /api/admin/stats
     * Trả về số liệu chi tiết nội bộ: rejection rate, per-contributor breakdown, metadata.
     */
    @GetMapping
    public ResponseEntity<AdminStatsDTO> getAdminStats() {
        return ResponseEntity.ok(statsService.getAdminStats());
    }
}
