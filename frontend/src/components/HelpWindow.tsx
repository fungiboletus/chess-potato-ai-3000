import React, { useCallback, useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { DraggableWindow } from './DraggableWindow';
import { publicAssetUrl } from '../utils/publicAssetUrl';

const REPOSITORY_URL = 'https://github.com/fungiboletus/chess-potato-ai-3000';
const AUTHOR_URL = 'https://github.com/fungiboletus';
const BLOG_POST_URL = REPOSITORY_URL;

const OPEN_SOURCE_LINKS = [
  {
    href: 'https://jdan.github.io/98.css/',
    labelKey: 'help.links.98css',
  },
  {
    href: 'https://github.com/lichess-org/chessground',
    labelKey: 'help.links.chessground',
  },
  {
    href: 'https://stockfishchess.org/',
    labelKey: 'help.links.stockfish',
  },
  {
    href: 'https://github.com/rotolonico/Badfish',
    labelKey: 'help.links.badfish',
  },
  {
    href: 'https://github.com/mikimasn/worstfish',
    labelKey: 'help.links.worstfish',
  },
  {
    href: 'https://github.com/fungiboletus/chess-potato-random',
    labelKey: 'help.links.random',
  },
  {
    href: 'https://github.com/fungiboletus/chess-potato-alphabet-42',
    labelKey: 'help.links.alphabet',
  },
] as const;

interface HelpWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onMouseDown?: () => void;
  windowId?: string;
  zIndex?: number;
}

export const HelpWindow: React.FC<HelpWindowProps> = ({
  isOpen,
  onClose,
  onMouseDown,
  windowId,
  zIndex,
}) => {
  const { t } = useTranslation();

  const WINDOW_WIDTH = 350;
  // Position window on the left side of the screen
  const getLeftSidePosition = useCallback(() => {

    // 50px from the right edge
    const innerWidth = window.innerWidth;
    const innerHeight = window.innerHeight;
    const leftEdge = Math.max(0, innerWidth - WINDOW_WIDTH - 100);
    const topEdge = Math.max(0, (innerHeight - 500) / 2);

    return {
      x: leftEdge,
      y: topEdge,
    };
  }, []);

  const defaultPosition = useMemo(
    () => getLeftSidePosition(),
    [getLeftSidePosition]
  );

  return (
    <DraggableWindow
      className="help-window"
      title={t('help.title')}
      isOpen={isOpen}
      onClose={onClose}
      onMouseDown={onMouseDown}
      defaultPosition={defaultPosition}
      windowId={windowId}
      zIndex={zIndex}
    >
      <div className="help-content text-selectable">
        <div className="field-border">
          <div className="help-scroll-area">
            <div className="help-section">
              {t('help.intro_paragraph_one')}
            </div>

            <h3 className="help-heading">
              {t('help.blog_heading')}
            </h3>

            <div className="help-section help-blog-section">
              {t('help.intro_paragraph_two')}<br />
              <a href={BLOG_POST_URL} target="_blank" rel="noreferrer noopener">
                {t('help.blog_link_label')}
              </a>
            </div>

            <div className="help-section">
              <Trans
                i18nKey="help.intro_paragraph_three"
                components={[<em key="science" />]}
              />
            </div>

            <h3 className="help-heading">
              {t('help.acknowledgments_heading')}
            </h3>

            <ul className="help-link-list help-section">
              {OPEN_SOURCE_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} target="_blank" rel="noreferrer noopener">
                    {t(link.labelKey)}
                  </a>
                </li>
              ))}
            </ul>

            <h3 className="help-heading">
              {t('help.repository_heading')}
            </h3>

            <ul className="help-link-list help-section">
              <li>
                <a href={REPOSITORY_URL} target="_blank" rel="noreferrer noopener">
                  {t('help.repository_link_label')}
                </a>
              </li>
            </ul>

            <h3 className="help-heading">
              {t('help.hosting_heading')}
            </h3>

            <ul className="help-link-list help-section">
              <li>
                <a href="https://www.sintef.no" target="_blank" rel="noreferrer noopener">
                  {t('help.hosting_link_label')}
                </a>
              </li>
            </ul>

            <h3 className="help-heading">
              {t('help.author_heading')}
            </h3>

            <ul className="help-link-list help-section">
              <li>
                <a href={AUTHOR_URL} target="_blank" rel="noreferrer noopener">
                  {t('help.author_link_label')}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <button
          type="button"
          className="buy-house-button"
          onClick={() => {
            window.open(
              'https://www.finn.no/realestate/homes/search.html?filters&sort=PRICE_DESC&property_type=1',
              '_blank',
              'noopener,noreferrer'
            );
          }}
        >
          <img src={publicAssetUrl('house2.png')} alt="" height="16" width="16" />
          {t('help.buy_me_a_house')}
        </button>
      </div>
    </DraggableWindow>
  );
};
