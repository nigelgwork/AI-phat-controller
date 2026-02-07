import { Sparkles } from 'lucide-react';

export default function Skills() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Skills</h2>
        <p className="text-sm text-slate-400 mt-1">
          Browse and manage Claude Code skills
        </p>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 text-center">
        <Sparkles className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <p className="text-slate-400">No skills configured yet</p>
        <p className="text-sm text-slate-500 mt-1">
          Skills are custom slash commands defined in your project or global configuration.
          Add skills to <code className="bg-slate-700 px-1 rounded">.claude/commands/</code> to see them here.
        </p>
      </div>
    </div>
  );
}
