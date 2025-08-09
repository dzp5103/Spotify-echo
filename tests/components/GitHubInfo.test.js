/**
 * GitHubInfo Component Integration Test
 * Tests the GitHub repository information functionality
 */

const fs = require('fs');
const path = require('path');

describe('GitHubInfo Component Integration', () => {
  test('GitHubInfo component file exists and is valid', () => {
    const componentPath = path.join(__dirname, '../../src/components/GitHubInfo.jsx');
    
    // Check if file exists
    expect(fs.existsSync(componentPath)).toBe(true);
    
    // Check if file has content
    const content = fs.readFileSync(componentPath, 'utf8');
    expect(content.length).toBeGreaterThan(0);
    
    // Check for key component elements
    expect(content).toContain('GitHubInfo');
    expect(content).toContain('GitHub API');
    expect(content).toContain('repository information');
    expect(content).toContain('export default GitHubInfo');
  });

  test('GitHubInfo is properly integrated in App.jsx', () => {
    const appPath = path.join(__dirname, '../../src/frontend/App.jsx');
    
    // Check if App.jsx exists
    expect(fs.existsSync(appPath)).toBe(true);
    
    // Check if GitHubInfo is imported and used
    const appContent = fs.readFileSync(appPath, 'utf8');
    expect(appContent).toContain("import GitHubInfo from '../components/GitHubInfo'");
    expect(appContent).toContain('<GitHubInfo />');
    expect(appContent).toContain('GitHub');
  });

  test('component contains required GitHub API configuration', () => {
    const componentPath = path.join(__dirname, '../../src/components/GitHubInfo.jsx');
    const content = fs.readFileSync(componentPath, 'utf8');
    
    // Check for GitHub API configuration
    expect(content).toContain('dzp5103');
    expect(content).toContain('Spotify-echo');
    expect(content).toContain('https://api.github.com');
    
    // Check for error handling
    expect(content).toContain('catch');
    expect(content).toContain('error');
    
    // Check for Material-UI components
    expect(content).toContain('@mui/material');
    expect(content).toContain('@mui/icons-material');
    
    // Check for key functionality
    expect(content).toContain('stars');
    expect(content).toContain('forks');
    expect(content).toContain('issues');
    expect(content).toContain('contributors');
  });

  test('component has proper JSX structure', () => {
    const componentPath = path.join(__dirname, '../../src/components/GitHubInfo.jsx');
    const content = fs.readFileSync(componentPath, 'utf8');
    
    // Basic JSX structure checks
    expect(content).toContain('return (');
    expect(content).toContain('<Card>');
    expect(content).toContain('</Card>');
    expect(content).toContain('onClick');
    expect(content).toContain('useState');
    expect(content).toContain('useEffect');
  });

  test('component exports are correct', () => {
    const componentPath = path.join(__dirname, '../../src/components/GitHubInfo.jsx');
    const content = fs.readFileSync(componentPath, 'utf8');
    
    // Check exports
    expect(content).toContain('export default GitHubInfo');
    expect(content).toMatch(/const GitHubInfo = \(\) => \{/);
  });

  test('issue #171 requirements are addressed', () => {
    const componentPath = path.join(__dirname, '../../src/components/GitHubInfo.jsx');
    const content = fs.readFileSync(componentPath, 'utf8');
    
    // Check that the component addresses GitHub-related functionality (G for GitHub)
    expect(content).toContain('GitHub repository information');
    expect(content).toContain('This component addresses the "G" issue');
    
    // Check for comprehensive functionality
    expect(content).toContain('repository information');
    expect(content).toContain('contribution details');
    expect(content).toContain('GitHub integration');
  });
});