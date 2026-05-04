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

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function DashboardPage() {
  
  const { user } = useAuth();

  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    trivial: 0,
  });

  const [recentBugs, setRecentBugs] = useState<any[]>([]);
  const [projectCount, setProjectCount] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [diffCount, setDiffCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
    setLoading(true);

    try {
      // ✅ 1. GET PROJECTS (simple + reliable)
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('created_by', user!.id);

      const projectIds = projects?.map(p => p.id) || [];
      setProjectCount(projectIds.length);

      // ❗ If no projects → stop
      if (projectIds.length === 0) {
        setLoading(false);
        return;
      }

      // ✅ 2. GET BUGS
      const { data: bugs } = await supabase
        .from('bugs')
        .select('*')
        .in('project_id', projectIds);

      const bugList = bugs || [];

      // ✅ 3. STATS
      const newStats = {
        total: bugList.length,
        open: bugList.filter(b => b.status === 'open').length,
        inProgress: bugList.filter(b => b.status === 'in_progress').length,
        resolved: bugList.filter(b => b.status === 'resolved' || b.status === 'closed').length,
        critical: bugList.filter(b => b.severity === 'critical').length,
        high: bugList.filter(b => b.severity === 'high').length,
        medium: bugList.filter(b => b.severity === 'medium').length,
        low: bugList.filter(b => b.severity === 'low').length,
        trivial: bugList.filter(b => b.severity === 'trivial').length,
      };

      setStats(newStats);

      // ✅ 4. RECENT BUGS
      const { data: recent } = await supabase
        .from('bugs')
        .select('id, title, severity, status, created_at, project_id')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentBugs(recent || []);

      // ✅ 5. AI PREDICTIONS (FIXED)
      // ✅ Only bugs with prediction
const validBugs = bugList.filter(b => b.predicted_severity);

// ✅ Matches
const matches = validBugs.filter(
  b => b.predicted_severity === b.severity
).length;

// ✅ Mismatches
const differs = validBugs.filter(
  b => b.predicted_severity !== b.severity
).length;

setMatchCount(matches);
setDiffCount(differs);

    } catch (err) {
      console.error("Dashboard Error:", err);
    }

    setLoading(false);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const accuracy =
  
    matchCount + diffCount > 0
      ? Math.round((matchCount / (matchCount + diffCount)) * 100)
      : 0;
    // 📊 Severity chart data
  const chartData = [
    { name: 'Critical', value: stats.critical },
    { name: 'High', value: stats.high },
    { name: 'Medium', value: stats.medium },
    { name: 'Low', value: stats.low },
    { name: 'Trivial', value: stats.trivial },
  ];

// 🧠 AI Pie data
  const pieData =
  matchCount + diffCount > 0
    ? [
        { name: 'Match', value: matchCount },
        { name: 'Mismatch', value: diffCount },
      ]
    : [{ name: 'No Data', value: 1 }];

const COLORS =
  matchCount + diffCount > 0
    ? ['#22c55e', '#f97316']
    : ['#64748b'];
  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm">Overview of your bug tracking</p>
        </div>
        <div className="text-slate-400 text-sm">
          {projectCount} projects
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="Total Bugs" value={stats.total} icon={Bug} />
        <Card label="Open" value={stats.open} icon={AlertTriangle} />
        <Card label="In Progress" value={stats.inProgress} icon={Clock} />
        <Card label="Resolved" value={stats.resolved} icon={CheckCircle2} />
      </div>

      {/* AI */}
      <div className="grid lg:grid-cols-2 gap-6">

  {/* 📊 Severity Distribution */}
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
    <h3 className="text-white mb-4">Severity Distribution</h3>

    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData}>
  <defs>
    <linearGradient id="colorSeverity" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.9}/>
      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.2}/>
    </linearGradient>
  </defs>

  <XAxis dataKey="name" stroke="#94a3b8" />
  <YAxis stroke="#94a3b8" />
  

  <Bar
    dataKey="value"
    fill="url(#colorSeverity)"
    radius={[6, 6, 0, 0]}
    animationDuration={800}
  />
</BarChart>
    </ResponsiveContainer>
  </div>

  {/* 🤖 AI Accuracy */}
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
    <Zap className="mx-auto mb-3 text-teal-400" />

    <h3 className="text-white mb-3">AI Accuracy</h3>

    <div className="text-2xl text-teal-400 font-bold mb-2">
      {matchCount + diffCount > 0 ? `${accuracy}%` : '--'}
    </div>

    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
  <defs>
    <linearGradient id="matchGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#22c55e" />
      <stop offset="100%" stopColor="#16a34a" />
    </linearGradient>

    <linearGradient id="diffGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#f97316" />
      <stop offset="100%" stopColor="#ea580c" />
    </linearGradient>
  </defs>

  <Pie
    data={pieData}
    dataKey="value"
    outerRadius={80}
    innerRadius={50} // 🔥 donut style
    paddingAngle={3}
    animationDuration={1000}
    label
  >
    {pieData.map((entry, index) => (
      <Cell
        key={index}
        fill={index === 0 ? 'url(#matchGradient)' : 'url(#diffGradient)'}
      />
    ))}
  </Pie>

</PieChart>
    </ResponsiveContainer>

    <div className="flex justify-between mt-3 text-sm">
      <span className="text-green-400">Match: {matchCount}</span>
      <span className="text-orange-400">Diff: {diffCount}</span>
    </div>
  </div>

</div>

      {/* Recent Bugs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between">
          <h3 className="text-white">Recent Bugs</h3>
        </div>

        {recentBugs.length === 0 ? (
          <p className="text-center text-slate-500 py-10">No bugs yet</p>
        ) : (
          recentBugs.map(bug => (
            <div key={bug.id} className="px-6 py-3 border-b border-slate-800">
              <p className="text-white">{bug.title}</p>
              <p className="text-xs text-slate-500">
                {formatDate(bug.created_at)}
              </p>
            </div>
          ))
        )}
      </div>

    </div>
  );
}

// Small reusable card
function Card({ label, value, icon: Icon }: any) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex justify-between mb-2">
        <span className="text-slate-400 text-sm">{label}</span>
        <Icon className="w-4 h-4 text-teal-400" />
      </div>
      <p className="text-2xl text-white font-bold">{value}</p>
    </div>
  );
}