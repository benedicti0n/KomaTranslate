import {
  EXTENSION_NAME,
  isMangaTranslatorMessage,
  Ok,
  type MessageKind,
  type MessageRequest,
  type MessageResponse,
} from '@manga-translator/shared';

const log = (...args: unknown[]): void => {
  // eslint-disable-next-line no-console
  console.log(`[${EXTENSION_NAME} offscreen]`, ...args);
};

const handleInit = (): MessageResponse<'offscreen:init'> =>
  Ok({ initialized: true });

const handleEcho = (
  payload: MessageRequest<'offscreen:echo'>,
): MessageResponse<'offscreen:echo'> => Ok({ echoed: payload.message });

const handleMessage = (
  kind: MessageKind,
  payload: MessageRequest<MessageKind>,
): MessageResponse<MessageKind> => {
  switch (kind) {
    case 'offscreen:init':
      return handleInit() as MessageResponse<MessageKind>;
    case 'offscreen:echo':
      return handleEcho(payload as MessageRequest<'offscreen:echo'>) as MessageResponse<MessageKind>;
    default:
      return {
        ok: false,
        error: `Unhandled offscreen message: ${kind}`,
      } as MessageResponse<MessageKind>;
  }
};

const init = (): void => {
  log('Offscreen document initialized');

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isMangaTranslatorMessage(message)) {
      return false;
    }

    Promise.resolve(
      handleMessage(
        message.kind as MessageKind,
        message.payload as MessageRequest<MessageKind>,
      ),
    )
      .then((response) => sendResponse(response))
      .catch((error: unknown) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      );

    return true;
  });

  // Notify background that the offscreen context is ready.
  void chrome.runtime.sendMessage({
    namespace: 'mangaTranslator',
    kind: 'offscreen:ready',
    payload: {},
    sentAt: new Date().toISOString(),
  });
};

init();
