package com.capstone.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Schema(description = "회원가입 요청")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SignupRequest {

    @Schema(description = "사용자 아이디", example = "testuser", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;

    @Schema(description = "비밀번호", example = "password123", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 100, message = "Password must be between 6 and 100 characters")
    private String password;

    @Schema(description = "이메일", example = "test@example.com", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    @Size(max = 100, message = "Email must be less than 100 characters")
    private String email;

    @Schema(description = "닉네임", example = "테스트유저", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "Nickname is required")
    @Size(min = 2, max = 50, message = "Nickname must be between 2 and 50 characters")
    private String nickname;
}
