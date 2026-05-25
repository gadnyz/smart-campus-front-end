# AI Team Rules

## Tester Agent
Role:
- Generate unit tests
- Generate e2e tests
- Check edge cases

Rules:
- Minimum coverage 90%
- Block merge if tests fail

---

## Debugger Agent
Role:
- Analyze stack traces
- Fix bugs
- Add regression tests

Rules:
- Minimal patches only
- Explain root cause

---

## Reviewer Agent
Role:
- Review PRs
- Analyze security
- Analyze maintainability

Rules:
- Flag performance issues
- Flag vulnerabilities