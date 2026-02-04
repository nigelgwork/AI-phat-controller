import Store from 'electron-store';
import { randomUUID } from 'crypto';
import { getEncryptionKey } from '../utils/encryption-key';

// Personality trait levels
export type TraitLevel = 'low' | 'medium' | 'high';

// Personality configuration
export interface ClawdbotPersonality {
  id: string;
  name: string;
  description: string;
  traits: {
    verbosity: TraitLevel;
    humor: TraitLevel;
    formality: TraitLevel;
    enthusiasm: TraitLevel;
  };
  customInstructions?: string;
  greeting?: string;
  signoff?: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Store schema
interface ClawdbotStore {
  personalities: ClawdbotPersonality[];
  currentPersonalityId: string | null;
}

const clawdbotStore = new Store<ClawdbotStore>({
  name: 'clawdbot',
  defaults: {
    personalities: [],
    currentPersonalityId: null,
  },
  encryptionKey: getEncryptionKey(),
});

// Default built-in personalities
const DEFAULT_PERSONALITIES: Omit<ClawdbotPersonality, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Balanced, professional, and helpful',
    traits: {
      verbosity: 'medium',
      humor: 'low',
      formality: 'medium',
      enthusiasm: 'medium',
    },
    isDefault: true,
  },
  {
    id: 'cheerful',
    name: 'Cheerful',
    description: 'High enthusiasm, friendly tone, casual approach',
    traits: {
      verbosity: 'medium',
      humor: 'medium',
      formality: 'low',
      enthusiasm: 'high',
    },
    greeting: 'Hey there! Great to see you!',
    signoff: 'Happy coding!',
    isDefault: true,
  },
  {
    id: 'concise',
    name: 'Concise',
    description: 'Direct, minimal, gets to the point quickly',
    traits: {
      verbosity: 'low',
      humor: 'low',
      formality: 'high',
      enthusiasm: 'low',
    },
    isDefault: true,
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Playful language, thinks outside the box',
    traits: {
      verbosity: 'high',
      humor: 'high',
      formality: 'low',
      enthusiasm: 'high',
    },
    greeting: 'Ahoy there, fellow code adventurer!',
    isDefault: true,
  },
  {
    id: 'teacher',
    name: 'Teacher',
    description: 'Patient, explains concepts thoroughly',
    traits: {
      verbosity: 'high',
      humor: 'low',
      formality: 'medium',
      enthusiasm: 'medium',
    },
    customInstructions: 'Explain concepts step by step. Use analogies when helpful. Always verify understanding.',
    isDefault: true,
  },
];

/**
 * Initialize default personalities if not present
 */
export function initializeDefaults(): void {
  const personalities = clawdbotStore.get('personalities') || [];
  const existingIds = new Set(personalities.map((p) => p.id));

  const now = new Date().toISOString();
  let updated = false;

  for (const defaultPersonality of DEFAULT_PERSONALITIES) {
    if (!existingIds.has(defaultPersonality.id)) {
      personalities.push({
        ...defaultPersonality,
        createdAt: now,
        updatedAt: now,
      });
      updated = true;
    }
  }

  if (updated) {
    clawdbotStore.set('personalities', personalities);
  }

  // Set default personality if none selected
  if (!clawdbotStore.get('currentPersonalityId')) {
    clawdbotStore.set('currentPersonalityId', 'default');
  }
}

/**
 * Get all personalities
 */
export function getPersonalities(): ClawdbotPersonality[] {
  initializeDefaults();
  return clawdbotStore.get('personalities') || [];
}

/**
 * Get a specific personality by ID
 */
export function getPersonality(id: string): ClawdbotPersonality | undefined {
  const personalities = getPersonalities();
  return personalities.find((p) => p.id === id);
}

/**
 * Get the current active personality
 */
export function getCurrentPersonality(): ClawdbotPersonality | undefined {
  const currentId = clawdbotStore.get('currentPersonalityId');
  if (!currentId) {
    return getPersonality('default');
  }
  return getPersonality(currentId);
}

/**
 * Get the current personality ID
 */
export function getCurrentPersonalityId(): string | null {
  return clawdbotStore.get('currentPersonalityId');
}

/**
 * Set the current active personality
 */
