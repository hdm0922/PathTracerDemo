package com.capstone.backend.service;

import com.capstone.backend.dto.SceneRequest;
import com.capstone.backend.dto.SceneResponse;
import com.capstone.backend.entity.Scene;
import com.capstone.backend.entity.User;
import com.capstone.backend.repository.SceneRepository;
import com.capstone.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SceneService {

    private final SceneRepository sceneRepository;
    private final UserRepository userRepository;

    @Transactional
    public SceneResponse createScene(SceneRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Scene scene = Scene.builder()
                .name(request.getName())
                .description(request.getDescription())
                .thumbnailUrl(request.getThumbnailUrl())
                .assets(request.getAssets())
                .user(user)
                .build();

        Scene savedScene = sceneRepository.save(scene);
        return convertToResponse(savedScene);
    }

    @Transactional(readOnly = true)
    public SceneResponse getSceneById(Long id) {
        Scene scene = sceneRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Scene not found"));
        return convertToResponse(scene);
    }

    @Transactional(readOnly = true)
    public List<SceneResponse> getAllScenes() {
        return sceneRepository.findAll().stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SceneResponse> getScenesByUsername(String username) {
        return sceneRepository.findByUserUsername(username).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public SceneResponse updateScene(Long id, SceneRequest request) {
        Scene scene = sceneRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Scene not found"));

        // Verify user ownership
        if (!scene.getUser().getUsername().equals(request.getUsername())) {
            throw new RuntimeException("You don't have permission to update this scene");
        }

        scene.setName(request.getName());
        scene.setDescription(request.getDescription());
        scene.setThumbnailUrl(request.getThumbnailUrl());
        scene.setAssets(request.getAssets());

        Scene updatedScene = sceneRepository.save(scene);
        return convertToResponse(updatedScene);
    }

    @Transactional
    public void deleteScene(Long id, String username) {
        Scene scene = sceneRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Scene not found"));

        // Verify user ownership
        if (!scene.getUser().getUsername().equals(username)) {
            throw new RuntimeException("You don't have permission to delete this scene");
        }

        sceneRepository.delete(scene);
    }

    private SceneResponse convertToResponse(Scene scene) {
        return SceneResponse.builder()
                .id(scene.getId())
                .name(scene.getName())
                .description(scene.getDescription())
                .thumbnailUrl(scene.getThumbnailUrl())
                .assets(scene.getAssets())
                .username(scene.getUser().getUsername())
                .createdAt(scene.getCreatedAt())
                .updatedAt(scene.getUpdatedAt())
                .build();
    }
}
