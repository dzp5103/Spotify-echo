/**
 * GitHub Repository Information Component
 * Displays project repository information, issues, and contribution details
 * 
 * This component addresses the "G" issue by providing GitHub integration
 * and repository information display functionality.
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Link,
  Grid,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  GitHub as GitHubIcon,
  Star as StarIcon,
  BugReport as IssuesIcon,
  Code as CodeIcon,
  People as ContributorsIcon
} from '@mui/icons-material';

const GitHubInfo = () => {
  const [repoInfo, setRepoInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Repository configuration
  const REPO_OWNER = 'dzp5103';
  const REPO_NAME = 'Spotify-echo';
  const GITHUB_API_BASE = 'https://api.github.com';

  /**
   * Fetch repository information from GitHub API
   */
  const fetchRepoInfo = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch basic repository information
      const repoResponse = await fetch(`${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}`);
      
      if (!repoResponse.ok) {
        throw new Error(`Failed to fetch repository info: ${repoResponse.status}`);
      }

      const repoData = await repoResponse.json();

      // Fetch additional information (issues, contributors)
      const [issuesResponse, contributorsResponse] = await Promise.all([
        fetch(`${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=open&per_page=1`),
        fetch(`${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contributors?per_page=5`)
      ]);

      const issuesData = issuesResponse.ok ? await issuesResponse.json() : [];
      const contributorsData = contributorsResponse.ok ? await contributorsResponse.json() : [];

      setRepoInfo({
        name: repoData.name,
        full_name: repoData.full_name,
        description: repoData.description,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        issues: repoData.open_issues_count,
        language: repoData.language,
        license: repoData.license?.name,
        created_at: repoData.created_at,
        updated_at: repoData.updated_at,
        html_url: repoData.html_url,
        clone_url: repoData.clone_url,
        contributors: contributorsData.length,
        topics: repoData.topics || []
      });

    } catch (err) {
      setError(err.message);
      console.error('GitHub API error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepoInfo();
  }, []);

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  /**
   * Handle external link clicks
   */
  const handleLinkClick = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" p={3}>
            <CircularProgress size={24} sx={{ mr: 2 }} />
            <Typography>Loading repository information...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load GitHub repository information: {error}
          </Alert>
          <Button 
            variant="outlined" 
            onClick={fetchRepoInfo}
            startIcon={<GitHubIcon />}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!repoInfo) {
    return null;
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <GitHubIcon sx={{ mr: 1, color: 'action.active' }} />
          <Typography variant="h6" component="h2">
            Repository Information
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" paragraph>
          {repoInfo.description}
        </Typography>

        <Grid container spacing={2} mb={3}>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h6" color="primary">
                {repoInfo.stars.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <StarIcon sx={{ fontSize: 16, mr: 0.5 }} />
                Stars
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h6" color="primary">
                {repoInfo.issues.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <IssuesIcon sx={{ fontSize: 16, mr: 0.5 }} />
                Issues
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h6" color="primary">
                {repoInfo.forks.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <CodeIcon sx={{ fontSize: 16, mr: 0.5 }} />
                Forks
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h6" color="primary">
                {repoInfo.contributors}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <ContributorsIcon sx={{ fontSize: 16, mr: 0.5 }} />
                Contributors
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box mb={2}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Primary Language: <strong>{repoInfo.language}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            License: <strong>{repoInfo.license || 'Not specified'}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Created: <strong>{formatDate(repoInfo.created_at)}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last Updated: <strong>{formatDate(repoInfo.updated_at)}</strong>
          </Typography>
        </Box>

        {repoInfo.topics && repoInfo.topics.length > 0 && (
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Topics:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {repoInfo.topics.map((topic, index) => (
                <Chip 
                  key={index} 
                  label={topic} 
                  size="small" 
                  variant="outlined" 
                />
              ))}
            </Box>
          </Box>
        )}

        <Box display="flex" gap={1} flexWrap="wrap">
          <Button
            variant="contained"
            startIcon={<GitHubIcon />}
            onClick={() => handleLinkClick(repoInfo.html_url)}
            size="small"
          >
            View on GitHub
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<IssuesIcon />}
            onClick={() => handleLinkClick(`${repoInfo.html_url}/issues`)}
            size="small"
          >
            Issues
          </Button>

          <Button
            variant="outlined"
            startIcon={<CodeIcon />}
            onClick={() => handleLinkClick(`${repoInfo.html_url}/fork`)}
            size="small"
          >
            Fork
          </Button>
        </Box>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Contribute:</strong> Found a bug or have a feature request? 
            <Link 
              component="button"
              variant="body2"
              onClick={() => handleLinkClick(`${repoInfo.html_url}/issues/new`)}
              sx={{ ml: 0.5 }}
            >
              Create an issue
            </Link> 
            or submit a pull request!
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default GitHubInfo;