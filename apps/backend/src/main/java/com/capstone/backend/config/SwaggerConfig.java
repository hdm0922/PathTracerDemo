package com.capstone.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Capstone Backend API")
                        .description("Spring Boot REST API for Capstone Project - Scene Management System")
                        .version("v1.0.0")
                        .contact(new Contact()
                                .name("Capstone Team")
                                .email("capstone@example.com")))
                .servers(List.of(
                        new Server()
                                .url("http://localhost:8080/api")
                                .description("Local Development Server")
                ))
                .components(new Components()
                        .addSecuritySchemes("bearer-jwt",
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("JWT token authentication (Currently disabled for testing)")))
                .addSecurityItem(new SecurityRequirement().addList("bearer-jwt"));
    }
}
