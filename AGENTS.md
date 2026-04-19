# AGENTS

- New code should be written with JSDoc comments.
- Any new or added files should be checked with eslint after creation or changes.
- Always run `npm run typecheck` as part of checks.
- If you create a new branch for user work, you should almost always also create or update the matching PR unless the user explicitly says not to, or the branch is only for local throwaway investigation.
- When creating PRs, use a proper multiline body (for example, `gh pr create --body-file - <<'EOF'` ... `EOF`) so newlines aren't escaped.
