import React from "react";
import { View, Text, Pressable, PressableProps, GestureResponderEvent } from "react-native";
import { MotiView } from "moti";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { AlertCircle, Inbox } from "lucide-react-native";
import { colors } from "@/theme/colors";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// 1. Shimmer Skeleton
export function Skeleton({ className, width, height, style }: { className?: string; width?: any; height?: any; style?: any }) {
  return (
    <MotiView
      from={{ opacity: 0.4 }}
      animate={{ opacity: 1 }}
      transition={{
        type: "timing",
        duration: 1000,
        loop: true,
      }}
      style={[{ width, height }, style]}
      className={`bg-muted rounded-md ${className || ""}`}
    />
  );
}

// 2. Skeleton Card Silhouette
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <View className={`bg-card rounded-[20px] border border-hairline p-5 mb-3 shadow-md ${className || ""}`}>
      <Skeleton className="h-4 w-1/3 mb-4" />
      <Skeleton className="h-8 w-1/2 mb-2" />
      <Skeleton className="h-4 w-2/3" />
    </View>
  );
}

// 3. Empty State with concentric layout
export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  className,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<any>;
  className?: string;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 15 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 320 }}
      className={`items-center justify-center px-6 py-12 ${className || ""}`}
    >
      <View className="rounded-full bg-accent-subtle p-5 mb-4 border border-hairline items-center justify-center">
        <Icon size={28} color={colors.accent} />
      </View>
      <Text className="text-foreground text-base font-sans font-semibold text-center">{title}</Text>
      <Text className="text-muted-foreground text-sm font-sans mt-2 text-center max-w-[280px]">
        {description}
      </Text>
      {action && <View className="mt-5">{action}</View>}
    </MotiView>
  );
}

// 4. Error State with retry option
export function ErrorState({
  title = "Something went wrong",
  description = "An error occurred while loading data.",
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 15 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 320 }}
      className={`items-center justify-center py-12 px-6 ${className || ""}`}
    >
      <View className="rounded-full bg-dangerSubtle p-5 mb-4 border border-hairline items-center justify-center">
        <AlertCircle size={28} color={colors.danger} />
      </View>
      <Text className="text-foreground text-base font-sans font-semibold text-center">{title}</Text>
      <Text className="text-muted-foreground text-sm font-sans mt-2 text-center max-w-[280px]">
        {description}
      </Text>
      {onRetry && (
        <PressableScale
          onPress={onRetry}
          className="mt-6 border border-accent rounded-xl px-5 py-2.5 bg-transparent"
        >
          <Text className="text-accent text-sm font-sans font-medium">Try again</Text>
        </PressableScale>
      )}
    </MotiView>
  );
}

// 5. Reusable Press Scale animation for Premium interaction feedback
export interface PressableScaleProps extends PressableProps {
  children: React.ReactNode;
}

export function PressableScale({ children, style, ...props }: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (event: GestureResponderEvent) => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 200 });
    props.onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
    props.onPressOut?.(event);
  };

  return (
    <AnimatedPressable
      style={style ? [style as any, animatedStyle] : animatedStyle}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
