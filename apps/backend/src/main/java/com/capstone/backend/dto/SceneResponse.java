package com.capstone.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Schema(description = "Scene 응답")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SceneResponse {
    @Schema(description = "Scene 고유번호", example = "1")
    private Long id;

    @Schema(description = "Scene 이름", example = "My Test Room")
    private String name;

    @Schema(description = "Scene 설명", example = "A simple test room with furniture")
    private String description;

    @Schema(description = "썸네일 URL", example = "https://example.com/thumbnail.jpg")
    private String thumbnailUrl;

    @Schema(description = "Scene assets JSON 문자열")
    private String assets; // JSON string

    @Schema(description = "Scene 소유자 사용자명", example = "testuser")
    private String username;

    @Schema(description = "생성 시각")
    private LocalDateTime createdAt;

    @Schema(description = "수정 시각")
    private LocalDateTime updatedAt;
}
