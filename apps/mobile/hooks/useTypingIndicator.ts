import { useCallback, useState } from 'react';
import { getSharedWs, useWebSocketListener } from '@/hooks/useWebSocket';

/** Send a typing indicator over WebSocket. */
function emitTypingIndicator(matchId: string, typing: boolean): void {
  getSharedWs()?.send(
    JSON.stringify({
      type: typing ? 'typing_start' : 'typing_stop',
      payload: { matchId },
    }),
  );
}

export function useTypingIndicator(matchId?: string) {
  const [isTyping, setIsTyping] = useState(false);

  // Listen for typing events on the shared WebSocket
  useWebSocketListener((data) => {
    if (data.type === 'typing_start' || data.type === 'typing_stop') {
      const typingMatchId = data.payload.matchId as string;
      if (matchId && typingMatchId === matchId) {
        setIsTyping(data.type === 'typing_start');
      }
    }
  });

  const sendTyping = useCallback(
    (typing: boolean) => {
      if (!matchId) return;
      emitTypingIndicator(matchId, typing);
    },
    [matchId],
  );

  return {
    isTyping,
    sendTyping,
  };
}
