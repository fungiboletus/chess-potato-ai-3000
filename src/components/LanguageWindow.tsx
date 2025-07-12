import React from 'react';
import { useTranslation } from 'react-i18next';
import { DraggableWindow } from './DraggableWindow';
import 'flag-icons/css/flag-icons.min.css';

interface LanguageWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onMouseDown?: () => void;
}

const LANGUAGES = [
  { code: 'fr', name: 'Français', flag: 'fr' },
  { code: 'en', name: 'English', flag: 'gb' },
  { code: 'no', name: 'Norsk', flag: 'no' },
  { code: 'es', name: 'Español', flag: 'es' },
];

export const LanguageWindow: React.FC<LanguageWindowProps> = ({
  isOpen,
  onClose,
  onMouseDown,
}) => {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  const getCenterPosition = () => {
    const windowWidth = 300;
    const windowHeight = 250;
    return {
      x: Math.max(0, (window.innerWidth - windowWidth) / 2),
      y: Math.max(0, (window.innerHeight - windowHeight) / 2),
    };
  };

  return (
    <DraggableWindow
      className="language-window"
      title={t('language.title')}
      isOpen={isOpen}
      onClose={onClose}
      onMouseDown={onMouseDown}
      defaultPosition={getCenterPosition()}
    >
      <div className="language-content">
        <fieldset>
          <legend>{t('language.select')}</legend>
          {LANGUAGES.map((lang) => (
            <div key={lang.code} className="field-row">
              <input
                id={`language-${lang.code}`}
                type="radio"
                name="language-selection"
                value={lang.code}
                checked={i18n.language === lang.code}
                onChange={() => handleLanguageChange(lang.code)}
              />
              <label htmlFor={`language-${lang.code}`} className="language-label">
                <span className={`fi fi-${lang.flag}`} />
                <span className="language-name">{lang.name}</span>
              </label>
            </div>
          ))}
        </fieldset>
      </div>
    </DraggableWindow>
  );
};
