package com.aigenxlab.loginapp.admin;

import com.aigenxlab.loginapp.auth.dto.UserResponse;
import com.aigenxlab.loginapp.error.AppException;
import com.aigenxlab.loginapp.session.SessionRepository;
import com.aigenxlab.loginapp.user.User;
import com.aigenxlab.loginapp.user.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository users;
    private final SessionRepository sessions;

    public AdminController(UserRepository users, SessionRepository sessions) {
        this.users = users;
        this.sessions = sessions;
    }

    /** Returns all users. Only callable by ADMIN users. */
    @GetMapping("/users")
    public ResponseEntity<List<UserResponse>> listUsers(Authentication auth) {
        requireAdmin(auth);
        List<UserResponse> list = users.findAll()
                .stream()
                .map(UserResponse::from)
                .toList();
        return ResponseEntity.ok(list);
    }

    /** Returns a single user by id. Only callable by ADMIN users. */
    @GetMapping("/users/{id}")
    public ResponseEntity<UserResponse> getUser(@PathVariable UUID id, Authentication auth) {
        requireAdmin(auth);
        UserResponse user = users.findById(id)
                .map(UserResponse::from)
                .orElseThrow(AppException::invalidCredentials);
        return ResponseEntity.ok(user);
    }

    /** Activates or deactivates a user. Only callable by ADMIN users. */
    @PatchMapping("/users/{id}/status")
    public ResponseEntity<UserResponse> setUserStatus(
            @PathVariable UUID id,
            @RequestBody StatusRequest body,
            Authentication auth) {
        requireAdmin(auth);

        UUID callerId = (UUID) auth.getPrincipal();
        if (callerId.equals(id)) {
            throw AppException.badRequest("You cannot change your own activation status.");
        }

        User target = users.findById(id)
                .orElseThrow(AppException::invalidCredentials);

        // Auto-assign employee ID when activating a user who doesn't have one yet.
        if (body.active() && target.getEmployeeId() == null) {
            int nextId = users.getNextEmployeeId();
            if (nextId == -1) {
                throw AppException.employeeIdExhausted();
            }
            users.assignEmployeeId(id, nextId);
        }

        users.setActiveStatus(id, body.active());

        UserResponse updated = users.findById(id)
                .map(UserResponse::from)
                .orElseThrow(AppException::invalidCredentials);

        // If deactivating, revoke all active sessions so they are logged out immediately.
        if (!body.active()) {
            sessions.revokeAllByUserId(id);
        }

        return ResponseEntity.ok(updated);
    }

    public record StatusRequest(boolean active) {}

    /** Deletes a user and all their sessions. Only callable by ADMIN users. */
    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable UUID id, Authentication auth) {
        requireAdmin(auth);

        UUID callerId = (UUID) auth.getPrincipal();
        if (callerId.equals(id)) {
            throw AppException.badRequest("You cannot delete your own account.");
        }

        sessions.revokeAllByUserId(id);
        users.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void requireAdmin(Authentication auth) {
        UUID userId = (UUID) auth.getPrincipal();
        User user = users.findById(userId)
                .orElseThrow(AppException::invalidCredentials);
        if (!"ADMIN".equals(user.getRole())) {
            throw AppException.forbidden();
        }
    }
}
