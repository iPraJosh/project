import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import {
  ArrowLeft,
  Clock,
  User,
  Tag,
  Zap,
  Send,
  Loader2,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface BugData {
  id: string;
  title: string;
  description: string;
  severity: string;
  priority: string;
  status: string;
  bug_type: string;
  environment: string;
  steps_to_reproduce: string;
  predicted_severity: string | null;
  severity_confidence: number | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  projects: { id: string; name: string };
  reporter: { full_name: string };
  assignee: { full_name: string } | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author: { full_name: string };
}

export default function BugDetailPage({ bugId, onNavigate }: { bugId: string; onNavigate: (page: string) => void }) {
  const { user } = useAuth();
  const [bug, setBug] = useState<BugData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    loadBug();
  }, [bugId]);

  const loadBug = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bugs')
      .select('id, title, description, severity, priority, status, bug_type, environment, steps_to_reproduce, predicted_severity, severity_confidence, created_at, updated_at, resolved_at, projects(id, name), reporter:profiles!bugs_reporter_id_fkey(full_name), assignee:profiles!bugs_assignee_id_fkey(full_name)')
      .eq('id', bugId)
      .maybeSingle();

    if (data) setBug(data as unknown as BugData);

    const { data: commentData } = await supabase
      .from('bug_comments')
      .select('id, content, created_at, author:profiles!bug_comments_author_id_fkey(full_name)')
      .eq('bug_id', bugId)
      .order('created_at', { ascending: true });

    setComments((commentData || []) as unknown as Comment[]);
    setLoading(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    setSubmitting(true);

    await supabase.from('bug_comments').insert({
      bug_id: bugId,
      author_id: user.id,
      content: newComment.trim(),
    });

    setNewComment('');
    await loadBug();
    setSubmitting(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true);
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'resolved' || newStatus === 'closed') updates.resolved_at = new Date().toISOString();
    else updates.resolved_at = null;

    await supabase.from('bugs').update(updates).eq('id', bugId);
    await loadBug();
    setUpdatingStatus(false);
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
      case 'open': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'in_progress': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'resolved': case 'closed': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'reopened': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'wont_fix': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
      </div>
    );
  }

  if (!bug) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-10 h-10 text-slate-700 mx-auto mb-3" />
        <p className="text-slate-500">Bug not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => onNavigate('bugs')} className="text-slate-400 hover:text-white transition-colors mt-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${severityColor(bug.severity)}`}>
              {bug.severity}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusColor(bug.status)}`}>
              {bug.status.replace('_', ' ')}
            </span>
            {bug.predicted_severity && (
              <span className="text-xs text-teal-400 flex items-center gap-1 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                <Sparkles className="w-3 h-3" />
                AI: {bug.predicted_severity} ({Math.round((bug.severity_confidence || 0) * 100)}%)
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-white">{bug.title}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {(bug.reporter as unknown as { full_name: string })?.full_name || 'Unknown'}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(bug.created_at)}</span>
            <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {(bug.projects as unknown as { name: string })?.name}</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-3">Description</h3>
            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
              {bug.description || 'No description provided.'}
            </p>
          </div>

          {/* Steps to reproduce */}
          {bug.steps_to_reproduce && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white mb-3">Steps to Reproduce</h3>
              <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-mono bg-slate-800/50 p-4 rounded-lg">
                {bug.steps_to_reproduce}
              </p>
            </div>
          )}

          {/* Comments */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-white">Comments ({comments.length})</h3>
            </div>

            <div className="divide-y divide-slate-800">
              {comments.map(comment => (
                <div key={comment.id} className="px-6 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white text-[10px] font-bold">
                      {(comment.author as unknown as { full_name: string })?.full_name?.[0] || '?'}
                    </div>
                    <span className="text-sm font-medium text-white">{(comment.author as unknown as { full_name: string })?.full_name || 'Unknown'}</span>
                    <span className="text-xs text-slate-600">{formatDate(comment.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-300 pl-8 whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddComment} className="px-6 py-4 border-t border-slate-800">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
                />
                <button
                  type="submit"
                  disabled={submitting || !newComment.trim()}
                  className="px-4 py-2.5 bg-teal-500/10 text-teal-400 rounded-xl border border-teal-500/20 hover:bg-teal-500/20 transition-all disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status update */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Update Status</h3>
            <div className="space-y-1.5">
              {['open', 'in_progress', 'resolved', 'closed', 'reopened', 'wont_fix'].map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={updatingStatus}
                  className={`w-full text-left text-xs font-medium px-3 py-2 rounded-lg transition-all ${
                    bug.status === s
                      ? `${statusColor(s)} border`
                      : 'text-slate-500 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Details</h3>

            {[
              { label: 'Priority', value: bug.priority },
              { label: 'Type', value: bug.bug_type.replace('_', '/') },
              { label: 'Environment', value: bug.environment || '--' },
              { label: 'Assignee', value: bug.assignee ? (bug.assignee as unknown as { full_name: string })?.full_name : 'Unassigned' },
              { label: 'Created', value: formatDate(bug.created_at) },
              { label: 'Updated', value: formatDate(bug.updated_at) },
              ...(bug.resolved_at ? [{ label: 'Resolved', value: formatDate(bug.resolved_at) }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-start">
                <span className="text-xs text-slate-500">{label}</span>
                <span className="text-xs text-slate-300 text-right max-w-[60%]">{value}</span>
              </div>
            ))}
          </div>

          {/* AI Prediction card */}
          {bug.predicted_severity && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-semibold text-white">AI Prediction</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Predicted</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${severityColor(bug.predicted_severity)}`}>
                    {bug.predicted_severity}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Actual</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${severityColor(bug.severity)}`}>
                    {bug.severity}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Confidence</span>
                  <span className="text-xs text-teal-400 font-semibold">{Math.round((bug.severity_confidence || 0) * 100)}%</span>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  {bug.predicted_severity === bug.severity ? (
                    <div className="flex items-center gap-1.5 text-xs text-green-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Prediction matches actual severity
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-orange-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Prediction differs from actual
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
