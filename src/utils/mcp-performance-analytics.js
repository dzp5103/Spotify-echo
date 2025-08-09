/**
 * MCP Analytics Integration for Performance Monitoring
 * Connects performance metrics with MCP analytics system
 */

const path = require('path');
const fs = require('fs');

class MCPPerformanceAnalytics {
    constructor(options = {}) {
        this.mcpAnalyticsPath = options.mcpAnalyticsPath || path.join(process.cwd(), 'mcp-servers', 'analytics-server');
        this.outputDir = options.outputDir || path.join(process.cwd(), 'reports', 'mcp-analytics');
        this.enabled = process.env.MCP_ANALYTICS_ENABLED !== 'false';
        
        this.metrics = {
            performance: {},
            cache: {},
            rateLimit: {},
            redis: {},
            timestamp: null
        };
    }

    /**
     * Initialize MCP analytics integration
     */
    async initialize() {
        if (!this.enabled) {
            console.log('⚠️ MCP Analytics integration disabled');
            return false;
        }
        
        try {
            // Ensure output directory exists
            if (!fs.existsSync(this.outputDir)) {
                fs.mkdirSync(this.outputDir, { recursive: true });
            }
            
            console.log('✅ MCP Analytics integration initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize MCP Analytics:', error);
            return false;
        }
    }

    /**
     * Collect performance metrics from various sources
     */
    async collectMetrics() {
        this.metrics.timestamp = new Date().toISOString();
        
        try {
            // Collect slow request metrics
            const slowRequestLogger = require('../src/middleware/slow-request-logger');
            this.metrics.performance.slowRequests = slowRequestLogger.getMetrics();
            
            // Collect cache metrics (Redis or fallback)
            try {
                const cacheManager = require('../src/api/cache/redis-cache-manager');
                this.metrics.cache = await cacheManager.getStats();
            } catch (error) {
                console.warn('Cache metrics unavailable:', error.message);
                this.metrics.cache = { error: error.message };
            }
            
            // Collect rate limiter metrics
            try {
                const { rateLimiters } = require('../src/middleware/redis-rate-limiter');
                this.metrics.rateLimit = {};
                
                for (const [name, limiter] of Object.entries(rateLimiters)) {
                    this.metrics.rateLimit[name] = limiter.getStats();
                }
            } catch (error) {
                console.warn('Rate limiter metrics unavailable:', error.message);
                this.metrics.rateLimit = { error: error.message };
            }
            
            // Collect Redis health metrics
            try {
                const redisManager = require('../src/utils/redis-manager');
                this.metrics.redis = {
                    connected: redisManager.isConnected,
                    health: await redisManager.healthCheck()
                };
            } catch (error) {
                this.metrics.redis = { error: error.message };
            }
            
            console.log('📊 Performance metrics collected');
            return this.metrics;
        } catch (error) {
            console.error('Error collecting metrics:', error);
            throw error;
        }
    }

    /**
     * Generate MCP analytics report
     */
    async generateMCPReport() {
        const metrics = await this.collectMetrics();
        
        const report = {
            title: 'EchoTune AI - MCP Performance Analytics Report',
            timestamp: metrics.timestamp,
            version: '1.0.0',
            environment: {
                node: process.version,
                platform: process.platform,
                memory: process.memoryUsage(),
                uptime: process.uptime()
            },
            sections: {
                executive_summary: this.generateExecutiveSummary(metrics),
                performance_analysis: this.generatePerformanceAnalysis(metrics),
                cache_analysis: this.generateCacheAnalysis(metrics),
                rate_limit_analysis: this.generateRateLimitAnalysis(metrics),
                infrastructure_analysis: this.generateInfrastructureAnalysis(metrics),
                recommendations: this.generateRecommendations(metrics),
                action_items: this.generateActionItems(metrics)
            },
            raw_metrics: metrics,
            metadata: {
                collector: 'MCP Performance Analytics',
                format_version: '1.0',
                retention_days: 30
            }
        };
        
        return report;
    }

    /**
     * Generate executive summary
     */
    generateExecutiveSummary(metrics) {
        const performance = metrics.performance.slowRequests?.summary || {};
        const cache = metrics.cache?.global || {};
        const redis = metrics.redis?.health || {};
        
        let status = 'good';
        let alerts = [];
        
        // Determine overall status
        if (performance.criticalRequests > 0) {
            status = 'critical';
            alerts.push(`${performance.criticalRequests} critical slow requests detected`);
        } else if (performance.slowRequestPercentage > 20) {
            status = 'warning';
            alerts.push(`${Math.round(performance.slowRequestPercentage)}% of requests are slow`);
        } else if (redis.status === 'unhealthy') {
            status = 'warning';
            alerts.push('Redis infrastructure issues detected');
        }
        
        return {
            status: status,
            alerts: alerts,
            key_metrics: {
                total_requests: performance.totalRequests || 0,
                average_response_time: Math.round(performance.averageResponseTime || 0),
                slow_request_percentage: Math.round(performance.slowRequestPercentage || 0),
                cache_hit_rate: Math.round((cache.hit_rate || 0) * 100),
                redis_status: redis.status || 'unknown'
            },
            health_score: this.calculateHealthScore(metrics)
        };
    }

