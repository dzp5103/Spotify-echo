/**
 * 🎛️ Advanced Settings UI Component
 * Provides comprehensive configuration interface for LLM providers,
 * database management, and real-time system monitoring
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box as _Box,
  Card as _Card,
  CardContent as _CardContent,
  Typography as _Typography,
  Tabs as _Tabs,
  Tab as _Tab,
  TextField as _TextField,
  Button as _Button,
  Select as _Select,
  MenuItem as _MenuItem,
  FormControl as _FormControl,
  InputLabel as _InputLabel,
  Alert as _Alert,
  CircularProgress as _CircularProgress,
  Chip as _Chip,
  Table as _Table,
  TableBody as _TableBody,
  TableCell as _TableCell,
  TableContainer as _TableContainer,
  TableHead as _TableHead,
  TableRow as _TableRow,
  Paper,
  LinearProgress as _LinearProgress,
  Grid as _Grid,
  Dialog as _Dialog,
  DialogTitle as _DialogTitle,
  DialogContent as _DialogContent,
  DialogActions as _DialogActions,
} from '@mui/material';
import {
  Psychology as _AIIcon,
  Storage as _DatabaseIcon,
  Settings as _SettingsIcon,
  TestTube as _TestIcon,
  Refresh as _RefreshIcon,
  Save as _SaveIcon,
  Warning as _WarningIcon,
  CheckCircle as _CheckIcon,
  Error as _ErrorIcon,
} from '@mui/icons-material';

const AdvancedSettingsUI = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState({});
  const [settings, setSettings] = useState({
    llm: {
      provider: 'mock',
      apiKey: '',
      model: '',
      temperature: 0.7,
      maxTokens: 4096,
      timeout: 30000,
    },
    database: {
      connectionStatus: 'unknown',
      collections: [],
      totalDocuments: 0,
      indexesOptimized: false,
    },
    system: {
      health: 'unknown',
      uptime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
    },
  });
  const [notifications, setNotifications] = useState([]);
  const [testDialogOpen, setTestDialogOpen] = useState(false);

  // Load initial settings
  useEffect(() => {
    loadSettings();
    loadSystemHealth();
    const interval = setInterval(loadSystemHealth, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [loadSettings, loadSystemHealth]);

  /**
   * Load current settings from backend
   */
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/advanced');
      if (response.ok) {
        const data = await response.json();
        setSettings((prevSettings) => ({ ...prevSettings, ...data }));
      }
    } catch (error) {
      addNotification('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  /**
   * Load system health and database insights
   */
  const loadSystemHealth = useCallback(async () => {
    try {
      // Load database insights
      const dbResponse = await fetch('/api/settings/database/insights');
      if (dbResponse.ok) {
        const dbData = await dbResponse.json();
        setSettings((prev) => ({
          ...prev,
          database: { ...prev.database, ...dbData },
        }));
      }

      // Load system health
      const healthResponse = await fetch('/api/health/detailed');
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setSettings((prev) => ({
          ...prev,
          system: { ...prev.system, ...healthData },
        }));
      }
    } catch (error) {
      console.error('Failed to load system health:', error);
    }
  }, []);

  /**
   * Save LLM provider settings
   */
  const saveLLMSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings.llm),
      });

      if (response.ok) {
        addNotification('LLM settings saved successfully', 'success');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      addNotification('Failed to save LLM settings', 'error');
    } finally {
      setLoading(false);
    }
  }, [settings.llm, addNotification]);

  /**
   * Test LLM provider connection
   */
  const testLLMProvider = useCallback(async () => {
    setLoading(true);
    setTestDialogOpen(true);

    try {
      const response = await fetch('/api/settings/llm/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings.llm),
      });

      const result = await response.json();

      setTestResults({
        provider: settings.llm.provider,
        status: response.ok ? 'success' : 'error',
        latency: result.latency || 0,
        response: result.response || result.error,
        timestamp: new Date().toLocaleString(),
      });

      if (response.ok) {
        addNotification(`${settings.llm.provider} test successful`, 'success');
      } else {
        addNotification(`${settings.llm.provider} test failed: ${result.error}`, 'error');
      }
    } catch (error) {
      setTestResults({
        provider: settings.llm.provider,
        status: 'error',
        response: error.message,
        timestamp: new Date().toLocaleString(),
      });
      addNotification('Provider test failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [settings.llm, addNotification]);

  /**
   * Add notification message
   */
  const addNotification = useCallback((message, severity = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      severity,
      timestamp: new Date(),
    };

    setNotifications((prev) => [notification, ...prev.slice(0, 4)]); // Keep last 5 notifications

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    }, 5000);
  }, []);

  /**
   * Handle settings changes
   */
  const handleSettingChange = useCallback((category, field, value) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  }, []);

  /**
   * Get status color based on value
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'success':
        return 'success';
      case 'warning':
      case 'degraded':
        return 'warning';
      case 'error':
      case 'disconnected':
      case 'failed':
        return 'error';
      default:
        return 'info';
    }
  };

  /**
   * Render LLM Provider Configuration Tab
   */
  const renderLLMProviderTab = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <AIIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          LLM Provider Configuration
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel>AI Provider</InputLabel>
              <Select
                value={settings.llm.provider}
                onChange={(e) => handleSettingChange('llm', 'provider', e.target.value)}
                label="AI Provider"
              >
                <MenuItem value="mock">Mock Provider (Testing)</MenuItem>
                <MenuItem value="openai">OpenAI GPT</MenuItem>
                <MenuItem value="gemini">Google Gemini</MenuItem>
                <MenuItem value="azure">Azure OpenAI</MenuItem>
                <MenuItem value="anthropic">Anthropic Claude</MenuItem>
                <MenuItem value="openrouter">OpenRouter</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              margin="normal"
              label="API Key"
              type="password"
              value={settings.llm.apiKey}
              onChange={(e) => handleSettingChange('llm', 'apiKey', e.target.value)}
              helperText="Keep your API key secure and never share it"
            />

            <TextField
              fullWidth
              margin="normal"
              label="Model"
              value={settings.llm.model}
              onChange={(e) => handleSettingChange('llm', 'model', e.target.value)}
              placeholder="e.g., gpt-3.5-turbo, gemini-1.5-flash"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              margin="normal"
              label="Temperature"
              type="number"
              value={settings.llm.temperature}
              onChange={(e) =>
                handleSettingChange('llm', 'temperature', parseFloat(e.target.value))
              }
              inputProps={{ min: 0, max: 2, step: 0.1 }}
              helperText="Controls randomness (0.0-2.0)"
            />

            <TextField
              fullWidth
              margin="normal"
              label="Max Tokens"
              type="number"
              value={settings.llm.maxTokens}
              onChange={(e) => handleSettingChange('llm', 'maxTokens', parseInt(e.target.value))}
              inputProps={{ min: 100, max: 8192 }}
              helperText="Maximum response length"
            />

            <TextField
              fullWidth
              margin="normal"
              label="Timeout (ms)"
              type="number"
              value={settings.llm.timeout}
              onChange={(e) => handleSettingChange('llm', 'timeout', parseInt(e.target.value))}
              inputProps={{ min: 5000, max: 120000 }}
              helperText="Request timeout in milliseconds"
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={saveLLMSettings}
            disabled={loading}
            startIcon={<SaveIcon />}
          >
            Save Configuration
          </Button>

          <Button
            variant="outlined"
            onClick={testLLMProvider}
            disabled={loading}
            startIcon={<TestIcon />}
          >
            Test Connection
          </Button>
        </Box>

        {Object.keys(testResults).length > 0 && (
          <Alert severity={testResults.status === 'success' ? 'success' : 'error'} sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Test Results for {testResults.provider}:</strong>
              <br />
              Status: {testResults.status}
              <br />
              {testResults.latency && `Latency: ${testResults.latency}ms`}
              <br />
              Response: {testResults.response}
              <br />
              Tested: {testResults.timestamp}
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  /**
   * Render Database Management Tab
   */
  const renderDatabaseManagementTab = () => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            <DatabaseIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Database Management
          </Typography>

          <Button
            variant="outlined"
            size="small"
            onClick={loadSystemHealth}
            startIcon={<RefreshIcon />}
          >
            Refresh
          </Button>
        </Box>

        {/* Connection Status */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Connection Status
          </Typography>
          <Chip
            icon={
              settings.database.connectionStatus === 'connected' ? <CheckIcon /> : <ErrorIcon />
            }
            label={`Database ${settings.database.connectionStatus || 'Unknown'}`}
            color={getStatusColor(settings.database.connectionStatus)}
            variant="outlined"
          />
        </Box>

        {/* Collection Statistics */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Collection Overview
          </Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Collection</TableCell>
                  <TableCell align="right">Documents</TableCell>
                  <TableCell align="right">Size</TableCell>
                  <TableCell align="center">Indexed</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {settings.database.collections.map((collection, index) => (
                  <TableRow key={index}>
                    <TableCell>{collection.name}</TableCell>
                    <TableCell align="right">{collection.count?.toLocaleString() || 0}</TableCell>
                    <TableCell align="right">{collection.size || 'N/A'}</TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={collection.indexed ? 'Yes' : 'No'}
                        color={collection.indexed ? 'success' : 'warning'}
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {settings.database.collections.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography variant="body2" color="textSecondary">
                        No collection data available
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Performance Metrics */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Performance Metrics
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Total Documents
                </Typography>
                <Typography variant="h6">
                  {settings.database.totalDocuments?.toLocaleString() || '0'}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Query Performance
                </Typography>
                <Typography variant="h6">{settings.database.avgQueryTime || 'N/A'}</Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Index Optimization
                </Typography>
                <Chip
                  size="small"
                  label={settings.database.indexesOptimized ? 'Optimized' : 'Needs Attention'}
                  color={settings.database.indexesOptimized ? 'success' : 'warning'}
                />
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );

  /**
   * Render System Health Tab
   */
  const renderSystemHealthTab = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          System Health & Monitoring
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Memory Usage
              </Typography>
              <LinearProgress
                variant="determinate"
                value={settings.system.memoryUsage || 0}
                color={settings.system.memoryUsage > 80 ? 'error' : 'primary'}
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="caption" color="textSecondary">
                {settings.system.memoryUsage || 0}% of available memory
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                CPU Usage
              </Typography>
              <LinearProgress
                variant="determinate"
                value={settings.system.cpuUsage || 0}
                color={settings.system.cpuUsage > 80 ? 'error' : 'primary'}
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="caption" color="textSecondary">
                {settings.system.cpuUsage || 0}% CPU utilization
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                System Uptime
              </Typography>
              <Typography variant="h6">
                {settings.system.uptime
                  ? `${Math.floor(settings.system.uptime / 3600)}h ${Math.floor((settings.system.uptime % 3600) / 60)}m`
                  : 'Unknown'}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Health Status
              </Typography>
              <Chip
                icon={settings.system.health === 'healthy' ? <CheckIcon /> : <WarningIcon />}
                label={settings.system.health || 'Unknown'}
                color={getStatusColor(settings.system.health)}
                variant="outlined"
              />
            </Box>
          </Grid>
        </Grid>

        {/* Real-time Notifications */}
        {notifications.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Recent Activity
            </Typography>
            {notifications.map((notification) => (
              <Alert key={notification.id} severity={notification.severity} sx={{ mb: 1 }}>
                <Typography variant="body2">
                  {notification.message}
                  <Typography variant="caption" display="block">
                    {notification.timestamp.toLocaleTimeString()}
                  </Typography>
                </Typography>
              </Alert>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Advanced Settings
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Configure AI providers, monitor database performance, and manage system settings.
      </Typography>

      <Tabs
        value={activeTab}
        onChange={(e, newValue) => setActiveTab(newValue)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
      >
        <Tab label="LLM Providers" icon={<AIIcon />} iconPosition="start" />
        <Tab label="Database Management" icon={<DatabaseIcon />} iconPosition="start" />
        <Tab label="System Health" icon={<SettingsIcon />} iconPosition="start" />
      </Tabs>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {activeTab === 0 && renderLLMProviderTab()}
      {activeTab === 1 && renderDatabaseManagementTab()}
      {activeTab === 2 && renderSystemHealthTab()}

      {/* Test Results Dialog */}
      <Dialog
        open={testDialogOpen}
        onClose={() => setTestDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>LLM Provider Test Results</DialogTitle>
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Testing {settings.llm.provider} connection...</Typography>
            </Box>
          ) : (
            Object.keys(testResults).length > 0 && (
              <Box>
                <Alert severity={testResults.status === 'success' ? 'success' : 'error'}>
                  <Typography variant="body1">
                    <strong>Provider:</strong> {testResults.provider}
                    <br />
                    <strong>Status:</strong> {testResults.status}
                    <br />
                    {testResults.latency && (
                      <>
                        <strong>Response Time:</strong> {testResults.latency}ms
                        <br />
                      </>
                    )}
                    <strong>Response:</strong> {testResults.response}
                    <br />
                    <strong>Tested:</strong> {testResults.timestamp}
                  </Typography>
                </Alert>
              </Box>
            )
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdvancedSettingsUI;
