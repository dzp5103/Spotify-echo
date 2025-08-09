/**
 * Dynamic Workflow Configuration Manager
 * 
 * Manages configurable agent workflows with support for:
 * - Template-based workflow definitions
 * - Dynamic task assignment
 * - Multiple input sources (PR comments, API, config files)
 * - Conditional logic and parameter validation
 * - Integration with existing GitHub Actions and MCP servers
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { EventEmitter } = require('events');

class WorkflowConfigurationManager extends EventEmitter {
    constructor(options = {}) {
        super();
        this.templatesDir = options.templatesDir || path.join(__dirname, 'templates');
        this.configDir = options.configDir || path.join(__dirname, 'config');
        this.tasksFile = options.tasksFile || path.join(__dirname, 'next-tasks.json');
        this.statusFile = options.statusFile || path.join(__dirname, 'current-status.json');
        
        this.templates = new Map();
        this.activeWorkflows = new Map();
        this.config = this.loadConfiguration();
        
        this.loadTemplates();
        this.setupInputSources();
    }

    /**
     * Load workflow configuration
     */
    loadConfiguration() {
        try {
            const configPath = path.join(this.configDir, 'config.json');
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                return {
                    enabled: true,
                    auto_assign: true,
                    max_concurrent_workflows: 3,
                    default_timeout: '30m',
                    notification_channels: ['pr_comment', 'issue_comment'],
                    ...config
                };
            }
        } catch (error) {
            console.error('Error loading configuration:', error.message);
        }
        
        return {
            enabled: true,
            auto_assign: true,
            max_concurrent_workflows: 3,
            default_timeout: '30m',
            notification_channels: ['pr_comment']
        };
    }

    /**
     * Load all workflow templates
     */
    loadTemplates() {
        try {
            if (!fs.existsSync(this.templatesDir)) {
                console.warn(`Templates directory not found: ${this.templatesDir}`);
                return;
            }

            const templateFiles = fs.readdirSync(this.templatesDir)
                .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));

            templateFiles.forEach(file => {
                try {
                    const templatePath = path.join(this.templatesDir, file);
                    const templateContent = fs.readFileSync(templatePath, 'utf8');
                    const template = yaml.load(templateContent);
                    
                    if (this.validateTemplate(template)) {
                        this.templates.set(template.category, template);
                        console.log(`✅ Loaded workflow template: ${template.name} (${template.category})`);
                    } else {
                        console.error(`❌ Invalid template: ${file}`);
                    }
                } catch (error) {
                    console.error(`Error loading template ${file}:`, error.message);
                }
            });

        } catch (error) {
            console.error('Error loading templates:', error.message);
        }
    }

    /**
     * Validate workflow template structure
     */
    validateTemplate(template) {
        const requiredFields = ['name', 'category', 'parameters', 'triggers', 'workflow_steps'];
        
        for (const field of requiredFields) {
            if (!template[field]) {
                console.error(`Template missing required field: ${field}`);
                return false;
            }
        }

        // Validate parameters
        if (typeof template.parameters !== 'object') {
            console.error('Template parameters must be an object');
            return false;
        }

        // Validate workflow steps
        if (!Array.isArray(template.workflow_steps) || template.workflow_steps.length === 0) {
            console.error('Template must have at least one workflow step');
            return false;
        }

        return true;
    }

    /**
     * Setup input sources for dynamic task assignment
     */
    setupInputSources() {
        // PR Comment handler
        this.on('pr_comment', (data) => this.handlePRComment(data));
        
        // Issue Label handler
        this.on('issue_label', (data) => this.handleIssueLabel(data));
        
        // API endpoint handler
        this.on('api_request', (data) => this.handleAPIRequest(data));
        
        // Manual configuration handler
        this.on('manual_trigger', (data) => this.handleManualTrigger(data));

        console.log('✅ Input sources configured');
    }

    /**
     * Handle PR comment triggers
     */
    async handlePRComment(data) {
        const { comment, pr_number, author } = data;
        
        for (const [category, template] of this.templates) {
            const triggers = template.triggers.filter(t => t.type === 'pr_comment');
            
            for (const trigger of triggers) {
                const match = comment.match(new RegExp(trigger.pattern, 'i'));
                if (match) {
                    const parameters = this.extractParameters(match, trigger.capture_groups);
                    
                    await this.createWorkflowTask({
                        template: template,
                        parameters: parameters,
                        source: 'pr_comment',
                        context: { pr_number, author, comment }
                    });
                    
                    return; // Only process first match
                }
            }
        }
    }

    /**
     * Handle issue label triggers
     */
    async handleIssueLabel(data) {
        const { labels, issue_number, title, body } = data;
        
        for (const [category, template] of this.templates) {
            const triggers = template.triggers.filter(t => t.type === 'issue_label');
            
            for (const trigger of triggers) {
                const hasMatchingLabel = trigger.labels.some(label => labels.includes(label));
                if (hasMatchingLabel) {
                    const parameters = this.extractParametersFromIssue({ title, body, labels });
                    
                    await this.createWorkflowTask({
                        template: template,
                        parameters: parameters,
                        source: 'issue_label',
                        context: { issue_number, labels, title }
                    });
                    
                    return;
                }
            }
        }
    }

    /**
     * Handle API requests for workflow creation
     */
    async handleAPIRequest(data) {
        const { template_category, parameters, source = 'api' } = data;
        
        const template = this.templates.get(template_category);
        if (!template) {
            throw new Error(`Template not found: ${template_category}`);
        }

        return await this.createWorkflowTask({
            template: template,
            parameters: parameters,
            source: source,
            context: data.context || {}
        });
    }

    /**
     * Handle manual triggers
     */
    async handleManualTrigger(data) {
        return await this.handleAPIRequest({ ...data, source: 'manual' });
    }

    /**
     * Extract parameters from regex matches
     */
    extractParameters(match, captureGroups) {
        const parameters = {};
        
        if (captureGroups) {
            Object.entries(captureGroups).forEach(([param, groupIndex]) => {
                if (match[groupIndex]) {
                    parameters[param] = match[groupIndex].trim();
                }
            });
        }
        
        return parameters;
    }

    /**
     * Extract parameters from issue content
     */
    extractParametersFromIssue({ title, body, labels }) {
        const parameters = {};
        
        // Extract from title
        if (title) {
            // Look for patterns like "Feature: user-authentication" or "Bug: login-failure"
            const titleMatch = title.match(/^(\w+):\s*(.+)$/i);
            if (titleMatch) {
                parameters.feature_name = titleMatch[2].toLowerCase().replace(/\s+/g, '-');
                parameters.bug_id = titleMatch[2].toLowerCase().replace(/\s+/g, '-');
            }
        }
        
        // Extract priority from labels
        const priorityLabels = ['low', 'medium', 'high', 'critical'];
        const priority = priorityLabels.find(p => labels.includes(`priority-${p}`) || labels.includes(p));
        if (priority) {
            parameters.priority = priority;
        }
        
        // Extract severity for bugs
        const severityLabels = ['low', 'medium', 'high', 'critical'];
        const severity = severityLabels.find(s => labels.includes(`severity-${s}`));
        if (severity) {
            parameters.severity = severity;
        }
        
        return parameters;
    }

    /**
     * Create a new workflow task
     */
    async createWorkflowTask(taskData) {
        const { template, parameters, source, context } = taskData;
        
        // Validate parameters
        const validatedParams = this.validateParameters(template.parameters, parameters);
        if (!validatedParams.isValid) {
            throw new Error(`Invalid parameters: ${validatedParams.errors.join(', ')}`);
        }

        // Check conditions if any
        const conditionsValid = await this.checkConditions(template.conditions || [], validatedParams.parameters);
        if (!conditionsValid.isValid) {
            console.warn(`Conditions not met for ${template.name}: ${conditionsValid.reason}`);
            return null;
        }

        // Check concurrent workflow limit
        if (this.activeWorkflows.size >= this.config.max_concurrent_workflows) {
            console.warn('Maximum concurrent workflows reached, queueing task');
            return await this.queueTask(taskData);
        }

        // Create workflow instance
        const workflowId = this.generateWorkflowId(template.category);
        const workflow = {
            id: workflowId,
            template: template,
            parameters: validatedParams.parameters,
            source: source,
            context: context,
            status: 'created',
            created_at: new Date().toISOString(),
            current_step: null,
            completed_steps: [],
            outputs: {}
        };

        // Save to active workflows
        this.activeWorkflows.set(workflowId, workflow);
        
        // Add to next tasks list
        await this.addToTaskList(workflow);
        
        // Update status
        await this.updateStatus('workflow_created', { workflow_id: workflowId });
        
        console.log(`✅ Created workflow: ${template.name} (ID: ${workflowId})`);
        
        // Trigger execution if auto-assign is enabled
        if (this.config.auto_assign) {
            await this.executeWorkflow(workflowId);
        }
        
        return workflow;
    }

    /**
     * Validate parameters against template schema
     */
    validateParameters(templateParams, providedParams) {
        const errors = [];
        const parameters = { ...providedParams };

        // Check required parameters
        Object.entries(templateParams).forEach(([paramName, paramConfig]) => {
            if (paramConfig.required && !parameters[paramName]) {
                errors.push(`Missing required parameter: ${paramName}`);
            }
            
            // Set defaults
            if (!parameters[paramName] && paramConfig.default !== undefined) {
                parameters[paramName] = paramConfig.default;
            }
            
            // Validate type
            if (parameters[paramName] && paramConfig.type) {
                if (!this.validateParameterType(parameters[paramName], paramConfig.type)) {
                    errors.push(`Invalid type for parameter ${paramName}: expected ${paramConfig.type}`);
                }
            }
            
            // Validate options
            if (parameters[paramName] && paramConfig.options) {
                if (!paramConfig.options.includes(parameters[paramName])) {
                    errors.push(`Invalid value for parameter ${paramName}: must be one of ${paramConfig.options.join(', ')}`);
                }
            }
            
            // Validate regex pattern
            if (parameters[paramName] && paramConfig.validation) {
                const regex = new RegExp(paramConfig.validation);
                if (!regex.test(parameters[paramName])) {
                    errors.push(`Invalid format for parameter ${paramName}`);
                }
            }
        });

        return {
            isValid: errors.length === 0,
            errors: errors,
            parameters: parameters
        };
    }

    /**
     * Validate parameter type
     */
    validateParameterType(value, expectedType) {
        switch (expectedType) {
            case 'string':
                return typeof value === 'string';
            case 'boolean':
                return typeof value === 'boolean';
            case 'number':
                return typeof value === 'number';
            case 'text':
                return typeof value === 'string';
            default:
                return true;
        }
    }

    /**
     * Check workflow conditions
     */
    async checkConditions(conditions, parameters) {
        for (const condition of conditions) {
            const result = await this.evaluateCondition(condition, parameters);
            if (!result) {
                return { isValid: false, reason: condition.description || condition.name };
            }
        }
        
        return { isValid: true };
    }

    /**
     * Evaluate a single condition
     */
    async evaluateCondition(condition, parameters) {
        switch (condition.check) {
            case 'directory_exists':
                const dirPath = this.resolveParameter(condition.parameter, parameters);
                return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
                
            case 'no_active_tasks':
                const activeInCategory = Array.from(this.activeWorkflows.values())
                    .filter(w => w.template.category === condition.category);
                return activeInCategory.length === 0;
                
            default:
                console.warn(`Unknown condition check: ${condition.check}`);
                return true;
        }
    }

    /**
     * Resolve parameter templates like {{parameters.name}}
     */
    resolveParameter(template, parameters) {
        if (typeof template !== 'string') return template;
        
        return template.replace(/\{\{parameters\.(\w+)\}\}/g, (match, paramName) => {
            return parameters[paramName] || match;
        });
    }

    /**
     * Generate unique workflow ID
     */
    generateWorkflowId(category) {
        return `${category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Add workflow to tasks list
     */
    async addToTaskList(workflow) {
        try {
            let tasks = [];
            if (fs.existsSync(this.tasksFile)) {
                const tasksData = fs.readFileSync(this.tasksFile, 'utf8');
                tasks = JSON.parse(tasksData);
            }

            const task = {
                title: `${workflow.template.name}: ${workflow.parameters.feature_name || workflow.parameters.bug_id || 'Automated Task'}`,
                priority: workflow.parameters.priority || 'medium',
                category: workflow.template.category,
                workflow_id: workflow.id,
                created_at: workflow.created_at,
                source: workflow.source,
                parameters: workflow.parameters
            };

            tasks.push(task);
            fs.writeFileSync(this.tasksFile, JSON.stringify(tasks, null, 2));
            
            console.log(`✅ Added task to list: ${task.title}`);
        } catch (error) {
            console.error('Error adding task to list:', error.message);
        }
    }

    /**
     * Update workflow status
     */
    async updateStatus(action, data = {}) {
        try {
            const status = {
                status: action,
                last_updated: new Date().toISOString(),
                active_workflows: this.activeWorkflows.size,
                ...data
            };

            fs.writeFileSync(this.statusFile, JSON.stringify(status, null, 2));
        } catch (error) {
            console.error('Error updating status:', error.message);
        }
    }

    /**
     * Execute workflow (simplified implementation)
     */
    async executeWorkflow(workflowId) {
        const workflow = this.activeWorkflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }

        workflow.status = 'running';
        workflow.started_at = new Date().toISOString();

        console.log(`🚀 Starting workflow: ${workflow.template.name} (ID: ${workflowId})`);

        // This is a simplified execution - in practice, this would integrate with
        // GitHub Actions, MCP servers, and other automation systems
        await this.updateStatus('workflow_started', { workflow_id: workflowId });
        
        return workflow;
    }

    /**
     * Get available templates
     */
    getAvailableTemplates() {
        return Array.from(this.templates.values()).map(template => ({
            name: template.name,
            category: template.category,
            description: template.description,
            parameters: Object.keys(template.parameters)
        }));
    }

    /**
     * Get active workflows
     */
    getActiveWorkflows() {
        return Array.from(this.activeWorkflows.values());
    }

    /**
     * Queue task when at capacity
     */
    async queueTask(taskData) {
        // Implementation for task queueing
        console.log('Task queued for later execution');
        return null;
    }
}

module.exports = WorkflowConfigurationManager;