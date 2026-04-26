import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import {
  Bug,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowUpRight,
  Shield,
  Zap,
} from 'lucide-react';

interface BugStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  trivial: number;
}

interface RecentBug {
  id: string;
  title: string;
  severity: string;
  status: string;
  created_at: string;
  projects: { name: string };
}

interface SeverityDistribution {
  predicted: string;
  actual: string;
  count: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<BugStats>({ total: 0, open: 0, inProgress: 0, resolved: 0, critical: 0, high: 0, medium: 0, low: 0, trivial: 0 });
  const [recentBugs, setRecentBugs] = useState<RecentBug[]>([]);
  const [severityData, setSeverityData] = useState<SeverityDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectCount, setProjectCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
    setLoading(true);

    const [bugsRes, recentRes, projectsRes] = await Promise.all([
      supabase
        .from('bugs')
        .select('severity, status')
        .in('project_id', (
          await supabase
            .from('project_members')
            .select('project_id')
            .eq('user_id', user!.id)
        ).data?.map(p => p.project_id) || []),
      supabase
        .from('bugs')
        .select('id, title, severity, status, created_at, projects:projects(name)')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user!.id),
    ]);

    const bugs = bugsRes.data || [];
    const bugStats: BugStats = {
      total: bugs.length,
      open: bugs.filter(b => b.status === 'open').length,
      inProgress: bugs.filter(b => b.status === 'in_progress').length,
      resolved: bugs.filter(b => b.status === 'resolved' || b.status === 'closed').length,
      critical: bugs.filter(b => b.severity === 'critical').length,
      high: bugs.filter(b => b.severity === 'high').length,
      medium: bugs.filter(b => b.severity === 'medium').length,
      low: bugs.filter(b => b.severity === 'low').length,
      trivial: bugs.filter(b => b.severity === 'trivial').length,
    };
    setStats(bugStats);
    setRecentBugs((recentRes.data || []) as unknown as RecentBug[]);
    setProjectCount(new Set(projectsRes.data?.map(p => p.project_id)).size);

    // Load severity predictions
    const predRes = await supabase
      .from('severity_predictions')
      .select('predicted_severity, bugs!inner(severity)')
      .limit(50);
    if (predRes.data) {
      const dist: SeverityDistribution[] = predRes.data.map(p => ({
        predicted: p.predicted_severity,
        actual: (p.bugs as unknown as { severity: string }).severity,
        count: 1,
      }));
      setSeverityData(dist);
    }

    setLoading(false);
  };

  const severityColor = (s: string) => {
    switch (s) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'low': return 'text-teal-400 bg-teal-500/10 border-teal-500/20';
      case 'trivial': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'open': return 'text-blue-400 bg-blue-500/10';
      case 'in_progress': return 'text-yellow-400 bg-yellow-500/10';
      case 'resolved': case 'closed': return 'text-green-400 bg-green-500/10';
      case 'reopened': return 'text-orange-400 bg-orange-500/10';
      default: return 'text-slate-400 bg-slate-500/10';
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Overview of your bug tracking activity</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Shield className="w-4 h-4 text-teal-400" />
          <span>{projectCount} project{projectCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Bugs', value: stats.total, icon: Bug, color: 'from-teal-500 to-cyan-500', shadow: 'shadow-teal-500/20' },
          { label: 'Open', value: stats.open, icon: AlertTriangle, color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20' },
          { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'from-yellow-500 to-orange-500', shadow: 'shadow-yellow-500/20' },
          { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: 'from-green-500 to-emerald-500', shadow: 'shadow-green-500/20' },
        ].map(({ label, value, icon: Icon, color, shadow }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{label}</span>
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shadow-lg ${shadow}`}>
                <Icon className="w-4.5 h-4.5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Severity distribution */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-white">Severity Distribution</h3>
            <TrendingUp className="w-4 h-4 text-slate-500" />
          </div>
          <div className="space-y-3">
            {['critical', 'high', 'medium', 'low', 'trivial'].map(sev => {
              const count = stats[sev as keyof BugStats] as number;
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={sev}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-semibold uppercase tracking-wider ${severityColor(sev).split(' ')[0]}`}>
                      {sev}
                    </span>
                    <span className="text-xs text-slate-500">{count} ({Math.round(pct)}%)</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        sev === 'critical' ? 'bg-red-500' :
                        sev === 'high' ? 'bg-orange-500' :
                        sev === 'medium' ? 'bg-yellow-500' :
                        sev === 'low' ? 'bg-teal-500' : 'bg-slate-500'
                      }`}
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Prediction accuracy */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-4 h-4 text-teal-400" />
            <h3 className="text-base font-semibold text-white">AI Prediction</h3>
          </div>
          <div className="text-center py-6">
            <div className="w-24 h-24 mx-auto rounded-full border-4 border-teal-500/20 flex items-center justify-center mb-4">
              <div>
                <p className="text-2xl font-bold text-teal-400">
                  {severityData.length > 0
                    ? Math.round((severityData.filter(d => d.predicted === d.actual).length / severityData.length) * 100)
                    : '--'}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Accuracy</p>
              </div>
            </div>
            <p className="text-sm text-slate-400">
              {severityData.length > 0
                ? `Based on ${severityData.length} predictions`
                : 'No predictions yet'}
            </p>
          </div>
          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Predictions match</span>
              <span className="text-teal-400">{severityData.filter(d => d.predicted === d.actual).length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Predictions differ</span>
              <span className="text-orange-400">{severityData.filter(d => d.predicted !== d.actual).length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent bugs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-base font-semibold text-white">Recent Bugs</h3>
          <button className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors">
            View all <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
        {recentBugs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Bug className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No bugs reported yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {recentBugs.map(bug => (
              <div key={bug.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-slate-800/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{bug.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {(bug.projects as unknown as { name: string })?.name || 'Unknown project'} &middot; {formatDate(bug.created_at)}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${severityColor(bug.severity)}`}>
                  {bug.severity}
                </span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(bug.status)}`}>
                  {bug.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
