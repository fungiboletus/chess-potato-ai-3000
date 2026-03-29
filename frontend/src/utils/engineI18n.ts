import i18n from '../i18n/i18n';
import type { EngineInfo } from '../services/mcpClient';

const resolveLocalizedText = (
  localizedValues: Record<string, string> | null | undefined,
  fallbackValue: string
): string => {
  if (!localizedValues || Object.keys(localizedValues).length === 0) {
    return fallbackValue;
  }

  const languagesToTry = [
    i18n.resolvedLanguage,
    i18n.language,
    ...i18n.languages,
  ].filter((language): language is string => Boolean(language));

  for (const language of languagesToTry) {
    const exactMatch = localizedValues[language];
    if (exactMatch) {
      return exactMatch;
    }

    const baseLanguage = language.split('-')[0];
    const baseMatch = localizedValues[baseLanguage];
    if (baseMatch) {
      return baseMatch;
    }
  }

  return localizedValues.en ?? fallbackValue;
};

export const getEngineDisplayName = (engine: EngineInfo): string => {
  return engine.display_name;
};

export const getEngineDescription = (engine: EngineInfo): string => {
  return resolveLocalizedText(engine.description_i18n, engine.description);
};

export const getEngineDisplayNameByName = (
  engineName: string | null,
  availableEngines: EngineInfo[],
  fallbackDisplayName?: string | null
): string | null => {
  if (!engineName) {
    return null;
  }

  const engine = availableEngines.find(item => item.name === engineName);
  if (engine) {
    return engine.display_name;
  }

  return fallbackDisplayName ?? engineName;
};