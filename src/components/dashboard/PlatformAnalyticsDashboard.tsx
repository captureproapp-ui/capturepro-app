import { useEffect, useState } from 'react';
import {
  Building2, Users, TrendingUp, DollarSign,
  HardDrive, RefreshCw, Activity, AlertCircle, Download,
  Database, Home, Image, FileText, Shield, Ruler, CheckSquare
} from 'lucide-react';
import {
  getPlatformMetrics,
  getAllOrganisations,
  getGrowthMetrics,
  getRevenueMetrics,
  getStorageMetrics,
  refreshAnalyticsSummary,
  getDatabaseMetrics,
  getUserAnalytics,
  getPropertiesAnalytics,
  getPhotoAnalytics,
  getReportAnalytics,
  getEvidenceAnalytics,
  getMeasureTypeAnalytics,
  getAuditLogSummary,
  type PlatformMetrics,
  type OrganisationStats,
  type GrowthMetrics,
  type RevenueMetrics,
  type StorageMetrics,
  type DatabaseMetrics,
  type UserAnalytics,
  type PropertiesAnalytics,
  type PhotoAnalytics,
  type ReportAnalytics,
  type EvidenceAnalytics,
  type MeasureTypeAnalytics,
  type AuditLogSummary,
} from '../../services/platformAnalyticsService';
import OrganizationsTable from './OrganizationsTable';
import DatabaseMetricsSection from './analytics/DatabaseMetricsSection';
import UserAnalyticsSection from './analytics/UserAnalyticsSection';
import PropertiesAnalyticsSection from './analytics/PropertiesAnalyticsSection';
import PhotoAnalyticsSection from './analytics/PhotoAnalyticsSection';
import ReportsAnalyticsSection from './analytics/ReportsAnalyticsSection';
import StorageAnalyticsSection from './analytics/StorageAnalyticsSection';
import EvidenceAnalyticsSection from './analytics/EvidenceAnalyticsSection';
import MeasureTypesSection from './analytics/MeasureTypesSection';
import AuditLogsSection from './analytics/AuditLogsSection';
import DateRangeFilter from './analytics/DateRangeFilter';
import { exportAnalyticsData } from '../../utils/exportUtils';

type TabType = 'overview' | 'database' | 'users' | 'organizations' | 'properties' |
  'photos' | 'reports' | 'storage' | 'evidence' | 'measures' | 'audit';

