package com.aigenxlab.loginapp.auth;

import com.aigenxlab.loginapp.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.security.web.FilterChainProxy;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired private WebApplicationContext context;
    @Autowired private FilterChainProxy springSecurityFilterChain;
    @Autowired private UserRepository users;
    @Autowired private ObjectMapper json;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).addFilters(springSecurityFilterChain).build();
        users.deleteAll();
    }

    @Test
    void signupLoginMeLogoutHappyPath() throws Exception {
        // signup
        Map<String, Object> signup = Map.of(
                "name", "Ada Lovelace",
                "email", "ada@example.com",
                "password", "supersecret1",
                "confirmPassword", "supersecret1",
                "address", "1 Analytical Engine Way",
                "designation", "Mathematician"
        );
        mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(signup)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("ada@example.com"));

        // login -- carry the MockHttpSession forward to simulate the real
        // browser holding a JSESSIONID cookie across subsequent requests.
        MockHttpSession session = new MockHttpSession();
        Map<String, Object> login = Map.of("email", "ada@example.com", "password", "supersecret1");
        MvcResult loginResult = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .session(session)
                        .content(json.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Ada Lovelace"))
                .andReturn();

        HttpSession authenticatedSession = loginResult.getRequest().getSession(false);
        assertThat(authenticatedSession)
                .as("login should establish an HTTP session")
                .isNotNull();

        // me with the session
        mvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("ada@example.com"));

        // logout invalidates the session
        mvc.perform(post("/api/auth/logout").session(session))
                .andExpect(status().isNoContent());

        // me after logout returns 401 with a fresh session
        mvc.perform(get("/api/auth/me").session(new MockHttpSession()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void meWithoutSessionReturns401() throws Exception {
        mvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginWithBadCredentialsReturns401() throws Exception {
        Map<String, Object> bad = Map.of("email", "nobody@example.com", "password", "wrongpass");
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(bad)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void signupRejectsMismatchedConfirmPassword() throws Exception {
        Map<String, Object> bad = Map.of(
                "name", "Grace Hopper",
                "email", "grace@example.com",
                "password", "supersecret1",
                "confirmPassword", "different1",
                "address", "Naval HQ",
                "designation", "Rear Admiral"
        );
        mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(bad)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.confirmPassword").exists());
    }

    @Test
    void changePasswordSucceedsWithCorrectOldPassword() throws Exception {
        Map<String, Object> signup = Map.of(
                "name", "Alan Turing",
                "email", "alan@example.com",
                "password", "enigma1234",
                "confirmPassword", "enigma1234",
                "address", "Bletchley Park",
                "designation", "Cryptanalyst"
        );
        mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(signup)))
                .andExpect(status().isCreated());

        Map<String, Object> change = Map.of(
                "email", "alan@example.com",
                "oldPassword", "enigma1234",
                "newPassword", "bombe5678",
                "confirmNewPassword", "bombe5678"
        );
        mvc.perform(post("/api/auth/change-password").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(change)))
                .andExpect(status().isNoContent());

        // old password no longer works
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", "alan@example.com", "password", "enigma1234"))))
                .andExpect(status().isUnauthorized());

        // new password works
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", "alan@example.com", "password", "bombe5678"))))
                .andExpect(status().isOk());
    }

    @Test
    void changePasswordWithWrongOldPasswordReturns401() throws Exception {
        Map<String, Object> signup = Map.of(
                "name", "Linus",
                "email", "linus@example.com",
                "password", "torvalds1",
                "confirmPassword", "torvalds1",
                "address", "Helsinki",
                "designation", "Engineer"
        );
        mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(signup)))
                .andExpect(status().isCreated());

        Map<String, Object> change = Map.of(
                "email", "linus@example.com",
                "oldPassword", "WRONG",
                "newPassword", "newpass12",
                "confirmNewPassword", "newpass12"
        );
        mvc.perform(post("/api/auth/change-password").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(change)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void duplicateEmailSignupReturns400() throws Exception {
        Map<String, Object> first = Map.of(
                "name", "First", "email", "dup@example.com", "password", "password1",
                "confirmPassword", "password1", "address", "Addr", "designation", "Eng"
        );
        mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(first)))
                .andExpect(status().isCreated());

        Map<String, Object> second = Map.of(
                "name", "Second", "email", "dup@example.com", "password", "password2",
                "confirmPassword", "password2", "address", "Addr2", "designation", "Eng2"
        );
        mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(second)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.email").exists());
    }
}
