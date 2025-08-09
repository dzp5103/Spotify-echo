# Pull Request Template v4.0

## 📋 Summary

**Brief Description:**
<!-- Provide a clear, concise description of the changes -->

**Related Issues:**
<!-- Link related issues using "Fixes #123" or "Addresses #456" -->

**Type of Change:**
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] 🔧 Configuration change
- [ ] 🚀 Performance improvement
- [ ] 🔒 Security enhancement
- [ ] 🧹 Code refactoring
- [ ] 🤖 MCP integration/enhancement
- [ ] 🔄 CI/CD pipeline change

## 🎯 Motivation and Context

**Why is this change required? What problem does it solve?**
<!-- Explain the motivation behind this change -->

**Screenshots/Videos (if applicable):**
<!-- Add screenshots or videos to help explain the changes -->

## 🔍 Detailed Changes

### Code Changes
<!-- List the main code changes -->
- 
- 
- 

### Configuration Changes
<!-- List any configuration changes -->
- 
- 
- 

### Documentation Changes
<!-- List documentation updates -->
- 
- 
- 

## 🧪 Testing Strategy

### Testing Performed
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] End-to-end tests added/updated
- [ ] Manual testing completed
- [ ] Performance testing completed
- [ ] Security testing completed

### Test Coverage
- [ ] Coverage maintained or improved
- [ ] Critical paths tested
- [ ] Edge cases tested
- [ ] Error conditions tested

### Testing Environment
- [ ] Local development
- [ ] Staging environment
- [ ] Production-like environment

## 📊 Quality Validation Checklist

### Code Quality
- [ ] Code follows project style guidelines
- [ ] Code is self-documenting with appropriate comments
- [ ] Functions and classes have clear responsibilities
- [ ] Error handling is comprehensive
- [ ] No code duplication or redundancy

### Security & Compliance
- [ ] No secrets or sensitive data committed
- [ ] Environment variables properly configured
- [ ] Security best practices followed
- [ ] Dependencies are secure and up-to-date
- [ ] Input validation implemented where needed

### Performance & Efficiency
- [ ] Performance impact assessed
- [ ] Database queries optimized (if applicable)
- [ ] Memory usage considered
- [ ] Network requests optimized
- [ ] Caching implemented where appropriate

## 🤖 MCP Integration (if applicable)

### MCP Server Changes
- [ ] New MCP servers integrated
- [ ] Existing MCP servers updated
- [ ] MCP registry updated (`mcp/registry.yaml`)
- [ ] Health checks configured
- [ ] Capabilities documented

### MCP Validation
- [ ] MCP health checks passing
- [ ] Server communication verified
- [ ] Error handling tested
- [ ] Performance impact assessed

## 🏗️ CI/CD Pipeline Impact

### Pipeline Changes
- [ ] New workflows added
- [ ] Existing workflows modified
- [ ] Quality gates updated
- [ ] Artifact generation updated

### Validation Requirements
- [ ] All CI checks passing
- [ ] Security scans clean
- [ ] Performance benchmarks met
- [ ] Code coverage maintained
- [ ] No breaking changes in API

## 📁 Artifacts & Reports

### Generated Artifacts
- [ ] SBOM report (`reports/sbom.json`)
- [ ] Performance baseline (`reports/perf-baseline.json`)
- [ ] Security scan results
- [ ] Code coverage report
- [ ] MCP health report (`reports/mcp-health.md`)
- [ ] Code quality audit

### Documentation Updates
- [ ] README updated (if needed)
- [ ] API documentation updated (if needed)
- [ ] Architecture documentation updated (if needed)
- [ ] Configuration documentation updated (if needed)

## 🚀 Deployment Considerations

### Environment Impact
- [ ] No database migrations required
- [ ] No configuration changes required
- [ ] No environment variable changes required
- [ ] Backward compatibility maintained

### Rollback Strategy
- [ ] Rollback plan documented
- [ ] Database rollback considered (if applicable)
- [ ] Feature flags implemented (if applicable)
- [ ] Monitoring alerts configured

## 🔗 Dependencies & Integrations

### External Dependencies
- [ ] No new external dependencies
- [ ] New dependencies justified and secure
- [ ] Dependencies properly versioned
- [ ] License compatibility verified

### Integration Points
- [ ] Spotify API integration tested
- [ ] Database integration verified
- [ ] Third-party services tested
- [ ] MCP server integrations validated

## 📝 Additional Notes

### Breaking Changes
<!-- If there are breaking changes, describe them here -->

### Migration Guide
<!-- If users need to migrate, provide instructions -->

### Future Considerations
<!-- Any technical debt or future improvements to consider -->

## 👥 Review Request

### Specific Areas for Review
- [ ] Algorithm/logic correctness
- [ ] Security implications
- [ ] Performance impact
- [ ] API design
- [ ] Database schema changes
- [ ] UI/UX changes
- [ ] MCP integration
- [ ] Configuration management

### Review Priority
- [ ] 🔴 Urgent (hotfix, critical bug)
- [ ] 🟡 High (important feature, significant change)
- [ ] 🟢 Normal (routine change, improvement)
- [ ] 🔵 Low (documentation, minor fix)

## 🎉 Final Validation

### Pre-merge Checklist
- [ ] All tests passing locally
- [ ] All CI checks passing
- [ ] Code reviewed and approved
- [ ] Documentation complete
- [ ] No merge conflicts
- [ ] Deployment plan ready

### Post-merge Monitoring
- [ ] Performance monitoring plan
- [ ] Error rate monitoring
- [ ] User impact assessment plan
- [ ] Rollback triggers defined

---

**🤖 Auto-Labeling:** This PR will be automatically labeled based on changed files and content.

**📊 Quality Gate:** This PR must pass all quality gates before merging:
- Code coverage ≥ 70%
- Security scan clean
- Performance impact < 10%
- Code duplication < 15%

**💡 Need Help?** 
- Check our [Contributing Guidelines](CONTRIBUTING.md)
- Review [Architecture Documentation](docs/ARCHITECTURE.md)
- See [MCP Integration Guide](docs/MCP_INTEGRATION.md)

*Template Version: 4.0 | Last Updated: 2024-12-27 | Auto-generated fields will be populated by CI*