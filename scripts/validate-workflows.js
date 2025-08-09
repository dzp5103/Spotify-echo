#!/usr/bin/env node

/**
 * GitHub Actions Workflow Validation & Optimization Tool
 * Validates syntax, checks for common issues, and suggests optimizations
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

class WorkflowValidator {
    constructor() {
        this.results = {
            total: 0,
            valid: 0,
            warnings: 0,
            errors: 0,
            optimizations: []
        };
    }

    async validateWorkflows() {
        console.log('🔍 GitHub Actions Workflow Validator');
        console.log('=====================================\n');

        const workflowDir = '.github/workflows';
        const files = await fs.readdir(workflowDir);
        const ymlFiles = files.filter(file => (
            (file.endsWith('.yml') || file.endsWith('.yaml')) && !file.includes('.disabled')
        ));

        this.results.total = ymlFiles.length;
        console.log(`📋 Found ${ymlFiles.length} active workflow files\n`);

        for (const file of ymlFiles) {
            await this.validateSingleWorkflow(path.join(workflowDir, file));
        }

        this.printSummary();
        await this.generateReport();
    }

    async validateSingleWorkflow(filePath) {
        const filename = path.basename(filePath);
        console.log(`🔍 Validating ${filename}...`);

        try {
            const content = await fs.readFile(filePath, 'utf8');
            const workflow = yaml.load(content);

            // Basic syntax validation
            if (!workflow.name) {
                this.logWarning(filename, 'Missing workflow name');
            }

            if (!workflow.on) {
                this.logError(filename, 'Missing trigger configuration');
                return;
            }

            // Check for common issues
            this.checkJobConfiguration(filename, workflow);
            this.checkResourceUsage(filename, workflow);
            this.checkSecrets(filename, workflow);
            this.checkOptimizationOpportunities(filename, workflow);

            console.log(`  ✅ Syntax valid`);
            this.results.valid++;

        } catch (error) {
            this.logError(filename, `YAML parsing failed: ${error.message}`);
        }

        console.log('');
    }

    checkJobConfiguration(filename, workflow) {
        if (!workflow.jobs) {
            this.logError(filename, 'No jobs defined');
            return;
        }

        Object.keys(workflow.jobs).forEach(jobName => {
            const job = workflow.jobs[jobName];
            
            if (!job['runs-on']) {
                this.logWarning(filename, `Job '${jobName}' missing runs-on`);
            }

            // Check for excessively long timeout
            if (job.timeout && job.timeout > 360) {
                this.logWarning(filename, `Job '${jobName}' has very long timeout (${job.timeout}min)`);
            }

            // Check for steps
            if (!job.steps && !job.uses && !job.needs) {
                this.logWarning(filename, `Job '${jobName}' has no steps defined`);
            }
        });
    }

    checkResourceUsage(filename, workflow) {
        const resourceHeavyActions = [
            'setup-node',
            'setup-python', 
            'setup-java',
            'cache',
            'upload-artifact'
        ];

        // This is a simplified check - in practice you'd analyze the workflow more deeply
        const workflowStr = JSON.stringify(workflow);
        const heavyActionCount = resourceHeavyActions.reduce((count, action) => {
            const matches = workflowStr.match(new RegExp(action, 'g'));
            return count + (matches ? matches.length : 0);
        }, 0);

        if (heavyActionCount > 5) {
            this.logWarning(filename, `Potentially resource-intensive workflow (${heavyActionCount} heavy actions)`);
        }
    }

    checkSecrets(filename, workflow) {
        const workflowStr = JSON.stringify(workflow);
        
        // Check for potentially hardcoded secrets (basic patterns)
        const suspiciousPatterns = [
            /api[_-]?key\s*[:=]\s*['"]\w{10,}/i,
            /token\s*[:=]\s*['"]\w{10,}/i,
            /password\s*[:=]\s*['"]\w{6,}/i
        ];

        suspiciousPatterns.forEach(pattern => {
            if (pattern.test(workflowStr)) {
                this.logWarning(filename, 'Potential hardcoded secret detected - please verify');
            }
        });

        // Check for proper secrets usage
        // Refined check: flag 'secrets.' usage that is not in ${{ secrets. }} and not 'secrets.inherit' or 'secrets: inherit'
        const improperSecretsPattern = /(?<!\${{\s*)secrets\.(?!inherit\b)/g;
        if (improperSecretsPattern.test(workflowStr)) {
            this.logWarning(filename, 'Possible improper secrets reference');
        }
    }

    checkOptimizationOpportunities(filename, workflow) {
        const workflowStr = JSON.stringify(workflow);

        // Check for caching opportunities
        if (workflowStr.includes('npm install') && !workflowStr.includes('cache:')) {
            this.results.optimizations.push({
                file: filename,
                type: 'caching',
                suggestion: 'Consider adding npm cache for faster builds'
            });
        }

        if (workflowStr.includes('pip install') && !workflowStr.includes('cache:')) {
            this.results.optimizations.push({
                file: filename,
                type: 'caching', 
                suggestion: 'Consider adding pip cache for faster builds'
            });
        }

        // Check for parallel job opportunities
        const jobCount = Object.keys(workflow.jobs || {}).length;
        const hasNeedsDirective = workflowStr.includes('"needs":');
        
        if (jobCount > 2 && !hasNeedsDirective) {
            this.results.optimizations.push({
                file: filename,
                type: 'parallelization',
                suggestion: 'Consider using job dependencies (needs:) for parallel execution'
            });
        }

        // Check for condition optimizations
        if (workflowStr.includes('if:') && workflowStr.includes('github.event_name')) {
            // This is good - conditional execution
            console.log(`  ⚡ Uses conditional execution`);
        }
    }

    logWarning(filename, message) {
        console.log(`  ⚠️  Warning: ${message}`);
        this.results.warnings++;
    }

    logError(filename, message) {
        console.log(`  ❌ Error: ${message}`);
        this.results.errors++;
    }

    printSummary() {
        console.log('\n📊 Validation Summary');
        console.log('=====================');
        console.log(`Total workflows: ${this.results.total}`);
        console.log(`Valid: ${this.results.valid}`);
        console.log(`Warnings: ${this.results.warnings}`);
        console.log(`Errors: ${this.results.errors}`);
        console.log(`Optimization opportunities: ${this.results.optimizations.length}`);

        if (this.results.optimizations.length > 0) {
            console.log('\n💡 Optimization Suggestions:');
            this.results.optimizations.forEach((opt, index) => {
                console.log(`${index + 1}. [${opt.file}] ${opt.type}: ${opt.suggestion}`);
            });
        }

        // Overall score
        const score = Math.round(((this.results.valid / this.results.total) * 100));
        console.log(`\n🎯 Overall Health Score: ${score}%`);

        if (score >= 90) {
            console.log('✅ Excellent workflow health!');
        } else if (score >= 70) {
            console.log('⚠️  Good workflow health with room for improvement');
        } else {
            console.log('❌ Workflow health needs attention');
        }
    }

    async generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: this.results,
            recommendations: [
                'Enable caching for package managers (npm, pip) to improve build times',
                'Use conditional execution (if:) to avoid unnecessary job runs', 
                'Implement job dependencies (needs:) for optimal parallelization',
                'Regular security scanning for secrets and credentials',
                'Monitor workflow execution times and optimize resource usage'
            ]
        };

        await fs.writeFile('workflow-validation-report.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Detailed report saved to: workflow-validation-report.json');
    }
}

// CLI execution
if (require.main === module) {
    const validator = new WorkflowValidator();
    validator.validateWorkflows().catch(console.error);
}

module.exports = { WorkflowValidator };