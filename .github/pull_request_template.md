---
name: Comprehensive Pull Request Template v4.0
about: Enhanced pull request template for EchoTune AI with advanced CI/CD validation
title: ''
labels: needs-review, ci-validation
assignees: ''
---

## 📋 Pull Request Summary

**Type of Change:** (Select all that apply)
- [ ] 🎵 New feature/enhancement
- [ ] 🐛 Bug fix
- [ ] 🔧 Configuration/Infrastructure change
- [ ] 🤖 MCP server integration/update
- [ ] 📚 Documentation update
- [ ] ⚡ Performance improvement
- [ ] 🔒 Security enhancement
- [ ] 🧪 Testing improvement
- [ ] 🔄 CI/CD pipeline change
- [ ] 🎨 Frontend/UI change
- [ ] 🗄️ Database/Backend change
- [ ] 📦 Dependency update

**Urgency Level:**
- [ ] 🔥 Critical/Hotfix (immediate deployment needed)
- [ ] ⚠️ High (should be included in next release)
- [ ] 📋 Medium (standard development cycle)
- [ ] 💡 Low (enhancement/nice-to-have)

## 🎯 Description

**Brief Summary:**
Clear description of what this PR does and why.

**Related Issues:**
- Fixes #
- Addresses #
- Related to #

**Breaking Changes:**
- [ ] This PR contains breaking changes
- [ ] This PR is backwards compatible

If breaking changes, describe:

## 🧪 Testing & Quality Assurance

**Testing Performed:**
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed
- [ ] Performance testing completed
- [ ] Security testing completed
- [ ] MCP integration testing completed

**Coverage:**
- [ ] Code coverage maintained/improved
- [ ] All tests passing
- [ ] No regression in existing functionality

**Quality Gates:**
- [ ] ESLint passes without errors
- [ ] Prettier formatting applied
- [ ] Security scan passes
- [ ] Performance benchmarks acceptable
- [ ] Documentation updated

## 🚀 Deployment & Configuration

**Deployment Requirements:**
- [ ] No deployment changes required
- [ ] Environment variables need updates
- [ ] Database migrations required
- [ ] Infrastructure changes needed
- [ ] Third-party service configuration updates
- [ ] MCP server deployment/restart required

**Configuration Changes:**
List any configuration files modified:
- [ ] `.env.example` updated
- [ ] `package.json` dependencies modified
- [ ] CI/CD workflows updated
- [ ] MCP registry updated
- [ ] Docker configuration changed

## 🔒 Security Considerations

**Security Review:**
- [ ] No sensitive data exposed in code
- [ ] Secrets properly managed
- [ ] Input validation implemented
- [ ] Authentication/authorization reviewed
- [ ] OWASP guidelines followed
- [ ] Dependency vulnerabilities checked

**Potential Security Impact:**
- [ ] None
- [ ] Low - minor security improvement
- [ ] Medium - addresses security concerns
- [ ] High - fixes security vulnerability

## ⚡ Performance Impact

**Performance Changes:**
- [ ] No performance impact expected
- [ ] Performance improvement expected
- [ ] Potential performance degradation (explain below)
- [ ] Performance testing required

**Metrics:**
- Bundle size change: +/- X KB
- Loading time impact: +/- X ms
- Memory usage: +/- X MB
- API response time: +/- X ms

## 🤖 MCP Integration (if applicable)

**MCP Changes:**
- [ ] New MCP server added
- [ ] Existing MCP server modified
- [ ] MCP orchestration updated
- [ ] MCP health checks updated
- [ ] Registry configuration changed

**MCP Testing:**
- [ ] MCP health checks pass
- [ ] Integration tests with MCP servers pass
- [ ] Coordination between servers validated
- [ ] Performance impact assessed

## 📱 Frontend Changes (if applicable)

**UI/UX Changes:**
- [ ] New components added
- [ ] Existing components modified
- [ ] Responsive design considerations
- [ ] Accessibility improvements
- [ ] Theme/styling updates

