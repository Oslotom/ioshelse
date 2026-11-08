import { useColorScheme } from "react-native";
export const colors = {
  mint: "#46DD9C",
  blue: "#85A9D0",
  lightBlue: "#DDEDFD",
  lightMint: "#ADEDE1",
  coral: "#D995A5",
  lavender: "#85A9D0",
  orange: "#D8B681",
};
export type Appearance = "light" | "dark" | "system";
export function useTheme(appearance: Appearance = "light") {
  const system = useColorScheme(),
    dark =
      appearance === "dark" || (appearance === "system" && system === "dark");
  return {
    ...colors,
    dark,
    background: dark ? "#111418" : "#F9FDFF",
    card: dark ? "#1C2128" : "#ECF5FC",
    text: dark ? "#F9FDFF" : "#263748",
    secondary: dark ? "#A5ADB9" : "#7F94A7",
    track: dark ? "#2B323B" : "#DDEDFD",
  };
}
export type Theme = ReturnType<typeof useTheme>;
