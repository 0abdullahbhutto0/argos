"use client";

import { useState, useEffect } from "react";
import {
  GitBranch,
  ChevronDown,
  Check,
  Search,
  Shield,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BranchSelectorProps } from "./types";

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const media = window.matchMedia(query);

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

function BranchItem({
  branch,
  isSelected,
  onSelect,
  isMobile = false,
}: {
  branch: BranchSelectorProps["branches"][0];
  isSelected: boolean;
  onSelect: () => void;
  isMobile?: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-2 rounded-lg text-left",
        "transition-colors touch-manipulation cursor-pointer",
        "active:scale-[0.99]",
        isMobile ? "px-4 py-3 text-sm" : "px-2.5 py-1.5 text-xs",
        isSelected
          ? "bg-primary/10 text-primary font-medium"
          : "hover:bg-muted/60 text-foreground"
      )}
    >
      <GitBranch
        className={cn(
          "shrink-0",
          isMobile ? "w-4 h-4" : "w-3.5 h-3.5",
          isSelected ? "text-primary" : "text-muted-foreground"
        )}
      />

      <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none font-mono">
        <span className="whitespace-nowrap">{branch.name}</span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {branch.isDefault && (
          <Badge
            variant="secondary"
            className={cn(
              "bg-muted text-muted-foreground border-0 font-medium",
              isMobile ? "h-5 px-1.5 text-xs" : "h-4 px-1 text-[9px]"
            )}
          >
            default
          </Badge>
        )}
        {branch.protected && (
          <Shield
            className={cn("text-amber-500", isMobile ? "w-4 h-4" : "w-3 h-3")}
          />
        )}
        {isSelected && (
          <Check
            className={cn("text-primary", isMobile ? "w-4 h-4" : "w-3.5 h-3.5")}
          />
        )}
      </div>
    </button>
  );
}

function BranchTrigger({
  currentBranch,
  disabled,
  open,
  fullWidth = false,
}: {
  currentBranch: string;
  disabled: boolean;
  open: boolean;
  fullWidth?: boolean;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled}
      className={cn(
        "h-7 gap-1.5 px-2.5 text-xs font-normal font-mono",
        "border-border/80 hover:border-border",
        "hover:bg-muted/50",
        "transition-all duration-150 cursor-pointer",
        fullWidth ? "w-full justify-between" : "max-w-35 sm:max-w-48",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <GitBranch className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{currentBranch}</span>
      </div>
      <ChevronDown
        className={cn(
          "w-3 h-3 shrink-0 text-muted-foreground transition-transform duration-150",
          open && "rotate-180"
        )}
      />
    </Button>
  );
}

export function BranchSelector({
  currentBranch,
  branches,
  onBranchChange,
  disabled = false,
  fullWidth = false,
}: BranchSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const isMobile = useMediaQuery("(max-width: 640px)");

  const filteredBranches = branches.filter((branch) =>
    branch.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (branchName: string) => {
    if (branchName !== currentBranch) {
      onBranchChange(branchName);
    }
    setOpen(false);
    setSearch("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearch("");
    }
  };

  if (!branches || branches.length <= 1) {
    return (
      <Badge
        variant="secondary"
        className={cn(
          "text-[10px] sm:text-xs shrink-0 gap-1 font-mono",
          fullWidth ? "w-full justify-center py-1.5" : "max-w-30 sm:max-w-40",
          "overflow-hidden"
        )}
      >
        <GitBranch className="w-3 h-3 shrink-0 text-muted-foreground" />
        <span className="truncate">{currentBranch}</span>
      </Badge>
    );
  }

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerTrigger asChild>
          <div className={cn(fullWidth && "w-full")}>
            <BranchTrigger
              currentBranch={currentBranch}
              disabled={disabled}
              open={open}
              fullWidth={fullWidth}
            />
          </div>
        </DrawerTrigger>
        <DrawerContent className="max-h-[85dvh] flex flex-col bg-card">
          <DrawerHeader className="shrink-0 border-b border-border/60 px-4 pb-3">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-base font-semibold flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-primary" />
                Switch Branch
              </DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                  <X className="w-4 h-4" />
                </Button>
              </DrawerClose>
            </div>

            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search branches..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 text-sm rounded-lg bg-muted/50 border-0 focus-visible:ring-1"
              />
            </div>
          </DrawerHeader>

          <div
            className="flex-1 overflow-y-auto overscroll-contain px-2 py-2"
            style={{
              WebkitOverflowScrolling: "touch",
              minHeight: 0,
            }}
          >
            {filteredBranches.length === 0 ? (
              <div className="py-10 text-center">
                <GitBranch className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No branches found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredBranches.map((branch) => (
                  <BranchItem
                    key={branch.name}
                    branch={branch}
                    isSelected={branch.name === currentBranch}
                    onSelect={() => handleSelect(branch.name)}
                    isMobile={true}
                  />
                ))}
              </div>
            )}
          </div>

          {branches.length > 5 && (
            <div className="shrink-0 p-3 border-t border-border/60 bg-muted/20">
              <p className="text-xs text-muted-foreground text-center">
                Showing {filteredBranches.length} of {branches.length} branches
              </p>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div className={cn(fullWidth && "w-full")}>
          <BranchTrigger
            currentBranch={currentBranch}
            disabled={disabled}
            open={open}
            fullWidth={fullWidth}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0 border-border/80 shadow-md"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-2 border-b border-border/60">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search branches..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs font-mono"
            />
          </div>
        </div>

        <div className="max-h-60 overflow-y-auto overscroll-contain p-1">
          {filteredBranches.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-muted-foreground">No branches found</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredBranches.map((branch) => (
                <BranchItem
                  key={branch.name}
                  branch={branch}
                  isSelected={branch.name === currentBranch}
                  onSelect={() => handleSelect(branch.name)}
                  isMobile={false}
                />
              ))}
            </div>
          )}
        </div>

        {branches.length > 10 && (
          <div className="p-2 border-t border-border/60 text-center bg-muted/20">
            <span className="text-[10px] text-muted-foreground">
              Showing {filteredBranches.length} of {branches.length} branches
            </span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
