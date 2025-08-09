#!/usr/bin/env node

/**
 * Workflow CLI Tool
 * 
 * Command-line interface for managing configurable agent workflows
 */

const { Command } = require('commander');
const WorkflowConfigurationManager = require('./workflow-config-manager');
const fs = require('fs');
const path = require('path');

const program = new Command();
const workflowManager = new WorkflowConfigurationManager();

program
    .name('workflow-cli')
    .description('CLI for configurable agent workflows')
    .version('1.0.0');

/**
 * List available templates
 */
program
    .command('templates')
    .description('List available workflow templates')
    .option('-d, --details', 'Show detailed template information')
    .action(async (options) => {
        try {
            const templates = workflowManager.getAvailableTemplates();
            
            console.log(`\n📋 Available Workflow Templates (${templates.length}):\n`);
            
            templates.forEach((template, index) => {
                console.log(`${index + 1}. ${template.name}`);
                console.log(`   Category: ${template.category}`);
                console.log(`   Description: ${template.description}`);
                
                if (options.details) {
                    console.log(`   Parameters: ${template.parameters.join(', ')}`);
                }
                console.log('');
            });
            
        } catch (error) {
            console.error('❌ Error listing templates:', error.message);
            process.exit(1);
        }
    });

/**
 * Create new workflow
 */
program
    .command('create')
    .description('Create a new workflow from template')
    .requiredOption('-t, --template <category>', 'Template category')
    .option('-p, --params <json>', 'Parameters as JSON string')
    .option('-f, --file <path>', 'Parameters from JSON file')
    .action(async (options) => {
        try {
            let parameters = {};
            
            if (options.file) {
                const paramFile = path.resolve(options.file);
                if (!fs.existsSync(paramFile)) {
                    throw new Error(`Parameter file not found: ${paramFile}`);
                }
                parameters = JSON.parse(fs.readFileSync(paramFile, 'utf8'));
            } else if (options.params) {
                parameters = JSON.parse(options.params);
            }

            console.log(`\n🚀 Creating workflow from template: ${options.template}`);
            console.log(`Parameters:`, JSON.stringify(parameters, null, 2));

            const workflow = await workflowManager.handleAPIRequest({
                template_category: options.template,
                parameters: parameters,
                context: { source: 'cli' }
            });

            if (workflow) {
                console.log(`\n✅ Workflow created successfully:`);
                console.log(`   ID: ${workflow.id}`);
                console.log(`   Name: ${workflow.template.name}`);
                console.log(`   Status: ${workflow.status}`);
                console.log(`   Created: ${workflow.created_at}`);
            } else {
                console.log('❌ Failed to create workflow');
                process.exit(1);
            }
            
        } catch (error) {
            console.error('❌ Error creating workflow:', error.message);
            process.exit(1);
        }
    });

/**
 * List active workflows
 */
program
    .command('active')
    .description('List currently active workflows')
    .action(async () => {
        try {
            const workflows = workflowManager.getActiveWorkflows();
            
            console.log(`\n🔄 Active Workflows (${workflows.length}):\n`);
            
            if (workflows.length === 0) {
                console.log('No active workflows');
                return;
            }

            workflows.forEach((workflow, index) => {
                console.log(`${index + 1}. ${workflow.template.name}`);
                console.log(`   ID: ${workflow.id}`);
                console.log(`   Category: ${workflow.template.category}`);
                console.log(`   Status: ${workflow.status}`);
                console.log(`   Source: ${workflow.source}`);
                console.log(`   Created: ${workflow.created_at}`);
                console.log('');
            });
            
        } catch (error) {
            console.error('❌ Error listing active workflows:', error.message);
            process.exit(1);
        }
    });

/**
 * Execute workflow
 */
program
    .command('execute <workflow-id>')
    .description('Execute a specific workflow')
    .action(async (workflowId) => {
        try {
            console.log(`\n▶️ Executing workflow: ${workflowId}`);

            const workflow = await workflowManager.executeWorkflow(workflowId);
            
            console.log(`✅ Workflow execution started:`);
            console.log(`   Name: ${workflow.template.name}`);
            console.log(`   Status: ${workflow.status}`);
            console.log(`   Started: ${workflow.started_at}`);
            
        } catch (error) {
            console.error('❌ Error executing workflow:', error.message);
            process.exit(1);
        }
    });

/**
 * Show workflow details
 */
