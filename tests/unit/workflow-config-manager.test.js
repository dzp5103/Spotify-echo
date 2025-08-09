/**
 * Tests for Dynamic Workflow Configuration Manager
 */

const WorkflowConfigurationManager = require('../../agent-workflow/workflow-config-manager');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Mock file system operations
jest.mock('fs');
jest.mock('js-yaml');

describe('WorkflowConfigurationManager', () => {
    let workflowManager;
    let mockTemplate;

    beforeEach(() => {
        // Reset mocks
        fs.existsSync.mockClear();
        fs.readFileSync.mockClear();
        fs.writeFileSync.mockClear();
        fs.readdirSync.mockClear();
        yaml.load.mockClear();

        // Mock template
        mockTemplate = {
            name: 'Test Feature Development',
            description: 'Test template for features',
            version: '1.0.0',
            category: 'feature-development',
            parameters: {
                feature_name: {
                    type: 'string',
                    required: true,
                    description: 'Name of the feature'
                },
                priority: {
                    type: 'string',
                    required: false,
                    default: 'medium',
                    options: ['low', 'medium', 'high']
                }
            },
            triggers: [
                {
                    type: 'pr_comment',
                    pattern: '/implement feature (.+)',
                    capture_groups: { feature_name: 1 }
                }
            ],
            workflow_steps: [
                {
                    id: 'test_step',
                    name: 'Test Step',
                    type: 'analysis',
                    timeout: '10m'
                }
            ]
        };

        workflowManager = new WorkflowConfigurationManager({
            templatesDir: '/mock/templates',
            configDir: '/mock/config',
            tasksFile: '/mock/tasks.json',
            statusFile: '/mock/status.json'
        });
    });

    describe('Template Loading', () => {
        test('should load templates from directory', () => {
            fs.existsSync.mockReturnValue(true);
            fs.readdirSync.mockReturnValue(['feature-development.yml']);
            fs.readFileSync.mockReturnValue('mock template content');
            yaml.load.mockReturnValue(mockTemplate);

            workflowManager.loadTemplates();

            expect(fs.readdirSync).toHaveBeenCalledWith('/mock/templates');
            expect(workflowManager.templates.has('feature-development')).toBe(true);
        });

        test('should validate template structure', () => {
            const validTemplate = { ...mockTemplate };
            expect(workflowManager.validateTemplate(validTemplate)).toBe(true);

            const invalidTemplate = { ...mockTemplate };
            delete invalidTemplate.parameters;
            expect(workflowManager.validateTemplate(invalidTemplate)).toBe(false);
        });

        test('should handle missing templates directory', () => {
            fs.existsSync.mockReturnValue(false);
            
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            workflowManager.loadTemplates();
            
            expect(consoleSpy).toHaveBeenCalledWith('Templates directory not found: /mock/templates');
            consoleSpy.mockRestore();
        });
    });

    describe('Parameter Validation', () => {
        test('should validate required parameters', () => {
            const result = workflowManager.validateParameters(mockTemplate.parameters, {
                feature_name: 'test-feature'
            });

            expect(result.isValid).toBe(true);
            expect(result.parameters.feature_name).toBe('test-feature');
            expect(result.parameters.priority).toBe('medium'); // default value
        });

        test('should fail validation for missing required parameters', () => {
            const result = workflowManager.validateParameters(mockTemplate.parameters, {});

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Missing required parameter: feature_name');
        });

        test('should validate parameter options', () => {
            const result = workflowManager.validateParameters(mockTemplate.parameters, {
                feature_name: 'test-feature',
                priority: 'invalid-priority'
            });

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid value for parameter priority: must be one of low, medium, high');
        });

        test('should validate parameter types', () => {
            const templateParams = {
                count: { type: 'number', required: true },
                enabled: { type: 'boolean', required: true }
            };

            const result = workflowManager.validateParameters(templateParams, {
                count: 'not-a-number',
                enabled: 'not-a-boolean'
            });

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid type for parameter count: expected number');
            expect(result.errors).toContain('Invalid type for parameter enabled: expected boolean');
        });
    });

    describe('PR Comment Handling', () => {
        test('should extract parameters from PR comment', () => {
            workflowManager.templates.set('feature-development', mockTemplate);

            const match = '/implement feature user-authentication'.match(/\/implement feature (.+)/);
            const parameters = workflowManager.extractParameters(match, { feature_name: 1 });

            expect(parameters.feature_name).toBe('user-authentication');
        });

        test('should handle PR comment trigger', async () => {
            workflowManager.templates.set('feature-development', mockTemplate);
            
            const createWorkflowSpy = jest.spyOn(workflowManager, 'createWorkflowTask').mockResolvedValue({});
            
            await workflowManager.handlePRComment({
                comment: '/implement feature user-dashboard',
                pr_number: 123,
                author: 'testuser'
            });

            expect(createWorkflowSpy).toHaveBeenCalledWith({
                template: mockTemplate,
                parameters: { feature_name: 'user-dashboard' },
                source: 'pr_comment',
                context: { pr_number: 123, author: 'testuser', comment: '/implement feature user-dashboard' }
            });
        });
    });

    describe('Issue Label Handling', () => {
        test('should extract parameters from issue', () => {
            const parameters = workflowManager.extractParametersFromIssue({
                title: 'Feature: user authentication system',
                body: 'Issue body',
                labels: ['feature-request', 'priority-high']
            });

            expect(parameters.feature_name).toBe('user-authentication-system');
            expect(parameters.priority).toBe('high');
        });

        test('should handle issue label trigger', async () => {
            workflowManager.templates.set('feature-development', mockTemplate);
            
            const createWorkflowSpy = jest.spyOn(workflowManager, 'createWorkflowTask').mockResolvedValue({});

            await workflowManager.handleIssueLabel({
                labels: ['feature-request'],
                issue_number: 456,
                title: 'Feature: notification system',
                body: 'Issue description'
            });

            expect(createWorkflowSpy).toHaveBeenCalled();
        });
    });

    describe('Workflow Creation', () => {
        beforeEach(() => {
            workflowManager.templates.set('feature-development', mockTemplate);
            
            // Mock file operations
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue('[]');
            fs.writeFileSync.mockImplementation(() => {});
        });

        test('should create workflow with valid parameters', async () => {
            const workflow = await workflowManager.createWorkflowTask({
                template: mockTemplate,
                parameters: { feature_name: 'test-feature' },
                source: 'api',
                context: {}
            });

            expect(workflow).toBeDefined();
            expect(workflow.template.name).toBe('Test Feature Development');
            expect(workflow.parameters.feature_name).toBe('test-feature');
            expect(workflow.status).toBe('created');
        });

        test('should reject workflow with invalid parameters', async () => {
            await expect(workflowManager.createWorkflowTask({
                template: mockTemplate,
                parameters: {}, // missing required feature_name
                source: 'api',
                context: {}
            })).rejects.toThrow('Invalid parameters: Missing required parameter: feature_name');
        });

        test('should add workflow to active list', async () => {
            const workflow = await workflowManager.createWorkflowTask({
                template: mockTemplate,
                parameters: { feature_name: 'test-feature' },
                source: 'api',
                context: {}
            });

            expect(workflowManager.activeWorkflows.has(workflow.id)).toBe(true);
        });

        test('should add task to tasks file', async () => {
            await workflowManager.createWorkflowTask({
                template: mockTemplate,
                parameters: { feature_name: 'test-feature' },
                source: 'api',
                context: {}
            });

            expect(fs.writeFileSync).toHaveBeenCalledWith(
                '/mock/tasks.json',
                expect.stringContaining('test-feature')
            );
        });
    });

    describe('Conditions Evaluation', () => {
        test('should check directory exists condition', async () => {
            fs.existsSync.mockReturnValue(true);
            fs.statSync.mockReturnValue({ isDirectory: () => true });

            const conditions = [{
                name: 'target_exists',
                check: 'directory_exists',
                parameter: 'src/'
            }];

            const result = await workflowManager.checkConditions(conditions, {});
            expect(result.isValid).toBe(true);
        });

        test('should fail directory exists condition', async () => {
            fs.existsSync.mockReturnValue(false);

            const conditions = [{
                name: 'target_exists',
                check: 'directory_exists',
                parameter: 'nonexistent/'
            }];

            const result = await workflowManager.checkConditions(conditions, {});
            expect(result.isValid).toBe(false);
        });
    });

    describe('API Request Handling', () => {
        test('should handle valid API request', async () => {
            workflowManager.templates.set('feature-development', mockTemplate);
            
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue('[]');
            fs.writeFileSync.mockImplementation(() => {});

            const workflow = await workflowManager.handleAPIRequest({
                template_category: 'feature-development',
                parameters: { feature_name: 'api-feature' },
                context: { source: 'api' }
            });

            expect(workflow).toBeDefined();
            expect(workflow.parameters.feature_name).toBe('api-feature');
        });

        test('should reject API request for non-existent template', async () => {
            await expect(workflowManager.handleAPIRequest({
                template_category: 'non-existent',
                parameters: {},
                context: {}
            })).rejects.toThrow('Template not found: non-existent');
        });
    });

    describe('Workflow Execution', () => {
        test('should execute workflow', async () => {
            const mockWorkflow = {
                id: 'test-workflow-123',
                template: { name: 'Test Workflow' },
                status: 'created'
            };

            workflowManager.activeWorkflows.set('test-workflow-123', mockWorkflow);

            const result = await workflowManager.executeWorkflow('test-workflow-123');

            expect(result.status).toBe('running');
            expect(result.started_at).toBeDefined();
        });

        test('should fail to execute non-existent workflow', async () => {
            await expect(workflowManager.executeWorkflow('non-existent')).rejects.toThrow('Workflow not found: non-existent');
        });
    });

    describe('Configuration Management', () => {
        test('should load configuration with defaults', () => {
            fs.existsSync.mockReturnValue(false);

            const config = workflowManager.loadConfiguration();

            expect(config.enabled).toBe(true);
            expect(config.auto_assign).toBe(true);
            expect(config.max_concurrent_workflows).toBe(3);
        });

        test('should merge with existing configuration', () => {
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(JSON.stringify({
                enabled: false,
                max_concurrent_workflows: 5
            }));

            const config = workflowManager.loadConfiguration();

            expect(config.enabled).toBe(false);
            expect(config.max_concurrent_workflows).toBe(5);
            expect(config.auto_assign).toBe(true); // default value
        });
    });
});

