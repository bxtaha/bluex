"use client";

import * as React from "react";
import { useState, useRef, useLayoutEffect, useCallback } from "react";

export interface TabItem {
  icon: React.ReactNode;
  color: string;
}

export interface AnimatedTabBarProps {
  items: TabItem[];
  defaultIndex?: number;
  onTabChange?: (index: number) => void;
}

export const AnimatedTabBar: React.FC<AnimatedTabBarProps> = ({
  items,
  defaultIndex = 0,
  onTabChange,
}) => {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  // Frozen at mount: the flare's resting `left` must never change after the
  // first paint, or the browser would jump it there instead of animating the
  // `transform` (only `transform` is transitioned). State rather than a ref
  // because it is read during render.
  const [initialIndex] = useState(defaultIndex);
  const menuRef = useRef<HTMLMenuElement>(null);
  const menuBorderRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const offsetMenuBorder = useCallback(() => {
    const activeItem = itemRefs.current[activeIndex];
    const menu = menuRef.current;
    const menuBorder = menuBorderRef.current;

    if (activeItem && menu && menuBorder) {
      const offsetActiveItem = activeItem.getBoundingClientRect();
      const target =
        offsetActiveItem.left -
        menu.getBoundingClientRect().left -
        (menuBorder.offsetWidth - offsetActiveItem.width) / 2;
      // The element carries a non-zero inline `left` for correct first paint,
      // so translate by the delta from that resting position rather than from 0.
      const left = Math.floor(target - menuBorder.offsetLeft);
      menuBorder.style.transform = `translate3d(${left}px, 0, 0)`;
    }
  }, [activeIndex]);

  useLayoutEffect(() => {
    offsetMenuBorder();
    const handleResize = () => {
      if (menuRef.current) {
        menuRef.current.style.setProperty("--timeOut", "none");
      }
      offsetMenuBorder();
    };

    window.addEventListener("resize", handleResize);

    // The bar is sized in `em`, so tab widths shift once webfonts swap in.
    // Re-measure then, otherwise the flare stays at its pre-font position.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) offsetMenuBorder();
    });

    return () => {
      cancelled = true;
      window.removeEventListener("resize", handleResize);
    };
  }, [offsetMenuBorder]);

  const handleItemClick = (index: number) => {
    if (menuRef.current) {
      menuRef.current.style.removeProperty("--timeOut");
    }
    if (activeIndex === index) return;
    setActiveIndex(index);
    onTabChange?.(index);
  };

  return (
    <>
      <div className="svg-container">
        <svg viewBox="0 0 202.9 45.5">
          <clipPath
            id="menu-clip-path"
            clipPathUnits="objectBoundingBox"
            transform="scale(0.0049285362247413 0.021978021978022)"
          >
            <path
              transform="translate(0 45.5) scale(1 -1)"
              d="M6.7,45.5c5.7,0.1,14.1-0.4,23.3-4c5.7-2.3,9.9-5,18.1-10.5c10.7-7.1,11.8-9.2,20.6-14.3c5-2.9,9.2-5.2,15.2-7 c7.1-2.1,13.3-2.3,17.6-2.1c4.2-0.2,10.5,0.1,17.6,2.1c6.1,1.8,10.2,4.1,15.2,7c8.8,5,9.9,7.1,20.6,14.3c8.3,5.5,12.4,8.2,18.1,10.5 c9.2,3.6,17.6,4.2,23.3,4H6.7z"
            />
          </clipPath>
        </svg>
      </div>

      <menu className="menu" ref={menuRef}>
        {items.map((item, index) => (
          <button
            key={index}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            className={`menu__item ${activeIndex === index ? "active" : ""}`}
            style={{ "--bgColorItem": item.color } as React.CSSProperties}
            onClick={() => handleItemClick(index)}
            aria-label={`Tab ${index + 1}`}
          >
            {item.icon}
          </button>
        ))}
        {/* First-paint position, so the flare starts under the active tab
            instead of at x=0 (far left) and visibly sliding into place after
            hydration/font-load. `left` is used rather than `transform`
            because a % here must resolve against the menu, not the flare's
            own width. JS then sets an exact px transform once it can measure.
            Tabs are equal-width (flex-grow: 1), so the active tab's centre is
            simply (index + 0.5) / count. */}
        <div
          className="menu__border"
          ref={menuBorderRef}
          style={{
            left: `calc(${
              ((initialIndex + 0.5) * 100) / items.length
            }% - (var(--menu-border-w, 8.6em) / 2))`,
          }}
        ></div>
      </menu>
    </>
  );
};
