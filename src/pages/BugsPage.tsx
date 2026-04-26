import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import {
  Search,
  Filter,
  Plus,
  Bug,
  ChevronDown,
  ArrowUpDown,
  Loader2,
} from 'lucide-react';

interface BugItem {
  id: string;
  title: string;
  severity: string;
  priority: string;
  status: string;
  bug_type: string;
  predicted_severity: string | null;
  severity_confidence: number | null;
  created_at: string;
  projects: { name: string };
  profiles: { full_name: string };
  assignee: { full_name: string } | null;
}

interface Project {
  id: string;
  name: string;
}

export default function BugsPage({ onNavigate }: { onNavigate: (page: string, id?: string) => void }) {
  const { user } = useAuth();
  const [bugs, setBugs] = useState<BugItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'severity' | 'priority'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, filterSeverity, filterStatus, filterProject, sortBy, sortDir]);

  const loadData = async () => {
    setLoading(true);

    // Get user's projects
    const { data: memberData } = await supabase
      .from('project_members')
      .select('project_id, projects(id, name)')
      .eq('user_id', user!.id);

    const projectIds = memberData?.map(m => m.project_id) || [];
    const projectList = memberData?.map(m => m.projects).filter(Boolean) as unknown as Project[] || [];
    setProjects(projectList);

    if (projectIds.length === 0) {
      setBugs([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from('bugs')
      .select('id, title, severity, priority, status, bug_type, predicted_severity, severity_confidence, created_at, projects(name), profiles!bugs_reporter_id_fkey(full_name), assignee:profiles!bugs_assignee_id_fkey(full_name)')
      .in('project_id', projectIds)
      .order(sortBy, { ascending: sortDir === 'asc' });

    if (filterSeverity !== 'all') query = query.eq('severity', filterSeverity);
    if (filterStatus !== 'all') query = query.eq('status', filterStatus);
    if (filterProject !== 'all') query = query.eq('project_id', filterProject);

    if (search.trim()) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data } = await query;
    setBugs((data || []) as unknown as BugItem[]);
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
      case 'wont_fix': return 'text-slate-400 bg-slate-500/10';
      default: return 'text-slate-400 bg-slate-500/10';
    }
  };

  const toggleSort = (col: 'created_at' | 'severity' | 'priority') => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Bug Tracker</h1>
          <p className="text-slate-400 text-sm mt-1">Manage and track all reported bugs</p>
        </div>
        <button
          onClick={() => onNavigate('bug-create')}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm font-semibold rounded-xl hover:from-teal-400 hover:to-cyan-400 transition-all shadow-lg shadow-teal-500/20"
        >
          <Plus className="w-4 h-4" />
          Report Bug
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bugs..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
              showFilters ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Severity</label>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="trivial">Trivial</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="reopened">Reopened</option>
                <option value="wont_fix">Won't Fix</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Project</label>
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              >
                <option value="all">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Bug list */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-800/50 text-xs text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-800">
          <div className="col-span-5 flex items-center gap-1 cursor-pointer hover:text-white" onClick={() => toggleSort('created_at')}>
            Bug <ArrowUpDown className="w-3 h-3" />
          </div>
          <div className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-white" onClick={() => toggleSort('severity')}>
            Severity <ArrowUpDown className="w-3 h-3" />
          </div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Project</div>
          <div className="col-span-1">AI</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
          </div>
        ) : bugs.length === 0 ? (
          <div className="py-16 text-center">
            <Bug className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No bugs found</p>
            <p className="text-slate-600 text-xs mt-1">Report a bug to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {bugs.map(bug => (
              <div
                key={bug.id}
                onClick={() => onNavigate('bug-detail', bug.id)}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <div className="md:col-span-5">
                  <p className="text-sm font-medium text-white">{bug.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    by {(bug.profiles as unknown as { full_name: string })?.full_name || 'Unknown'} &middot; {new Date(bug.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${severityColor(bug.severity)}`}>
                    {bug.severity}
                  </span>
                </div>
                <div className="md:col-span-2">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(bug.status)}`}>
                    {bug.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-slate-400 truncate">{(bug.projects as unknown as { name: string })?.name || '--'}</p>
                </div>
                <div className="md:col-span-1">
                  {bug.predicted_severity ? (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      bug.predicted_severity === bug.severity ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'
                    }`}>
                      {Math.round((bug.severity_confidence || 0) * 100)}%
                    </span>
                  ) : (
                    <span className="text-xs text-slate-600">--</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
