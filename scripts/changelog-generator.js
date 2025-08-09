#!/usr/bin/env node

/**
 * 📝 Automated Changelog Generator & Documentation Updater
 * Hardened CI/CD Pipeline - Documentation Automation Component
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class ChangelogGenerator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      changelog_updated: false,
      documentation_updated: false,
      version_info: {},
      changes: [],
      sections: {
        breaking: [],
        features: [],
        fixes: [],
        improvements: [],
        security: [],
        dependencies: [],
        documentation: [],
      },
    };
    
    this.conventionalCommitTypes = {
      'feat': { section: 'features', emoji: '✨', description: 'New Features' },
      'fix': { section: 'fixes', emoji: '🐛', description: 'Bug Fixes' },
      'docs': { section: 'documentation', emoji: '📚', description: 'Documentation' },
      'style': { section: 'improvements', emoji: '💄', description: 'Code Style' },
      'refactor': { section: 'improvements', emoji: '♻️', description: 'Code Refactoring' },
      'perf': { section: 'improvements', emoji: '⚡', description: 'Performance' },
      'test': { section: 'improvements', emoji: '🧪', description: 'Testing' },
      'chore': { section: 'dependencies', emoji: '🔧', description: 'Maintenance' },
      'ci': { section: 'improvements', emoji: '👷', description: 'CI/CD' },
      'build': { section: 'dependencies', emoji: '📦', description: 'Build System' },
      'security': { section: 'security', emoji: '🔒', description: 'Security' },
    };
  }

  async run(options = {}) {
    console.log('📝 Starting Automated Changelog Generation...');
    
    try {
      // Parse options
      const {
        version = null,
        since = null,
        includeUnreleased = true,
        updateDocs = true,
      } = options;
      
      await this.setupDirectories();
      
      // Get version information
      await this.getVersionInfo(version);
      
      // Analyze git commits
      await this.analyzeCommits(since);
      
      // Generate changelog sections
      this.generateChangelog();
      
      // Update CHANGELOG.md
      await this.updateChangelogFile();
      
      if (updateDocs) {
        // Update other documentation
        await this.updateDocumentation();
      }
      
      console.log(`📈 Changelog generation completed. Updated: ${this.results.changelog_updated ? 'Yes' : 'No'}`);
      
      return true;
      
    } catch (error) {
      console.error('❌ Changelog generation failed:', error.message);
      return false;
    }
  }

  async setupDirectories() {
    const docsDir = path.join(process.cwd(), 'docs');
    await fs.mkdir(docsDir, { recursive: true });
  }

  async getVersionInfo(providedVersion) {
    console.log('🔖 Getting version information...');
    
    try {
      // Get version from package.json
      const packageJson = await fs.readFile('package.json', 'utf8');
      const packageData = JSON.parse(packageJson);
      
      const currentVersion = providedVersion || packageData.version || '0.0.1';
      
      // Get latest git tag
      let latestTag = null;
      try {
        latestTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
      } catch {
        latestTag = null;
      }
      
      this.results.version_info = {
        current_version: currentVersion,
        latest_tag: latestTag,
        is_new_version: latestTag !== currentVersion,
        package_name: packageData.name || 'Unknown',
        description: packageData.description || '',
      };
      
      console.log(`   Current version: ${currentVersion}`);
      console.log(`   Latest tag: ${latestTag || 'None'}`);
      
    } catch (error) {
      console.warn('   Warning: Could not determine version info:', error.message);
      this.results.version_info = {
        current_version: '0.0.1',
        latest_tag: null,
        is_new_version: true,
        package_name: 'Unknown',
        description: '',
      };
    }
  }

  async analyzeCommits(since) {
    console.log('📊 Analyzing git commits...');
    
    try {
      // Determine commit range
      let commitRange = 'HEAD';
      
      if (since) {
        commitRange = `${since}..HEAD`;
      } else if (this.results.version_info.latest_tag) {
        commitRange = `${this.results.version_info.latest_tag}..HEAD`;
      } else {
        // Get all commits (limit to last 100)
        commitRange = 'HEAD --max-count=100';
      }
      
      // Get commit log with specific format
      const gitLogCommand = `git log ${commitRange} --pretty=format:"%H|%an|%ae|%ad|%s|%b" --date=iso`;
      const gitOutput = execSync(gitLogCommand, { encoding: 'utf8' });
      
      if (!gitOutput.trim()) {
        console.log('   No commits found in range');
        return;
      }
      
      const commits = gitOutput.trim().split('\n').map(line => {
        const [hash, author, email, date, subject, body] = line.split('|');
        return { hash, author, email, date, subject, body: body || '' };
      });
      
      console.log(`   Found ${commits.length} commits to analyze`);
      
      // Parse commits
      for (const commit of commits) {
        this.parseCommit(commit);
      }
      
      // Also check for dependency changes
      await this.analyzeDependencyChanges();
      
    } catch (error) {
      console.warn('   Warning: Could not analyze commits:', error.message);
    }
  }

  parseCommit(commit) {
    const { hash, author, subject, body, date } = commit;
    
    // Parse conventional commit format
    const conventionalRegex = /^(\w+)(\(.+\))?: (.+)$/;
    const match = subject.match(conventionalRegex);
    
    let type = 'other';
    let scope = null;
    let description = subject;
    let isBreaking = false;
    
    if (match) {
      type = match[1].toLowerCase();
      scope = match[2] ? match[2].slice(1, -1) : null; // Remove parentheses
      description = match[3];
    }
    
    // Check for breaking changes
    if (subject.includes('BREAKING CHANGE') || 
        body.includes('BREAKING CHANGE') ||
        subject.includes('!:')) {
      isBreaking = true;
      type = 'breaking';
    }
    
    // Create change entry
    const change = {
      hash: hash.substring(0, 8),
      author,
      date,
      type,
      scope,
      description,
      original_subject: subject,
      body,
      is_breaking: isBreaking,
    };
    
    this.results.changes.push(change);
    
    // Categorize into sections
    if (isBreaking) {
      this.results.sections.breaking.push(change);
    } else if (this.conventionalCommitTypes[type]) {
      const section = this.conventionalCommitTypes[type].section;
      this.results.sections[section].push(change);
    } else {
      this.results.sections.improvements.push(change);
    }
  }

  async analyzeDependencyChanges() {
    console.log('📦 Analyzing dependency changes...');
    
    try {
      // Check for package.json changes
      const packageJsonDiff = execSync('git diff HEAD~10..HEAD -- package.json', { encoding: 'utf8' });
      
      if (packageJsonDiff) {
        const addedDeps = packageJsonDiff.match(/\+.*"([^"]+)":\s*"[^"]+"/g) || [];
        const removedDeps = packageJsonDiff.match(/-.*"([^"]+)":\s*"[^"]+"/g) || [];
        const updatedDeps = packageJsonDiff.match(/[+-].*"([^"]+)":\s*"[^"]+"/g) || [];
        
        if (addedDeps.length > 0 || removedDeps.length > 0) {
          this.results.sections.dependencies.push({
            hash: 'package',
            author: 'Dependency Manager',
            date: new Date().toISOString(),
            type: 'deps',
            description: `Updated dependencies: ${addedDeps.length} added, ${removedDeps.length} removed`,
            details: {
              added: addedDeps.map(dep => dep.match(/"([^"]+)"/)[1]),
              removed: removedDeps.map(dep => dep.match(/"([^"]+)"/)[1]),
            },
          });
        }
      }
      
    } catch (error) {
      // Ignore git diff errors
    }
  }

  generateChangelog() {
    console.log('📋 Generating changelog content...');
    
    // Sort changes by date (newest first)
    for (const section of Object.values(this.results.sections)) {
      section.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    
    this.changelogContent = this.buildChangelogMarkdown();
  }

  buildChangelogMarkdown() {
    const { version_info, sections } = this.results;
    
    let changelog = `# Changelog\n\n`;
    changelog += `All notable changes to **${version_info.package_name}** will be documented in this file.\n\n`;
    changelog += `The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),\n`;
    changelog += `and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n`;
    
    // Current version section
    const versionHeader = version_info.is_new_version ? 
      `## [${version_info.current_version}] - ${new Date().toISOString().split('T')[0]}` :
      `## [Unreleased]`;
    
    changelog += `${versionHeader}\n\n`;
    
    // Add description if available
    if (version_info.description) {
      changelog += `${version_info.description}\n\n`;
    }
    
    // Breaking changes (most important)
    if (sections.breaking.length > 0) {
      changelog += `### 💥 BREAKING CHANGES\n\n`;
      for (const change of sections.breaking) {
        changelog += `- ${change.description}`;
        if (change.scope) changelog += ` (**${change.scope}**)`;
        changelog += ` ([${change.hash}](../../commit/${change.hash}))\n`;
        
        if (change.body && change.body.includes('BREAKING CHANGE')) {
          const breakingNote = change.body.split('BREAKING CHANGE:')[1];
          if (breakingNote) {
            changelog += `  - **Breaking Change**: ${breakingNote.trim()}\n`;
          }
        }
      }
      changelog += `\n`;
    }
    
    // Security fixes
    if (sections.security.length > 0) {
      changelog += `### 🔒 Security\n\n`;
      for (const change of sections.security) {
        changelog += `- ${change.description}`;
        if (change.scope) changelog += ` (**${change.scope}**)`;
        changelog += ` ([${change.hash}](../../commit/${change.hash}))\n`;
      }
      changelog += `\n`;
    }
    
    // New features
    if (sections.features.length > 0) {
      changelog += `### ✨ New Features\n\n`;
      for (const change of sections.features) {
        changelog += `- ${change.description}`;
        if (change.scope) changelog += ` (**${change.scope}**)`;
        changelog += ` ([${change.hash}](../../commit/${change.hash}))\n`;
      }
      changelog += `\n`;
    }
    
    // Bug fixes
    if (sections.fixes.length > 0) {
      changelog += `### 🐛 Bug Fixes\n\n`;
      for (const change of sections.fixes) {
        changelog += `- ${change.description}`;
        if (change.scope) changelog += ` (**${change.scope}**)`;
        changelog += ` ([${change.hash}](../../commit/${change.hash}))\n`;
      }
      changelog += `\n`;
    }
    
    // Improvements
    if (sections.improvements.length > 0) {
      changelog += `### 🚀 Improvements\n\n`;
      for (const change of sections.improvements) {
        const typeInfo = this.conventionalCommitTypes[change.type];
        const emoji = typeInfo ? typeInfo.emoji : '🔧';
        
        changelog += `- ${emoji} ${change.description}`;
        if (change.scope) changelog += ` (**${change.scope}**)`;
        changelog += ` ([${change.hash}](../../commit/${change.hash}))\n`;
      }
      changelog += `\n`;
    }
    
    // Dependencies
    if (sections.dependencies.length > 0) {
      changelog += `### 📦 Dependencies\n\n`;
      for (const change of sections.dependencies) {
        changelog += `- ${change.description} ([${change.hash}](../../commit/${change.hash}))\n`;
        
        if (change.details && (change.details.added.length > 0 || change.details.removed.length > 0)) {
          if (change.details.added.length > 0) {
            changelog += `  - Added: ${change.details.added.join(', ')}\n`;
          }
          if (change.details.removed.length > 0) {
            changelog += `  - Removed: ${change.details.removed.join(', ')}\n`;
          }
        }
      }
      changelog += `\n`;
    }
    
    // Documentation
    if (sections.documentation.length > 0) {
      changelog += `### 📚 Documentation\n\n`;
      for (const change of sections.documentation) {
        changelog += `- ${change.description}`;
        if (change.scope) changelog += ` (**${change.scope}**)`;
        changelog += ` ([${change.hash}](../../commit/${change.hash}))\n`;
      }
      changelog += `\n`;
    }
    
    // Add footer with generation info
    changelog += `---\n\n`;
    changelog += `*This changelog was generated automatically on ${new Date().toISOString().split('T')[0]} by the Hardened CI/CD Pipeline.*\n`;
    
    return changelog;
  }

  async updateChangelogFile() {
    console.log('📝 Updating CHANGELOG.md...');
    
    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
    
    try {
      // Check if existing changelog exists
      let existingChangelog = '';
      try {
        existingChangelog = await fs.readFile(changelogPath, 'utf8');
      } catch {
        // File doesn't exist, create new
      }
      
      // If existing changelog, merge with new content
      let finalChangelog;
      
      if (existingChangelog) {
        // Find where to insert new version
        const versionRegex = /^## \[.*\]/m;
        const match = existingChangelog.match(versionRegex);
        
        if (match) {
          // Insert new version before first existing version
          const insertIndex = existingChangelog.indexOf(match[0]);
          const header = existingChangelog.substring(0, insertIndex);
          const rest = existingChangelog.substring(insertIndex);
          
          // Extract new version section from generated changelog
          const newVersionMatch = this.changelogContent.match(/(^## \[.*?\n\n)(.*?)(^---)/ms);
          if (newVersionMatch) {
            finalChangelog = header + newVersionMatch[1] + newVersionMatch[2] + '\n' + rest;
          } else {
            finalChangelog = this.changelogContent + '\n\n' + existingChangelog;
          }
        } else {
          finalChangelog = this.changelogContent + '\n\n' + existingChangelog;
        }
      } else {
        finalChangelog = this.changelogContent;
      }
      
      await fs.writeFile(changelogPath, finalChangelog);
      
      this.results.changelog_updated = true;
      console.log('   ✅ CHANGELOG.md updated successfully');
      
    } catch (error) {
      console.error('   ❌ Failed to update CHANGELOG.md:', error.message);
    }
  }

  async updateDocumentation() {
    console.log('📚 Updating related documentation...');
    
    try {
      // Update README.md with latest version info
      await this.updateReadme();
      
      // Generate release notes
      await this.generateReleaseNotes();
      
      // Update documentation index
      await this.updateDocsIndex();
      
      this.results.documentation_updated = true;
      
    } catch (error) {
      console.warn('   Warning: Some documentation updates failed:', error.message);
    }
  }

  async updateReadme() {
    const readmePath = path.join(process.cwd(), 'README.md');
    
    try {
      const readme = await fs.readFile(readmePath, 'utf8');
      const { version_info } = this.results;
      
      // Update version badges
      let updatedReadme = readme;
      
      // Update version badge
      const versionBadgeRegex = /!\[Version\]\([^)]*\)/g;
      const newVersionBadge = `![Version](https://img.shields.io/badge/version-${version_info.current_version}-blue.svg)`;
      
      if (versionBadgeRegex.test(readme)) {
        updatedReadme = updatedReadme.replace(versionBadgeRegex, newVersionBadge);
      } else {
        // Add version badge at top if none exists
        updatedReadme = `${newVersionBadge}\n\n${updatedReadme}`;
      }
      
      // Update last updated date
      const lastUpdatedRegex = />.*Last Updated.*:.*\d{4}/g;
      const newLastUpdated = `> **📋 Last Updated**: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
      
      if (lastUpdatedRegex.test(readme)) {
        updatedReadme = updatedReadme.replace(lastUpdatedRegex, newLastUpdated);
      }
      
      await fs.writeFile(readmePath, updatedReadme);
      console.log('   ✅ README.md updated');
      
    } catch (error) {
      console.log('   ⚠️ Could not update README.md:', error.message);
    }
  }

  async generateReleaseNotes() {
    const releaseNotesPath = path.join(process.cwd(), 'docs', 'RELEASE_NOTES.md');
    
    try {
      const { version_info, sections } = this.results;
      
      let releaseNotes = `# Release Notes - ${version_info.current_version}\n\n`;
      releaseNotes += `**Release Date**: ${new Date().toISOString().split('T')[0]}\n\n`;
      
      // Highlight summary
      const totalChanges = Object.values(sections).reduce((sum, section) => sum + section.length, 0);
      releaseNotes += `## 📊 Release Summary\n\n`;
      releaseNotes += `This release includes **${totalChanges} changes** across multiple categories:\n\n`;
      
      for (const [sectionName, changes] of Object.entries(sections)) {
        if (changes.length > 0) {
          const typeInfo = Object.values(this.conventionalCommitTypes).find(t => t.section === sectionName);
          const emoji = typeInfo ? typeInfo.emoji : '🔧';
          const description = typeInfo ? typeInfo.description : sectionName;
          
          releaseNotes += `- ${emoji} **${description}**: ${changes.length} changes\n`;
        }
      }
      
      releaseNotes += `\n---\n\n`;
      releaseNotes += `For detailed changes, see [CHANGELOG.md](../CHANGELOG.md).\n`;
      
      await fs.writeFile(releaseNotesPath, releaseNotes);
      console.log('   ✅ Release notes generated');
      
    } catch (error) {
      console.log('   ⚠️ Could not generate release notes:', error.message);
    }
  }

  async updateDocsIndex() {
    const docsIndexPath = path.join(process.cwd(), 'docs', 'README.md');
    
    try {
      const { version_info } = this.results;
      
      let docsIndex = `# 📚 Documentation Index\n\n`;
      docsIndex += `**Project**: ${version_info.package_name}\n`;
      docsIndex += `**Version**: ${version_info.current_version}\n`;
      docsIndex += `**Last Updated**: ${new Date().toISOString().split('T')[0]}\n\n`;
      
      docsIndex += `## 📋 Available Documentation\n\n`;
      docsIndex += `- [📝 Changelog](../CHANGELOG.md) - Complete change history\n`;
      docsIndex += `- [🚀 Release Notes](RELEASE_NOTES.md) - Latest release information\n`;
      docsIndex += `- [📖 Main README](../README.md) - Project overview and setup\n`;
      docsIndex += `- [🏗️ Architecture](ARCHITECTURE.md) - System architecture (if available)\n`;
      docsIndex += `- [🚀 Deployment](DEPLOYMENT.md) - Deployment guide (if available)\n`;
      docsIndex += `- [🤝 Contributing](../CONTRIBUTING.md) - Contribution guidelines (if available)\n\n`;
      
      docsIndex += `---\n\n`;
      docsIndex += `*Documentation automatically updated by Hardened CI/CD Pipeline*\n`;
      
      await fs.writeFile(docsIndexPath, docsIndex);
      console.log('   ✅ Documentation index updated');
      
    } catch (error) {
      console.log('   ⚠️ Could not update documentation index:', error.message);
    }
  }
}

// CLI execution
if (require.main === module) {
  const generator = new ChangelogGenerator();
  
  // Parse CLI arguments
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];
    
    switch (key) {
      case 'version':
        options.version = value;
        break;
      case 'since':
        options.since = value;
        break;
      case 'no-docs':
        options.updateDocs = false;
        break;
    }
  }
  
  generator.run(options)
    .then(success => {
      console.log(`\n🏁 Changelog generation ${success ? 'COMPLETED' : 'FAILED'}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Changelog generation crashed:', error);
      process.exit(1);
    });
}

module.exports = ChangelogGenerator;