**Screenshots/Recordings:**
Add screenshots or GIFs showing the changes (before/after if applicable):

## 🗄️ Backend/API Changes (if applicable)

**API Changes:**
- [ ] New endpoints added
- [ ] Existing endpoints modified
- [ ] Breaking API changes
- [ ] Authentication/authorization changes
- [ ] Database schema changes

**Database Changes:**
- [ ] New tables/collections
- [ ] Schema modifications
- [ ] Data migrations required
- [ ] Indexing changes

## 📋 Checklist

**Developer:**
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No console.log/debug statements
- [ ] Error handling implemented
- [ ] Edge cases considered

**CI/CD Validation:**
- [ ] All GitHub Actions pass
- [ ] Hardened CI pipeline validates successfully
- [ ] Security scan passes
- [ ] Performance benchmarks meet thresholds
- [ ] Code coverage requirements met
- [ ] MCP validation passes (if applicable)

**Ready for Review:**
- [ ] PR is ready for code review
- [ ] All required information provided
- [ ] Tests are comprehensive
- [ ] Documentation is complete

## 🎵 Spotify Integration (if applicable)

**Spotify API Changes:**
- [ ] New API endpoints used
- [ ] Authentication flow modified
- [ ] Playlist operations updated
- [ ] User data handling changes
- [ ] Rate limiting considerations

## 📊 Monitoring & Analytics (if applicable)

**Monitoring:**
- [ ] New metrics/logging added
- [ ] Analytics events tracked
- [ ] Error reporting configured
- [ ] Performance monitoring updated

## 🔄 Post-Merge Actions

**Actions Required After Merge:**
- [ ] Deploy to staging environment
- [ ] Update production configuration
- [ ] Notify stakeholders
- [ ] Update documentation site
- [ ] Monitor deployment metrics
- [ ] Restart MCP servers (if needed)

## 💬 Additional Notes

Any additional context, concerns, or information for reviewers:

---

## 🤖 Automated Validation Status

<!-- This section will be populated by GitHub Actions -->
- **Quality Gates**: ⏳ Pending
- **Security Scan**: ⏳ Pending  
- **Performance Test**: ⏳ Pending
- **MCP Validation**: ⏳ Pending
- **Coverage Report**: ⏳ Pending

**Auto-merge Eligibility**: This PR will be eligible for auto-merge once all validation checks pass and required reviews are approved.

---
*Template Version: 4.0 | Last Updated: 2024-12-27*

---

## 🛡️ MCP Validation Results

> **Note:** MCP validation will run automatically when this PR is created. Results will be posted as a comment.

**Pre-submission Checklist:**
- [ ] All MCP servers are responding correctly
- [ ] Integration tests pass for affected MCP servers
- [ ] No security vulnerabilities introduced
- [ ] Documentation updated if new MCPs added
- [ ] Performance impact assessed

**Expected MCP Validation:**
- [ ] **Health Check**: All MCP servers operational
- [ ] **Integration Tests**: Community MCP servers validated  
- [ ] **Security Scan**: No high-severity vulnerabilities
- [ ] **Code Analysis**: FileScopeMCP validation passed
- [ ] **Performance**: Response times within acceptable limits

---

## 🔧 MCP Integration Details

### New MCP Servers Added
List any new MCP servers integrated:
- Server name: `package-name`
  - Purpose: Description of functionality
  - Configuration: Key configuration details
  - Dependencies: Any new dependencies added

### Existing MCP Servers Modified
List any changes to existing MCP server configurations:
- Server name: `existing-server`
  - Changes made: Description
  - Impact: Expected behavioral changes

### MCP Workflow Changes
Describe any changes to MCP automation workflows:
- Workflow file: `.github/workflows/example.yml`
- Changes: Description of modifications
- Impact: How this affects CI/CD

---

## 🧪 Testing

