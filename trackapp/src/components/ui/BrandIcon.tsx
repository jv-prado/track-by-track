import Svg, { Path } from "react-native-svg";
import { colors } from "@/lib/colors";

/**
 * Porta 1:1 de src/shared/ui/BrandIcon.tsx (web) — mesmo path SVG oficial
 * simplificado (lucide não tem ícone de marca; react-icons foi removido do
 * projeto, CLAUDE.md 5.1, sem reintroduzir). `fill="currentColor"` do web
 * herdava a cor do texto ancestral — react-native-svg não suporta esse
 * keyword, por isso o default aqui é uma cor explícita; passe `color` sempre
 * que o contexto pedir outra.
 */
export interface BrandIconProps {
  size?: number;
  color?: string;
}

export function SpotifyIcon({ size = 14, color = colors.branco }: BrandIconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
      <Path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.18-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.3.421-1.02.6-1.56.301z" />
    </Svg>
  );
}

export function YoutubeIcon({ size = 14, color = colors.branco }: BrandIconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
      <Path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </Svg>
  );
}

export function AppleMusicIcon({ size = 14, color = colors.branco }: BrandIconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
      <Path d="M23.997 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043A5.022 5.022 0 0 0 19.845.1a13.4 13.4 0 0 0-2.6-.088H6.812c-.554 0-1.107.014-1.66.045a5.874 5.874 0 0 0-1.44.19A5.03 5.03 0 0 0 .78 2.53a5.6 5.6 0 0 0-.7 1.81 9.317 9.317 0 0 0-.088 1.14C0 5.87 0 6.26 0 6.65v10.7c0 .39 0 .78.01 1.17.007.38.03.76.088 1.14a5.6 5.6 0 0 0 .7 1.81 5.03 5.03 0 0 0 2.933 2.195c.472.11.951.171 1.44.19.553.031 1.106.045 1.66.045h10.433c.87.006 1.74-.033 2.6-.088a5.022 5.022 0 0 0 1.732-.791c1.118-.733 1.863-1.733 2.18-3.043.146-.72.228-1.452.24-2.19.01-.39.01-.78.01-1.17V7.294c0-.39 0-.78-.01-1.17zM9.75 16.5a1.75 1.75 0 1 1-1.5-1.732V9.15c0-.45.3-.75.72-.84l5.79-1.29c.45-.09.99.24.99.81v6.42a1.75 1.75 0 1 1-1.5-1.732V9.87l-4.5 1v5.63z" />
    </Svg>
  );
}
