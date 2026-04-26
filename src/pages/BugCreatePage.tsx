import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import {
  Zap,
  Loader2,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
}

const SEVERITY_KEYWORDS: Record<string, string[]> = {
  critical: ['crash', 'data loss', 'security', 'vulnerability', 'exploit', 'breach', 'corruption', 'fatal', 'outage', 'down', 'unrecoverable', 'hack', 'injection', 'xss', 'csrf', 'rce'],
  high: ['fail', 'error', 'broken', 'incorrect', 'wrong', 'missing', 'unusable', 'block', 'regression', 'major', 'severe', 'urgent', 'critical path'],
  medium: ['unexpected', 'inconsistent', 'slow', 'delay', 'timeout', 'partial', 'workaround', 'moderate', 'affects', 'intermittent'],
  low: ['minor', 'cosmetic', 'typo', 'alignment', 'spacing', 'format', 'display', 'visual', 'style', 'color', 'font'],
  trivial: ['suggestion', 'enhancement', 'nice to have', 'polish', 'refinement', 'nit', 'pedantic'],
};

function predictSeverity(title: string, description: string, bugType: string, environment: string): { severity: string; confidence: number; features: Record<string, unknown> } {
  const text = `${title} ${description} ${environment}`.toLowerCase();
  const scores: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, trivial: 0 };

  // Keyword matching
  for (const [sev, keywords] of Object.entries(SEVERITY_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw)) scores[sev] += 1;
    }
  }

  // Bug type influence
  if (bugType === 'security') scores.critical += 3;
  else if (bugType === 'performance') scores.high += 1.5;
  else if (bugType === 'functional') scores.high += 0.5;
  else if (bugType === 'ui_ux') scores.low += 1;
  else if (bugType === 'compatibility') scores.medium += 0.5;
  else if (bugType === 'documentation') scores.trivial += 1;

  // Title length heuristic (shorter titles often more urgent)
  if (title.length < 20) scores.critical += 0.3;
  else if (title.length < 40) scores.high += 0.2;

  // Environment mentions
  if (environment.toLowerCase().includes('production')) scores.critical += 2;
  else if (environment.toLowerCase().includes('staging')) scores.high += 1;

  // Default to medium if no signals
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) scores.medium = 1;

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const predicted = (Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0]);
  const confidence = Math.min(0.95, Math.max(0.3, (scores[predicted] / totalScore) * 1.5 + 0.2));

  return {
    severity: predicted,
    confidence: Math.round(confidence * 100) / 100,
    features: { keyword_scores: scores, bug_type: bugType, text_length: text.length },
  };
}

export default function BugCreatePage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState<{ severity: string; confidence: number } | null>(null);

  const [form, setForm] = useState({
    project_id: '',
    title: '',
    description: '',
    severity: 'medium',
    priority: 'medium',
    bug_type: 'functional',
    environment: '',
    steps_to_reproduce: '',
  });

  useEffect(() => {
    loadProjects();
  }, [user]);

  const loadProjects = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('project_members')
      .select('projects(id, name)')
      .eq('user_id', user.id);
    setProjects((data?.map(d => d.projects).filter(Boolean) || []) as unknown as Project[]);
  };

  const handlePredict = () => {
    if (!form.title.trim()) return;
    setPredicting(true);
    setTimeout(() => {
      const result = predictSeverity(form.title, form.description, form.bug_type, form.environment);
      setPrediction(result);
      setForm(f => ({ ...f, severity: result.severity }));
      setPredicting(false);
    }, 800);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.project_id) return;
    setLoading(true);

    const { data: bug } = await supabase
      .from('bugs')
      .insert({
        project_id: form.project_id,
        reporter_id: user.id,
        title: form.title,
        description: form.description,
        severity: form.severity,
        priority: form.priority,
        bug_type: form.bug_type,
        environment: form.environment,
        steps_to_reproduce: form.steps_to_reproduce,
        predicted_severity: prediction?.severity || null,
        severity_confidence: prediction?.confidence || null,
      })
      .select('id')
      .maybeSingle();

    if (bug && prediction) {
      await supabase.from('severity_predictions').insert({
        bug_id: bug.id,
        predicted_severity: prediction.severity,
        confidence_score: prediction.confidence,
        features_used: { source: 'client_prediction' },
        model_version: 'v1',
      });
    }

    setLoading(false);
    onNavigate('bugs');
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => onNavigate('bugs')} className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Report New Bug</h1>
          <p className="text-slate-400 text-sm mt-0.5">Fill in the details and let AI predict severity</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project selection */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Project</h3>
          <select
            value={form.project_id}
            onChange={(e) => setForm(f => ({ ...f, project_id: e.target.value }))}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
            required
          >
            <option value="">Select a project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Bug details */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Bug Details</h3>

          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
              placeholder="Brief description of the bug"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              rows={4}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 resize-none"
              placeholder="Detailed description of the issue"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Steps to Reproduce</label>
            <textarea
              value={form.steps_to_reproduce}
              onChange={(e) => setForm(f => ({ ...f, steps_to_reproduce: e.target.value }))}
              rows={3}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 resize-none"
              placeholder="1. Go to...&#10;2. Click on...&#10;3. See error"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Environment</label>
            <input
              type="text"
              value={form.environment}
              onChange={(e) => setForm(f => ({ ...f, environment: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
              placeholder="e.g., Chrome 120, Windows 11, Production"
            />
          </div>
        </div>

        {/* Classification */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Classification</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Bug Type</label>
              <select
                value={form.bug_type}
                onChange={(e) => setForm(f => ({ ...f, bug_type: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              >
                <option value="functional">Functional</option>
                <option value="performance">Performance</option>
                <option value="security">Security</option>
                <option value="ui_ux">UI/UX</option>
                <option value="compatibility">Compatibility</option>
                <option value="documentation">Documentation</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* AI Severity Prediction */}
          <div className="border border-slate-700 rounded-xl p-4 bg-slate-800/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-400" />
                <span className="text-sm font-medium text-white">AI Severity Prediction</span>
              </div>
              <button
                type="button"
                onClick={handlePredict}
                disabled={predicting || !form.title.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/10 text-teal-400 text-xs font-semibold rounded-lg border border-teal-500/20 hover:bg-teal-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {predicting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                Predict
              </button>
            </div>

            {prediction ? (
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${severityColor(prediction.severity)}`}>
                  {prediction.severity}
                </span>
                <span className="text-xs text-slate-400">
                  {Math.round(prediction.confidence * 100)}% confidence
                </span>
                {prediction.severity !== form.severity && (
                  <span className="text-xs text-orange-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Override from {prediction.severity}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Click Predict to let AI analyze the bug severity</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Severity (manual override)</label>
            <div className="flex flex-wrap gap-2">
              {['critical', 'high', 'medium', 'low', 'trivial'].map(sev => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, severity: sev }))}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                    form.severity === sev ? severityColor(sev) : 'text-slate-500 bg-slate-800 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 justify-end">
          <button
            type="button"
            onClick={() => onNavigate('bugs')}
            className="px-5 py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !form.project_id}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm font-semibold rounded-xl hover:from-teal-400 hover:to-cyan-400 transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Submit Bug Report
          </button>
        </div>
      </form>
    </div>
  );
}
