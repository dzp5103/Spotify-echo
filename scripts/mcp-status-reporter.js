#!/usr/bin/env node

/**
 * MCP Status Reporter - Generate comprehensive MCP system status reports
 * Provides structured reporting for MCP validation, health monitoring, and orchestration
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class MCPStatusReporter {
    constructor() {
        this.reportDir = 'reports/mcp-status';
        this.timestamp = new Date().toISOString();
        this.results = {
            timestamp: this.timestamp,
            summary: {
                overall_status: 'unknown',
                health_score: 0,
                total_servers: 0,
                healthy_servers: 0,
                failed_servers: 0,
                warnings: 0
            },
            components: {},
            recommendations: [],
            artifacts: []
        };
    }

    async initialize() {
        console.log('🎵 Initializing MCP Status Reporter for EchoTune AI...');
        
        // Ensure report directory exists
        await fs.mkdir(this.reportDir, { recursive: true });
        
        // Create timestamp-specific subdirectory
        const timestampDir = path.join(this.reportDir, this.timestamp.split('T')[0]);
        await fs.mkdir(timestampDir, { recursive: true });
        
        this.timestampDir = timestampDir;
        
        console.log(`📁 Report directory: ${this.timestampDir}`);
    }

    async collectSystemInfo() {
        console.log('📊 Collecting system information...');
        
        try {
            // Node.js version
            const nodeVersion = process.version;
            
            // NPM version
            const { stdout: npmVersion } = await execAsync('npm --version');
            
            // Python version (if available)
            let pythonVersion = 'Not available';
            try {
                const { stdout } = await execAsync('python3 --version');
                pythonVersion = stdout.trim();
            } catch {}
            
            // System uptime
            const uptime = process.uptime();
            
            // Memory usage
            const memoryUsage = process.memoryUsage();
            
            this.results.system_info = {
                node_version: nodeVersion,
                npm_version: npmVersion.trim(),
                python_version: pythonVersion,
                uptime_seconds: uptime,
                memory_usage_mb: Math.round(memoryUsage.rss / 1024 / 1024),
                platform: process.platform,
                architecture: process.arch
            };
            
            console.log('✅ System information collected');
        } catch (error) {
            console.error('⚠️ Error collecting system info:', error.message);
            this.results.summary.warnings++;
        }
    }

    async collectMCPServerStatus() {
        console.log('🛡️ Collecting MCP server status...');
        
        try {
            // Import MCP manager
            const mcpManager = require('./mcp-manager.js');
            
            // Get server configuration
            const servers = await mcpManager.readServers();
            this.results.summary.total_servers = Object.keys(servers).length;
            
            // Test each server
            const serverResults = {};
            
            for (const [name, config] of Object.entries(servers)) {
                console.log(`  Testing server: ${name}`);
                
                const serverResult = {
                    name,
                    config,
                    status: 'unknown',
                    response_time: 0,
                    error_message: null,
                    last_check: new Date().toISOString()
                };
                
                try {
                    const startTime = Date.now();
                    
                    // Use MCP manager's probe function
                    const port = config.port || process.env.MCP_PORT || 3001;
                    const url = `http://localhost:${port}${config.healthPath || '/health'}`;
                    
                    const isHealthy = await mcpManager.probeHealth(url, 5000, 500);
                    serverResult.response_time = Date.now() - startTime;
                    
                    if (isHealthy) {
                        serverResult.status = 'healthy';
                        this.results.summary.healthy_servers++;
                    } else {
                        serverResult.status = 'unhealthy';
                        serverResult.error_message = 'Health check failed';
                        this.results.summary.failed_servers++;
                    }
                    
                } catch (error) {
                    serverResult.status = 'error';
                    serverResult.error_message = error.message;
                    this.results.summary.failed_servers++;
                }
                
                serverResults[name] = serverResult;
            }
            
            this.results.components.mcp_servers = serverResults;
            
            // Calculate health score
            if (this.results.summary.total_servers > 0) {
                this.results.summary.health_score = Math.round(
                    (this.results.summary.healthy_servers / this.results.summary.total_servers) * 100
                );
            }
            
            console.log('✅ MCP server status collected');
            
        } catch (error) {
            console.error('❌ Error collecting MCP server status:', error.message);
            this.results.components.mcp_servers = { error: error.message };
            this.results.summary.warnings++;
        }
    }

    async collectWorkflowStatus() {
        console.log('⚙️ Collecting workflow status...');
        
        try {
            // Check workflow files
            const workflowsDir = '.github/workflows';
            const files = await fs.readdir(workflowsDir);
            
            const mcpWorkflows = files.filter(f => 
                f.includes('mcp') || 
                f.includes('validation') || 
                f.includes('automation')
            );
            
            const workflowResults = {
                total_workflows: files.length,
                mcp_workflows: mcpWorkflows.length,
                workflow_files: mcpWorkflows,
                status: 'active'
            };
            
            // Check if key workflows exist
            const requiredWorkflows = [
                'mcp-validation.yml',
                'mcp-validation-gateway.yml',
                'mcp-scheduled-discovery.yml'
            ];
            
            workflowResults.required_workflows = {};
            for (const workflow of requiredWorkflows) {
                workflowResults.required_workflows[workflow] = files.includes(workflow);
            }
            
            this.results.components.workflows = workflowResults;
            console.log('✅ Workflow status collected');
            
        } catch (error) {
            console.error('⚠️ Error collecting workflow status:', error.message);
            this.results.components.workflows = { error: error.message };
            this.results.summary.warnings++;
        }
    }

    async collectPackageStatus() {
        console.log('📦 Collecting package and dependency status...');
        
        try {
            // Read package.json
            const packageData = JSON.parse(await fs.readFile('package.json', 'utf8'));
            
            // Count MCP-related dependencies
            const allDeps = { 
                ...packageData.dependencies || {}, 
                ...packageData.devDependencies || {} 
            };
            
            const mcpDeps = Object.keys(allDeps).filter(dep => 
                dep.includes('mcp') || 
                dep.includes('model-context-protocol') ||
                dep.includes('@modelcontextprotocol')
            );
            
            // Count MCP-related scripts
            const mcpScripts = Object.keys(packageData.scripts || {}).filter(script =>
                script.includes('mcp') || script.includes('MCP')
            );
            
            const packageResults = {
                name: packageData.name,
                version: packageData.version,
                total_dependencies: Object.keys(allDeps).length,
                mcp_dependencies: mcpDeps.length,
                mcp_dependency_list: mcpDeps,
                mcp_scripts: mcpScripts.length,
                mcp_script_list: mcpScripts,
                last_modified: (await fs.stat('package.json')).mtime.toISOString()
            };
            
            this.results.components.packages = packageResults;
            console.log('✅ Package status collected');
            
        } catch (error) {
            console.error('⚠️ Error collecting package status:', error.message);
            this.results.components.packages = { error: error.message };
            this.results.summary.warnings++;
        }
    }

    async collectPerformanceMetrics() {
        console.log('⚡ Collecting performance metrics...');
        
        try {
            const startTime = Date.now();
            
            // Test MCP manager performance
            const mcpManager = require('./mcp-manager.js');
            await mcpManager.readServers();
            
            const configLoadTime = Date.now() - startTime;
            
            // Memory snapshot
            const memoryUsage = process.memoryUsage();
            
            const performanceResults = {
                config_load_time_ms: configLoadTime,
                memory_usage: {
                    rss_mb: Math.round(memoryUsage.rss / 1024 / 1024),
                    heap_used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                    heap_total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                    external_mb: Math.round(memoryUsage.external / 1024 / 1024)
                },
                cpu_usage_percent: process.cpuUsage(),
                timestamp: new Date().toISOString()
            };
            
            // Performance assessment
            if (configLoadTime < 1000) {
                performanceResults.config_performance = 'excellent';
            } else if (configLoadTime < 3000) {
                performanceResults.config_performance = 'good';
            } else {
                performanceResults.config_performance = 'needs_optimization';
                this.results.summary.warnings++;
            }
            
            this.results.components.performance = performanceResults;
            console.log('✅ Performance metrics collected');
            
        } catch (error) {
            console.error('⚠️ Error collecting performance metrics:', error.message);
            this.results.components.performance = { error: error.message };
            this.results.summary.warnings++;
        }
    }

    async generateRecommendations() {
        console.log('🔧 Generating recommendations...');
        
        const recommendations = [];
        
        // Health-based recommendations
        if (this.results.summary.health_score < 50) {
            recommendations.push({
                priority: 'high',
                category: 'health',
                message: 'Multiple MCP servers are unhealthy. Investigate server configurations and connectivity.',
                action: 'Run `node scripts/mcp-manager.js health` for detailed diagnostics'
            });
        } else if (this.results.summary.health_score < 80) {
            recommendations.push({
                priority: 'medium',
                category: 'health',
                message: 'Some MCP servers need attention. Consider reviewing server configurations.',
                action: 'Check individual server logs and update configurations as needed'
            });
        }
        
        // Performance recommendations
        if (this.results.components.performance?.config_performance === 'needs_optimization') {
            recommendations.push({
                priority: 'medium',
                category: 'performance',
                message: 'MCP configuration loading is slow. Consider optimizing server startup.',
                action: 'Review server initialization and consider caching configurations'
            });
        }
        
        // Workflow recommendations
        const workflows = this.results.components.workflows;
        if (workflows && workflows.required_workflows) {
            const missingWorkflows = Object.entries(workflows.required_workflows)
                .filter(([name, exists]) => !exists)
                .map(([name]) => name);
                
            if (missingWorkflows.length > 0) {
                recommendations.push({
                    priority: 'medium',
                    category: 'workflows',
                    message: `Missing required workflows: ${missingWorkflows.join(', ')}`,
                    action: 'Ensure all MCP validation workflows are properly configured'
                });
            }
        }
        
        // General maintenance
        recommendations.push({
            priority: 'low',
            category: 'maintenance',
            message: 'Regular MCP system monitoring is active and healthy.',
            action: 'Continue scheduled health checks and keep dependencies updated'
        });
        
        this.results.recommendations = recommendations;
        console.log(`✅ Generated ${recommendations.length} recommendations`);
    }

    determineOverallStatus() {
        let status = 'healthy';
        
        // Critical failure conditions
        if (this.results.summary.failed_servers > this.results.summary.healthy_servers) {
            status = 'critical';
        } else if (this.results.summary.health_score < 50) {
            status = 'degraded';
        } else if (this.results.summary.warnings > 3) {
            status = 'warning';
        } else if (this.results.summary.health_score < 80) {
            status = 'partial';
        }
        
        this.results.summary.overall_status = status;
        
        const statusEmoji = {
            healthy: '✅',
            partial: '⚠️',
            warning: '⚠️',
            degraded: '❌',
            critical: '🚨'
        }[status] || '❓';
        
        console.log(`📊 Overall status: ${statusEmoji} ${status.toUpperCase()}`);
    }

    async generateReports() {
        console.log('📄 Generating comprehensive reports...');
        
        // JSON report (machine readable)
        const jsonReportPath = path.join(this.timestampDir, 'mcp-status-report.json');
        await fs.writeFile(jsonReportPath, JSON.stringify(this.results, null, 2));
        
        // Markdown report (human readable)
        const markdownReport = await this.generateMarkdownReport();
        const mdReportPath = path.join(this.timestampDir, 'mcp-status-report.md');
        await fs.writeFile(mdReportPath, markdownReport);
        
        // Summary report (concise)
        const summaryReport = this.generateSummaryReport();
        const summaryPath = path.join(this.timestampDir, 'mcp-status-summary.txt');
        await fs.writeFile(summaryPath, summaryReport);
        
        this.results.artifacts = [jsonReportPath, mdReportPath, summaryPath];
        
        console.log('✅ Reports generated:');
        console.log(`  📋 JSON Report: ${jsonReportPath}`);
        console.log(`  📝 Markdown Report: ${mdReportPath}`);
        console.log(`  📊 Summary Report: ${summaryPath}`);
        
        // Copy latest reports to root for easy access
        await fs.copyFile(jsonReportPath, 'mcp-status-report.json');
        await fs.copyFile(mdReportPath, 'mcp-status-report.md');
    }

    async generateMarkdownReport() {
        const statusEmoji = {
            healthy: '✅',
            partial: '⚠️',
            warning: '⚠️',
            degraded: '❌',
            critical: '🚨'
        };

        return `# 🎵 EchoTune AI - MCP System Status Report

**Generated:** ${this.results.timestamp}  
**Overall Status:** ${statusEmoji[this.results.summary.overall_status] || '❓'} ${this.results.summary.overall_status.toUpperCase()}  
**Health Score:** ${this.results.summary.health_score}%

## 📊 Executive Summary

- **Total MCP Servers:** ${this.results.summary.total_servers}
- **Healthy Servers:** ${this.results.summary.healthy_servers}
- **Failed Servers:** ${this.results.summary.failed_servers}
- **Warnings:** ${this.results.summary.warnings}

## 🛡️ MCP Server Status

${this.results.components.mcp_servers ? 
    Object.entries(this.results.components.mcp_servers).map(([name, server]) => 
        `### ${name}
- **Status:** ${statusEmoji[server.status] || '❓'} ${server.status}
- **Response Time:** ${server.response_time}ms
- **Configuration:** ${server.config.command} ${(server.config.args || []).join(' ')}
- **Last Check:** ${server.last_check}
${server.error_message ? `- **Error:** ${server.error_message}` : ''}`
    ).join('\n\n') : 'No server data available'
}

## ⚙️ System Information

- **Node.js Version:** ${this.results.system_info?.node_version || 'N/A'}
- **NPM Version:** ${this.results.system_info?.npm_version || 'N/A'}
- **Python Version:** ${this.results.system_info?.python_version || 'N/A'}
- **Memory Usage:** ${this.results.system_info?.memory_usage_mb || 0}MB
- **Platform:** ${this.results.system_info?.platform || 'N/A'}

## ⚡ Performance Metrics

${this.results.components.performance ? `
- **Config Load Time:** ${this.results.components.performance.config_load_time_ms}ms
- **Memory Usage:** ${this.results.components.performance.memory_usage.rss_mb}MB RSS
- **Performance Rating:** ${this.results.components.performance.config_performance}
` : 'Performance data not available'}

## 📦 Package Status

${this.results.components.packages ? `
- **Project:** ${this.results.components.packages.name} v${this.results.components.packages.version}
- **Total Dependencies:** ${this.results.components.packages.total_dependencies}
- **MCP Dependencies:** ${this.results.components.packages.mcp_dependencies}
- **MCP Scripts:** ${this.results.components.packages.mcp_scripts}
` : 'Package data not available'}

## ⚙️ Workflow Status

${this.results.components.workflows ? `
- **Total Workflows:** ${this.results.components.workflows.total_workflows}
- **MCP Workflows:** ${this.results.components.workflows.mcp_workflows}
- **Required Workflows:** ${Object.entries(this.results.components.workflows.required_workflows || {})
    .map(([name, exists]) => `${exists ? '✅' : '❌'} ${name}`)
    .join(', ')
}
` : 'Workflow data not available'}

## 🔧 Recommendations

${this.results.recommendations.map(rec => 
    `### ${rec.priority.toUpperCase()} Priority - ${rec.category}
${rec.message}

**Action:** ${rec.action}
`).join('\n')}

## 📋 Next Steps

1. **Address Critical Issues:** ${this.results.summary.overall_status === 'critical' ? 'Immediate attention required' : 'No critical issues detected'}
2. **Monitor Health Score:** Current score is ${this.results.summary.health_score}% 
3. **Review Recommendations:** ${this.results.recommendations.length} recommendations generated
4. **Schedule Next Check:** Regular monitoring active

---

**🤖 Generated by EchoTune AI MCP Status Reporter**  
**Report ID:** ${this.timestamp}
`;
    }

    generateSummaryReport() {
        return `EchoTune AI - MCP Status Summary
${new Date().toISOString()}

OVERALL STATUS: ${this.results.summary.overall_status.toUpperCase()}
HEALTH SCORE: ${this.results.summary.health_score}%

SERVERS: ${this.results.summary.healthy_servers}/${this.results.summary.total_servers} healthy
WARNINGS: ${this.results.summary.warnings}
RECOMMENDATIONS: ${this.results.recommendations.length}

${this.results.summary.overall_status === 'healthy' ? 
    '✅ All systems operational' : 
    '⚠️ Attention required - see full report'}
`;
    }

    async generateFullReport() {
        try {
            await this.initialize();
            await this.collectSystemInfo();
            await this.collectMCPServerStatus();
            await this.collectWorkflowStatus();
            await this.collectPackageStatus();
            await this.collectPerformanceMetrics();
            await this.generateRecommendations();
            this.determineOverallStatus();
            await this.generateReports();
            
            console.log('\n🎉 MCP Status Report completed successfully!');
            console.log(`📊 Overall Status: ${this.results.summary.overall_status.toUpperCase()}`);
            console.log(`📈 Health Score: ${this.results.summary.health_score}%`);
            
            // Return summary for use in other scripts
            return this.results;
            
        } catch (error) {
            console.error('💥 Error generating MCP status report:', error.message);
            throw error;
        }
    }
}

// Run if called directly
if (require.main === module) {
    const reporter = new MCPStatusReporter();
    reporter.generateFullReport()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Failed to generate report:', error);
            process.exit(1);
        });
}

module.exports = MCPStatusReporter;