export default function PlatformAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dateRange, setDateRange] = useState('30');
  const [error, setError] = useState<string | null>(null);

  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics | null>(null);
  const [organisations, setOrganisations] = useState<OrganisationStats[]>([]);
  const [growthMetrics, setGrowthMetrics] = useState<GrowthMetrics[]>([]);
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [storageMetrics, setStorageMetrics] = useState<StorageMetrics | null>(null);
  const [databaseMetrics, setDatabaseMetrics] = useState<DatabaseMetrics | null>(null);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
  const [propertiesAnalytics, setPropertiesAnalytics] = useState<PropertiesAnalytics | null>(null);
  const [photoAnalytics, setPhotoAnalytics] = useState<PhotoAnalytics | null>(null);
  const [reportAnalytics, setReportAnalytics] = useState<ReportAnalytics | null>(null);
  const [evidenceAnalytics, setEvidenceAnalytics] = useState<EvidenceAnalytics | null>(null);
  const [measureTypeAnalytics, setMeasureTypeAnalytics] = useState<MeasureTypeAnalytics | null>(null);
  const [auditLogSummary, setAuditLogSummary] = useState<AuditLogSummary | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);

    const TIMEOUT_MS = 30000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout - analytics took too long to load')), TIMEOUT_MS)
    );

    try {
      const dataPromise = Promise.allSettled([
        getPlatformMetrics(),
        getAllOrganisations(),
        getGrowthMetrics(parseInt(dateRange)),
        getRevenueMetrics(),
        getStorageMetrics(),
        getDatabaseMetrics(),
        getUserAnalytics(),
        getPropertiesAnalytics(),
        getPhotoAnalytics(),
        getReportAnalytics(),
        getEvidenceAnalytics(),
        getMeasureTypeAnalytics(),
        getAuditLogSummary(),
      ]);

      const results = await Promise.race([dataPromise, timeoutPromise]) as PromiseSettledResult<any>[];

      const [
        metrics, orgs, growth, revenue, storage,
        database, users, properties, photos, reports,
        evidence, measures, audit
      ] = results;

      if (metrics.status === 'fulfilled') setPlatformMetrics(metrics.value);
      if (orgs.status === 'fulfilled') setOrganisations(orgs.value);
      if (growth.status === 'fulfilled') setGrowthMetrics(growth.value);
      if (revenue.status === 'fulfilled') setRevenueMetrics(revenue.value);
      if (storage.status === 'fulfilled') setStorageMetrics(storage.value);
      if (database.status === 'fulfilled') setDatabaseMetrics(database.value);
      if (users.status === 'fulfilled') setUserAnalytics(users.value);
      if (properties.status === 'fulfilled') setPropertiesAnalytics(properties.value);
      if (photos.status === 'fulfilled') setPhotoAnalytics(photos.value);
      if (reports.status === 'fulfilled') setReportAnalytics(reports.value);
      if (evidence.status === 'fulfilled') setEvidenceAnalytics(evidence.value);
      if (measures.status === 'fulfilled') setMeasureTypeAnalytics(measures.value);
      if (audit.status === 'fulfilled') setAuditLogSummary(audit.value);

      const failedCount = results.filter(r => r.status === 'rejected').length;
      if (failedCount > 0) {
        console.warn(`${failedCount} analytics queries failed`);
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`Query ${index} failed:`, result.reason);
          }
        });
      }
    } catch (error) {
      console.error('Error loading platform analytics:', error);
      setError(error instanceof Error ? error.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAnalyticsSummary();
      await loadAllData();
    } catch (error) {
      console.error('Error refreshing analytics:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(cents / 100);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading platform analytics...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Analytics</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadAllData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: Activity },
    { id: 'database' as TabType, label: 'Database', icon: Database },
    { id: 'users' as TabType, label: 'Users', icon: Users },
    { id: 'organizations' as TabType, label: 'Organizations', icon: Building2 },
    { id: 'properties' as TabType, label: 'Properties', icon: Home },
    { id: 'photos' as TabType, label: 'Photos', icon: Image },
    { id: 'reports' as TabType, label: 'Reports', icon: FileText },
    { id: 'storage' as TabType, label: 'Storage', icon: HardDrive },
    { id: 'evidence' as TabType, label: 'Evidence', icon: CheckSquare },
    { id: 'measures' as TabType, label: 'Measures', icon: Ruler },
    { id: 'audit' as TabType, label: 'Audit Logs', icon: Shield },
  ];

  const handleExport = () => {
    switch (activeTab) {
      case 'database':
        exportAnalyticsData('database', databaseMetrics);
        break;
      case 'users':
        exportAnalyticsData('users', userAnalytics);
        break;
      case 'properties':
        exportAnalyticsData('properties', propertiesAnalytics);
        break;
      case 'photos':
        exportAnalyticsData('photos', photoAnalytics);
        break;
      case 'reports':
        exportAnalyticsData('reports', reportAnalytics);
        break;
      case 'evidence':
        exportAnalyticsData('evidence', evidenceAnalytics);
        break;
      case 'measures':
        exportAnalyticsData('measures', measureTypeAnalytics);
        break;
      case 'audit':
        exportAnalyticsData('audit', auditLogSummary);
        break;
      default:
        alert('Export not available for this section');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Super Admin Analytics</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">
              Comprehensive platform insights and metrics
            </p>
          </div>
          <div className="flex gap-3">
            {activeTab !== 'overview' && activeTab !== 'organizations' && (
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm md:text-base"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm md:text-base"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Refresh</span>
            </button>
          </div>
        </div>

        <DateRangeFilter selectedRange={dateRange} onRangeChange={setDateRange} />

        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-x-auto">
          <div className="flex border-b border-gray-200 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 font-medium transition-colors whitespace-nowrap text-sm md:text-base ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <MetricCard
                  icon={Building2}
                  label="Total Organisations"
                  value={platformMetrics?.total_organisations || 0}
                  iconColor="text-blue-600"
                  bgColor="bg-blue-50"
                />
                <MetricCard
                  icon={Users}
                  label="Total Users"
                  value={platformMetrics?.total_users || 0}
                  iconColor="text-green-600"
                  bgColor="bg-green-50"
                />
                <MetricCard
                  icon={Activity}
                  label="Active Subscriptions"
                  value={platformMetrics?.active_subscriptions || 0}
                  iconColor="text-teal-600"
                  bgColor="bg-teal-50"
                />
                <MetricCard
                  icon={AlertCircle}
                  label="Suspended Orgs"
                  value={platformMetrics?.suspended_organisations || 0}
                  iconColor="text-red-600"
                  bgColor="bg-red-50"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border border-gray-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-emerald-50 rounded-lg">
                      <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-gray-600">Monthly Recurring Revenue</p>
                      <p className="text-xl md:text-2xl font-bold text-gray-900">
                        {formatCurrency(revenueMetrics?.current_mrr_cents || 0)}
                      </p>
                    </div>
                  </div>
                  {revenueMetrics && revenueMetrics.mrr_growth_rate !== 0 && (
                    <div className={`flex items-center gap-1 text-xs md:text-sm ${
                      revenueMetrics.mrr_growth_rate > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <TrendingUp className="w-4 h-4" />
                      <span>{revenueMetrics.mrr_growth_rate.toFixed(1)}% from last month</span>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border border-gray-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-gray-600">Avg Revenue Per Org</p>
                      <p className="text-xl md:text-2xl font-bold text-gray-900">
                        {formatCurrency(revenueMetrics?.average_revenue_per_org_cents || 0)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs md:text-sm text-gray-600">
                    {revenueMetrics?.paying_organisations || 0} paying organisations
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border border-gray-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <HardDrive className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-gray-600">Total Storage Used</p>
                      <p className="text-xl md:text-2xl font-bold text-gray-900">
                        {formatBytes(storageMetrics?.total_storage_bytes || 0)}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs md:text-sm text-gray-600">
                    <p>Photos: {formatBytes(storageMetrics?.photos_storage_bytes || 0)}</p>
                    <p>PDFs: {formatBytes(storageMetrics?.pdfs_storage_bytes || 0)}</p>
                  </div>
                </div>
              </div>

              {growthMetrics.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border border-gray-200">
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
                    Growth Trend (Last {dateRange} Days)
                  </h2>
                  <div className="h-48 md:h-64 flex items-end gap-1">
                    {growthMetrics.slice(-parseInt(dateRange)).map((metric, index) => {
                      const maxValue = Math.max(...growthMetrics.map(m => m.new_organisations));
                      const height = maxValue > 0 ? (metric.new_organisations / maxValue) * 100 : 0;

                      return (
                        <div
                          key={index}
                          className="flex-1 bg-blue-200 hover:bg-blue-300 transition-colors rounded-t"
                          style={{ height: `${height}%`, minHeight: metric.new_organisations > 0 ? '4px' : '0' }}
                          title={`${metric.date}: ${metric.new_organisations} new orgs`}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-4 text-xs md:text-sm text-gray-600">
                    <p>Total new organisations: {growthMetrics[growthMetrics.length - 1]?.cumulative_organisations || 0}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'database' && (
            <DatabaseMetricsSection metrics={databaseMetrics} formatBytes={formatBytes} />
          )}

          {activeTab === 'users' && (
            <UserAnalyticsSection analytics={userAnalytics} />
          )}

          {activeTab === 'organizations' && (
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">All Organisations</h2>
                <p className="text-sm md:text-base text-gray-600 mt-1">
                  Manage and monitor all platform organisations
                </p>
              </div>
              <OrganizationsTable organisations={organisations} onUpdate={loadAllData} />
            </div>
          )}

          {activeTab === 'properties' && (
            <PropertiesAnalyticsSection analytics={propertiesAnalytics} />
          )}

          {activeTab === 'photos' && (
            <PhotoAnalyticsSection analytics={photoAnalytics} formatBytes={formatBytes} />
          )}

          {activeTab === 'reports' && (
            <ReportsAnalyticsSection analytics={reportAnalytics} formatBytes={formatBytes} />
          )}

          {activeTab === 'storage' && (
            <StorageAnalyticsSection metrics={storageMetrics} formatBytes={formatBytes} />
          )}

          {activeTab === 'evidence' && (
            <EvidenceAnalyticsSection analytics={evidenceAnalytics} />
          )}

          {activeTab === 'measures' && (
            <MeasureTypesSection analytics={measureTypeAnalytics} formatCurrency={formatCurrency} />
          )}

          {activeTab === 'audit' && (
            <AuditLogsSection summary={auditLogSummary} />
          )}
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  iconColor: string;
  bgColor: string;
}

function MetricCard({ icon: Icon, label, value, iconColor, bgColor }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center gap-3">
        <div className={`p-3 ${bgColor} rounded-lg`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
