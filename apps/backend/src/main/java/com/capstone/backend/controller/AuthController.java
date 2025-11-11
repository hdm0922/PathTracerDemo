package com.capstone.backend.controller;

import com.capstone.backend.dto.AuthResponse;
import com.capstone.backend.dto.LoginRequest;
import com.capstone.backend.dto.SignupRequest;
import com.capstone.backend.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
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

@Tag(name = "Authentication", description = "회원가입 및 로그인 API")
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "회원가입", description = "새로운 사용자를 등록합니다.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "회원가입 성공",
            content = @Content(schema = @Schema(implementation = AuthResponse.class))),
        @ApiResponse(responseCode = "400", description = "잘못된 요청 (중복된 username 또는 email)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest request) {
        try {
            AuthResponse response = authService.signup(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(e.getMessage()));
        }
    }

    @Operation(summary = "로그인", description = "사용자 인증 후 사용자 정보를 반환합니다. (JWT는 현재 비활성화)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "로그인 성공",
            content = @Content(schema = @Schema(implementation = AuthResponse.class))),
        @ApiResponse(responseCode = "401", description = "인증 실패 (잘못된 username 또는 password)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            AuthResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse(e.getMessage()));
        }
    }

    // Error response class
    record ErrorResponse(String message) {}
}
