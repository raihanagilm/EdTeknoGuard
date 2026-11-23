# Clean State Checklist

A session is not complete until all 5 dimensions pass:
1. [ ] Build / check passes without errors (`make check`)
2. [ ] All unit and integration tests pass (`pytest`)
3. [ ] PROGRESS.md and feature_list.json updated
4. [ ] Zero debug artifacts (no console.log, unhandled prints, leftover files)
5. [ ] Application startup path verified (`make dev`)
