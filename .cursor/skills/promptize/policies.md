# Promptize Policies

Read this when the task domain involves git/working tree, dependencies, security, database, APIs, UI, non-functionals, impact, or protected/generated areas. Apply only what is relevant; unrelated sections stay out of the generated prompt (or `N/A`).

## Git / working tree

Before implementation (`--execute` or follow-up execute):

1. Run `git status` (and note dirty paths).
2. Never overwrite, revert, reset, or discard pre-existing user changes.
3. Treat unrelated working-tree changes as **protected state**.
4. If the task must touch a dirty file, surface the overlap to the user before editing and preserve their intent; do not clobber their edits.

## Dependency policy

Before adding a dependency:

1. Check whether the repository already has an equivalent dependency.
2. Check whether existing framework/platform APIs can solve the problem.
3. Prefer existing dependencies.
4. Add a new dependency only when it materially improves the implementation.
5. Explain why the dependency is necessary (Engineering Decisions / Constraints).
6. Do not replace an existing dependency without explicit justification (and user intent when it is an architectural swap).

## Security considerations

When applicable, inspect and document only **relevant** items:

- Authentication / authorization
- Input validation
- Injection risks
- XSS / CSRF
- Secrets and credentials
- File upload handling
- Path traversal
- SSRF
- Sensitive data exposure
- Dependency vulnerabilities
- Permission boundaries

Put findings in **Security Considerations**. Confirmation is required before destructive or security-sensitive execution (see SKILL.md Execution Rules).

## Database / migrations

If the task changes persistent data structures:

- Identify affected schema/models.
- Identify the existing migration mechanism (Prisma, Drizzle, Django, Rails, raw SQL, etc.).
- Follow the repository’s migration conventions.
- Never modify production data destructively without confirmation.
- Identify backward compatibility concerns.
- Identify rollback considerations.

Document under Technical Requirements (and Impact Analysis as needed).

## API compatibility

Classify API work as one of:

- New API
- Modified API
- Breaking API change
- Internal-only change

When documenting API changes, include as applicable:

- Endpoint
- HTTP method
- Request changes
- Response changes
- Error behavior
- Authentication requirements
- Backward compatibility

## UI / UX

When the task is UI-related, inspect existing:

- Design system / component library
- Spacing, typography, color conventions
- Responsive breakpoints
- Accessibility patterns
- Loading, empty, and error states
- Mobile behavior

**Do not invent a new design system if one already exists.** Extend existing components and tokens.

## Non-functional requirements

When the request implies them, specify measurable or concrete expectations for:

- Performance
- Accessibility
- Security
- Reliability
- Scalability
- Observability
- Maintainability
- Localization
- Compatibility

Example: “optimize API” without a performance target is incomplete — derive a reasonable, evidence-based target or mark Unknown (non-blocking unless execution is unsafe).

## Impact analysis

Identify:

- Directly affected components
- Indirectly affected components
- Public APIs
- Data models
- Shared utilities
- Tests
- Build/deployment implications

Use this to keep scope honest and to populate Out of Scope.

## Protected areas

Identify files/directories that must not be modified unless explicitly required. Examples:

- Generated files
- Vendor code
- Reference fixtures
- Migration history (do not rewrite applied migrations unless that is the repo’s explicit practice)
- External/reference datasets
- Build artifacts

List them under Constraints / Protected Areas in the generated prompt.

## Generated files

Recognize common generated outputs, e.g.:

- `dist/`, `build/`, `generated/`
- `*.generated.ts`
- `openapi-generated/`

Prefer modifying **source-of-truth** files rather than generated artifacts. Edit generated output only when repository convention requires it (document why).

## Definition of Done (detail)

Use as the engineering completion bar (behavior belongs in Acceptance Criteria):

- Implementation matches the requested behavior
- No unrelated files were modified
- Existing APIs remain compatible unless explicitly changed
- Formatting/linting passes where configured
- Relevant tests pass where available
- No new dependency was introduced without justification
- No unresolved TODOs remain from this task
- Pre-existing user working-tree changes were not discarded or overwritten
