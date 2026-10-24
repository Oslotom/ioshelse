import { useColorScheme } from "react-native";
export const colors = {
  mint: "#39B8A5",
  coral: "#FF647C",
  lavender: "#8175E8",
  orange: "#F4A261",
};
export type Appearance = "light" | "dark" | "system";
export function useTheme(appearance: Appearance = "light") {
  const system = useColorScheme(),
    dark =
      appearance === "dark" || (appearance === "system" && system === "dark");
  return {
    ...colors,
    dark,
    background: dark ? "#111418" : "#F7F8FA",
    card: dark ? "#1C2128" : "#FFFFFF",
    text: dark ? "#F7F8FA" : "#15171B",
    secondary: dark ? "#A5ADB9" : "#727C89",
    track: dark ? "#2B323B" : "#EDF1F4",
  };
}
export type Theme = ReturnType<typeof useTheme>;