### Manual Testing Performed
- [ ] Tested MCP server startup/shutdown
- [ ] Validated new integrations manually
- [ ] Checked existing functionality still works
- [ ] Verified documentation accuracy

### Automated Testing
- [ ] All existing tests pass
- [ ] New tests added for changes (if applicable)
- [ ] MCP validation workflow passes
- [ ] Integration tests updated

### Test Coverage
If applicable, describe test coverage for MCP-related changes:
- Unit tests: Coverage details
- Integration tests: Scenarios covered
- E2E tests: User workflows tested

---

## 📚 Documentation

### Documentation Updated
- [ ] `docs/guides/AGENTS.md` - MCP server listings
- [ ] `README.md` - Installation/setup instructions
- [ ] Code comments - Inline documentation
- [ ] API documentation - If applicable
- [ ] Other: ___________

### New Documentation Added
List any new documentation files created:
- File: `path/to/file.md`
  - Purpose: Description

---

## 🚀 Deployment Considerations

### Environment Variables
List any new environment variables required:
- `VARIABLE_NAME`: Description and example value

### Dependencies
List any new package dependencies:
- Package: `package-name@version`
  - Reason: Why this dependency is needed

### Infrastructure Impact
Describe any infrastructure changes:
- Resource requirements: CPU/Memory changes
- Network requirements: New ports/connections
- Storage requirements: Disk space needs

---

## 🔍 MCP Discovery Integration

### Auto-Discovery Results
If this PR includes results from MCP auto-discovery:
- [ ] Discovery report reviewed: `mcp-discovery-report.json`
- [ ] Relevant MCPs selected for integration
- [ ] Integration priority assessed
- [ ] Community feedback considered

### Future MCP Candidates
List MCPs discovered but not integrated in this PR:
- Server name: `future-mcp-server`
  - Reason deferred: Explanation
  - Future consideration: Timeline/priority

---

## 📊 Performance Impact

### Expected Performance Changes
- Memory usage: Expected change
- CPU usage: Expected impact  
- Network usage: Additional requests/bandwidth
- Startup time: Impact on application startup

### Performance Testing
- [ ] Load testing performed (if significant changes)
- [ ] Memory leak testing (if applicable)
- [ ] Startup time measured
- [ ] Resource monitoring configured

---

## 🔐 Security Review

### Security Considerations
- [ ] No hardcoded secrets or credentials
- [ ] Environment variables used for sensitive data
- [ ] Input validation implemented where needed
- [ ] Network security considerations addressed

### MCP Security
- [ ] MCP server permissions configured correctly
- [ ] File system access properly scoped
- [ ] Network access restricted as needed
- [ ] Authentication/authorization implemented

---

## 🎯 Rollback Plan

### Rollback Strategy
If this change needs to be reverted:
1. Steps to disable new MCP servers
2. Configuration rollback procedure
3. Dependency cleanup process
4. Monitoring/alerting considerations

### Risk Assessment
- **Low Risk**: Minor configuration changes
- **Medium Risk**: New MCP integration  
- **High Risk**: Core MCP infrastructure changes

---

## 📝 Additional Notes

### Related Issues
Closes #[issue number]
Relates to #[issue number]

### Dependencies
This PR depends on:
- [ ] Other PR: #[pr number]
- [ ] External dependency: Description
- [ ] Infrastructure change: Description

### Future Work
Items to address in future PRs:
- [ ] Enhancement: Description
- [ ] Optimization: Description  
- [ ] Integration: Description

---

## ✅ Final Checklist

Before requesting review:
- [ ] All automated checks pass
- [ ] MCP validation results reviewed
- [ ] Documentation is complete and accurate
- [ ] Manual testing performed
- [ ] Security considerations addressed
- [ ] Performance impact assessed
- [ ] Rollback plan defined
- [ ] Related issues linked

**Ready for Review**: [ ] Yes / [ ] No

---

*This PR template ensures comprehensive MCP integration validation and maintains system reliability.*