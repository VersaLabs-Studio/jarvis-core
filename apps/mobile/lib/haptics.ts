// D6: Centralized haptics — semantic names, not raw Haptics.* calls.
// Use this in every screen/hook to keep haptic feedback consistent.

import * as Haptics from 'expo-haptics';

export const haptics = {
  /** Subtle tap / keypress / list-item selection. */
  light(): void {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  /** Strong confirmation — primary actions like "Trigger" workflow. */
  heavy(): void {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },

  /** Non-blocking warning. */
  warning(): void {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },

  /** Confirmation — created, saved, deleted, trigger succeeded. */
  success(): void {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },

  /** Failure — error, validation fail, trigger rejected. */
  error(): void {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },
};
