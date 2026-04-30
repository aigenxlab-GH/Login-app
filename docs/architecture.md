# Architecture Decision Record — Login App

## Single-JAR Production Style

**Decision**: Ship one executable Spring Boot JAR that contains both the REST
API and the React SPA.

**Rationale**: Eliminates the operational complexity of deploying, routing, and
coordinating two separate services (an API server and a static hosting service)
for a small application. Same-origin deployment means no CORS configuration,
no preflight requests, and no proxy layer in production.

**Trade-off**: The build step is slightly slower (Node must run during Maven
`package`), and you cannot independently scale the frontend. Neither trade-off
matters at this application's scale.

---

## Auth: Custom Table + Spring Security Sessions

**Decision**: Use a custom `app_user` table with BCrypt passwords and
server-side HttpSession (Spring Security), **not** Supabase Auth.

**Rationale**:
- Supabase Auth adds an SDK dependency and another point of failure. For a
  learning/portfolio app it is unnecessary complexity.
- Server-side sessions are simple to reason about: session invalid → 401.
  No token refresh logic, no JWT key rotation.
- The JSESSIONID cookie is HttpOnly (no XSS exposure) and SameSite=Lax
  (blocks cross-site request forgery from third-party sites).

**Trade-off**: Sessions are not stateless — a restart loses all sessions. For
this use case (single instance, dev/portfolio) that is acceptable.

---

## Frontend: Relative `/api` Paths Only

**Decision**: The React app calls the backend using only relative `/api/...`
paths, never a hardcoded `http://localhost:...` or a production domain.

**Rationale**: The same frontend bundle works in every environment:
- Dev mode: Vite proxies `/api/**` to Spring Boot on `:8080`.
- Prod JAR: same origin — no proxy needed.
- Docker Compose: same origin inside the container.
- Cloud deployment: same origin.

No per-environment build configuration is needed.

---

## Flyway Migrations

**Decision**: Use Flyway SQL migrations. Hibernate runs in `validate` mode.

**Rationale**: Schema drift between environments is the most common source of
mysterious prod bugs. Flyway's versioned migrations make schema changes
explicit, reviewable, and reproducible.

`supabase/migrations/` mirrors the Flyway files for use with the Supabase CLI
(`supabase db push`). The authoritative version for the runtime is the one on
the classpath inside the JAR.

---

## Build: frontend-maven-plugin

**Decision**: Use `com.github.eirslett:frontend-maven-plugin` to invoke Node
and npm during `mvn package`.

**Rationale**: Keeps the build self-contained. Developers and CI runners only
need Java — the plugin downloads Node locally into `frontend/node/` (gitignored).
`npm ci` (not `npm install`) is used so the lock file is enforced and the build
is reproducible.

The plugin downloads Node once and caches it in the local Maven repository
(`~/.m2/repository/com/github/eirslett/node/`), so subsequent builds are fast.

---

## SpaForwardingConfig

**Decision**: Add a `WebMvcConfigurer` that forwards non-asset, non-API paths
to `/index.html`.

**Rationale**: React Router handles client-side navigation, but when the user
refreshes `/home` the server receives a GET for `/home` — which has no Spring
MVC handler. Without the forwarder, Spring Boot returns a 404. The pattern
`/{path:[^.]*}` matches any path segment without a dot (excludes static assets
like `/assets/app.js`), ensuring asset requests still resolve correctly.
