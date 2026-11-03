"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import { Button } from "./button";
import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  onMouseEnter?: () => void;
}

const ThemeToggle = ({ onMouseEnter }: ThemeToggleProps) => {
  const { setTheme, resolvedTheme } = useTheme();

  if (!resolvedTheme) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
          onMouseEnter={onMouseEnter}
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <AnimatePresence mode="wait" initial={false}>
            {resolvedTheme === "dark" ? (
              <motion.div
                key="dark"
                initial={{ rotate: -90, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                exit={{ rotate: 90, scale: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Moon className="w-4 h-4" />
              </motion.div>
            ) : (
              <motion.div
                key="light"
                initial={{ rotate: -90, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                exit={{ rotate: 90, scale: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Sun className="w-4 h-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </TooltipTrigger>

      <TooltipContent side="bottom" sideOffset={5}>
        Toggle theme
      </TooltipContent>
    </Tooltip>
  );
};

export default ThemeToggle;