describe('Integration Tests', () => {
    let workflowManager;

    beforeAll(() => {
        // Use real file system for integration tests
        jest.unmock('fs');
        jest.unmock('js-yaml');
        
        const testDir = path.join(__dirname, '../tmp/test-workflows');
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        workflowManager = new WorkflowConfigurationManager({
            templatesDir: path.join(__dirname, '../agent-workflow/templates'),
            configDir: path.join(testDir, 'config'),
            tasksFile: path.join(testDir, 'tasks.json'),
            statusFile: path.join(testDir, 'status.json')
        });
    });

    test('should load real templates', () => {
        workflowManager.loadTemplates();
        expect(workflowManager.templates.size).toBeGreaterThan(0);
    });

    test('should create and execute workflow end-to-end', async () => {
        if (workflowManager.templates.size === 0) {
            workflowManager.loadTemplates();
        }

        const templateCategory = Array.from(workflowManager.templates.keys())[0];
        const template = workflowManager.templates.get(templateCategory);

        if (!template) {
            console.warn('No templates available for integration test');
            return;
        }

        const workflow = await workflowManager.createWorkflowTask({
            template: template,
            parameters: {
                feature_name: 'integration-test-feature',
                priority: 'medium'
            },
            source: 'test',
            context: {}
        });

        expect(workflow).toBeDefined();
        expect(workflow.id).toBeDefined();
        expect(workflowManager.activeWorkflows.has(workflow.id)).toBe(true);
    });
});