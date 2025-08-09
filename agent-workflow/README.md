# 🤖 Configurable Agent Workflows

A flexible system for dynamic task assignment and workflow execution with minimal manual intervention.

## Overview

This system provides configurable workflow templates that can be dynamically triggered through multiple input sources:
- PR comments (`/implement feature user-authentication`)
- Issue labels (`feature-request`, `bug`, `performance`)
- API calls and manual configuration
- Scheduled triggers

## Quick Start

### 1. List Available Templates
```bash
npm run workflow:templates
```

### 2. Create a Workflow
```bash
# Via CLI
npm run workflow:create -- --template feature-development --params '{"feature_name":"user-dashboard","priority":"high"}'

# Via API
curl -X POST http://localhost:3000/api/workflow/create \
  -H "Content-Type: application/json" \
  -d '{"template_category":"feature-development","parameters":{"feature_name":"user-dashboard"}}'
```

### 3. Check Active Workflows
```bash
npm run workflow:active
```

## Built-in Templates

1. **Feature Development** (`feature-development`)
   - Implements new features with testing and documentation
   - Triggered by: `/implement feature <name>`, `feature-request` label

2. **Bug Fixes** (`bug-fixes`)
   - Systematic bug resolution with regression tests
   - Triggered by: `/fix bug <id>`, `bug` label

3. **Performance Optimization** (`performance-optimization`)
   - Performance analysis and improvements
   - Triggered by: `/optimize <target>`, `performance` label

## Structure

- `templates/` - Workflow template definitions (YAML)
- `config/` - System configuration files
- `workflow-config-manager.js` - Core workflow management system
- `workflow-api.js` - REST API for workflow operations
- `workflow-cli.js` - Command-line interface
- `README.md` - Complete documentation

## Legacy Structure (Continuous Agent)

- `summaries/` - PR completion summaries and analysis
- `tasks/` - Generated tasks for next development cycle
- `prompts/` - Generated prompts for coding agent
- `progress/` - Progress tracking and status updates
- `current-status.json` - Current status of the workflow
- `last-analysis.md` - Latest analysis summary
- `next-tasks.json` - Queue of pending tasks

## Integration with GitHub Actions

The system integrates with GitHub Actions through the `dynamic-workflow-handler.yml` workflow:
- **PR Comments**: Automatically detect and process workflow commands
- **Issue Labels**: Trigger workflows when specific labels are applied
- **Manual Dispatch**: Execute workflows with custom parameters
- **Status Updates**: Post progress and results back to issues/PRs