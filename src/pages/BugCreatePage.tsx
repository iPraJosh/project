import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Loader2, ArrowLeft, Sparkles, AlertTriangle } from 'lucide-react';

interface Project {
  id: string;
  name: string;
}

// 🔥 AI Prediction
function predictSeverity(
  title: string,
  description: string,
  bugType: string,
  environment: string
) {
  const text = `${title} ${description} ${environment}`.toLowerCase();

  let score = { critical: 0, high: 0, medium: 0, low: 0, trivial: 0 };

  if (text.includes('crash') || text.includes('down')) score.critical += 2;
  if (text.includes('error') || text.includes('fail')) score.high += 1;
  if (text.includes('slow')) score.medium += 1;
  if (text.includes('ui')) score.low += 1;

  if (bugType === 'security') score.critical += 2;
  if (environment.includes('production')) score.critical += 1;

  const sorted = Object.entries(score).sort(([, a], [, b]) => b - a);
  const predicted = sorted[0][1] > 0 ? sorted[0][0] : 'medium';
  const confidence = Math.min(0.95, 0.5 + sorted[0][1] * 0.1);

  return { severity: predicted, confidence };
}

export default function BugCreatePage({ onNavigate }: any) {
  const { user } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    project_id: '',
    title: '',
    description: '',
    severity: 'medium',
    bug_type: 'functional',
    environment: '',
  });

  // 🔥 Load projects
  useEffect(() => {
    const load = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('project_members')
        .select('projects(id, name)')
        .eq('user_id', user.id);

      setProjects((data || []).map((m: any) => m.projects));
    };

    load();
  }, [user]);

  // 🔥 Predict
  const handlePredict = () => {
    if (!form.title) {
      setErrorMsg("Title is required for prediction");
      return;
    }

    const result = predictSeverity(
      form.title,
      form.description,
      form.bug_type,
      form.environment
    );

    setPrediction(result);
    setForm(f => ({ ...f, severity: result.severity }));
    setErrorMsg('');
  };

  // 🔥 Submit
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setErrorMsg('');

    if (!user?.id) {
      setErrorMsg("User not logged in");
      return;
    }

    if (!form.project_id) {
      setErrorMsg("Please select a project");
      return;
    }

    if (!form.title) {
      setErrorMsg("Title is required");
      return;
    }

    try {
      setLoading(true);

      const result = predictSeverity(
        form.title,
        form.description,
        form.bug_type,
        form.environment
      );

      const { data: bug, error } = await supabase
        .from('bugs')
        .insert({
          project_id: form.project_id,
          created_by: user.id,
          title: form.title,
          description: form.description,
          severity: form.severity,
          status: 'open',
          predicted_severity: result.severity,
          severity_confidence: result.confidence,
        })
        .select('id')
        .maybeSingle();

      if (error) {
        console.error("INSERT ERROR:", error);
        setErrorMsg(error.message);
        return;
      }

      if (bug) {
        await supabase.from('severity_predictions').insert({
          bug_id: bug.id,
          predicted_severity: result.severity,
          confidence_score: result.confidence,
          model_version: 'rule_based_v1',
        });
      }

      alert("Bug created successfully!");
      onNavigate('bugs');

    } catch (err) {
      console.error(err);
      setErrorMsg("Unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto text-white space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => onNavigate('bugs')}>
          <ArrowLeft />
        </button>
        <h1 className="text-2xl font-bold">Report New Bug</h1>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 p-3 rounded flex gap-2 items-center text-red-400">
          <AlertTriangle size={16} />
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Project */}
        <div>
          <label className="text-sm text-slate-400">Project</label>
          <select
            value={form.project_id}
            onChange={e => setForm({ ...form, project_id: e.target.value })}
            className="w-full mt-1 p-3 bg-slate-800 border border-slate-700 rounded-lg"
          >
            <option value="">Select project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="text-sm text-slate-400">Title</label>
          <input
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="w-full mt-1 p-3 bg-slate-800 border border-slate-700 rounded-lg"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm text-slate-400">Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full mt-1 p-3 bg-slate-800 border border-slate-700 rounded-lg"
          />
        </div>
        {/* Environment */}
<div>
  <label className="text-sm text-slate-400">Environment</label>
  <input
    placeholder="e.g. production, staging"
    value={form.environment}
    onChange={e => setForm({ ...form, environment: e.target.value })}
    className="w-full mt-1 p-3 bg-slate-800 border border-slate-700 rounded-lg"
  />
</div>

{/* Bug Type */}
<div>
  <label className="text-sm text-slate-400">Bug Type</label>
  <select
    value={form.bug_type}
    onChange={e => setForm({ ...form, bug_type: e.target.value })}
    className="w-full mt-1 p-3 bg-slate-800 border border-slate-700 rounded-lg"
  >
    <option value="functional">Functional</option>
    <option value="ui">UI</option>
    <option value="performance">Performance</option>
    <option value="security">Security</option>
  </select>
</div>

{/* Manual Severity */}
<div>
  <label className="text-sm text-slate-400">Manual Severity</label>
  <select
    value={form.severity}
    onChange={e => setForm({ ...form, severity: e.target.value })}
    className="w-full mt-1 p-3 bg-slate-800 border border-slate-700 rounded-lg"
  >
    <option value="critical">Critical</option>
    <option value="high">High</option>
    <option value="medium">Medium</option>
    <option value="low">Low</option>
    <option value="trivial">Trivial</option>
  </select>
</div>
        {/* Predict */}
        <button
          type="button"
          onClick={handlePredict}
          className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 text-teal-400 px-4 py-2 rounded-lg"
        >
          <Sparkles size={16} />
          Predict Severity
        </button>

        {/* Prediction */}
        {prediction && (
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
            <p className="text-sm text-slate-400">AI Prediction</p>
            <p className="text-teal-400 font-semibold">
              {prediction.severity} ({Math.round(prediction.confidence * 100)}%)
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-cyan-600 py-3 rounded-lg font-semibold"
        >
          {loading ? <Loader2 className="animate-spin mx-auto" /> : "Submit Bug"}
        </button>
      </form>
    </div>
  );
}