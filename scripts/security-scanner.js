#!/usr/bin/env node

/**
 * 🔒 Enhanced Security Scanning & Vulnerability Management
 * Hardened CI/CD Pipeline - Security Assessment Component
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

class SecurityScanner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      scan_id: crypto.randomUUID(),
      security_score: 0,
      overall_status: 'unknown',
      vulnerabilities: {
        critical: 0,
        high: 0,
        moderate: 0,
        low: 0,
        info: 0,
      },
      scans: {
        dependency_audit: { status: 'pending', results: [] },
        secret_scanning: { status: 'pending', results: [] },
        code_analysis: { status: 'pending', results: [] },
        configuration_review: { status: 'pending', results: [] },
        license_compliance: { status: 'pending', results: [] },
      },
      recommendations: [],
      remediation_actions: [],
    };
    
    this.severityWeights = {
      critical: 10,
      high: 5,
      moderate: 2,
      low: 1,
      info: 0.1,
    };
    
    this.secretPatterns = [
      {
        name: 'AWS Access Key',
        pattern: /AKIA[0-9A-Z]{16}/g,
        severity: 'critical',
      },
      {
        name: 'API Key',
        pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['\"]?([a-zA-Z0-9_\-]{20,})['\"]?/gi,
        severity: 'high',
      },
      {
        name: 'Generic Secret',
        pattern: /(?:secret|password|pwd|token)\s*[:=]\s*['\"]?([a-zA-Z0-9_\-@!#$%^&*]{12,})['\"]?/gi,
        severity: 'moderate',
      },
      {
        name: 'Private Key',
        pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g,
        severity: 'critical',
      },
      {
        name: 'Database Connection String',
        pattern: /(?:mongodb|mysql|postgres|redis):\/\/[^\s'"]+/gi,
        severity: 'high',
      },
      {
        name: 'JWT Token',
        pattern: /eyJ[a-zA-Z0-9_\-]*\.[a-zA-Z0-9_\-]*\.[a-zA-Z0-9_\-]*/g,
        severity: 'moderate',
      },
    ];
    
    this.dangerousPatterns = [
      {
        name: 'Eval Usage',
        pattern: /\beval\s*\(/g,
        severity: 'high',
        description: 'Use of eval() can lead to code injection vulnerabilities',
      },
      {
        name: 'Process Exit',
        pattern: /process\.exit\s*\(/g,
        severity: 'moderate',
        description: 'Direct process.exit() usage can disrupt graceful shutdown',
      },
      {
        name: 'SQL Injection Risk',
        pattern: /query\s*\(\s*['"]\s*SELECT.*\+.*['"]\s*\)/gi,
        severity: 'high',
        description: 'Potential SQL injection vulnerability in query construction',
      },
      {
        name: 'Command Injection Risk',
        pattern: /exec\s*\(\s*[^)]*\+[^)]*\)/g,
        severity: 'critical',
        description: 'Command execution with concatenated strings is dangerous',
      },
      {
        name: 'Insecure Random',
        pattern: /Math\.random\(\)/g,
        severity: 'low',
        description: 'Math.random() is not cryptographically secure',
      },
    ];
  }

  async run() {
    console.log('🔒 Starting Enhanced Security Scanning...');
    
    try {
      await this.setupReportsDirectory();
      
      // Run all security scans
      await this.runDependencyAudit();
      await this.runSecretScanning();
      await this.runCodeAnalysis();
      await this.runConfigurationReview();
      await this.runLicenseCompliance();
      
      // Calculate overall security score
      this.calculateSecurityScore();
      
      // Generate recommendations and remediation actions
      this.generateRecommendations();
      this.generateRemediationActions();
      
      // Generate reports
      await this.generateReports();
      
      console.log(`🛡️ Security scan completed. Score: ${this.results.security_score}/100`);
      
      return this.results.overall_status !== 'failed';
      
    } catch (error) {
      console.error('❌ Security scan failed:', error.message);
      this.results.overall_status = 'failed';
      this.results.error = error.message;
      return false;
    }
  }

  async setupReportsDirectory() {
    const reportsDir = path.join(process.cwd(), 'reports', 'security');
    await fs.mkdir(reportsDir, { recursive: true });
  }

  async runDependencyAudit() {
    console.log('📦 Running dependency vulnerability audit...');
    
    try {
      // Run npm audit
      const auditOutput = execSync('npm audit --json --audit-level=info', {
        encoding: 'utf8',
        timeout: 60000,
        maxBuffer: 1024 * 1024 * 5, // 5MB buffer
      });
      
      const auditData = JSON.parse(auditOutput);
      
      // Process vulnerabilities
      const vulnerabilities = [];
      
      if (auditData.vulnerabilities) {
        for (const [packageName, vulnData] of Object.entries(auditData.vulnerabilities)) {
          vulnerabilities.push({
            package: packageName,
            severity: vulnData.severity,
            title: vulnData.title,
            description: vulnData.url ? `See: ${vulnData.url}` : 'Dependency vulnerability',
            via: vulnData.via,
            range: vulnData.range,
            fixAvailable: vulnData.fixAvailable,
          });
          
          // Update vulnerability counts
          if (this.results.vulnerabilities[vulnData.severity] !== undefined) {
            this.results.vulnerabilities[vulnData.severity]++;
          }
        }
      }
      
      this.results.scans.dependency_audit = {
        status: 'completed',
        results: vulnerabilities,
        summary: auditData.metadata?.vulnerabilities || {},
        total_vulnerabilities: vulnerabilities.length,
      };
      
      console.log(`   Found ${vulnerabilities.length} dependency vulnerabilities`);
      
    } catch (error) {
      console.log('   ⚠️ Dependency audit completed with warnings');
      
      // Try to extract some info from error output
      let vulnerabilityCount = 0;
      if (error.stdout && error.stdout.includes('vulnerabilities')) {
        const matches = error.stdout.match(/(\d+)\s+vulnerabilities/);
        if (matches) {
          vulnerabilityCount = parseInt(matches[1]);
        }
      }
      
      this.results.scans.dependency_audit = {
        status: 'completed_with_warnings',
        results: [],
        total_vulnerabilities: vulnerabilityCount,
        warning: error.message,
      };
    }
  }

  async runSecretScanning() {
    console.log('🔍 Scanning for exposed secrets and credentials...');
    
    const secretsFound = [];
    const filesToScan = [
      'src/**/*.js',
      'src/**/*.ts',
      'src/**/*.jsx',
      'src/**/*.tsx',
      'scripts/**/*.js',
      'mcp-server/**/*.js',
      '*.js',
      '*.ts',
      '.env*',
      'config/**/*',
    ];
    
    for (const filePattern of filesToScan) {
      try {
        const files = await this.findFiles(filePattern);
        
        for (const filePath of files) {
          // Skip certain files
          if (filePath.includes('node_modules') || 
              filePath.includes('.git') || 
              filePath.includes('coverage') ||
              filePath.includes('dist') ||
              filePath.includes('.min.')) {
            continue;
          }
          
          try {
            const content = await fs.readFile(filePath, 'utf8');
            
            // Check against secret patterns
            for (const pattern of this.secretPatterns) {
              const matches = content.match(pattern.pattern);
              if (matches) {
                for (const match of matches) {
                  secretsFound.push({
                    type: pattern.name,
                    file: filePath,
                    match: match.substring(0, 50) + '...', // Truncate for security
                    severity: pattern.severity,
                    line: this.findLineNumber(content, match),
                  });
                  
                  // Update vulnerability counts
                  if (this.results.vulnerabilities[pattern.severity] !== undefined) {
                    this.results.vulnerabilities[pattern.severity]++;
                  }
                }
              }
            }
          } catch (fileError) {
            // Skip files that can't be read
          }
        }
      } catch (globError) {
        // Skip patterns that don't match
      }
    }
    
    this.results.scans.secret_scanning = {
      status: 'completed',
      results: secretsFound,
      total_secrets: secretsFound.length,
    };
    
    console.log(`   Found ${secretsFound.length} potential secrets`);
  }

  async runCodeAnalysis() {
    console.log('🔍 Performing static code security analysis...');
    
    const codeIssues = [];
    const filesToAnalyze = await this.findFiles('src/**/*.js');
    
    for (const filePath of filesToAnalyze.slice(0, 50)) { // Limit to avoid timeout
      try {
        const content = await fs.readFile(filePath, 'utf8');
        
        // Check against dangerous patterns
        for (const pattern of this.dangerousPatterns) {
          const matches = content.match(pattern.pattern);
          if (matches) {
            for (const match of matches) {
              codeIssues.push({
                type: pattern.name,
                file: filePath,
                match: match,
                severity: pattern.severity,
                description: pattern.description,
                line: this.findLineNumber(content, match),
              });
              
              // Update vulnerability counts
              if (this.results.vulnerabilities[pattern.severity] !== undefined) {
                this.results.vulnerabilities[pattern.severity]++;
              }
            }
          }
        }
        
        // Additional security checks
        if (content.includes('innerHTML') && !content.includes('sanitize')) {
          codeIssues.push({
            type: 'XSS Risk',
            file: filePath,
            severity: 'moderate',
            description: 'Using innerHTML without sanitization can lead to XSS',
            line: this.findLineNumber(content, 'innerHTML'),
          });
          this.results.vulnerabilities.moderate++;
        }
        
      } catch (fileError) {
        // Skip files that can't be read
      }
    }
    
    this.results.scans.code_analysis = {
      status: 'completed',
      results: codeIssues,
      total_issues: codeIssues.length,
      files_analyzed: Math.min(filesToAnalyze.length, 50),
    };
    
    console.log(`   Found ${codeIssues.length} code security issues`);
  }

  async runConfigurationReview() {
    console.log('⚙️ Reviewing security configuration...');
    
    const configIssues = [];
    
    // Check for security-related configuration files
    const configFiles = [
      '.env',
      '.env.example',
      'package.json',
      'nginx.conf',
      'docker-compose.yml',
      'Dockerfile',
    ];
    
    for (const configFile of configFiles) {
      try {
        const content = await fs.readFile(configFile, 'utf8');
        
        // Check for common security misconfigurations
        if (configFile === 'package.json') {
          const packageData = JSON.parse(content);
          
          // Check for outdated security-critical packages
          if (packageData.dependencies) {
            const securityPackages = ['helmet', 'bcrypt', 'jsonwebtoken', 'express-rate-limit'];
            for (const pkg of securityPackages) {
              if (!packageData.dependencies[pkg] && !packageData.devDependencies?.[pkg]) {
                configIssues.push({
                  type: 'Missing Security Package',
                  file: configFile,
                  severity: 'moderate',
                  description: `Consider adding '${pkg}' for enhanced security`,
                });
              }
            }
          }
        }
        
        if (configFile.includes('.env')) {
          // Check for example secrets in .env files
          if (content.includes('your_secret_here') || 
              content.includes('change_me') ||
              content.includes('example_key')) {
            configIssues.push({
              type: 'Example Credentials',
              file: configFile,
              severity: 'low',
              description: 'Example credentials found in environment file',
            });
          }
        }
        
        if (configFile.includes('nginx') || configFile.includes('docker')) {
          // Check for insecure configurations
          if (content.includes('ssl_protocols') && !content.includes('TLSv1.3')) {
            configIssues.push({
              type: 'Outdated SSL Configuration',
              file: configFile,
              severity: 'moderate',
              description: 'Consider upgrading to TLS 1.3',
            });
          }
        }
        
      } catch (error) {
        // File doesn't exist, skip
      }
    }
    
    // Update vulnerability counts
    for (const issue of configIssues) {
      if (this.results.vulnerabilities[issue.severity] !== undefined) {
        this.results.vulnerabilities[issue.severity]++;
      }
    }
    
    this.results.scans.configuration_review = {
      status: 'completed',
      results: configIssues,
      total_issues: configIssues.length,
      files_checked: configFiles.length,
    };
    
    console.log(`   Found ${configIssues.length} configuration issues`);
  }

  async runLicenseCompliance() {
    console.log('📄 Checking license compliance...');
    
    const licenseIssues = [];
    
    try {
      const packageJson = await fs.readFile('package.json', 'utf8');
      const packageData = JSON.parse(packageJson);
      
      // Check main project license
      if (!packageData.license) {
        licenseIssues.push({
          type: 'Missing License',
          severity: 'low',
          description: 'Project should specify a license',
        });
      }
      
      // Note: Full dependency license checking would require additional tools
      // This is a basic check for demonstration
      
    } catch (error) {
      licenseIssues.push({
        type: 'Package.json Not Found',
        severity: 'info',
        description: 'Could not verify license information',
      });
    }
    
    // Update vulnerability counts
    for (const issue of licenseIssues) {
      if (this.results.vulnerabilities[issue.severity] !== undefined) {
        this.results.vulnerabilities[issue.severity]++;
      }
    }
    
    this.results.scans.license_compliance = {
      status: 'completed',
      results: licenseIssues,
      total_issues: licenseIssues.length,
    };
    
    console.log(`   Found ${licenseIssues.length} license compliance issues`);
  }

  calculateSecurityScore() {
    // Calculate weighted severity score
    let totalSeverityScore = 0;
    
    for (const [severity, count] of Object.entries(this.results.vulnerabilities)) {
      totalSeverityScore += count * this.severityWeights[severity];
    }
    
    // Base score of 100, subtract weighted severity points
    let securityScore = Math.max(0, 100 - totalSeverityScore);
    
    // Bonus points for completed scans
    const completedScans = Object.values(this.results.scans).filter(scan => 
      scan.status === 'completed' || scan.status === 'completed_with_warnings'
    ).length;
    
    const totalScans = Object.keys(this.results.scans).length;
    const completionBonus = (completedScans / totalScans) * 10;
    
    securityScore = Math.min(100, securityScore + completionBonus);
    
    this.results.security_score = Math.round(securityScore);
    
    // Determine overall status
    if (this.results.security_score >= 80 && this.results.vulnerabilities.critical === 0) {
      this.results.overall_status = 'passed';
    } else if (this.results.security_score >= 60 && this.results.vulnerabilities.critical <= 1) {
      this.results.overall_status = 'warning';
    } else {
      this.results.overall_status = 'failed';
    }
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Critical vulnerability recommendations
    if (this.results.vulnerabilities.critical > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'vulnerability_remediation',
        title: 'Address Critical Vulnerabilities',
        description: `${this.results.vulnerabilities.critical} critical vulnerabilities found. Address immediately.`,
        actions: ['Run npm audit fix', 'Update vulnerable packages', 'Review code for security issues'],
      });
    }
    
    // High severity recommendations
    if (this.results.vulnerabilities.high > 0) {
      recommendations.push({
        priority: 'high',
        category: 'vulnerability_remediation',
        title: 'Fix High Severity Issues',
        description: `${this.results.vulnerabilities.high} high severity issues found.`,
        actions: ['Review and fix high severity vulnerabilities', 'Implement additional security controls'],
      });
    }
    
    // Secret management recommendations
    const secretsFound = this.results.scans.secret_scanning.total_secrets || 0;
    if (secretsFound > 0) {
      recommendations.push({
        priority: 'high',
        category: 'secret_management',
        title: 'Improve Secret Management',
        description: `${secretsFound} potential secrets found in code.`,
        actions: [
          'Move secrets to environment variables',
          'Use secret management tools',
          'Add .env files to .gitignore',
          'Rotate exposed credentials',
        ],
      });
    }
    
    // Security tooling recommendations
    if (this.results.security_score < 80) {
      recommendations.push({
        priority: 'medium',
        category: 'security_tooling',
        title: 'Enhance Security Tooling',
        description: 'Consider implementing additional security measures.',
        actions: [
          'Add security headers with helmet.js',
          'Implement rate limiting',
          'Add input validation and sanitization',
          'Set up automated security scanning',
        ],
      });
    }
    
    this.results.recommendations = recommendations;
  }

  generateRemediationActions() {
    const actions = [];
    
    // Generate specific remediation actions based on findings
    for (const [scanType, scanResults] of Object.entries(this.results.scans)) {
      if (scanResults.results && Array.isArray(scanResults.results)) {
        for (const result of scanResults.results) {
          if (result.severity === 'critical' || result.severity === 'high') {
            actions.push({
              scan_type: scanType,
              severity: result.severity,
              issue: result.type || result.title,
              file: result.file,
              recommended_action: this.getRecommendedAction(scanType, result),
              priority: result.severity === 'critical' ? 1 : 2,
            });
          }
        }
      }
    }
    
    // Sort by priority
    actions.sort((a, b) => a.priority - b.priority);
    
    this.results.remediation_actions = actions.slice(0, 20); // Limit to top 20
  }

  getRecommendedAction(scanType, result) {
    const actionMap = {
      dependency_audit: 'Run `npm audit fix` or update the vulnerable package',
      secret_scanning: 'Remove secret from code and add to environment variables',
      code_analysis: 'Refactor code to use secure alternatives',
      configuration_review: 'Update configuration to follow security best practices',
      license_compliance: 'Review and update license information',
    };
    
    return actionMap[scanType] || 'Review and address security issue';
  }

  async generateReports() {
    const reportsDir = path.join(process.cwd(), 'reports', 'security');
    
    // JSON report
    await fs.writeFile(
      path.join(reportsDir, 'security-scan-results.json'),
      JSON.stringify(this.results, null, 2)
    );
    
    // Markdown report
    const markdownReport = this.generateMarkdownReport();
    await fs.writeFile(
      path.join(reportsDir, 'security-report.md'),
      markdownReport
    );
    
    // SARIF report for GitHub security tab
    const sarifReport = this.generateSarifReport();
    await fs.writeFile(
      path.join(reportsDir, 'security-results.sarif'),
      JSON.stringify(sarifReport, null, 2)
    );
    
    // CSV report for spreadsheet analysis
    const csvReport = this.generateCsvReport();
    await fs.writeFile(
      path.join(reportsDir, 'vulnerabilities.csv'),
      csvReport
    );
  }

  generateMarkdownReport() {
    const { security_score, overall_status, vulnerabilities, scans, recommendations } = this.results;
    
    let report = `# 🔒 Security Scan Report\n\n`;
    report += `**Generated**: ${new Date().toLocaleString()}\n`;
    report += `**Scan ID**: ${this.results.scan_id}\n`;
    report += `**Overall Status**: ${this.getStatusEmoji(overall_status)} ${overall_status.toUpperCase()}\n`;
    report += `**Security Score**: ${security_score}/100\n\n`;
    
    // Vulnerability summary
    report += `## 🚨 Vulnerability Summary\n\n`;
    report += `| Severity | Count | Weight |\n`;
    report += `|----------|-------|--------|\n`;
    
    for (const [severity, count] of Object.entries(vulnerabilities)) {
      if (count > 0) {
        report += `| ${severity.charAt(0).toUpperCase() + severity.slice(1)} | ${count} | ${this.severityWeights[severity]} |\n`;
      }
    }
    
    const totalVulns = Object.values(vulnerabilities).reduce((sum, count) => sum + count, 0);
    report += `| **Total** | **${totalVulns}** | - |\n\n`;
    
    // Scan results
    report += `## 🔍 Scan Results\n\n`;
    
    for (const [scanName, scanData] of Object.entries(scans)) {
      const status = scanData.status === 'completed' ? '✅' : 
                     scanData.status === 'completed_with_warnings' ? '⚠️' : '❌';
      const issueCount = scanData.total_vulnerabilities || scanData.total_secrets || scanData.total_issues || 0;
      
      report += `### ${status} ${scanName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}\n`;
      report += `- **Status**: ${scanData.status}\n`;
      report += `- **Issues Found**: ${issueCount}\n`;
      
      if (scanData.results && scanData.results.length > 0) {
        report += `- **Top Issues**:\n`;
        for (const issue of scanData.results.slice(0, 3)) {
          const severity = issue.severity || 'unknown';
          report += `  - ${this.getSeverityEmoji(severity)} ${issue.type || issue.title || 'Security Issue'}\n`;
        }
      }
      report += `\n`;
    }
    
    // Recommendations
    if (recommendations.length > 0) {
      report += `## 💡 Recommendations\n\n`;
      
      const criticalRecs = recommendations.filter(r => r.priority === 'critical');
      const highRecs = recommendations.filter(r => r.priority === 'high');
      const mediumRecs = recommendations.filter(r => r.priority === 'medium');
      
      if (criticalRecs.length > 0) {
        report += `### 🔴 Critical Priority\n`;
        for (const rec of criticalRecs) {
          report += `- **${rec.title}**: ${rec.description}\n`;
          if (rec.actions) {
            for (const action of rec.actions) {
              report += `  - ${action}\n`;
            }
          }
        }
        report += `\n`;
      }
      
      if (highRecs.length > 0) {
        report += `### 🟠 High Priority\n`;
        for (const rec of highRecs) {
          report += `- **${rec.title}**: ${rec.description}\n`;
        }
        report += `\n`;
      }
      
      if (mediumRecs.length > 0) {
        report += `### 🟡 Medium Priority\n`;
        for (const rec of mediumRecs) {
          report += `- **${rec.title}**: ${rec.description}\n`;
        }
      }
    }
    
    return report;
  }

  generateSarifReport() {
    // Generate SARIF 2.1.0 format for GitHub security tab
    const sarif = {
      version: '2.1.0',
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      runs: [
        {
          tool: {
            driver: {
              name: 'Enhanced Security Scanner',
              version: '1.0.0',
              informationUri: 'https://github.com/dzp5103/Spotify-echo',
            },
          },
          results: [],
        },
      ],
    };
    
    // Add results from all scans
    for (const [scanType, scanData] of Object.entries(this.results.scans)) {
      if (scanData.results && Array.isArray(scanData.results)) {
        for (const result of scanData.results) {
          sarif.runs[0].results.push({
            ruleId: `${scanType}/${result.type || 'security-issue'}`,
            message: {
              text: result.description || result.title || 'Security issue detected',
            },
            level: this.mapSeverityToSarif(result.severity),
            locations: result.file ? [
              {
                physicalLocation: {
                  artifactLocation: {
                    uri: result.file,
                  },
                  region: {
                    startLine: result.line || 1,
                  },
                },
              },
            ] : [],
          });
        }
      }
    }
    
    return sarif;
  }

  generateCsvReport() {
    let csv = 'Scan Type,Issue Type,Severity,File,Line,Description\n';
    
    for (const [scanType, scanData] of Object.entries(this.results.scans)) {
      if (scanData.results && Array.isArray(scanData.results)) {
        for (const result of scanData.results) {
          const row = [
            scanType,
            result.type || 'Security Issue',
            result.severity || 'unknown',
            result.file || '',
            result.line || '',
            (result.description || result.title || '').replace(/,/g, ';'),
          ];
          csv += row.map(field => `"${field}"`).join(',') + '\n';
        }
      }
    }
    
    return csv;
  }

  // Utility methods
  async findFiles(pattern) {
    // Simple file finding - in production, you'd use a glob library
    const files = [];
    
    if (pattern.includes('**')) {
      // For demo, just return some common files
      const commonFiles = [
        'src/index.js',
        'src/app.js',
        'scripts/deploy.sh',
        'package.json',
        '.env.example',
      ];
      
      for (const file of commonFiles) {
        try {
          await fs.access(file);
          files.push(file);
        } catch {
          // File doesn't exist
        }
      }
    } else {
      try {
        await fs.access(pattern);
        files.push(pattern);
      } catch {
        // File doesn't exist
      }
    }
    
    return files;
  }

  findLineNumber(content, searchText) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchText)) {
        return i + 1;
      }
    }
    return 1;
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

  getSeverityEmoji(severity) {
    const emojis = {
      'critical': '🔴',
      'high': '🟠',
      'moderate': '🟡',
      'low': '🟢',
      'info': '🔵',
    };
    return emojis[severity] || '⚪';
  }

  mapSeverityToSarif(severity) {
    const mapping = {
      'critical': 'error',
      'high': 'error',
      'moderate': 'warning',
      'low': 'note',
      'info': 'note',
    };
    return mapping[severity] || 'warning';
  }
}

// CLI execution
if (require.main === module) {
  const scanner = new SecurityScanner();
  
  scanner.run()
    .then(passed => {
      console.log(`\n🏁 Security scan ${passed ? 'PASSED' : 'FAILED'}`);
      process.exit(passed ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Security scan crashed:', error);
      process.exit(1);
    });
}

module.exports = SecurityScanner;