program
    .command('show <workflow-id>')
    .description('Show detailed workflow information')
    .action(async (workflowId) => {
        try {
            const workflow = workflowManager.activeWorkflows.get(workflowId);
            if (!workflow) {
                throw new Error(`Workflow not found: ${workflowId}`);
            }

            console.log(`\n📄 Workflow Details:\n`);
            console.log(`   ID: ${workflow.id}`);
            console.log(`   Name: ${workflow.template.name}`);
            console.log(`   Category: ${workflow.template.category}`);
            console.log(`   Status: ${workflow.status}`);
            console.log(`   Source: ${workflow.source}`);
            console.log(`   Created: ${workflow.created_at}`);
            
            if (workflow.started_at) {
                console.log(`   Started: ${workflow.started_at}`);
            }

            console.log(`\n   Parameters:`);
            Object.entries(workflow.parameters).forEach(([key, value]) => {
                console.log(`     ${key}: ${value}`);
            });

            if (workflow.completed_steps.length > 0) {
                console.log(`\n   Completed Steps: ${workflow.completed_steps.join(', ')}`);
            }

            if (workflow.current_step) {
                console.log(`   Current Step: ${workflow.current_step}`);
            }
            
        } catch (error) {
            console.error('❌ Error showing workflow:', error.message);
            process.exit(1);
        }
    });

/**
 * Show system status
 */
program
    .command('status')
    .description('Show system status and configuration')
    .action(async () => {
        try {
            const activeWorkflows = workflowManager.getActiveWorkflows();
            const templates = workflowManager.getAvailableTemplates();
            const config = workflowManager.config;

            console.log(`\n📊 Workflow System Status:\n`);
            
            console.log(`   System Status: ${config.enabled ? '🟢 Enabled' : '🔴 Disabled'}`);
            console.log(`   Auto Assignment: ${config.auto_assign ? '🟢 Enabled' : '🔴 Disabled'}`);
            console.log(`   Max Concurrent: ${config.max_concurrent_workflows}`);
            console.log(`   Default Timeout: ${config.default_timeout}`);
            
            console.log(`\n   Statistics:`);
            console.log(`     Active Workflows: ${activeWorkflows.length}`);
            console.log(`     Available Templates: ${templates.length}`);
            console.log(`     Notification Channels: ${config.notification_channels.join(', ')}`);
            
        } catch (error) {
            console.error('❌ Error getting status:', error.message);
            process.exit(1);
        }
    });

/**
 * Validate template
 */
program
    .command('validate <template-file>')
    .description('Validate a workflow template file')
    .action(async (templateFile) => {
        try {
            const yaml = require('js-yaml');
            const templatePath = path.resolve(templateFile);
            
            if (!fs.existsSync(templatePath)) {
                throw new Error(`Template file not found: ${templatePath}`);
            }

            console.log(`\n🔍 Validating template: ${templateFile}`);

            const templateContent = fs.readFileSync(templatePath, 'utf8');
            const template = yaml.load(templateContent);
            
            if (workflowManager.validateTemplate(template)) {
                console.log(`✅ Template is valid`);
                console.log(`   Name: ${template.name}`);
                console.log(`   Category: ${template.category}`);
                console.log(`   Parameters: ${Object.keys(template.parameters).length}`);
                console.log(`   Workflow Steps: ${template.workflow_steps.length}`);
            } else {
                console.log(`❌ Template validation failed`);
                process.exit(1);
            }
            
        } catch (error) {
            console.error('❌ Error validating template:', error.message);
            process.exit(1);
        }
    });

/**
 * Generate template
 */
program
    .command('generate <category>')
    .description('Generate a new workflow template')
    .option('-n, --name <name>', 'Template name')
    .option('-d, --description <desc>', 'Template description')
    .action(async (category, options) => {
        try {
            const templateName = options.name || category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const templateDesc = options.description || `Template for ${templateName.toLowerCase()}`;
            
            const template = {
                name: templateName,
                description: templateDesc,
                version: "1.0.0",
                category: category,
                parameters: {
                    name: {
                        type: "string",
                        required: true,
                        description: "Task name"
                    },
                    priority: {
                        type: "string",
                        required: false,
                        default: "medium",
                        options: ["low", "medium", "high", "critical"],
                        description: "Task priority level"
                    }
                },
                triggers: [
                    {
                        type: "manual",
                        description: "Manually triggered"
                    }
                ],
                workflow_steps: [
                    {
                        id: "main_step",
                        name: "Main Task Step",
                        type: "coding",
                        timeout: "30m",
                        inputs: {
                            name: "{{parameters.name}}"
                        },
                        outputs: ["result"]
                    }
                ],
                success_criteria: [
                    {
                        name: "step_complete",
                        check: "step_successful",
                        step: "main_step"
                    }
                ]
            };

            const yaml = require('js-yaml');
            const outputFile = path.join(workflowManager.templatesDir, `${category}.yml`);
            
            fs.writeFileSync(outputFile, yaml.dump(template, { indent: 2 }));
            
            console.log(`✅ Generated template: ${outputFile}`);
            console.log(`   Name: ${templateName}`);
            console.log(`   Category: ${category}`);
            console.log(`   Edit the file to customize the template`);
            
        } catch (error) {
            console.error('❌ Error generating template:', error.message);
            process.exit(1);
        }
    });

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
    program.outputHelp();
}