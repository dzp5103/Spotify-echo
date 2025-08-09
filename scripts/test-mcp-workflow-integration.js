#!/usr/bin/env node

/**
 * MCP Workflow Integration Tests
 * Validates that MCP validation workflows and reporting are properly configured
 */

const fs = require('fs').promises;
const path = require('path');

class MCPWorkflowTester {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            warnings: 0,
            tests: []
        };
    }

    log(message, type = 'info') {
        const symbols = {
            info: '🔍',
            pass: '✅',
            fail: '❌',
            warn: '⚠️'
        };
        
        console.log(`${symbols[type]} ${message}`);
        
        this.testResults.tests.push({
            message,
            type,
            timestamp: new Date().toISOString()
        });

        if (type === 'pass') this.testResults.passed++;
        if (type === 'fail') this.testResults.failed++;
        if (type === 'warn') this.testResults.warnings++;
    }

    async testWorkflowFiles() {
        this.log('Testing MCP workflow files...', 'info');
        
        const workflowsDir = '.github/workflows';
        const requiredWorkflows = [
            'mcp-validation-gateway.yml',
            'mcp-scheduled-discovery.yml',
            'mcp-validation.yml'
        ];
        
        try {
            const files = await fs.readdir(workflowsDir);
            
            for (const workflow of requiredWorkflows) {
                if (files.includes(workflow)) {
                    this.log(`Workflow ${workflow} exists`, 'pass');
                    
                    // Check workflow content
                    const content = await fs.readFile(path.join(workflowsDir, workflow), 'utf8');
                    
                    // Basic content validation
                    if (content.includes('mcp-manager.js')) {
                        this.log(`Workflow ${workflow} includes MCP manager integration`, 'pass');
                    } else {
                        this.log(`Workflow ${workflow} missing MCP manager integration`, 'warn');
                    }
                    
                    if (content.includes('on:')) {
                        this.log(`Workflow ${workflow} has proper triggers`, 'pass');
                    } else {
                        this.log(`Workflow ${workflow} missing triggers`, 'fail');
                    }
                    
                } else {
                    this.log(`Required workflow ${workflow} not found`, 'fail');
                }
            }
            
        } catch (error) {
            this.log(`Error reading workflow directory: ${error.message}`, 'fail');
        }
    }

    async testMCPManagerScript() {
        this.log('Testing MCP Manager script...', 'info');
        
        try {
            // Check if mcp-manager.js exists
            await fs.access('scripts/mcp-manager.js');
            this.log('MCP Manager script exists', 'pass');
            
            // Try to require and test basic functionality
            const mcpManager = require('./mcp-manager.js');
            
            const requiredExports = ['readServers', 'install', 'health', 'test', 'report'];
            for (const exportName of requiredExports) {
                if (typeof mcpManager[exportName] === 'function') {
                    this.log(`MCP Manager exports ${exportName}`, 'pass');
                } else {
                    this.log(`MCP Manager missing export: ${exportName}`, 'fail');
                }
            }
            
            // Test reading server configuration
            try {
                const servers = await mcpManager.readServers();
                if (typeof servers === 'object') {
                    this.log(`MCP Manager can read server configuration (${Object.keys(servers).length} servers)`, 'pass');
                } else {
                    this.log('MCP Manager readServers returns invalid data', 'fail');
                }
            } catch (error) {
                this.log(`MCP Manager readServers error: ${error.message}`, 'warn');
            }
            
        } catch (error) {
            this.log(`MCP Manager script error: ${error.message}`, 'fail');
        }
    }

    async testStatusReporter() {
        this.log('Testing MCP Status Reporter...', 'info');
        
        try {
            await fs.access('scripts/mcp-status-reporter.js');
            this.log('MCP Status Reporter script exists', 'pass');
            
            // Try to require the status reporter
            const MCPStatusReporter = require('./mcp-status-reporter.js');
            
            if (typeof MCPStatusReporter === 'function') {
                this.log('MCP Status Reporter is properly exported', 'pass');
                
                // Test instantiation
                const reporter = new MCPStatusReporter();
                if (reporter && typeof reporter.generateFullReport === 'function') {
                    this.log('MCP Status Reporter can be instantiated', 'pass');
                } else {
                    this.log('MCP Status Reporter missing generateFullReport method', 'fail');
                }
            } else {
                this.log('MCP Status Reporter not properly exported', 'fail');
            }
            
        } catch (error) {
            this.log(`Status Reporter error: ${error.message}`, 'fail');
        }
    }

    async testPackageScripts() {
        this.log('Testing package.json MCP scripts...', 'info');
        
        try {
            const packageData = JSON.parse(await fs.readFile('package.json', 'utf8'));
            const scripts = packageData.scripts || {};
            
            const requiredScripts = [
                'mcp:install',
                'mcp:health', 
                'mcp:test',
                'mcp:report',
                'mcp:validate'
            ];
            
            for (const script of requiredScripts) {
                if (scripts[script]) {
                    this.log(`Package script ${script} configured`, 'pass');
                } else {
                    this.log(`Package script ${script} missing`, 'fail');
                }
            }
            
            // Count total MCP scripts
            const mcpScripts = Object.keys(scripts).filter(script => 
                script.includes('mcp:') || script.includes('MCP')
            );
            
            this.log(`Found ${mcpScripts.length} MCP-related scripts`, 'info');
            
        } catch (error) {
            this.log(`Package.json error: ${error.message}`, 'fail');
        }
    }

    async testMCPServerConfig() {
        this.log('Testing MCP server configuration...', 'info');
        
        try {
            const mcpServerPackage = path.join('mcp-server', 'package.json');
            await fs.access(mcpServerPackage);
            this.log('MCP server package.json exists', 'pass');
            
            const packageData = JSON.parse(await fs.readFile(mcpServerPackage, 'utf8'));
            
            if (packageData.servers && Object.keys(packageData.servers).length > 0) {
                this.log(`MCP servers configured: ${Object.keys(packageData.servers).join(', ')}`, 'pass');
            } else {
                this.log('No MCP servers configured in mcp-server/package.json', 'warn');
            }
            
        } catch (error) {
            this.log(`MCP server config error: ${error.message}`, 'warn');
        }
    }

    async testDocumentation() {
        this.log('Testing MCP documentation...', 'info');
        
        const docs = [
            'docs/MCP_VALIDATION_WORKFLOWS.md',
            'README.md'
        ];
        
        for (const doc of docs) {
            try {
                await fs.access(doc);
                this.log(`Documentation ${doc} exists`, 'pass');
                
                // Check if it mentions MCP
                const content = await fs.readFile(doc, 'utf8');
                if (content.toLowerCase().includes('mcp')) {
                    this.log(`Documentation ${doc} includes MCP references`, 'pass');
                } else {
                    this.log(`Documentation ${doc} missing MCP references`, 'warn');
                }
                
            } catch (error) {
                this.log(`Documentation ${doc} not found`, 'warn');
            }
        }
    }

    async testReportDirectory() {
        this.log('Testing report directory structure...', 'info');
        
        try {
            await fs.mkdir('reports', { recursive: true });
            await fs.mkdir('reports/mcp-status', { recursive: true });
            this.log('Report directories created successfully', 'pass');
            
        } catch (error) {
            this.log(`Report directory error: ${error.message}`, 'warn');
        }
    }

    async generateTestReport() {
        const totalTests = this.testResults.passed + this.testResults.failed;
        const score = totalTests > 0 ? Math.round((this.testResults.passed / totalTests) * 100) : 0;
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total_tests: this.testResults.tests.length,
                passed: this.testResults.passed,
                failed: this.testResults.failed,
                warnings: this.testResults.warnings,
                score: score
            },
            tests: this.testResults.tests,
            status: this.testResults.failed === 0 ? 'passed' : 'failed'
        };
        
        // Save report
        await fs.writeFile(
            'mcp-workflow-integration-test-results.json',
            JSON.stringify(report, null, 2)
        );
        
        this.log('\n📊 MCP Workflow Integration Test Results:', 'info');
        this.log(`Total Tests: ${report.summary.total_tests}`, 'info');
        this.log(`Passed: ${report.summary.passed}`, this.testResults.passed > 0 ? 'pass' : 'info');
        this.log(`Failed: ${report.summary.failed}`, this.testResults.failed > 0 ? 'fail' : 'info');
        this.log(`Warnings: ${report.summary.warnings}`, this.testResults.warnings > 0 ? 'warn' : 'info');
        this.log(`Score: ${score}%`, score >= 80 ? 'pass' : score >= 60 ? 'warn' : 'fail');
        
        return report;
    }

    async runFullTest() {
        this.log('🎵 Starting MCP Workflow Integration Tests for EchoTune AI...', 'info');
        
        await this.testWorkflowFiles();
        await this.testMCPManagerScript();
        await this.testStatusReporter();
        await this.testPackageScripts();
        await this.testMCPServerConfig();
        await this.testDocumentation();
        await this.testReportDirectory();
        
        const report = await this.generateTestReport();
        
        if (report.status === 'passed') {
            this.log('\n🎉 All MCP workflow integration tests passed!', 'pass');
            return true;
        } else {
            this.log('\n⚠️ Some MCP workflow integration tests failed', 'warn');
            return false;
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new MCPWorkflowTester();
    tester.runFullTest()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Test execution error:', error.message);
            process.exit(1);
        });
}

module.exports = MCPWorkflowTester;