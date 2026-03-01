export function downloadCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        return stringValue.includes(',') || stringValue.includes('"')
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportAnalyticsData(type: string, data: any) {
  switch (type) {
    case 'database':
      downloadCSV(data.table_sizes, 'database_metrics');
      break;
    case 'users':
      downloadCSV(data.inactive_users, 'inactive_users');
      break;
    case 'properties':
      const propertiesData = [
        { metric: 'Total Properties', value: data.total_properties },
        { metric: 'In Progress', value: data.by_status.in_progress },
        { metric: 'Completed', value: data.by_status.completed },
        { metric: 'Archived', value: data.by_status.archived },
      ];
      downloadCSV(propertiesData, 'properties_summary');
      break;
    case 'photos':
      const photosData = [
        { metric: 'Total Photos', value: data.total_photos },
        { metric: 'Pre Stage', value: data.by_stage.pre },
        { metric: 'During Stage', value: data.by_stage.during },
        { metric: 'Post Stage', value: data.by_stage.post },
      ];
      downloadCSV(photosData, 'photos_summary');
      break;
    case 'reports':
      downloadCSV(data.most_viewed, 'most_viewed_reports');
      break;
    case 'evidence':
      downloadCSV(data.by_template, 'evidence_templates');
      break;
    case 'measures':
      downloadCSV(data.usage_by_type, 'measure_types_usage');
      break;
    case 'audit':
      downloadCSV(data.recent_actions, 'recent_audit_actions');
      break;
    default:
      alert('Export type not supported');
  }
}
