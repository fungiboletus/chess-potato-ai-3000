import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { loadEmittersPlugin } from '@tsparticles/plugin-emitters';
import type { Container, Engine, ISourceOptions } from '@tsparticles/engine';

interface ConfettiParticlesProps {
  show: boolean;
}

export const ConfettiParticles: React.FC<ConfettiParticlesProps> = ({ show }) => {
  const [init, setInit] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void initParticlesEngine(async (engine: Engine) => {
      await loadSlim(engine);
      await loadEmittersPlugin(engine);
    }).then(() => {
      if (isMounted) {
        setInit(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const particlesLoaded = useCallback(async (container?: Container): Promise<void> => {
    if (!container || container.destroyed) {
      return;
    }

    container.play();
  }, []);

  const options = useMemo(
    (): ISourceOptions => ({
      fullScreen: {
        enable: true,
        zIndex: 1
      },
      detectRetina: true,
      particles: {
        number: {
          value: 0
        },
        color: {
          value: [
            "#F3632F",
            "#3E87CF",
            "#FAC706",
            "#66C557"
          ]
        },
        shape: {
          type: [
            "circle",
            "square"
          ],
          options: {}
        },
        opacity: {
          value: {
            min: 0,
            max: 1
          },
          animation: {
            enable: true,
            speed: 2,
            startValue: "max" as const,
            destroy: "min" as const
          }
        },
        size: {
          value: {
            min: 2,
            max: 4
          }
        },
        links: {
          enable: false
        },
        life: {
          duration: {
            sync: true,
            value: 5
          },
          count: 1
        },
        move: {
          enable: true,
          gravity: {
            enable: true,
            acceleration: 10
          },
          speed: {
            min: 10,
            max: 20
          },
          decay: 0.1,
          direction: "none" as const,
          straight: false,
          outModes: {
            default: "destroy" as const,
            top: "none" as const
          }
        },
        rotate: {
          value: {
            min: 0,
            max: 360
          },
          direction: "random" as const,
          move: true,
          animation: {
            enable: true,
            speed: 60
          }
        },
        tilt: {
          direction: "random" as const,
          enable: true,
          move: true,
          value: {
            min: 0,
            max: 360
          },
          animation: {
            enable: true,
            speed: 60
          }
        },
        roll: {
          darken: {
            enable: true,
            value: 25
          },
          enable: true,
          speed: {
            min: 15,
            max: 25
          }
        },
        wobble: {
          distance: 30,
          enable: true,
          move: true,
          speed: {
            min: -15,
            max: 15
          }
        }
      },
      emitters: {
        autoPlay: true,
        life: {
          count: 0,
          duration: 0.1,
          delay: 0.4
        },
        rate: {
          delay: 0.1,
          quantity: 150
        },
        size: {
          width: 0,
          height: 0
        }
      }
    }),
    []
  );

  if (!init || !show) {
    return null;
  }

  return (
    <Particles
      id="confetti"
      className="confetti-overlay"
      style={{ pointerEvents: 'none', display: show ? 'block' : 'none' }}
      particlesLoaded={particlesLoaded}
      options={options}
    />
  );
};
