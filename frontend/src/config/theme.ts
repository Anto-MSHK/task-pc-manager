import type { ThemeConfig } from 'antd';

const accent = '#575ad0';
const accentHover = '#777af2';
const accentActive = '#4a4db8';
const accentBg = '#1e1b4f';
const accentBgHover = '#292466';
const accentText = '#b7b9ff';

export const theme: ThemeConfig = {
  token: {
    colorPrimary: accent,
    colorPrimaryBg: accentBg,
    colorPrimaryBgHover: accentBgHover,
    colorPrimaryBorder: accent,
    colorPrimaryBorderHover: accentHover,
    colorPrimaryHover: accentHover,
    colorPrimaryActive: accentActive,
    colorPrimaryText: accentText,
    colorPrimaryTextHover: '#d7d8ff',
    colorPrimaryTextActive: accentText,
    colorInfo: accent,
    colorInfoBg: accentBg,
    colorInfoBgHover: accentBgHover,
    colorInfoBorder: accent,
    colorInfoBorderHover: accentHover,
    colorInfoHover: accentHover,
    colorInfoActive: accentActive,
    colorInfoText: accentText,
    colorInfoTextHover: '#d7d8ff',
    colorInfoTextActive: accentText,
    colorLink: accentText,
    colorLinkHover: '#d7d8ff',
    colorLinkActive: accentHover,
    borderRadius: 14,
    colorBgBase: '#09090b',
    colorTextBase: '#e4e4e7',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  components: {
    Layout: {
      bodyBg: '#09090b',
      headerBg: 'rgba(24, 24, 27, 0.82)',
      siderBg: 'rgba(24, 24, 27, 0.92)',
    },
    Card: {
      colorBgContainer: 'rgba(39, 39, 42, 0.68)',
    },
    Table: {
      colorBgContainer: 'rgba(24, 24, 27, 0.72)',
      headerBg: 'rgba(39, 39, 42, 0.95)',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      itemBorderRadius: 12,
      itemHeight: 42,
      itemMarginInline: 0,
      itemMarginBlock: 3,
    },
  },
};
