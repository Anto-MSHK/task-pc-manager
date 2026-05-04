import type { ThemeConfig } from 'antd';

/** Single source of truth — keep in sync with `global.css` :root vars. */
const accent        = '#a855f7';
const accentHover   = '#c084fc';
const accentActive  = '#9333ea';
const accentSoft    = '#d8b4fe';
const accentBg      = 'rgba(55, 32, 72, 0.55)';
const accentBgHover = 'rgba(72, 42, 92, 0.62)';
const accentText    = '#e9d5ff';
const accentShadow  = '0 0 0 2px rgba(168, 85, 247, 0.2)';

/** Dark UI surfaces — neutral cool-dark, no warm tint. */
const bgBase        = '#100e0c';
const bgInput       = 'rgba(18, 14, 26, 0.72)';
const bgCard        = 'rgba(48, 40, 36, 0.62)';
const bgTable       = 'rgba(32, 26, 22, 0.78)';
const bgTableHeader = 'rgba(44, 36, 32, 0.96)';
const bgLayout      = '#100e0c';
const bgHeader      = 'rgba(38, 30, 26, 0.88)';
const bgSider       = 'rgba(32, 26, 22, 0.94)';

/** Borders — cool purple-tinted neutral, override warm-derived defaults. */
const border        = 'rgba(113, 90, 140, 0.45)';
const borderSoft    = 'rgba(113, 90, 140, 0.28)';

export const theme: ThemeConfig = {
  token: {
    colorPrimary:              accent,
    colorPrimaryBg:            accentBg,
    colorPrimaryBgHover:       accentBgHover,
    colorPrimaryBorder:        accent,
    colorPrimaryBorderHover:   accentHover,
    colorPrimaryHover:         accentHover,
    colorPrimaryActive:        accentActive,
    colorPrimaryText:          accentText,
    colorPrimaryTextHover:     '#f3e8ff',
    colorPrimaryTextActive:    accentText,
    colorInfo:                 accent,
    colorInfoBg:               accentBg,
    colorInfoBgHover:          accentBgHover,
    colorInfoBorder:           accent,
    colorInfoBorderHover:      accentHover,
    colorInfoHover:            accentHover,
    colorInfoActive:           accentActive,
    colorInfoText:             accentText,
    colorInfoTextHover:        '#f3e8ff',
    colorInfoTextActive:       accentText,
    colorLink:                 accentHover,
    colorLinkHover:            accentSoft,
    colorLinkActive:           accent,
    colorWarning:              '#fb923c',
    borderRadius:              14,
    colorBgBase:               bgBase,
    colorTextBase:             '#ece8e4',
    colorBorder:               border,
    colorBorderSecondary:      borderSoft,
    colorBgElevated:           'rgba(22, 17, 34, 0.98)',
    colorBgContainer:          bgInput,
    colorFill:                 'rgba(113, 90, 140, 0.12)',
    colorFillSecondary:        'rgba(113, 90, 140, 0.08)',
    colorFillTertiary:         'rgba(113, 90, 140, 0.04)',
    colorFillAlter:            'rgba(18, 14, 26, 0.55)',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  components: {
    Layout: {
      bodyBg:   bgLayout,
      headerBg: bgHeader,
      siderBg:  bgSider,
    },
    Card: {
      colorBgContainer: bgCard,
    },
    Table: {
      colorBgContainer: bgTable,
      headerBg:         bgTableHeader,
    },
    Menu: {
      darkItemBg:        'transparent',
      darkSubMenuItemBg: 'transparent',
      itemBorderRadius:  12,
      itemHeight:        42,
      itemMarginInline:  0,
      itemMarginBlock:   3,
    },
    Input: {
      colorBgContainer: bgInput,
      hoverBorderColor: accentHover,
      activeBorderColor: accent,
      activeShadow:     accentShadow,
    },
    InputNumber: {
      colorBgContainer: bgInput,
      hoverBorderColor: accentHover,
      activeBorderColor: accent,
      activeShadow:     accentShadow,
    },
    DatePicker: {
      colorBgContainer:    bgInput,
      colorBgElevated:     'rgba(22, 18, 32, 0.98)',
      hoverBorderColor:    accentHover,
      activeBorderColor:   accent,
      activeShadow:        accentShadow,
      cellRangeBorderColor: accent,
    },
    Select: {
      colorBgContainer:  bgInput,
      colorBgElevated:   'rgba(22, 18, 32, 0.98)',
      hoverBorderColor:  accentHover,
      activeBorderColor: accent,
      optionSelectedBg:  accentBg,
    },
    Modal: {
      contentBg:    'rgba(22, 17, 34, 0.97)',
      headerBg:     'rgba(22, 17, 34, 0.97)',
      footerBg:     'rgba(22, 17, 34, 0.97)',
      colorBgElevated: 'rgba(22, 17, 34, 0.97)',
    },
    Drawer: {
      colorBgElevated: 'rgba(22, 17, 34, 0.97)',
    },
    Popover: {
      colorBgElevated: 'rgba(22, 17, 34, 0.97)',
    },
    Dropdown: {
      colorBgElevated: 'rgba(22, 17, 34, 0.97)',
    },
    Tooltip: {
      colorBgSpotlight: 'rgba(30, 22, 44, 0.95)',
    },
    Button: {
      defaultBg:                bgInput,
      defaultHoverBg:           'rgba(30, 22, 44, 0.85)',
      defaultActiveBg:          'rgba(40, 28, 56, 0.9)',
      defaultBorderColor:       border,
      defaultHoverBorderColor:  accentHover,
      defaultActiveBorderColor: accent,
      defaultColor:             '#ece8e4',
      defaultHoverColor:        accentSoft,
      defaultActiveColor:       accentSoft,
    },
    Checkbox: {
      colorPrimary:      accent,
      colorPrimaryHover: accentHover,
    },
    Radio: {
      colorPrimary:               accent,
      colorPrimaryHover:          accentHover,
      buttonBg:                   bgInput,
      buttonColor:                '#ece8e4',
      buttonSolidCheckedBg:       accent,
      buttonSolidCheckedHoverBg:  accentHover,
      buttonSolidCheckedActiveBg: accentActive,
      buttonSolidCheckedColor:    '#fff',
    },
    Switch: {
      colorPrimary:      accent,
      colorPrimaryHover: accentHover,
    },
  },
};
