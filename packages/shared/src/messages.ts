/**
 * Cross-context message contracts for the Manga Translator extension.
 *
 * Every message that crosses an extension boundary (popup, background,
 * content script, offscreen document) is declared here so that callers and
 * handlers can be type-checked end to end.
 */

import type { Result } from './result.js';
import type { ExtensionSettings, Origin, SiteAuthorization } from './siteState.js';

/** Logical extension context identifiers. */
export type Context = 'background' | 'content' | 'popup' | 'offscreen';

/** Base envelope shared by all messages. */
export interface MessageEnvelope<TKind extends string, TPayload = unknown> {
  readonly namespace: typeof NAMESPACE;
  readonly kind: TKind;
  readonly payload: TPayload;
  /** ISO timestamp set by the sender for latency debugging. */
  readonly sentAt: string;
}

// ---------------------------------------------------------------------------
// Request/response pairs
// ---------------------------------------------------------------------------

export interface PopupRequests {
  'popup:getSiteStatus': {
    request: { tabId: number; origin: Origin };
    response: Result<SiteAuthorization>;
  };
  'popup:requestSitePermission': {
    request: { origin: Origin };
    response: Result<{ granted: boolean }>;
  };
  'popup:enableSite': {
    request: { origin: Origin };
    response: Result<SiteAuthorization>;
  };
  'popup:disableSite': {
    request: { origin: Origin };
    response: Result<SiteAuthorization>;
  };
  'popup:getSettings': {
    request: Record<string, never>;
    response: Result<ExtensionSettings>;
  };
  'popup:updateSettings': {
    request: { settings: Partial<ExtensionSettings> };
    response: Result<ExtensionSettings>;
  };
}

export interface ContentRequests {
  'content:ready': {
    request: { tabId: number; origin: Origin };
    response: Result<{ siteStatus: SiteAuthorization }>;
  };
  'content:requestStatus': {
    request: { origin: Origin };
    response: Result<SiteAuthorization>;
  };
}

export interface OffscreenRequests {
  'offscreen:init': {
    request: Record<string, never>;
    response: Result<{ initialized: boolean }>;
  };
  'offscreen:echo': {
    request: { message: string };
    response: Result<{ echoed: string }>;
  };
}

/** All request/response pairs keyed by message kind. */
export interface RequestMap
  extends PopupRequests,
    ContentRequests,
    OffscreenRequests {}

export type MessageKind = keyof RequestMap;

export type MessageRequest<K extends MessageKind> = RequestMap[K]['request'];
export type MessageResponse<K extends MessageKind> = RequestMap[K]['response'];

// ---------------------------------------------------------------------------
// Broadcast / one-way messages
// ---------------------------------------------------------------------------

export interface BroadcastMessages {
  /** Background notifies content scripts that authorization changed. */
  'broadcast:siteStatusChanged': {
    origin: Origin;
    authorization: SiteAuthorization;
  };
  /** Background instructs a content script to inject or remove the overlay. */
  'broadcast:overlayCommand': {
    command: 'inject' | 'remove';
    origin: Origin;
  };
}

export type BroadcastKind = keyof BroadcastMessages;
export type BroadcastPayload<K extends BroadcastKind> = BroadcastMessages[K];

// ---------------------------------------------------------------------------
// Runtime message helpers
// ---------------------------------------------------------------------------

const NAMESPACE = 'mangaTranslator';

export const buildMessage = <K extends MessageKind>(
  kind: K,
  payload: MessageRequest<K>,
): MessageEnvelope<K, MessageRequest<K>> => ({
  namespace: NAMESPACE,
  kind,
  payload,
  sentAt: new Date().toISOString(),
});

export const buildBroadcast = <K extends BroadcastKind>(
  kind: K,
  payload: BroadcastPayload<K>,
): MessageEnvelope<K, BroadcastPayload<K>> => ({
  namespace: NAMESPACE,
  kind,
  payload,
  sentAt: new Date().toISOString(),
});

/** Guard to distinguish our namespaced messages from foreign runtime messages. */
export const isMangaTranslatorMessage = (
  message: unknown,
): message is MessageEnvelope<string, unknown> =>
  typeof message === 'object' &&
  message !== null &&
  'namespace' in message &&
  (message as Record<string, unknown>).namespace === NAMESPACE &&
  'kind' in message &&
  typeof (message as Record<string, unknown>).kind === 'string';
