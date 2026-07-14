import type { ThemeConfig } from "antd";

/**
 * Direction B — "Optical Instrument".
 * antd is the interaction/accessibility substrate; the visual identity comes
 * from these tokens (CSS-variable theme) plus sandbox/design.css. The goal is a
 * precise, light instrument look — cool white, graphite ink, one lens-blue —
 * that reads as nothing like default antd.
 */
export const opticalTheme: ThemeConfig = {
  // antd 6 emits CSS variables by default — no cssVar flag needed.
  token: {
    colorPrimary: "#1466B3", // lens blue
    colorInfo: "#1466B3",
    colorError: "#D4483F", // the single reticle red
    colorLink: "#1466B3",
    colorTextBase: "#141A1E", // graphite
    colorText: "#141A1E",
    colorTextSecondary: "#5B666D",
    colorTextTertiary: "#7C868C",
    colorBorder: "#D3DADE",
    colorBorderSecondary: "#E5EAED",
    colorBgContainer: "#FFFFFF",
    colorBgElevated: "#FFFFFF",
    colorBgLayout: "#EEF1F3",
    borderRadius: 10,
    borderRadiusLG: 12,
    fontFamily:
      "'Inter', system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    fontSize: 15,
    controlHeight: 42,
    controlHeightLG: 50,
    lineWidth: 1,
    wireframe: false,
  },
  components: {
    Segmented: {
      trackBg: "#EEF1F3",
      itemSelectedBg: "#1466B3",
      itemSelectedColor: "#FFFFFF",
      itemHoverBg: "#E3EEF8",
      itemHoverColor: "#141A1E",
      trackPadding: 4,
      borderRadius: 10,
      borderRadiusSM: 8,
      controlHeight: 46,
    },
    Button: {
      fontWeight: 600,
      primaryShadow: "none",
      defaultShadow: "none",
      controlHeightLG: 52,
    },
    Card: { colorBgContainer: "#FFFFFF", boxShadowTertiary: "none" },
    Alert: { borderRadiusLG: 10 },
    Collapse: { headerPadding: "8px 0", contentPadding: "4px 0 0" },
    Progress: { defaultColor: "#1466B3" },
    Slider: { trackBg: "#1466B3", handleColor: "#1466B3" },
  },
};
