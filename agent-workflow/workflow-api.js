/**
 * Dynamic Workflow API
 * 
 * Provides REST API endpoints for configurable agent workflows
 */

const express = require('express');
const WorkflowConfigurationManager = require('./workflow-config-manager');

const router = express.Router();
const workflowManager = new WorkflowConfigurationManager();

/**
 * GET /api/workflow/templates
 * Get available workflow templates
 */
router.get('/templates', (req, res) => {
    try {
        const templates = workflowManager.getAvailableTemplates();
        res.json({
            success: true,
            templates: templates,
            count: templates.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/workflow/templates/:category
 * Get specific template details
 */
router.get('/templates/:category', (req, res) => {
    try {
        const template = workflowManager.templates.get(req.params.category);
        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template not found'
            });
        }

        res.json({
            success: true,
            template: template
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/workflow/create
 * Create a new workflow from template
 */
router.post('/create', async (req, res) => {
    try {
        const { template_category, parameters, context } = req.body;

        if (!template_category) {
            return res.status(400).json({
                success: false,
                error: 'template_category is required'
            });
        }

        const workflow = await workflowManager.handleAPIRequest({
            template_category: template_category,
            parameters: parameters || {},
            context: context || {}
        });

        if (workflow) {
            res.status(201).json({
                success: true,
                workflow: {
                    id: workflow.id,
                    name: workflow.template.name,
                    status: workflow.status,
                    created_at: workflow.created_at
                }
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Failed to create workflow'
            });
        }
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/workflow/active
 * Get currently active workflows
 */
router.get('/active', (req, res) => {
    try {
        const workflows = workflowManager.getActiveWorkflows();
        res.json({
            success: true,
            workflows: workflows.map(w => ({
                id: w.id,
                name: w.template.name,
                category: w.template.category,
                status: w.status,
                created_at: w.created_at,
                source: w.source,
                parameters: w.parameters
            })),
            count: workflows.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/workflow/:id
 * Get specific workflow details
 */
router.get('/:id', (req, res) => {
    try {
        const workflow = workflowManager.activeWorkflows.get(req.params.id);
        if (!workflow) {
            return res.status(404).json({
                success: false,
                error: 'Workflow not found'
            });
        }

        res.json({
            success: true,
            workflow: workflow
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/workflow/:id/execute
 * Execute a specific workflow
 */
router.post('/:id/execute', async (req, res) => {
    try {
        const workflow = await workflowManager.executeWorkflow(req.params.id);
        res.json({
            success: true,
            workflow: {
                id: workflow.id,
                name: workflow.template.name,
                status: workflow.status,
                started_at: workflow.started_at
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/workflow/pr-comment
 * Handle PR comment triggers
 */
router.post('/pr-comment', async (req, res) => {
    try {
        const { comment, pr_number, author } = req.body;

        if (!comment || !pr_number) {
            return res.status(400).json({
                success: false,
                error: 'comment and pr_number are required'
            });
        }

        // Emit PR comment event
        workflowManager.emit('pr_comment', {
            comment: comment,
            pr_number: pr_number,
            author: author
        });

        res.json({
            success: true,
            message: 'PR comment processed'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/workflow/issue-label
 * Handle issue label triggers
 */
router.post('/issue-label', async (req, res) => {
    try {
        const { labels, issue_number, title, body } = req.body;

        if (!labels || !issue_number) {
            return res.status(400).json({
                success: false,
                error: 'labels and issue_number are required'
            });
        }

        // Emit issue label event
        workflowManager.emit('issue_label', {
            labels: labels,
            issue_number: issue_number,
            title: title,
            body: body
        });

        res.json({
            success: true,
            message: 'Issue label processed'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/workflow/config
 * Get current workflow configuration
 */
router.get('/config', (req, res) => {
    try {
        res.json({
            success: true,
            config: workflowManager.config
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/workflow/config
 * Update workflow configuration
 */
router.put('/config', (req, res) => {
    try {
        const newConfig = { ...workflowManager.config, ...req.body };
        workflowManager.config = newConfig;
        
        // Save to file
        const fs = require('fs');
        const path = require('path');
        const configPath = path.join(workflowManager.configDir, 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));

        res.json({
            success: true,
            config: newConfig
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/workflow/status
 * Get system status and statistics
 */
router.get('/status', (req, res) => {
    try {
        const activeWorkflows = workflowManager.getActiveWorkflows();
        const templates = workflowManager.getAvailableTemplates();

        res.json({
            success: true,
            status: {
                active_workflows: activeWorkflows.length,
                available_templates: templates.length,
                max_concurrent: workflowManager.config.max_concurrent_workflows,
                auto_assign: workflowManager.config.enabled && workflowManager.config.auto_assign,
                last_updated: new Date().toISOString()
            },
            workflows: activeWorkflows.map(w => ({
                id: w.id,
                name: w.template.name,
                status: w.status,
                source: w.source
            })),
            templates: templates.map(t => ({
                name: t.name,
                category: t.category
            }))
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;