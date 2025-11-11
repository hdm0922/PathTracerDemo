package com.capstone.backend.repository;

import com.capstone.backend.entity.Scene;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SceneRepository extends JpaRepository<Scene, Long> {
    List<Scene> findByUserId(Long userId);
    List<Scene> findByUserUsername(String username);
}
