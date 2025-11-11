package com.capstone.backend.controller;

import com.capstone.backend.dto.SceneRequest;
import com.capstone.backend.dto.SceneResponse;
import com.capstone.backend.service.SceneService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Scene", description = "Scene CRUD API - 3D 씬 데이터 관리")
@RestController
@RequestMapping("/scenes")
@RequiredArgsConstructor
public class SceneController {

    private final SceneService sceneService;

    @Operation(summary = "Scene 생성", description = "새로운 Scene을 생성합니다. assets는 JSON 문자열로 전달됩니다.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Scene 생성 성공",
            content = @Content(schema = @Schema(implementation = SceneResponse.class))),
        @ApiResponse(responseCode = "400", description = "잘못된 요청 (유효하지 않은 데이터)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PostMapping
    public ResponseEntity<?> createScene(@Valid @RequestBody SceneRequest request) {
        try {
            SceneResponse response = sceneService.createScene(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(e.getMessage()));
        }
    }

    @Operation(summary = "Scene 조회 (ID)", description = "ID로 특정 Scene을 조회합니다.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Scene 조회 성공",
            content = @Content(schema = @Schema(implementation = SceneResponse.class))),
        @ApiResponse(responseCode = "404", description = "Scene을 찾을 수 없음",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/{id}")
    public ResponseEntity<?> getSceneById(
            @Parameter(description = "Scene ID", required = true) @PathVariable Long id) {
        try {
            SceneResponse response = sceneService.getSceneById(id);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse(e.getMessage()));
        }
    }

    @Operation(summary = "모든 Scene 조회", description = "시스템의 모든 Scene 목록을 조회합니다.")
    @ApiResponse(responseCode = "200", description = "Scene 목록 조회 성공")
    @GetMapping
    public ResponseEntity<List<SceneResponse>> getAllScenes() {
        List<SceneResponse> scenes = sceneService.getAllScenes();
        return ResponseEntity.ok(scenes);
    }

    @Operation(summary = "사용자별 Scene 조회", description = "특정 사용자가 생성한 모든 Scene을 조회합니다.")
    @ApiResponse(responseCode = "200", description = "사용자의 Scene 목록 조회 성공")
    @GetMapping("/user/{username}")
    public ResponseEntity<List<SceneResponse>> getScenesByUsername(
            @Parameter(description = "사용자명", example = "testuser", required = true) @PathVariable String username) {
        List<SceneResponse> scenes = sceneService.getScenesByUsername(username);
        return ResponseEntity.ok(scenes);
    }

    @Operation(summary = "Scene 수정", description = "기존 Scene의 정보를 수정합니다. 소유자만 수정 가능합니다.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Scene 수정 성공",
            content = @Content(schema = @Schema(implementation = SceneResponse.class))),
        @ApiResponse(responseCode = "400", description = "잘못된 요청 또는 권한 없음",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PutMapping("/{id}")
    public ResponseEntity<?> updateScene(
            @Parameter(description = "Scene ID", required = true) @PathVariable Long id,
            @Valid @RequestBody SceneRequest request) {
        try {
            SceneResponse response = sceneService.updateScene(id, request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(e.getMessage()));
        }
    }

    @Operation(summary = "Scene 삭제", description = "Scene을 삭제합니다. 소유자만 삭제 가능합니다.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Scene 삭제 성공",
            content = @Content(schema = @Schema(implementation = SuccessResponse.class))),
        @ApiResponse(responseCode = "400", description = "잘못된 요청 또는 권한 없음",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteScene(
            @Parameter(description = "Scene ID", required = true) @PathVariable Long id,
            @Parameter(description = "사용자명 (소유자 확인용)", example = "testuser", required = true) @RequestParam String username) {
        try {
            sceneService.deleteScene(id, username);
            return ResponseEntity.ok(new SuccessResponse("Scene deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(e.getMessage()));
        }
    }

    // Response classes
    record ErrorResponse(String message) {}
    record SuccessResponse(String message) {}
}
