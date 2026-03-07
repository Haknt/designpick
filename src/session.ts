export interface Variant {
  id: string;
  label: string;
  description: string;
  html: string;
  eliminated: boolean;
}

export interface Round {
  number: number;
  variants: Variant[];
  keptIds: string[];
  eliminatedIds: string[];
}

export interface Session {
  id: string;
  code: string;
  platform: string;
  description: string;
  rounds: Round[];
  currentRound: number;
  selectedVariantId: string | null;
  resolved: boolean;
}

const sessions = new Map<string, Session>();
let resolvers = new Map<string, (value: Session) => void>();

export function createSession(
  code: string,
  platform: string,
  description: string,
  variants: Variant[]
): Session {
  const id = `dp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const session: Session = {
    id,
    code,
    platform,
    description,
    rounds: [
      {
        number: 1,
        variants,
        keptIds: [],
        eliminatedIds: [],
      },
    ],
    currentRound: 1,
    selectedVariantId: null,
    resolved: false,
  };
  sessions.set(id, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function getActiveSession(): Session | undefined {
  for (const session of sessions.values()) {
    if (!session.resolved) return session;
  }
  return undefined;
}

export function getCurrentVariants(session: Session): Variant[] {
  const round = session.rounds[session.currentRound - 1];
  return round.variants.filter((v) => !v.eliminated);
}

export function eliminateVariant(sessionId: string, variantId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;

  const round = session.rounds[session.currentRound - 1];
  const variant = round.variants.find((v) => v.id === variantId);
  if (!variant) return false;

  variant.eliminated = true;
  round.eliminatedIds.push(variantId);
  return true;
}

export function keepVariant(sessionId: string, variantId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;

  const round = session.rounds[session.currentRound - 1];
  round.keptIds.push(variantId);
  return true;
}

export function selectWinner(sessionId: string, variantId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;

  session.selectedVariantId = variantId;
  session.resolved = true;

  const resolver = resolvers.get(sessionId);
  if (resolver) {
    resolver(session);
    resolvers.delete(sessionId);
  }
  return true;
}

export function waitForSelection(sessionId: string): Promise<Session> {
  const session = sessions.get(sessionId);
  if (session?.resolved) return Promise.resolve(session);

  return new Promise((resolve) => {
    resolvers.set(sessionId, resolve);
  });
}

export function deleteSession(id: string): void {
  sessions.delete(id);
  resolvers.delete(id);
}
