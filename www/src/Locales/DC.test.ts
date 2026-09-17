import { describe, expect, it } from 'vitest';
import en from './en/Index';
import zhCN from './zh-CN/Index';
import ptBR from './pt-BR/Index';
import deDE from './de-DE/Index';
import jaJP from './ja-JP/Index';
import koKR from './ko-KR/Index';
import esMX from './es-MX/Index';
import trTR from './tr-TR/Index';
import frFR from './fr-FR/Index';

// The DC namespace only ever shipped for English. i18next's fallbackLng: 'en'
// hid that silently — every other language just kept showing English DC
// strings instead of erroring — so this asserts real parity instead of
// trusting the fallback not to be needed.
const locales: Record<string, unknown> = {
  'zh-CN': zhCN,
  'pt-BR': ptBR,
  'de-DE': deDE,
  'ja-JP': jaJP,
  'ko-KR': koKR,
  'es-MX': esMX,
  'tr-TR': trTR,
  'fr-FR': frFR,
};

describe('DC namespace locale parity', () => {
  const enDC = en.DC as Record<string, string>;
  const enKeys = Object.keys(enDC).sort();

  it.each(Object.entries(locales))('%s registers a DC namespace', (_code, locale) => {
    expect((locale as Record<string, unknown>).DC).toBeDefined();
  });

  it.each(Object.entries(locales))(
    '%s DC namespace has the same keys as en',
    (_code, locale) => {
      const dc = (locale as { DC?: Record<string, string> }).DC ?? {};
      expect(Object.keys(dc).sort()).toEqual(enKeys);
    },
  );

  it.each(Object.entries(locales))(
    '%s DC namespace preserves interpolation placeholders from en',
    (_code, locale) => {
      const dc = (locale as { DC?: Record<string, string> }).DC ?? {};
      for (const key of enKeys) {
        const enPlaceholders = (enDC[key].match(/\{\{\w+\}\}/g) ?? []).sort();
        const localePlaceholders = (dc[key]?.match(/\{\{\w+\}\}/g) ?? []).sort();
        expect(localePlaceholders).toEqual(enPlaceholders);
      }
    },
  );
});
