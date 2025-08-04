#!/usr/bin/env node

/**
 * Continuous Coding Agent Workflow Manager
 * 
 * This script manages the continuous development cycle:
 * 1. Analyzes completed PRs
 * 2. Generates development summaries
 * 3. Creates new tasks and prompts
 * 4. Triggers new coding agent PRs
 * 5. Updates project progress
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class ContinuousAgent {
    constructor() {
        this.repoRoot = process.cwd();
        this.agentWorkflowDir = path.join(this.repoRoot, 'agent-workflow');
        this.configPath = path.join(this.agentWorkflowDir, 'config', 'config.json');
        this.statusPath = path.join(this.agentWorkflowDir, 'current-status.json');
        this.tasksPath = path.join(this.agentWorkflowDir, 'next-tasks.json');
        this.githubToken = process.env.GH_PAT || process.env.GITHUB_TOKEN;
        
        if (!this.githubToken && !process.env.CI) {
            console.warn('⚠️ GitHub token (GH_PAT or GITHUB_TOKEN) not found - some features will be disabled');
        }
    }

    async loadConfig() {
        try {
            const configData = await fs.readFile(this.configPath, 'utf8');
            return JSON.parse(configData);
        } catch (error) {
            console.error('❌ Failed to load config:', error.message);
            throw error;
        }
    }

    async loadStatus() {
        try {
            const statusData = await fs.readFile(this.statusPath, 'utf8');
            return JSON.parse(statusData);
        } catch (error) {
            console.error('❌ Failed to load status:', error.message);
            throw error;
        }
    }

    async saveStatus(status) {
        try {
            await fs.writeFile(this.statusPath, JSON.stringify(status, null, 2));
            console.log('✅ Status saved');
        } catch (error) {
            console.error('❌ Failed to save status:', error.message);
            throw error;
        }
    }

    async analyzeLastPR() {
        console.log('🔍 Analyzing last merged PR...');
        
        try {
            // Get the latest merged PR
            const gitLog = execSync('git log --oneline -10 --grep="Merge pull request"', { 
                encoding: 'utf8', 
                cwd: this.repoRoot 
            });
            
            if (!gitLog.trim()) {
                console.log('ℹ️ No recent merge commits found');
                return null;
            }

            const lines = gitLog.trim().split('\n');
            const latestMerge = lines[0];
            console.log('📋 Latest merge:', latestMerge);

            // Extract PR number if available
            const prMatch = latestMerge.match(/#(\d+)/);
            const prNumber = prMatch ? prMatch[1] : null;

            // Get commit details
            const commitHash = latestMerge.split(' ')[0];
            const commitDetails = execSync(`git show --stat ${commitHash}`, { 
                encoding: 'utf8', 
                cwd: this.repoRoot 
            });

            const analysis = {
                pr_number: prNumber,
                commit_hash: commitHash,
                merge_message: latestMerge,
                commit_details: commitDetails,
                analyzed_at: new Date().toISOString(),
                files_changed: this.extractChangedFiles(commitDetails),
                change_summary: this.generateChangeSummary(commitDetails)
            };

            // Save analysis
            const analysisPath = path.join(this.agentWorkflowDir, 'summaries', `analysis-${Date.now()}.json`);
            await fs.writeFile(analysisPath, JSON.stringify(analysis, null, 2));
            
            return analysis;
        } catch (error) {
            console.error('❌ Failed to analyze PR:', error.message);
            return null;
        }
    }

    extractChangedFiles(commitDetails) {
        const files = [];
        const lines = commitDetails.split('\n');
        
        for (const line of lines) {
            if (line.includes('|') && (line.includes('+') || line.includes('-'))) {
                const parts = line.trim().split('|');
                if (parts.length >= 2) {
                    files.push(parts[0].trim());
                }
            }
        }
        
        return files;
    }

    generateChangeSummary(commitDetails) {
        const lines = commitDetails.split('\n');
        const summary = {
            total_files: 0,
            insertions: 0,
            deletions: 0,
            categories: []
        };

        // Extract statistics
        for (const line of lines) {
            if (line.includes('files changed')) {
                const match = line.match(/(\d+)\s+files?\s+changed/);
                if (match) summary.total_files = parseInt(match[1]);
            }
            if (line.includes('insertions')) {
                const match = line.match(/(\d+)\s+insertions?\(\+\)/);
                if (match) summary.insertions = parseInt(match[1]);
            }
            if (line.includes('deletions')) {
                const match = line.match(/(\d+)\s+deletions?\(-\)/);
                if (match) summary.deletions = parseInt(match[1]);
            }
        }

        // Categorize changes
        const categories = new Set();
        if (commitDetails.includes('.js') || commitDetails.includes('.ts')) categories.add('javascript');
        if (commitDetails.includes('.py')) categories.add('python');
        if (commitDetails.includes('.yml') || commitDetails.includes('.yaml')) categories.add('workflows');
        if (commitDetails.includes('.md')) categories.add('documentation');
        if (commitDetails.includes('test')) categories.add('testing');
        if (commitDetails.includes('package.json')) categories.add('dependencies');
        
        summary.categories = Array.from(categories);
        
        return summary;
    }

    async generateTasks(analysis) {
        console.log('🎯 Generating new development tasks...');
        
        if (!analysis) {
            console.log('ℹ️ No analysis available, generating default tasks');
            return this.generateDefaultTasks();
        }

        const tasks = [];
        const categories = analysis.change_summary.categories;
        
        // Generate tasks based on changes
        if (categories.includes('javascript') || categories.includes('python')) {
            tasks.push({
                id: `code-enhancement-${Date.now()}`,
                type: 'feature-development',
                title: 'Code Quality and Feature Enhancement',
                description: 'Review and enhance recent code changes, add tests, and improve documentation',
                priority: 'high',
                estimated_effort: 'medium',
                created_at: new Date().toISOString()
            });
        }

        if (categories.includes('workflows')) {
            tasks.push({
                id: `workflow-optimization-${Date.now()}`,
                type: 'performance-optimization', 
                title: 'Workflow and CI/CD Optimization',
                description: 'Optimize GitHub workflows and automation processes',
                priority: 'medium',
                estimated_effort: 'low',
                created_at: new Date().toISOString()
            });
        }

        if (categories.includes('documentation')) {
            tasks.push({
                id: `docs-improvement-${Date.now()}`,
                type: 'documentation-updates',
                title: 'Documentation Enhancement',
                description: 'Improve project documentation and add missing guides',
                priority: 'medium',
                estimated_effort: 'low',
                created_at: new Date().toISOString()
            });
        }

        // Always add a general improvement task
        tasks.push({
            id: `general-improvement-${Date.now()}`,
            type: 'feature-development',
            title: 'General System Improvements',
            description: 'Identify and implement system improvements, fix any issues, and enhance user experience',
            priority: 'medium',
            estimated_effort: 'medium',
            created_at: new Date().toISOString()
        });

        // Save tasks
        const tasksPath = path.join(this.agentWorkflowDir, 'tasks', `tasks-${Date.now()}.json`);
        await fs.writeFile(tasksPath, JSON.stringify(tasks, null, 2));
        
        return tasks;
    }

    generateDefaultTasks() {
        return [
            {
                id: `default-improvement-${Date.now()}`,
                type: 'feature-development',
                title: 'System Enhancement and Optimization',
                description: 'Analyze the current system and implement improvements, fix issues, and enhance functionality',
                priority: 'high',
                estimated_effort: 'medium',
                created_at: new Date().toISOString()
            },
            {
                id: `testing-enhancement-${Date.now()}`,
                type: 'testing-improvements',
                title: 'Testing Infrastructure Enhancement',
                description: 'Improve test coverage and add comprehensive testing capabilities',
                priority: 'medium',
                estimated_effort: 'medium',
                created_at: new Date().toISOString()
            }
        ];
    }

    async generatePrompt(tasks) {
        console.log('📝 Generating coding agent prompt...');
        
        const prompt = {
            title: 'Continuous Development Cycle',
            description: 'Automated development task execution',
            tasks: tasks,
            instructions: [
                'Analyze the provided tasks and prioritize them based on impact and effort',
                'Implement the highest priority task first',
                'Ensure all changes follow the project coding standards',
                'Add appropriate tests for new functionality',
                'Update documentation as needed',
                'Make minimal, focused changes',
                'Provide clear commit messages and PR descriptions'
            ],
            context: {
                project: 'EchoTune AI - Music Recommendation System',
                tech_stack: ['Node.js', 'Python', 'MongoDB', 'Express', 'React'],
                focus_areas: ['Music recommendation algorithms', 'Spotify API integration', 'Conversational AI', 'MCP server automation']
            },
            success_criteria: [
                'Code builds successfully',
                'All tests pass', 
                'No new linting errors',
                'Documentation is updated',
                'Changes are minimal and focused'
            ]
        };

        const promptPath = path.join(this.agentWorkflowDir, 'prompts', `prompt-${Date.now()}.json`);
        await fs.writeFile(promptPath, JSON.stringify(prompt, null, 2));
        
        return prompt;
    }

    async updateProgress(cycle, tasks) {
        console.log('📊 Updating progress tracking...');
        
        const progressUpdate = {
            cycle: cycle,
            timestamp: new Date().toISOString(),
            tasks_generated: tasks.length,
            status: 'tasks_ready',
            next_action: 'create_pr'
        };

        const progressPath = path.join(this.agentWorkflowDir, 'progress', `cycle-${cycle}.json`);
        await fs.writeFile(progressPath, JSON.stringify(progressUpdate, null, 2));
        
        // Update README with progress
        await this.updateReadmeProgress(cycle, tasks);
    }

    async updateReadmeProgress(cycle, tasks) {
        console.log('📖 Updating README with progress...');
        
        try {
            const readmePath = path.join(this.repoRoot, 'README.md');
            let readmeContent = await fs.readFile(readmePath, 'utf8');
            
            // Create progress section
            const progressSection = `\n## 🤖 Continuous Development Progress\n\n` +
                `**Cycle ${cycle}** - ${new Date().toISOString().split('T')[0]}\n\n` +
                `### Current Tasks (${tasks.length})\n` +
                tasks.map(task => `- **${task.title}** (${task.type}, Priority: ${task.priority})`).join('\n') +
                `\n\n*Last updated by Continuous Agent: ${new Date().toISOString()}*\n`;
            
            // Find existing progress section and replace, or append
            const progressMarker = '## 🤖 Continuous Development Progress';
            if (readmeContent.includes(progressMarker)) {
                // Replace existing section
                const sections = readmeContent.split(progressMarker);
                const beforeProgress = sections[0];
                const afterProgress = sections[1] ? sections[1].split('\n##')[0] : '';
                const remainingContent = sections[1] ? '\n##' + sections[1].split('\n##').slice(1).join('\n##') : '';
                
                readmeContent = beforeProgress + progressSection + remainingContent;
            } else {
                // Append new section
                readmeContent += progressSection;
            }
            
            await fs.writeFile(readmePath, readmeContent);
            console.log('✅ README updated with progress');
        } catch (error) {
            console.error('❌ Failed to update README:', error.message);
        }
    }

    async createGitHubIssue(prompt) {
        console.log('🎯 Creating GitHub issue for coding agent...');
        
        const config = await this.loadConfig();
        const { repo_owner, repo_name } = config.github_api;
        
        const issueData = {
            title: `[Coding Agent] ${prompt.title} - Cycle ${await this.getCurrentCycle()}`,
            body: this.formatIssueBody(prompt),
            labels: ['coding-agent', 'automated', 'enhancement']
        };

        try {
            const response = await this.makeGitHubRequest(
                `https://api.github.com/repos/${repo_owner}/${repo_name}/issues`,
                'POST',
                issueData
            );
            
            console.log('✅ GitHub issue created:', response.html_url);
            return response;
        } catch (error) {
            console.error('❌ Failed to create GitHub issue:', error.message);
            throw error;
        }
    }

    formatIssueBody(prompt) {
        return `# ${prompt.title}\n\n` +
            `${prompt.description}\n\n` +
            `## Tasks\n\n` +
            prompt.tasks.map(task => 
                `### ${task.title}\n` +
                `- **Type**: ${task.type}\n` +
                `- **Priority**: ${task.priority}\n` +
                `- **Effort**: ${task.estimated_effort}\n` +
                `- **Description**: ${task.description}\n`
            ).join('\n') +
            `\n## Instructions\n\n` +
            prompt.instructions.map(instruction => `- ${instruction}`).join('\n') +
            `\n\n## Context\n\n` +
            `**Project**: ${prompt.context.project}\n` +
            `**Tech Stack**: ${prompt.context.tech_stack.join(', ')}\n` +
            `**Focus Areas**: ${prompt.context.focus_areas.join(', ')}\n` +
            `\n## Success Criteria\n\n` +
            prompt.success_criteria.map(criteria => `- ${criteria}`).join('\n') +
            `\n\n---\n*Generated by Continuous Coding Agent - ${new Date().toISOString()}*`;
    }

    async makeGitHubRequest(url, method = 'GET', data = null) {
        const fetch = (await import('node-fetch')).default;
        
        const options = {
            method,
            headers: {
                'Authorization': `token ${this.githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'EchoTune-Continuous-Agent/1.0'
            }
        };

        if (data) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        return await response.json();
    }

    async getCurrentCycle() {
        const status = await this.loadStatus();
        return status.cycle || 0;
    }

    async incrementCycle() {
        const status = await this.loadStatus();
        status.cycle = (status.cycle || 0) + 1;
        status.last_updated = new Date().toISOString();
        await this.saveStatus(status);
        return status.cycle;
    }

    async run(mode = 'full') {
        console.log('🚀 Starting Continuous Coding Agent...');
        console.log(`Mode: ${mode}`);
        
        try {
            const config = await this.loadConfig();
            
            if (!config.enabled) {
                console.log('⏸️ Continuous agent is disabled');
                return;
            }

            // Increment cycle
            const cycle = await this.incrementCycle();
            console.log(`🔄 Starting cycle ${cycle}`);

            let analysis = null;
            if (mode === 'full' || mode === 'analyze') {
                analysis = await this.analyzeLastPR();
            }

            const tasks = await this.generateTasks(analysis);
            console.log(`✅ Generated ${tasks.length} tasks`);

            const prompt = await this.generatePrompt(tasks);
            console.log('✅ Generated prompt');

            await this.updateProgress(cycle, tasks);
            console.log('✅ Updated progress');

            if (config.auto_create_pr && (mode === 'full' || mode === 'create-issue')) {
                if (this.githubToken) {
                    await this.createGitHubIssue(prompt);
                } else {
                    console.log('ℹ️ Skipping GitHub issue creation - no token available');
                }
            }

            // Update status
            const status = await this.loadStatus();
            status.status = 'cycle_complete';
            status.current_task = null;
            status.next_action = 'waiting_for_pr_completion';
            status.workflow_state.last_tasks_created = new Date().toISOString();
            await this.saveStatus(status);

            console.log('🎉 Continuous agent cycle completed successfully');
            console.log(`📊 Cycle ${cycle} summary:`);
            console.log(`   - Tasks generated: ${tasks.length}`);
            console.log(`   - Analysis completed: ${analysis ? 'Yes' : 'No'}`);
            console.log(`   - GitHub issue created: ${config.auto_create_pr ? 'Yes' : 'No'}`);

        } catch (error) {
            console.error('❌ Continuous agent failed:', error.message);
            
            // Update status with error
            const status = await this.loadStatus();
            status.status = 'error';
            status.errors.push({
                message: error.message,
                timestamp: new Date().toISOString(),
                stack: error.stack
            });
            await this.saveStatus(status);
            
            process.exit(1);
        }
    }
}

// CLI handling
if (require.main === module) {
    const mode = process.argv[2] || 'full';
    const agent = new ContinuousAgent();
    agent.run(mode);
}

module.exports = ContinuousAgent;