export function setCurrentPersonality(id: string): boolean {
  const personality = getPersonality(id);
  if (!personality) {
    return false;
  }
  clawdbotStore.set('currentPersonalityId', id);
  return true;
}

/**
 * Save (create or update) a personality
 */
export function savePersonality(
  personality: Omit<ClawdbotPersonality, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): ClawdbotPersonality {
  const personalities = getPersonalities();
  const now = new Date().toISOString();

  if (personality.id) {
    // Update existing
    const index = personalities.findIndex((p) => p.id === personality.id);
    if (index !== -1) {
      // Don't allow modifying default personalities' core traits
      if (personalities[index].isDefault) {
        // Only allow updating custom instructions, greeting, signoff
        personalities[index] = {
          ...personalities[index],
          customInstructions: personality.customInstructions,
          greeting: personality.greeting,
          signoff: personality.signoff,
          updatedAt: now,
        };
      } else {
        personalities[index] = {
          ...personalities[index],
          ...personality,
          id: personality.id,
          updatedAt: now,
        };
      }
      clawdbotStore.set('personalities', personalities);
      return personalities[index];
    }
  }

  // Create new
  const newPersonality: ClawdbotPersonality = {
    ...personality,
    id: personality.id || randomUUID(),
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  };

  personalities.push(newPersonality);
  clawdbotStore.set('personalities', personalities);
  return newPersonality;
}

/**
 * Delete a personality
 */
export function deletePersonality(id: string): boolean {
  const personalities = getPersonalities();
  const personality = personalities.find((p) => p.id === id);

  // Can't delete default personalities
  if (!personality || personality.isDefault) {
    return false;
  }

  const filtered = personalities.filter((p) => p.id !== id);
  clawdbotStore.set('personalities', filtered);

  // If deleted the current personality, reset to default
  if (clawdbotStore.get('currentPersonalityId') === id) {
    clawdbotStore.set('currentPersonalityId', 'default');
  }

  return true;
}

/**
 * Build a system prompt incorporating personality traits
 */
export function buildSystemPrompt(personality: ClawdbotPersonality, basePrompt: string): string {
  const traitInstructions: string[] = [];

  // Verbosity
  switch (personality.traits.verbosity) {
    case 'low':
      traitInstructions.push('Be concise and brief. Avoid unnecessary explanations.');
      break;
    case 'high':
      traitInstructions.push('Provide thorough explanations with context and examples when helpful.');
      break;
    // medium is default, no special instruction
  }

  // Humor
  switch (personality.traits.humor) {
    case 'low':
      traitInstructions.push('Maintain a serious, professional tone.');
      break;
    case 'high':
      traitInstructions.push('Feel free to use light humor, wit, and playful language when appropriate.');
      break;
    case 'medium':
      traitInstructions.push('Occasional light humor is fine when it fits naturally.');
      break;
  }

  // Formality
  switch (personality.traits.formality) {
    case 'low':
      traitInstructions.push('Use a casual, friendly tone. Contractions and informal language are encouraged.');
      break;
    case 'high':
      traitInstructions.push('Maintain a formal, professional tone. Avoid contractions and casual language.');
      break;
    // medium is default
  }

  // Enthusiasm
  switch (personality.traits.enthusiasm) {
    case 'low':
      traitInstructions.push('Keep responses measured and calm.');
      break;
    case 'high':
      traitInstructions.push('Show enthusiasm and energy in your responses!');
      break;
    // medium is default
  }

  // Build the full prompt
  let fullPrompt = basePrompt;

  if (traitInstructions.length > 0) {
    fullPrompt += `\n\n## Communication Style\n${traitInstructions.join(' ')}`;
  }

  if (personality.customInstructions) {
    fullPrompt += `\n\n## Custom Instructions\n${personality.customInstructions}`;
  }

  return fullPrompt;
}

/**
 * Get a greeting message for the current personality
 */
export function getGreeting(): string {
  const personality = getCurrentPersonality();
  if (personality?.greeting) {
    return personality.greeting;
  }
  return 'Hello! How can I help you today?';
}

/**
 * Get a signoff message for the current personality
 */
export function getSignoff(): string {
  const personality = getCurrentPersonality();
  return personality?.signoff || '';
}

// Initialize defaults on module load
initializeDefaults();
