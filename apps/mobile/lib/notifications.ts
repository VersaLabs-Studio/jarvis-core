// D6: Push notification initialization
// - Foreground display handler
// - Android channel (small icon)
// - Permission request
// - Push token registration (stub on Expo Go; POST /api/push-tokens when available)
// - WS 'notification' subscription -> local scheduleNotificationAsync
// - Tapped-notification response listener -> deep-link to chat session
//
// D-SEC-1: no service-role key, no secrets. Push token is a delivery address.
// D-WS-1: reuses getWs() from lib/websocket — no second WebSocket.
// D-P6-1: zero `any`. Strict types only.

import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { getWs } from './websocket';
import { api } from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WsNotificationPayload {
  title?: string;
  body?: string;
  session_id?: string;
}

type NotificationResponseSubscription = ReturnType<
  typeof Notifications.addNotificationResponseReceivedListener
>;

// ---------------------------------------------------------------------------
// Idempotency guard
// Calling initNotifications() more than once is a no-op (StrictMode-safe).
// The cleanup() returned on the second call is itself a no-op.
// ---------------------------------------------------------------------------

let _initialized = false;

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export function initNotifications(): () => void {
  if (_initialized) {
    return () => {};
  }
  _initialized = true;

  // 1) Foreground handler — display notifications while the app is in focus.
  // expo-notifications 0.32.x: shouldShowBanner + shouldShowList are REQUIRED;
  // shouldShowAlert is deprecated but kept for back-compat.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  // 2) Android channel — channels are an Android-only concept. The smallIcon
  // for the app is configured via app.json (android.notification.icon), not
  // here (NotificationChannelInput in expo-notifications@0.32 has no smallIcon).
  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // 3) Permission request — only ask if not already granted.
  void (async () => {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  })();

  // 4) Push token registration.
  // Expo Go does not support remote push — Phase F
  void (async () => {
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: undefined,
      });
      const token = tokenData?.data;
      if (!token) return;

      // Endpoint may not exist yet (Phase F carryover). Log and continue.
      try {
        await api.post('/api/push-tokens', { token });
      } catch {
        console.log(
          '[notifications] /api/push-tokens endpoint not available (Phase F carryover). Token:',
          token,
        );
      }
    } catch {
      console.log(
        '[notifications] Push token registration deferred to Phase F (Expo Go does not support remote push)',
      );
    }
  })();

  // 5) WS 'notification' subscription — forward server pushes to local UI.
  const unsubscribeWs = getWs().on('notification', (data) => {
    const payload = (data ?? {}) as WsNotificationPayload;
    const title = payload.title ?? 'Jarvis';
    const body = payload.body ?? '';
    const sessionId = payload.session_id;

    void Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: sessionId ? { session_id: sessionId } : {},
      },
      trigger: null,
    });
  });

  // 6) Tapped-notification response listener — deep-link into chat session.
  // jarvis://chat/session/[id] is routable once Agent B lands
  // app/(tabs)/chat/session/[id].tsx. Linking.openURL is a string-based runtime
  // call, so typecheck does not depend on the route file existing yet.
  const responseSubscription: NotificationResponseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const sessionId = data?.session_id as string | undefined;
      if (sessionId) {
        void Linking.openURL(`jarvis://chat/session/${sessionId}`);
      }
    });

  // Cleanup
  return () => {
    _initialized = false;
    unsubscribeWs();
    responseSubscription.remove();
  };
}
