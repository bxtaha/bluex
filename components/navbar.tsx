"use client";

import * as React from "react";
import { Menu, Inbox, Home, LayoutDashboard, Image as ImageIcon } from "lucide-react";
import {
  AnimatedTabBar,
  type TabItem,
} from "@/components/ui/animated-tab-bar";
import { useAccentColor } from "@/components/accent-provider";

const navItems: TabItem[] = [
  { color: "#ff8c00", icon: <Menu className="icon" strokeWidth={1.6} /> },
  { color: "#f54888", icon: <Inbox className="icon" strokeWidth={1.6} /> },
  { color: "#4343f5", icon: <Home className="icon" strokeWidth={1.6} /> },
  {
    color: "#e0b115",
    icon: <LayoutDashboard className="icon" strokeWidth={1.6} />,
  },
  {
    color: "#65ddb7",
    icon: <ImageIcon className="icon" strokeWidth={1.6} />,
  },
];

export function Navbar() {
  const { setColor } = useAccentColor();

  return (
    <nav className="flex w-full justify-center pt-0">
      <AnimatedTabBar
        items={navItems}
        defaultIndex={2}
        onTabChange={(index) => setColor(navItems[index].color)}
      />
    </nav>
  );
}
