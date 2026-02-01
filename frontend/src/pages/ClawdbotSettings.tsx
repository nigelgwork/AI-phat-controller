import { useState } from 'react';
import {
  Bot,
  Plus,
  Trash2,
  Check,
  X,
  Edit2,
  Volume2,
  Smile,
  Briefcase,
  Zap,
  RefreshCw,
  Star,
} from 'lucide-react';
import {
  usePersonalities,
  useCurrentPersonality,
  useSetCurrentPersonality,
  useSavePersonality,
  useDeletePersonality,
  ClawdbotPersonality,
  TraitLevel,
  getTraitPercentage,
} from '../hooks/useClawdbot';

export default function ClawdbotSettings() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPersonality, setEditingPersonality] = useState<ClawdbotPersonality | null>(null);

  const { data: personalities = [], isLoading } = usePersonalities();
  const { data: currentPersonality } = useCurrentPersonality();
  const setCurrentPersonality = useSetCurrentPersonality();
  const savePersonality = useSavePersonality();
  const deletePersonality = useDeletePersonality();

  const handleSetCurrent = async (id: string) => {
    try {
      await setCurrentPersonality.mutateAsync(id);
    } catch (error) {
      console.error('Failed to set personality:', error);
    }
  };

  const handleDelete = async (id: string) => {
    const personality = personalities.find((p: ClawdbotPersonality) => p.id === id);
    if (personality?.isDefault) {
      alert('Cannot delete built-in personalities');
      return;
    }
    if (!confirm(`Delete "${personality?.name}"?`)) return;
    try {
      await deletePersonality.mutateAsync(id);
    } catch (error) {
      console.error('Failed to delete personality:', error);
    }
  };

  const handleSave = async (
    data: Omit<ClawdbotPersonality, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => {
    try {
      await savePersonality.mutateAsync(data);
      setShowCreateModal(false);
      setEditingPersonality(null);
    } catch (error) {
      console.error('Failed to save personality:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Clawdbot Personalities</h1>
            <p className="text-sm text-slate-400">Customize how the AI assistant communicates</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Personality
        </button>
      </div>

      {/* Current Personality Banner */}
      {currentPersonality && (
        <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-lg border border-cyan-500/30 p-4">
          <div className="flex items-center gap-3">
            <Star className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-sm text-slate-400">Currently Active:</span>
              <span className="ml-2 text-white font-medium">{currentPersonality.name}</span>
            </div>
          </div>
        </div>
      )}

      {/* Personalities Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {personalities.map((personality: ClawdbotPersonality) => (
          <PersonalityCard
            key={personality.id}
            personality={personality}
            isActive={currentPersonality?.id === personality.id}
            onSetActive={() => handleSetCurrent(personality.id)}
            onEdit={() => setEditingPersonality(personality)}
            onDelete={() => handleDelete(personality.id)}
          />
        ))}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPersonality) && (
        <PersonalityModal
          personality={editingPersonality}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPersonality(null);
          }}
          onSave={handleSave}
          isSaving={savePersonality.isPending}
        />
      )}
    </div>
  );
}

// Personality Card Component
function PersonalityCard({
  personality,
  isActive,
  onSetActive,
  onEdit,
  onDelete,
}: {
  personality: ClawdbotPersonality;
  isActive: boolean;
  onSetActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const traitIcons = {
    verbosity: Volume2,
    humor: Smile,
    formality: Briefcase,
    enthusiasm: Zap,
  };

  return (
    <div
      className={`bg-slate-800 rounded-lg border p-4 transition-colors ${
        isActive ? 'border-cyan-500 ring-1 ring-cyan-500/50' : 'border-slate-700 hover:border-slate-600'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bot className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
          <span className="font-medium text-white">{personality.name}</span>
          {personality.isDefault && (
            <span className="px-1.5 py-0.5 text-xs bg-slate-700 text-slate-400 rounded">
              Built-in
            </span>
          )}
        </div>
        {isActive && (
          <span className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded">Active</span>
        )}
      </div>

      <p className="text-sm text-slate-400 mb-4 line-clamp-2">{personality.description}</p>

      {/* Trait Bars */}
      <div className="space-y-2 mb-4">
        {Object.entries(personality.traits).map(([trait, level]) => {
          const Icon = traitIcons[trait as keyof typeof traitIcons];
          return (
            <div key={trait} className="flex items-center gap-2">
              <Icon className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs text-slate-500 w-20 capitalize">{trait}</span>
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    level === 'low'
                      ? 'bg-blue-500'
                      : level === 'medium'
                      ? 'bg-green-500'
                      : 'bg-orange-500'
                  }`}
                  style={{ width: `${getTraitPercentage(level)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Greeting Preview */}
      {personality.greeting && (
        <div className="mb-4 p-2 bg-slate-900 rounded text-xs text-slate-400 italic">
          "{personality.greeting}"
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {!isActive && (
          <button
            onClick={onSetActive}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded transition-colors"
          >
            <Check className="w-4 h-4" />
            Set Active
          </button>
        )}
        <button
          onClick={onEdit}
          className={`p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors ${
            isActive ? 'flex-1 flex items-center justify-center gap-1.5' : ''
          }`}
          title="Edit"
        >
          <Edit2 className="w-4 h-4" />
          {isActive && <span className="text-sm">Edit</span>}
        </button>
        {!personality.isDefault && (
          <button
            onClick={onDelete}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Create/Edit Personality Modal
function PersonalityModal({
  personality,
  onClose,
  onSave,
  isSaving,
}: {
  personality: ClawdbotPersonality | null;
  onClose: () => void;
  onSave: (data: Omit<ClawdbotPersonality, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  isSaving: boolean;
}) {
  const isEditing = !!personality;
  const isDefault = personality?.isDefault;

  const [name, setName] = useState(personality?.name || '');
  const [description, setDescription] = useState(personality?.description || '');
  const [verbosity, setVerbosity] = useState<TraitLevel>(personality?.traits.verbosity || 'medium');
  const [humor, setHumor] = useState<TraitLevel>(personality?.traits.humor || 'low');
  const [formality, setFormality] = useState<TraitLevel>(personality?.traits.formality || 'medium');
  const [enthusiasm, setEnthusiasm] = useState<TraitLevel>(personality?.traits.enthusiasm || 'medium');
  const [customInstructions, setCustomInstructions] = useState(personality?.customInstructions || '');
  const [greeting, setGreeting] = useState(personality?.greeting || '');
  const [signoff, setSignoff] = useState(personality?.signoff || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: personality?.id,
      name: name.trim(),
      description: description.trim(),
      traits: { verbosity, humor, formality, enthusiasm },
      customInstructions: customInstructions.trim() || undefined,
      greeting: greeting.trim() || undefined,
      signoff: signoff.trim() || undefined,
      isDefault: personality?.isDefault,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-2xl my-8">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">
            {isEditing ? 'Edit Personality' : 'Create Personality'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {/* Basic Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isDefault}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                placeholder="My Custom Personality"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isDefault}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                placeholder="Brief description"
              />
            </div>
          </div>

          {/* Trait Sliders */}
          {!isDefault && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-300">Personality Traits</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <TraitSlider
                  label="Verbosity"
                  icon={Volume2}
                  value={verbosity}
                  onChange={setVerbosity}
                  description="How detailed responses should be"
                />
                <TraitSlider
                  label="Humor"
                  icon={Smile}
                  value={humor}
                  onChange={setHumor}
                  description="Use of wit and playfulness"
                />
                <TraitSlider
                  label="Formality"
                  icon={Briefcase}
                  value={formality}
                  onChange={setFormality}
                  description="Professional vs casual tone"
                />
                <TraitSlider
                  label="Enthusiasm"
                  icon={Zap}
                  value={enthusiasm}
                  onChange={setEnthusiasm}
                  description="Energy level in responses"
                />
              </div>
            </div>
          )}

          {/* Custom Instructions */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Custom Instructions (optional)
            </label>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 resize-none"
              rows={3}
              placeholder="Additional behavior instructions..."
            />
          </div>

          {/* Greeting & Signoff */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Greeting (optional)
              </label>
              <input
                type="text"
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                placeholder="Hello! How can I help?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Sign-off (optional)
              </label>
              <input
                type="text"
                value={signoff}
                onChange={(e) => setSignoff(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                placeholder="Happy coding!"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSaving}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 text-white rounded-lg transition-colors"
            >
              {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Personality'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Trait Slider Component
function TraitSlider({
  label,
  icon: Icon,
  value,
  onChange,
  description,
}: {
  label: string;
  icon: React.ElementType;
  value: TraitLevel;
  onChange: (value: TraitLevel) => void;
  description: string;
}) {
  const levels: TraitLevel[] = ['low', 'medium', 'high'];

  return (
    <div className="bg-slate-900 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-medium text-white">{label}</span>
      </div>
      <p className="text-xs text-slate-500 mb-3">{description}</p>
      <div className="flex gap-1">
        {levels.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            className={`flex-1 py-1.5 text-xs rounded capitalize transition-colors ${
              value === level
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
}
