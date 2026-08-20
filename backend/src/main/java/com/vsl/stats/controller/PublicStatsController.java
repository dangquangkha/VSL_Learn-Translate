package com.vsl.stats.controller;

import com.vsl.stats.dto.PublicStatsDTO;
import com.vsl.stats.service.DatasetStatsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// FR-010: Public stats endpoint — ai cũng truy cập được, không cần đăng nhập
@RestController
@RequestMapping("/api/stats")
public class PublicStatsController {

    private final DatasetStatsService statsService;

    public PublicStatsController(DatasetStatsService statsService) {
        this.statsService = statsService;
    }

    /**
     * GET /api/stats/public
     * Trả về số liệu tổng quan bộ dữ liệu đã ẩn danh hóa.
     * Phục vụ trang minh bạch và dataset card (DR-E05).
     */
    @GetMapping("/public")
    public ResponseEntity<PublicStatsDTO> getPublicStats() {
        return ResponseEntity.ok(statsService.getPublicStats());
    }
}
