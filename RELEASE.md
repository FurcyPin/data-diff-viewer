The release is automatically handled by the [`.github/workflows/release.yml`](.github/workflows/release.yml) GitHub
action pipeline. 

Make sure the version matches the upstream version and increase the last digit in the version number.

### Bump version

We use the tool [bump-my-version](https://github.com/callowayproject/bump-my-version) to handle version changes.

```
# 0.1.0 -> 0.1.1
bump-my-version bump patch

# 0.1.1 -> 0.2.0
bump-my-version bump minor
```

### Release

- [ ] update changelog in README.md
- [ ] bump version
- [ ] `git push`
- [ ] check build
- [ ] `git push --tags`
