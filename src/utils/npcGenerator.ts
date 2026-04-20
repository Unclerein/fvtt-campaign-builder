import { ModuleSettings, SettingKey } from '@/settings';

export interface NpcData {
  name: string;
  age: string;
  physical: string;
  speech: string;
  secret: string;
}

const RACES = ['Humain', 'Nain', 'Elfe', 'Drakéide', 'Fée', 'Animorphe', 'Gueule-libre', 'Gobelin'] as const;
const GENDERS = ['Homme', 'Femme'] as const;

export type NpcRace = typeof RACES[number] | 'Aléatoire';
export type NpcGender = typeof GENDERS[number] | 'Aléatoire';

export const NPC_RACES: NpcRace[] = ['Aléatoire', ...RACES];
export const NPC_GENDERS: NpcGender[] = ['Aléatoire', ...GENDERS];

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const SYSTEM_PROMPT = `Tu es un générateur de PNJ pour un jeu de rôle fantasy. Tu dois générer des personnages cohérents et variés.

Descriptions des races spéciales :
- Fée : hybride humanoïde-insecte. Le degré d'hybridation est très variable : peut être quasiment humain avec de légers traits insectes (antennes, yeux composés discrets, léger reflet chitineux), ou entièrement insectoïde, ou n'importe quel point entre les deux.
- Drakéide : hybride homme-dragon. Corps humanoïde, écailles, traits draconiques (cornes, crêtes, yeux reptiliens, parfois queue ou ailes vestigielles).
- Animorphe : corps et morphologie humaine, mais avec une tête d'animal (au choix : loup, renard, oiseau, chat, ours, cerf, etc.). Les mains restent humaines.
- Gueule-libre : animal ordinaire doué de la parole. Garde tous les attributs physiques d'un animal normal.

Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après :
{"name":"...","age":"...","physical":"...","speech":"...","secret":"..."}

Toutes les valeurs doivent être en français. Garde les descriptions courtes (1-3 phrases max par champ).`;

export async function generateNpc(race: NpcRace, gender: NpcGender): Promise<NpcData> {
  const apiKey = ModuleSettings.get(SettingKey.APIToken);
  if (!apiKey) {
    throw new Error('API Token non configuré. Renseigne-le dans Paramètres avancés → Backend → API Token.');
  }

  const resolvedRace = race === 'Aléatoire' ? pickRandom(RACES) : race;
  const resolvedGender = gender === 'Aléatoire' ? pickRandom(GENDERS) : gender;

  const userPrompt = `Génère un PNJ : ${resolvedGender}, ${resolvedRace}.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText);
    throw new Error(`Erreur API Anthropic (${response.status}) : ${err}`);
  }

  const data = await response.json();
  const text: string = data?.content?.[0]?.text ?? '';

  // Extract JSON — Claude sometimes wraps in ```json blocks
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Réponse invalide de l\'API : pas de JSON trouvé.');

  const parsed = JSON.parse(jsonMatch[0]) as Partial<NpcData>;
  if (!parsed.name || !parsed.age || !parsed.physical || !parsed.speech || !parsed.secret) {
    throw new Error('Réponse incomplète de l\'API.');
  }

  return parsed as NpcData;
}

export function formatNpcDescription(npc: NpcData): string {
  return [
    `<p><strong>Âge :</strong> ${npc.age}</p>`,
    `<p><strong>Description physique :</strong> ${npc.physical}</p>`,
    `<p><strong>Manière de parler :</strong> ${npc.speech}</p>`,
    `<p><strong>Secret :</strong> ${npc.secret}</p>`,
  ].join('\n');
}
