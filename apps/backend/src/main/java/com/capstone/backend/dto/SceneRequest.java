package com.capstone.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Schema(description = "Scene 생성/수정 요청")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SceneRequest {

    @Schema(description = "Scene 이름", example = "My Test Room", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Scene name is required")
    @Size(max = 100, message = "Scene name must be less than 100 characters")
    private String name;

    @Schema(description = "Scene 설명", example = "A simple test room with furniture")
    @Size(max = 500, message = "Description must be less than 500 characters")
    private String description;

    @Schema(description = "썸네일 URL", example = "https://example.com/thumbnail.jpg")
    @Size(max = 255, message = "Thumbnail URL must be less than 255 characters")
    private String thumbnailUrl;

    @Schema(description = "Scene assets JSON 문자열 (SceneAsset[] 배열)",
            example = "[{\"id\":\"chair_0\",\"type\":\"object\",\"meshName\":\"Chair\",\"transform\":{\"position\":[0,0,0],\"rotation\":[0,0,0],\"scale\":[1,1,1]}}]",
            requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Assets JSON is required")
    private String assets; // JSON string of SceneAsset[]

    @Schema(description = "Scene 소유자 사용자명", example = "testuser", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Username is required")
    private String username;
}