    /**
     * Calculate overall health score (0-100)
     */
    calculateHealthScore(metrics) {
        const performance = metrics.performance.slowRequests?.summary || {};
        const cache = metrics.cache?.global || {};
        const redis = metrics.redis?.health || {};
        
        let score = 100;
        
        // Deduct points for performance issues
        if (performance.criticalRequests > 0) {
            score -= 30;
        }
        if (performance.slowRequestPercentage > 10) {
            score -= Math.min(20, performance.slowRequestPercentage);
        }
        if (performance.averageResponseTime > 1000) {
            score -= 15;
        }
        
        // Deduct points for cache issues
        if (cache.hit_rate < 0.5) {
            score -= 10;
        }
        
        // Deduct points for infrastructure issues
        if (redis.status !== 'healthy') {
            score -= 20;
        }
        
        return Math.max(0, Math.round(score));
    }

    /**
     * Generate performance analysis section
     */
    generatePerformanceAnalysis(metrics) {
        const performance = metrics.performance.slowRequests?.summary || {};
        const routes = metrics.performance.slowRequests?.routeMetrics || {};
        
        const analysis = {
            overview: {
                total_requests: performance.totalRequests || 0,
                slow_requests: performance.slowRequests || 0,
                average_response_time: performance.averageResponseTime || 0,
                p95_response_time: performance.p95ResponseTime || 0,
                p99_response_time: performance.p99ResponseTime || 0
            },
            trends: {
                requests_per_second: performance.requestsPerSecond || 0,
                uptime_minutes: Math.round(performance.uptime / 1000 / 60) || 0
            },
            problematic_routes: []
        };
        
        // Identify problematic routes
        for (const [route, metrics] of Object.entries(routes)) {
            if (metrics.slowCount > 0 || metrics.errorCount > 0) {
                analysis.problematic_routes.push({
                    route: route,
                    slow_requests: metrics.slowCount,
                    error_count: metrics.errorCount,
                    average_time: Math.round(metrics.averageTime),
                    max_time: Math.round(metrics.maxTime)
                });
            }
        }
        
        // Sort by most problematic
        analysis.problematic_routes.sort((a, b) => (b.slow_requests + b.error_count) - (a.slow_requests + a.error_count));
        
        return analysis;
    }

    /**
     * Generate cache analysis section
     */
    generateCacheAnalysis(metrics) {
        const cache = metrics.cache || {};
        const redis = cache.redis || {};
        
        return {
            type: redis.connected ? 'redis' : 'memory',
            status: redis.health?.status || 'unknown',
            performance: {
                hit_rate: Math.round((cache.global?.hit_rate || 0) * 100),
                total_hits: cache.global?.hits || 0,
                total_misses: cache.global?.misses || 0,
                average_response_time: cache.performance?.avgResponseTime || 0
            },
            configuration: redis.configuration || {},
            recommendations: this.generateCacheRecommendations(cache)
        };
    }

    /**
     * Generate cache-specific recommendations
     */
    generateCacheRecommendations(cache) {
        const recommendations = [];
        const hitRate = cache.global?.hit_rate || 0;
        
        if (hitRate < 0.5) {
            recommendations.push('Low cache hit rate detected. Consider adjusting TTL values or cache key strategies.');
        }
        
        if (cache.redis?.connected === false) {
            recommendations.push('Redis is not connected. Cache is falling back to memory, which limits scalability.');
        }
        
        if (cache.performance?.errors > 0) {
            recommendations.push('Cache errors detected. Check Redis connection stability and error logs.');
        }
        
        return recommendations;
    }

    /**
     * Generate rate limit analysis section
     */
    generateRateLimitAnalysis(metrics) {
        const rateLimiters = metrics.rateLimit || {};
        
        const analysis = {
            active_limiters: Object.keys(rateLimiters).length,
            total_requests: 0,
            limited_requests: 0,
            limiters: {}
        };
        
        for (const [name, limiter] of Object.entries(rateLimiters)) {
            if (limiter.totalRequests) {
                analysis.total_requests += limiter.totalRequests;
                analysis.limited_requests += limiter.limitedRequests || 0;
                
                analysis.limiters[name] = {
                    requests: limiter.totalRequests,
                    limited: limiter.limitedRequests || 0,
                    limit_rate: limiter.limitedRequests ? (limiter.limitedRequests / limiter.totalRequests * 100) : 0,
                    connected: limiter.connected || false
                };
            }
        }
        
        analysis.overall_limit_rate = analysis.total_requests > 0 ? 
            (analysis.limited_requests / analysis.total_requests * 100) : 0;
        
        return analysis;
    }

