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
  status: string;
  created_at: string;
  project_name?: string;
  user_name?: string;
  predicted_severity?: string | null;
  severity_confidence?: number | null;
}

interface Project {
  id: string;
  name: string;
}

export default function BugsPage({
  onNavigate,
}: {
  onNavigate: (page: string, id?: string) => void;
}) {
  const { user } = useAuth();

  const [bugs, setBugs] = useState<BugItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProject, setFilterProject] = useState('all');

  const [sortBy, setSortBy] = useState<'created_at' | 'severity'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user, filterSeverity, filterStatus, filterProject, sortBy, sortDir]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);

    // ✅ 1. Get user's projects via project_members
    const { data: memberData, error: memberError } = await supabase
      .from('project_members')
      .select('project_id, projects(id, name)')
      .eq('user_id', user.id);

    if (memberError) {
      console.error(memberError);
      setLoading(false);
      return;
    }

    const projectList: Project[] =
      (memberData || [])
        .map((m: any) => m.projects)
        .filter(Boolean) || [];

    setProjects(projectList);

    const projectIds = projectList.map(p => p.id);

    // ✅ 2. Get bugs
    let query = supabase
      .from('bugs')
      .select('*')
      .in('project_id', projectIds)
      .order(sortBy, { ascending: sortDir === 'asc' });

    if (filterSeverity !== 'all')
      query = query.eq('severity', filterSeverity);

    if (filterStatus !== 'all')
      query = query.eq('status', filterStatus);

    if (filterProject !== 'all')
      query = query.eq('project_id', filterProject);

    if (search.trim()) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    const { data: bugData, error: bugError } = await query;

    if (bugError) {
      console.error(bugError);
      setLoading(false);
      return;
    }

    // ✅ 3. Get users
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name');

    // ✅ 4. Enrich bugs
    const enriched: BugItem[] = (bugData || []).map((bug: any) => ({
      ...bug,
      project_name: projectList.find(p => p.id === bug.project_id)?.name,
      user_name: profilesData?.find(p => p.id === bug.created_by)?.full_name,
    }));

    setBugs(enriched);
    setLoading(false);
  };

  const toggleSort = (col: 'created_at' | 'severity') => {
    if (sortBy === col) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold text-white">Bug Tracker</h1>
        <button
          onClick={() => onNavigate('bug-create')}
          className="px-4 py-2 bg-teal-500 text-white rounded"
        >
          + Report Bug
        </button>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search bugs..."
        className="w-full px-3 py-2 bg-slate-800 text-white rounded"
      />

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-teal-400" />
        </div>
      ) : bugs.length === 0 ? (
        <div className="text-center text-slate-400">No bugs found</div>
      ) : (
        <div className="space-y-3">
          {bugs.map(bug => (
            <div
              key={bug.id}
              onClick={() => onNavigate('bug-detail', bug.id)}
              className="p-4 bg-slate-900 rounded cursor-pointer hover:bg-slate-800"
            >
              <div className="flex justify-between">
                <p className="text-white font-medium">{bug.title}</p>
                <span className="text-xs text-slate-400">
                  {bug.project_name || '--'}
                </span>
              </div>

              <p className="text-xs text-slate-500">
                by {bug.user_name || 'Unknown'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}