import React, {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useContext,
} from 'react';
import styled, { keyframes, css } from 'styled-components';
import dfstyles from '../../styles/dfstyles';
import WindowManager, {
  TooltipName,
  WindowManagerEvent,
} from '../../utils/WindowManager';
import { CtrlContext, GameWindowZIndex, HiPerfContext } from '../GameWindow';
import { TooltipContent } from './TooltipPanes';

// activate TooltipName on mouseenter, deactivate on mouse leave
type DisplayType = 'inline' | 'block' | 'inline-block' | 'inline-flex' | 'flex';
type TooltipProps = {
  children: React.ReactNode;
  name: TooltipName;
  needsCtrl?: boolean;
  display?: DisplayType;
  style?: React.CSSProperties;
  className?: string;
};

const fade = keyframes`
  from {
    background: ${dfstyles.colors.dfblue}; 
  }
  to {
    background: ${dfstyles.colors.backgroundlight};
  }
`;

const _animation = css`
  animation: ${fade} 1s ${dfstyles.game.styles.animProps};
`;

// ${(props) => (props.anim ? animation : 'animation: none;')}
const StyledTooltipTrigger = styled.span<{
  anim: boolean;
  display?: DisplayType;
}>`
  border-radius: 2px;
  transition: background 0.2s;
  background: ${(props) => (props.anim ? dfstyles.colors.dfblue : 'none')};

  display: ${(props) => props.display || 'inline'};
`;

export function TooltipTrigger({
  children,
  name,
  needsCtrl,
  display,
  style,
  className,
}: TooltipProps) {
  // the model for this is a state machine on the state of {shift, hovering}
  const ctrl = useContext<boolean>(CtrlContext);

  const [hovering, setHovering] = useState<boolean>(false);

  const [pushed, setPushed] = useState<boolean>(false);

  const hiPerf = useContext<boolean | null>(HiPerfContext);

  const windowManager = WindowManager.getInstance();

  // manage state machine
  useEffect(() => {
    const getCtrl = () => {
      if (!needsCtrl) return true;
      else return ctrl;
    };

    if (!pushed) {
      // not pushed yet
      if (hovering && getCtrl()) {
        windowManager.pushTooltip(name);
        setPushed(true);
      }
    } else {
      // is pushed already
      if (!hovering || !getCtrl()) {
        windowManager.popTooltip();
        setPushed(false);
      }
    }
  }, [hovering, ctrl, pushed, windowManager, name, needsCtrl]);

  return (
    <StyledTooltipTrigger
      display={display}
      style={{ ...style }}
      className={className}
      anim={ctrl && !hiPerf}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {children}
    </StyledTooltipTrigger>
  );
}

const StyledTooltip = styled.div<{
  visible: boolean;
}>`
  position: absolute;
  width: fit-content;
  height: fit-content;
  min-height: 1em;
  min-width: 5em;
  border: 1px solid ${dfstyles.colors.text};
  background: ${dfstyles.colors.background};
  padding: 0.5em;
  border-radius: 3px;

  z-index: ${GameWindowZIndex.Tooltip};
  display: ${(props) => (props.visible ? 'block' : 'none')};
`;

export function Tooltip({ hiPerf }: { hiPerf: boolean }) {
  const [top, setTop] = useState<number>(0);
  const [left, setLeft] = useState<number>(0);

  const [visible, setVisible] = useState<boolean>(false);

  const windowManager = WindowManager.getInstance();

  const [current, setCurrent] = useState<TooltipName>(TooltipName.None);

  const [leftOffset, setLeftOffset] = useState<number>(10);
  const [topOffset, setTopOffset] = useState<number>(10);

  const elRef = useRef<HTMLDivElement>(document.createElement('div'));
  const [height, setHeight] = useState<number>(20);
  const [width, setWidth] = useState<number>(20);

  // subscribe to tooltip changes
  useEffect(() => {
    const checkTooltip = () => {
      const current = windowManager.getTooltip();
      setCurrent(current);
    };
    windowManager.on(WindowManagerEvent.TooltipUpdated, checkTooltip);
    return () => {
      windowManager.removeListener(
        WindowManagerEvent.TooltipUpdated,
        checkTooltip
      );
    };
  }, [windowManager]);

  // sync visible to current tooltip
  useEffect(() => {
    const checkTooltip = () => {
      const current = windowManager.getTooltip();
      if (current === TooltipName.None) setVisible(false);
      else setVisible(true);
    };

    windowManager.on(WindowManagerEvent.TooltipUpdated, checkTooltip);

    return () => {
      windowManager.removeListener(
        WindowManagerEvent.TooltipUpdated,
        checkTooltip
      );
    };
  }, [windowManager, height, width]);

  // sync mousemove event
  useEffect(() => {
    const doMouseMove = (e: MouseEvent) => {
      if (!visible) return;
      setLeft(e.clientX);
      setTop(e.clientY);
    };

    if (visible) {
      window.addEventListener('mousemove', doMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', doMouseMove);
    };
  }, [visible]);

  // sync size to content size
  useLayoutEffect(() => {
    setHeight(elRef.current.offsetHeight);
    setWidth(elRef.current.offsetWidth);
  }, [elRef.current.offsetHeight, elRef, visible]);

  // point it in the right direction based on quadrant
  useLayoutEffect(() => {
    if (left < window.innerWidth / 2) {
      setLeftOffset(10);
    } else {
      setLeftOffset(-10 - width);
    }

    if (top < window.innerHeight / 2) {
      setTopOffset(10);
    } else {
      setTopOffset(-10 - height);
    }
  }, [left, top, width, height]);

  if (hiPerf) return <div ref={elRef} style={{ display: 'none' }}></div>;

  return (
    <StyledTooltip
      ref={elRef}
      onMouseEnter={(e) => e.preventDefault()}
      onMouseLeave={(e) => e.preventDefault()}
      style={{
        top: `${top + topOffset}px`,
        left: `${left + leftOffset}px`,
      }}
      visible={visible}
    >
      <TooltipContent name={current} />
    </StyledTooltip>
  );
}
