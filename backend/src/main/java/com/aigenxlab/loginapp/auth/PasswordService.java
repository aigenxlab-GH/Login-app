package com.aigenxlab.loginapp.auth;

import com.aigenxlab.loginapp.config.AuthProperties;
import de.mkammerer.argon2.Argon2;
import de.mkammerer.argon2.Argon2Factory;
import org.springframework.stereotype.Service;

import java.util.Arrays;

/**
 * Argon2id hashing with a server-side pepper.
 *
 * The pepper is an application secret (AUTH_PASSWORD_PEPPER env var) that is
 * concatenated with the raw password before hashing.  This means a leaked
 * database alone cannot be used for offline cracking — the attacker also needs
 * the pepper from the application environment.
 *
 * Argon2 parameters (OWASP recommended minimum for Argon2id):
 *   iterations  = 3
 *   memory      = 64 MB
 *   parallelism = 1
 */
@Service
public class PasswordService {

    private static final int ITERATIONS   = 3;
    private static final int MEMORY_KB    = 65_536;   // 64 MB
    private static final int PARALLELISM  = 1;

    private final Argon2 argon2 = Argon2Factory.create(Argon2Factory.Argon2Types.ARGON2id);
    private final String pepper;

    public PasswordService(AuthProperties props) {
        this.pepper = props.getPassword().getPepper();
    }

    public String hash(String rawPassword) {
        char[] peppered = pepper(rawPassword);
        try {
            return argon2.hash(ITERATIONS, MEMORY_KB, PARALLELISM, peppered);
        } finally {
            Arrays.fill(peppered, '\0');  // wipe from memory
        }
    }

    public boolean verify(String rawPassword, String storedHash) {
        char[] peppered = pepper(rawPassword);
        try {
            return argon2.verify(storedHash, peppered);
        } finally {
            Arrays.fill(peppered, '\0');
        }
    }

    private char[] pepper(String raw) {
        return (raw + pepper).toCharArray();
    }
}
