#!/usr/bin/env node

/**
 * 🎯 Hardened CI/CD Quality Gate Manager
 * Orchestrates all validation components for comprehensive quality assessment
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

// Import validation components
const PerformanceBenchmark = require('./performance-benchmark.js');
const CoverageValidator = require('./coverage-validator.js');
const SecurityScanner = require('./security-scanner.js');
const ChangelogGenerator = require('./changelog-generator.js');

class QualityGateManager {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      gate_id: `qg-${Date.now()}`,
      overall_status: 'unknown',
      overall_score: 0,
      gate_results: {},
      thresholds: {
        overall_score: 75,
        security_score: 80,
        coverage_threshold: 70,
        performance_threshold: 60,
      },
      execution_time: 0,
      recommendations: [],
    };
    
    this.gates = [
      {
        name: 'security',
        description: '🔒 Security Validation',
        runner: SecurityScanner,
        weight: 0.30,
        required: true,
        timeout: 300000, // 5 minutes
      },
      {
        name: 'coverage',
        description: '📊 Coverage Validation',
        runner: CoverageValidator,
        weight: 0.25,
        required: true,
        timeout: 180000, // 3 minutes
      },
      {
        name: 'performance',
        description: '⚡ Performance Benchmarking',
        runner: PerformanceBenchmark,
        weight: 0.25,
        required: false,
        timeout: 240000, // 4 minutes
      },
      {
        name: 'documentation',
        description: '📝 Documentation Validation',
        runner: ChangelogGenerator,
        weight: 0.10,
        required: false,
        timeout: 120000, // 2 minutes
      },
      {
        name: 'lint',
        description: '🧹 Code Quality Linting',
        runner: null, // External command
        command: 'npm run lint',
        weight: 0.10,
        required: true,
        timeout: 120000, // 2 minutes
      },
    ];
  }

  async run(options = {}) {
    console.log('🎯 Starting Hardened CI/CD Quality Gate Assessment...');
    console.log(`   Gate ID: ${this.results.gate_id}`);
    
    const startTime = Date.now();
    
    try {
      // Setup
      await this.setupEnvironment();
      
      // Parse options
      const {
        skipOptional = false,
        parallel = true,
        failFast = false,
        generateReport = true,
      } = options;
      
      // Filter gates based on options
      let activeGates = this.gates;
      if (skipOptional) {
        activeGates = this.gates.filter(gate => gate.required);
      }
      
      console.log(`📋 Running ${activeGates.length} quality gates${parallel ? ' (parallel)' : ' (sequential)'}...`);
      
      // Execute gates
      if (parallel && !failFast) {
        await this.runGatesParallel(activeGates);
      } else {
        await this.runGatesSequential(activeGates, failFast);
      }
      
      // Calculate overall results
      this.calculateOverallScore();
      
      // Generate recommendations
      this.generateRecommendations();
      
      // Generate comprehensive report
      if (generateReport) {
        await this.generateReports();
      }
      
      this.results.execution_time = Date.now() - startTime;
      
      const statusEmoji = this.getStatusEmoji(this.results.overall_status);
      console.log(`\n${statusEmoji} Quality Gate Assessment Complete`);
      console.log(`   Overall Score: ${this.results.overall_score}/100`);
      console.log(`   Status: ${this.results.overall_status.toUpperCase()}`);
      console.log(`   Execution Time: ${Math.round(this.results.execution_time / 1000)}s`);
      
      return this.results.overall_status === 'passed';
      
    } catch (error) {
      console.error('❌ Quality Gate Manager failed:', error.message);
      this.results.overall_status = 'failed';
      this.results.error = error.message;
      return false;
    }
  }

  async setupEnvironment() {
    console.log('🔧 Setting up quality gate environment...');
    
    // Create reports directory
    const reportsDir = path.join(process.cwd(), 'reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    // Create subdirectories for each component
    const subDirs = ['quality-gates', 'security', 'coverage', 'performance', 'lint'];
    for (const subDir of subDirs) {
      await fs.mkdir(path.join(reportsDir, subDir), { recursive: true });
    }
    
    console.log('   ✅ Environment setup complete');
  }

  async runGatesParallel(gates) {
    console.log('⚡ Running quality gates in parallel...');
    
    const promises = gates.map(gate => this.runSingleGate(gate));
    const results = await Promise.allSettled(promises);
    
    // Process results
    results.forEach((result, index) => {
      const gate = gates[index];
      
      if (result.status === 'fulfilled') {
        this.results.gate_results[gate.name] = {
          ...result.value,
          status: 'completed',
        };
      } else {
        this.results.gate_results[gate.name] = {
          status: 'failed',
          error: result.reason.message,
          score: 0,
          passed: false,
        };
      }
    });
  }

  async runGatesSequential(gates, failFast = false) {
    console.log('🔄 Running quality gates sequentially...');
    
    for (const gate of gates) {
      try {
        const result = await this.runSingleGate(gate);
        
        this.results.gate_results[gate.name] = {
          ...result,
          status: 'completed',
        };
        
        // Fail fast if enabled and required gate failed
        if (failFast && gate.required && !result.passed) {
          console.log(`❌ Failing fast due to required gate failure: ${gate.name}`);
          break;
        }
        
      } catch (error) {
        this.results.gate_results[gate.name] = {
          status: 'failed',
          error: error.message,
          score: 0,
          passed: false,
        };
        
        if (failFast && gate.required) {
          throw error;
        }
      }
    }
  }

  async runSingleGate(gate) {
    console.log(`   🚀 ${gate.description}...`);
    const startTime = Date.now();
    
    try {
      let result;
      
      if (gate.runner) {
        // JavaScript runner
        const runner = new gate.runner();
        const passed = await Promise.race([
          runner.run(),
          this.createTimeout(gate.timeout, `${gate.name} timeout`),
        ]);
        
        result = {
          passed,
          score: runner.results?.score || runner.results?.overall_score || (passed ? 100 : 0),
          details: runner.results,
        };
        
      } else if (gate.command) {
        // External command runner
        result = await Promise.race([
          this.runCommand(gate.command),
          this.createTimeout(gate.timeout, `${gate.name} timeout`),
        ]);
        
      } else {
        throw new Error(`No runner or command specified for gate: ${gate.name}`);
      }
      
      const duration = Date.now() - startTime;
      
      const status = result.passed ? '✅' : '❌';
      console.log(`   ${status} ${gate.description} completed in ${Math.round(duration / 1000)}s (Score: ${result.score || 0})`);
      
      return {
        ...result,
        duration,
        gate_name: gate.name,
        weight: gate.weight,
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`   ❌ ${gate.description} failed after ${Math.round(duration / 1000)}s: ${error.message}`);
      
      throw error;
    }
  }

  async runCommand(command) {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      
      const child = spawn(cmd, args, {
        stdio: 'pipe',
        cwd: process.cwd(),
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        const passed = code === 0;
        
        // Try to extract score from output (if available)
        let score = passed ? 100 : 0;
        const scoreMatch = stdout.match(/score:\s*(\d+)/i);
        if (scoreMatch) {
          score = parseInt(scoreMatch[1]);
        }
        
        resolve({
          passed,
          score,
          exit_code: code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
      });
      
      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  createTimeout(ms, message) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout: ${message}`)), ms);
    });
  }

  calculateOverallScore() {
    console.log('📊 Calculating overall quality score...');
    
    let totalWeightedScore = 0;
    let totalWeight = 0;
    let passedRequired = 0;
    let totalRequired = 0;
    
    for (const gate of this.gates) {
      const result = this.results.gate_results[gate.name];
      
      if (result && result.status === 'completed') {
        const score = result.score || 0;
        totalWeightedScore += score * gate.weight;
        totalWeight += gate.weight;
        
        if (gate.required) {
          totalRequired++;
          if (result.passed) passedRequired++;
        }
      } else if (gate.required) {
        // Failed required gate
        totalRequired++;
        totalWeight += gate.weight;
      }
    }
    
    // Calculate weighted average score
    const weightedScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    
    // Apply penalties for failed required gates
    const requiredPenalty = totalRequired > 0 ? (totalRequired - passedRequired) * 20 : 0;
    
    this.results.overall_score = Math.max(0, Math.round(weightedScore - requiredPenalty));
    
    // Determine overall status
    if (this.results.overall_score >= this.results.thresholds.overall_score && passedRequired === totalRequired) {
      this.results.overall_status = 'passed';
    } else if (this.results.overall_score >= 60 && passedRequired >= Math.ceil(totalRequired * 0.75)) {
      this.results.overall_status = 'warning';
    } else {
      this.results.overall_status = 'failed';
    }
    
    console.log(`   📈 Weighted Score: ${Math.round(weightedScore)}/100`);
    console.log(`   ⚖️ Required Gates: ${passedRequired}/${totalRequired} passed`);
    console.log(`   🏆 Final Score: ${this.results.overall_score}/100`);
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Analyze each gate result
    for (const [gateName, result] of Object.entries(this.results.gate_results)) {
      const gate = this.gates.find(g => g.name === gateName);
      
      if (!result.passed || (result.score && result.score < 70)) {
        const priority = gate.required ? 'high' : 'medium';
        
        recommendations.push({
          gate: gateName,
          priority,
          title: `Improve ${gate.description}`,
          description: `${gate.description} needs attention (Score: ${result.score || 0})`,
          actions: this.getGateRecommendations(gateName, result),
        });
      }
    }
    
    // Overall system recommendations
    if (this.results.overall_score < 80) {
      recommendations.push({
        gate: 'overall',
        priority: 'high',
        title: 'Improve Overall Quality',
        description: 'System quality score is below recommended threshold',
        actions: [
          'Focus on failing quality gates',
          'Implement automated quality monitoring',
          'Regular code reviews and testing',
          'Continuous improvement of CI/CD pipeline',
        ],
      });
    }
    
    this.results.recommendations = recommendations;
  }

  getGateRecommendations(gateName, result) {
    const recommendationMap = {
      security: [
        'Fix critical and high severity vulnerabilities',
        'Implement secure coding practices',
        'Regular security audits and dependency updates',
        'Use security linting tools',
      ],
      coverage: [
        'Write more comprehensive unit tests',
        'Add integration tests for critical paths',
        'Test edge cases and error conditions',
        'Maintain test documentation',
      ],
      performance: [
        'Optimize slow functions and queries',
        'Implement caching strategies',
        'Review resource usage patterns',
        'Set up performance monitoring',
      ],
      lint: [
        'Fix linting errors and warnings',
        'Consistent code formatting',
        'Follow established coding standards',
        'Configure automated code formatting',
      ],
      documentation: [
        'Update project documentation',
        'Maintain accurate changelog',
        'Document API changes',
        'Update README and guides',
      ],
    };
    
    return recommendationMap[gateName] || ['Review and improve gate requirements'];
  }

  async generateReports() {
    console.log('📄 Generating comprehensive quality reports...');
    
    const reportsDir = path.join(process.cwd(), 'reports', 'quality-gates');
    
    // JSON report
    await fs.writeFile(
      path.join(reportsDir, 'quality-gate-results.json'),
      JSON.stringify(this.results, null, 2)
    );
    
    // Markdown report
    const markdownReport = this.generateMarkdownReport();
    await fs.writeFile(
      path.join(reportsDir, 'quality-gate-report.md'),
      markdownReport
    );
    
    // Executive summary
    const summaryReport = this.generateSummaryReport();
    await fs.writeFile(
      path.join(reportsDir, 'executive-summary.md'),
      summaryReport
    );
    
    // JUnit XML for CI integration
    const junitReport = this.generateJUnitReport();
    await fs.writeFile(
      path.join(reportsDir, 'quality-gate-results.xml'),
      junitReport
    );
    
    console.log('   ✅ Reports generated successfully');
  }

  generateMarkdownReport() {
    const { overall_status, overall_score, gate_results, recommendations, execution_time } = this.results;
    
    let report = `# 🎯 Quality Gate Assessment Report\n\n`;
    report += `**Generated**: ${new Date().toLocaleString()}\n`;
    report += `**Gate ID**: ${this.results.gate_id}\n`;
    report += `**Overall Status**: ${this.getStatusEmoji(overall_status)} ${overall_status.toUpperCase()}\n`;
    report += `**Overall Score**: ${overall_score}/100\n`;
    report += `**Execution Time**: ${Math.round(execution_time / 1000)}s\n\n`;
    
    // Gate results summary
    report += `## 📊 Gate Results Summary\n\n`;
    report += `| Gate | Status | Score | Duration | Weight |\n`;
    report += `|------|--------|-------|----------|--------|\n`;
    
    for (const gate of this.gates) {
      const result = gate_results[gate.name];
      
      if (result) {
        const status = result.passed ? '✅ PASS' : '❌ FAIL';
        const score = result.score || 0;
        const duration = Math.round((result.duration || 0) / 1000);
        const weight = Math.round(gate.weight * 100);
        
        report += `| ${gate.description} | ${status} | ${score}/100 | ${duration}s | ${weight}% |\n`;
      } else {
        report += `| ${gate.description} | ⏭️ SKIP | - | - | ${Math.round(gate.weight * 100)}% |\n`;
      }
    }
    
    // Detailed results
    report += `\n## 🔍 Detailed Results\n\n`;
    
    for (const gate of this.gates) {
      const result = gate_results[gate.name];
      
      if (result && result.status === 'completed') {
        report += `### ${gate.description}\n`;
        report += `- **Status**: ${result.passed ? '✅ Passed' : '❌ Failed'}\n`;
        report += `- **Score**: ${result.score}/100\n`;
        report += `- **Duration**: ${Math.round(result.duration / 1000)}s\n`;
        
        if (result.details) {
          report += `- **Details**: Available in individual gate reports\n`;
        }
        
        if (result.error) {
          report += `- **Error**: ${result.error}\n`;
        }
        
        report += `\n`;
      }
    }
    
    // Recommendations
    if (recommendations.length > 0) {
      report += `## 💡 Recommendations\n\n`;
      
      const highPriority = recommendations.filter(r => r.priority === 'high');
      const mediumPriority = recommendations.filter(r => r.priority === 'medium');
      const lowPriority = recommendations.filter(r => r.priority === 'low');
      
      if (highPriority.length > 0) {
        report += `### 🔴 High Priority\n`;
        for (const rec of highPriority) {
          report += `- **${rec.title}**: ${rec.description}\n`;
          if (rec.actions) {
            for (const action of rec.actions) {
              report += `  - ${action}\n`;
            }
          }
        }
        report += `\n`;
      }
      
      if (mediumPriority.length > 0) {
        report += `### 🟡 Medium Priority\n`;
        for (const rec of mediumPriority) {
          report += `- **${rec.title}**: ${rec.description}\n`;
        }
        report += `\n`;
      }
      
      if (lowPriority.length > 0) {
        report += `### 🟢 Low Priority\n`;
        for (const rec of lowPriority) {
          report += `- **${rec.title}**: ${rec.description}\n`;
        }
      }
    }
    
    return report;
  }

  generateSummaryReport() {
    const { overall_status, overall_score, gate_results } = this.results;
    
    let summary = `# 📋 Executive Summary - Quality Assessment\n\n`;
    
    const statusEmoji = this.getStatusEmoji(overall_status);
    summary += `## ${statusEmoji} Overall Result: ${overall_status.toUpperCase()}\n\n`;
    summary += `**Quality Score**: ${overall_score}/100\n\n`;
    
    // Key metrics
    const totalGates = this.gates.length;
    const completedGates = Object.keys(gate_results).length;
    const passedGates = Object.values(gate_results).filter(r => r.passed).length;
    
    summary += `**Gate Statistics**:\n`;
    summary += `- Total Gates: ${totalGates}\n`;
    summary += `- Completed: ${completedGates}\n`;
    summary += `- Passed: ${passedGates}\n`;
    summary += `- Success Rate: ${Math.round((passedGates / completedGates) * 100)}%\n\n`;
    
    // Status interpretation
    if (overall_status === 'passed') {
      summary += `### ✅ Quality Standards Met\n`;
      summary += `The codebase meets all required quality standards and is ready for deployment.\n\n`;
    } else if (overall_status === 'warning') {
      summary += `### ⚠️ Quality Issues Detected\n`;
      summary += `Some quality issues were detected. Review recommendations before deployment.\n\n`;
    } else {
      summary += `### ❌ Quality Standards Not Met\n`;
      summary += `Significant quality issues detected. Address critical issues before deployment.\n\n`;
    }
    
    // Next steps
    summary += `## 🎯 Recommended Next Steps\n\n`;
    
    if (overall_status === 'passed') {
      summary += `1. ✅ Deploy with confidence\n`;
      summary += `2. 📊 Monitor production metrics\n`;
      summary += `3. 🔄 Continue quality practices\n`;
    } else {
      summary += `1. 🔧 Address failing quality gates\n`;
      summary += `2. 📝 Review detailed recommendations\n`;
      summary += `3. 🧪 Re-run quality assessment\n`;
      summary += `4. 👥 Consider code review if needed\n`;
    }
    
    return summary;
  }

  generateJUnitReport() {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<testsuite name="Quality Gates" tests="${this.gates.length}" failures="0" errors="0" time="${this.results.execution_time / 1000}">\n`;
    
    for (const gate of this.gates) {
      const result = this.results.gate_results[gate.name];
      const time = result ? (result.duration || 0) / 1000 : 0;
      
      xml += `  <testcase classname="QualityGate" name="${gate.name}" time="${time}">\n`;
      
      if (result && !result.passed) {
        xml += `    <failure message="Quality gate failed">${gate.description} failed with score ${result.score || 0}</failure>\n`;
      }
      
      if (result && result.error) {
        xml += `    <error message="Gate execution error">${result.error}</error>\n`;
      }
      
      xml += `  </testcase>\n`;
    }
    
    xml += `</testsuite>\n`;
    return xml;
  }

  getStatusEmoji(status) {
    const emojis = {
      'passed': '✅',
      'warning': '⚠️',
      'failed': '❌',
      'unknown': '❓',
    };
    return emojis[status] || '❓';
  }
}

// CLI execution
if (require.main === module) {
  const manager = new QualityGateManager();
  
  // Parse CLI arguments
  const args = process.argv.slice(2);
  const options = {};
  
  args.forEach(arg => {
    switch (arg) {
      case '--skip-optional':
        options.skipOptional = true;
        break;
      case '--sequential':
        options.parallel = false;
        break;
      case '--fail-fast':
        options.failFast = true;
        break;
      case '--no-report':
        options.generateReport = false;
        break;
    }
  });
  
  manager.run(options)
    .then(passed => {
      console.log(`\n🏁 Quality Gate Assessment ${passed ? 'PASSED' : 'FAILED'}`);
      process.exit(passed ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Quality Gate Manager crashed:', error);
      process.exit(1);
    });
}

module.exports = QualityGateManager;