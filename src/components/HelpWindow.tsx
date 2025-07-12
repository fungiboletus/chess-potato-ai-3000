import React from 'react';
import { useTranslation } from 'react-i18next';
import { DraggableWindow } from './DraggableWindow';

interface HelpWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onMouseDown?: () => void;
}

export const HelpWindow: React.FC<HelpWindowProps> = ({
  isOpen,
  onClose,
  onMouseDown,
}) => {
  const { t } = useTranslation();

  const WINDOW_WIDTH = 350;
  // Position window on the left side of the screen
  const getLeftSidePosition = () => {

    // 50px from the right edge
    const innerWidth = window.innerWidth;
    const innerHeight = window.innerHeight;
    const leftEdge = Math.max(0, innerWidth - WINDOW_WIDTH - 100);
    const topEdge = Math.max(0, (innerHeight - 500) / 2);

    return {
      x: leftEdge,
      y: topEdge,
    };
  };

  return (
    <DraggableWindow
      className="help-window"
      title={t('help.title')}
      isOpen={isOpen}
      onClose={onClose}
      onMouseDown={onMouseDown}
      defaultPosition={getLeftSidePosition()}
    >
      <div className="help-content">
        <h3 className="help-heading">
          {t('help.how_to_play')}
        </h3>

        <div className="help-section">
          <strong>{t('help.goal')}</strong> {t('help.goal_text')}<br />
          <strong>{t('help.ai')}</strong> {t('help.ai_text')}<br />
          <strong>{t('help.color')}</strong> {t('help.color_text')}
        </div>

        <h3 className="help-heading">
          {t('help.keyboard_shortcuts')}
        </h3>

        <div className="help-shortcuts">
          <strong>H</strong> - {t('help.shortcut_h')}<br />
          <strong>N</strong> - {t('help.shortcut_n')}<br />
          <strong>?</strong> - {t('help.shortcut_help')}
        </div>

        <h3 className="help-heading">
          {t('help.windows')}
        </h3>

        <div className="help-section">
          • <strong>{t('help.move_history')}</strong> {t('help.move_history_text')}<br />
          • <strong>{t('help.result_window')}</strong> {t('help.result_window_text')}<br />
          • <strong>{t('help.draggable')}</strong> {t('help.draggable_text')}<br />
          • <strong>{t('help.persistent')}</strong> {t('help.persistent_text')}
        </div>

        <div className="help-footer">
          {t('help.footer')}
        </div>
      </div>
    </DraggableWindow>
  );
};
