import { Platform } from "react-native";
import { Pedometer } from "expo-sensors";
import { authorizePedometer, loadPedometer } from "./pedometer-core";

function requireIPhone() {
  if (Platform.OS !== "ios")
    throw new Error(
      "Skritthistorikken er tilgjengelig på iPhone. Du kan bruke demodata på andre plattformer.",
    );
}
export async function authorizePhoneSteps() {
  requireIPhone();
  await authorizePedometer(Pedometer);
}
export async function loadPhoneSteps() {
  requireIPhone();
  return loadPedometer(Pedometer);
}
export function observePhoneSteps(onChange: () => void) {
  if (Platform.OS !== "ios") return () => {};
  let stopped = false,
    lastRefresh = Date.now(),
    timer: ReturnType<typeof setTimeout> | undefined;
  let subscription: ReturnType<typeof Pedometer.watchStepCount> | undefined;
  void Pedometer.getPermissionsAsync()
    .then(async (permission) => {
      if (
        !permission.granted ||
        stopped ||
        !(await Pedometer.isAvailableAsync()) ||
        stopped
      )
        return;
      subscription = Pedometer.watchStepCount(() => {
        // Watch counts are relative to subscription start. Never add them to a
        // historical total: re-query Core Motion, throttled to once per 30 seconds.
        if (stopped || timer) return;
        timer = setTimeout(
          () => {
            timer = undefined;
            if (!stopped) {
              lastRefresh = Date.now();
              onChange();
            }
          },
          Math.max(0, 30000 - (Date.now() - lastRefresh)),
        );
      });
    })
    .catch(() => {});
  return () => {
    stopped = true;
    clearTimeout(timer);
    subscription?.remove();
  };
}