    /**
     * Generate infrastructure analysis section
     */
    generateInfrastructureAnalysis(metrics) {
        const redis = metrics.redis || {};
        
        return {
            redis: {
                status: redis.health?.status || 'unknown',
                connected: redis.connected || false,
                response_time: redis.health?.responseTime || 0,
                last_error: redis.health?.error || null
            },
            system: {
                memory_usage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                uptime_seconds: Math.round(process.uptime()),
                node_version: process.version,
                platform: process.platform
            }
        };
    }

    /**
     * Generate recommendations
     */
    generateRecommendations(metrics) {
        const recommendations = [];
        const performance = metrics.performance.slowRequests?.summary || {};
        const cache = metrics.cache || {};
        const redis = metrics.redis || {};
        
        // Performance recommendations
        if (performance.slowRequestPercentage > 15) {
            recommendations.push({
                category: 'Performance',
                priority: 'High',
                issue: `${Math.round(performance.slowRequestPercentage)}% of requests are slow`,
                action: 'Optimize slow endpoints, add caching, or increase infrastructure resources'
            });
        }
        
        if (performance.averageResponseTime > 1000) {
            recommendations.push({
                category: 'Performance',
                priority: 'Medium',
                issue: `Average response time is ${Math.round(performance.averageResponseTime)}ms`,
                action: 'Review database queries, API calls, and add appropriate caching'
            });
        }
        
        // Cache recommendations
        if (cache.global?.hit_rate < 0.6) {
            recommendations.push({
                category: 'Caching',
                priority: 'Medium',
                issue: `Cache hit rate is only ${Math.round((cache.global?.hit_rate || 0) * 100)}%`,
                action: 'Review cache key strategies and TTL values for better hit rates'
            });
        }
        
        // Infrastructure recommendations
        if (!redis.connected) {
            recommendations.push({
                category: 'Infrastructure',
                priority: 'High',
                issue: 'Redis is not connected',
                action: 'Ensure Redis is running and accessible, configure connection parameters'
            });
        }
        
        return recommendations;
    }

    /**
     * Generate action items
     */
    generateActionItems(metrics) {
        const actionItems = [];
        const performance = metrics.performance.slowRequests?.summary || {};
        
        if (performance.criticalRequests > 0) {
            actionItems.push({
                priority: 'Critical',
                item: `Investigate ${performance.criticalRequests} critical slow requests immediately`,
                owner: 'DevOps Team',
                due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
            });
        }
        
        if (performance.slowRequestPercentage > 20) {
            actionItems.push({
                priority: 'High',
                item: 'Performance degradation detected - review system resources and bottlenecks',
                owner: 'Development Team',
                due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days
            });
        }
        
        return actionItems;
    }

    /**
     * Save MCP analytics report
     */
    async saveMCPReport(report) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Save detailed report
        const reportPath = path.join(this.outputDir, `mcp-analytics-${timestamp}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // Save summary for dashboard
        const summaryPath = path.join(this.outputDir, 'mcp-analytics-latest.json');
        const summary = {
            timestamp: report.timestamp,
            status: report.sections.executive_summary.status,
            health_score: report.sections.executive_summary.health_score,
            key_metrics: report.sections.executive_summary.key_metrics,
            alerts: report.sections.executive_summary.alerts,
            recommendations_count: report.sections.recommendations.length,
            action_items_count: report.sections.action_items.length
        };
        fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
        
        console.log(`📊 MCP Analytics report saved to: ${reportPath}`);
        return reportPath;
    }

    /**
     * Run complete MCP analytics cycle
     */
    async runAnalytics() {
        console.log('🔍 Running MCP Performance Analytics...');
        
        try {
            await this.initialize();
            const report = await this.generateMCPReport();
            const reportPath = await this.saveMCPReport(report);
            
            console.log('✅ MCP Analytics completed successfully');
            console.log(`📈 Health Score: ${report.sections.executive_summary.health_score}/100`);
            console.log(`⚡ Status: ${report.sections.executive_summary.status}`);
            
            if (report.sections.executive_summary.alerts.length > 0) {
                console.log('🚨 Alerts:');
                for (const alert of report.sections.executive_summary.alerts) {
                    console.log(`  - ${alert}`);
                }
            }
            
            return report;
        } catch (error) {
            console.error('❌ MCP Analytics failed:', error);
            throw error;
        }
    }
}

module.exports = {
    MCPPerformanceAnalytics
};