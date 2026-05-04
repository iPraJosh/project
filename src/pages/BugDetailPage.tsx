import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function BugDetailPage({
  bugId,
  onNavigate,
}: {
  bugId: string;
  onNavigate: (page: string) => void;
}) {
  const [bug, setBug] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bugId) {
      loadBug();
    }
  }, [bugId]);

  const loadBug = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('bugs')
      .select('*')
      .eq('id', bugId)
      .single();

    console.log("BUG FROM DB:", data);

    if (error || !data) {
      console.error("BUG ERROR:", error);
      setBug(null);
      setLoading(false);
      return;
    }

    // ✅ Fetch related data manually
    const [{ data: projects }, { data: profiles }] = await Promise.all([
      supabase.from('projects').select('id, name'),
      supabase.from('profiles').select('id, full_name'),
    ]);

    const enriched = {
      ...data,
      project_name: projects?.find(p => p.id === data.project_id)?.name,
      user_name: profiles?.find(p => p.id === data.created_by)?.full_name,
    };

    console.log("ENRICHED BUG:", enriched);

    setBug(enriched);
    setLoading(false);
  };

  // 🔄 Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
      </div>
    );
  }

  // ❌ No bug found
  if (!bug) {
    return (
      <div className="text-white p-6">
        Bug not found
      </div>
    );
  }

  // ✅ Main UI
  return (
    <div className="max-w-3xl mx-auto space-y-6 text-white">

      {/* Back button */}
      <button
        onClick={() => onNavigate('bugs')}
        className="flex items-center gap-2 text-slate-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Bugs
      </button>

      {/* Bug title */}
      <div>
        <h1 className="text-2xl font-bold">{bug.title}</h1>
        <p className="text-slate-400 mt-1">
          by {bug.user_name || 'Unknown'} • {new Date(bug.created_at).toLocaleString()}
        </p>
        <p className="text-xs text-slate-500">
          Project: {bug.project_name || '--'}
        </p>
      </div>

      {/* Bug details */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">

        <div>
          <p className="text-sm text-slate-400">Description</p>
          <p className="text-white mt-1">
            {bug.description || 'No description provided'}
          </p>
        </div>

        <div className="flex gap-4 text-sm">
          <span className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs">
            {bug.severity}
          </span>
          <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs">
            {bug.status}
          </span>
        </div>

        {/* Status Update */}
        <select
          value={bug.status}
          onChange={async (e) => {
            const newStatus = e.target.value;

            await supabase
              .from('bugs')
              .update({ status: newStatus })
              .eq('id', bugId);

            loadBug(); // refresh UI
          }}
          className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm"
        >
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

      </div>

    </div>
  );
}