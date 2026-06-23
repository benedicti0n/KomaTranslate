import {
  buildBroadcast,
  buildMessage,
  isMangaTranslatorMessage,
  type MessageKind,
  type MessageRequest,
  type MessageResponse,
  type BroadcastKind,
  type BroadcastPayload,
} from '@manga-translator/shared';

/** Sends a typed request from a non-background context to the background service worker. */
export const sendMessage = async <K extends MessageKind>(
  kind: K,
  payload: MessageRequest<K>,
): Promise<MessageResponse<K>> => {
  const envelope = buildMessage(kind, payload);
  const response = (await chrome.runtime.sendMessage(envelope)) as
    | MessageResponse<K>
    | undefined;

  if (response === undefined) {
    return {
      ok: false,
      error: 'No response from background service worker',
    } as MessageResponse<K>;
  }

  return response;
};

/** Broadcasts a one-way message to all extension contexts. */
export const broadcastMessage = async <K extends BroadcastKind>(
  kind: K,
  payload: BroadcastPayload<K>,
): Promise<void> => {
  const envelope = buildBroadcast(kind, payload);
  await chrome.runtime.sendMessage(envelope);
};

/**
 * Registers a typed message handler in the background service worker.
 *
 * The handler map keys are the declared message kinds. Unknown messages are
 * forwarded to any fallback handler if provided.
 */
export type BackgroundHandler<K extends MessageKind> = (
  payload: MessageRequest<K>,
  sender: chrome.runtime.MessageSender,
) => Promise<MessageResponse<K>> | MessageResponse<K>;

export type BackgroundHandlerMap = {
  [K in MessageKind]?: BackgroundHandler<K>;
};

export const registerBackgroundHandlers = (
  handlers: BackgroundHandlerMap,
): (() => void) => {
  const listener = (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void,
  ): boolean => {
    if (!isMangaTranslatorMessage(message)) {
      return false;
    }

    const handler = handlers[message.kind as MessageKind];
    if (!handler) {
      return false;
    }

    Promise.resolve(handler(message.payload as never, sender))
      .then((response) => sendResponse(response))
      .catch((error: unknown) => {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return true;
  };

  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
};

/** Registers a handler for broadcast messages in any context. */
export const onBroadcast = <K extends BroadcastKind>(
  kind: K,
  handler: (payload: BroadcastPayload<K>) => void,
): (() => void) => {
  const listener = (message: unknown): void => {
    if (isMangaTranslatorMessage(message) && message.kind === kind) {
      handler(message.payload as BroadcastPayload<K>);
    }
  };

  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
};
