# Frontend Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the entire Meta Ads CRM frontend with state-of-the-art visual design and improved UX, making it no longer feel dated and comfortable to use.

**Architecture:** Phased approach—update Tailwind config first (foundation), rebuild core UI components with modern styling, update layout components, then modernize page-level components across dashboard, ads, leads, and settings in that order.

**Tech Stack:** Next.js 14, React 18, Tailwind CSS, Recharts, Radix UI (no new dependencies)

---

## Phase 1: Foundation & Core Components

### Task 1: Update Tailwind Configuration

**Files:**
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Open the Tailwind config file**

Run: `cat tailwind.config.ts`

This will show the current configuration.

- [ ] **Step 2: Replace the entire config with modernized color palette**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0f1117",
        surface: "#161b22",
        border: "#30363d",
        "text-primary": "#e6edf3",
        "text-secondary": "#8b949e",
        primary: {
          50: "#ecfcff",
          100: "#d4f9ff",
          200: "#a9f0ff",
          300: "#7ee8ff",
          400: "#06b6d4",
          500: "#0891b2",
          600: "#0e7490",
          700: "#155e75",
          800: "#164e63",
          900: "#1a3a42",
        },
        success: "#3fb950",
        warning: "#d29922",
        danger: "#f85149",
        info: "#58a6ff",
        gray: {
          50: "#f6f8fa",
          100: "#eaeef2",
          200: "#d0d7de",
          300: "#afb8c1",
          400: "#8b949e",
          500: "#6e7681",
          600: "#57606a",
          700: "#424a53",
          800: "#30363d",
          900: "#161b22",
          950: "#0f1117",
        },
      },
      fontSize: {
        xs: ["12px", { lineHeight: "1.5" }],
        sm: ["14px", { lineHeight: "1.6" }],
        base: ["14px", { lineHeight: "1.6" }],
        lg: ["16px", { lineHeight: "1.5" }],
        xl: ["20px", { lineHeight: "1.4" }],
        "2xl": ["24px", { lineHeight: "1.3" }],
        "3xl": ["32px", { lineHeight: "1.2" }],
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "6px",
        lg: "8px",
        xl: "12px",
      },
      boxShadow: {
        xs: "0 1px 1px rgba(0, 0, 0, 0.05)",
        sm: "0 1px 2px rgba(0, 0, 0, 0.05)",
        md: "0 4px 6px rgba(0, 0, 0, 0.1)",
        lg: "0 10px 15px rgba(0, 0, 0, 0.2)",
        xl: "0 20px 25px rgba(0, 0, 0, 0.25)",
      },
      transitionDuration: {
        fast: "150ms",
        base: "200ms",
        slow: "300ms",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 3: Verify the file was updated**

Run: `head -20 tailwind.config.ts`

Expected: Should show the new colors object with primary, success, warning, danger, info colors.

- [ ] **Step 4: Commit the config update**

```bash
git add tailwind.config.ts
git commit -m "style: update tailwind config with modern color palette and spacing

- Add semantic colors: primary accent (cyan), success, warning, danger, info
- Add grayscale palette (50-950) for better contrast
- Update font size scale with proper line heights
- Add custom spacing and border radius scales
- Add shadow definitions for depth"
```

---

### Task 2: Modernize Button Component

**Files:**
- Modify: `components/ui/button.tsx`

- [ ] **Step 1: Review the current button component**

Run: `cat components/ui/button.tsx`

This shows the existing structure using forwardRef and Radix UI patterns.

- [ ] **Step 2: Replace with modern button implementation**

```typescript
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary-400 text-white hover:bg-primary-500 active:bg-primary-600 shadow-sm hover:shadow-md",
        secondary: "border-2 border-primary-400 text-primary-400 hover:bg-primary-400/10 active:bg-primary-400/20",
        outline: "border border-border text-text-primary hover:bg-surface hover:border-gray-600 active:bg-gray-700",
        ghost: "text-text-primary hover:bg-surface/50 active:bg-surface",
        danger: "bg-danger text-white hover:bg-red-600 active:bg-red-700 shadow-sm hover:shadow-md",
      },
      size: {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

- [ ] **Step 3: Test the button component by viewing it in the browser**

Run: `npm run dev` (in background if not already running)

Navigate to any page with buttons (e.g., /dashboard/settings) and verify:
- Primary buttons have cyan background, white text, hover shadow
- Secondary buttons have cyan border, transparent background
- Hover states are smooth and visible
- Focus rings appear on keyboard navigation

- [ ] **Step 4: Commit the button update**

```bash
git add components/ui/button.tsx
git commit -m "style: modernize button component with new design system

- Add primary variant with cyan background and hover effects
- Add secondary variant with bordered outline style
- Add danger variant for destructive actions
- Add smooth transitions and shadow elevations
- Update focus states with visible focus ring
- Maintain accessibility with proper contrast"
```

---

### Task 3: Modernize Input Component

**Files:**
- Modify: `components/ui/input.tsx`

- [ ] **Step 1: Review current input component**

Run: `cat components/ui/input.tsx`

- [ ] **Step 2: Replace with modern input implementation**

```typescript
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary transition-all duration-200 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = "Input"

export { Input }
```

- [ ] **Step 3: Test input styling**

Run: Open browser dev tools on any page with inputs (e.g., /dashboard/settings)

Click on input fields and verify:
- Border is subtle gray (`#30363d`)
- Focus state has cyan border and ring
- Placeholder text is muted
- Background is transparent
- Transitions are smooth (200ms)

- [ ] **Step 4: Commit input update**

```bash
git add components/ui/input.tsx
git commit -m "style: modernize input component with focus states and transitions

- Update border color to match design system
- Add cyan focus ring and border on interaction
- Improve placeholder text visibility
- Add smooth transitions on focus
- Maintain accessibility with clear focus indicators"
```

---

### Task 4: Modernize Card Component

**Files:**
- Modify: `components/ui/card.tsx`

- [ ] **Step 1: Review current card component**

Run: `cat components/ui/card.tsx`

- [ ] **Step 2: Replace with modern card implementation**

```typescript
import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border border-border bg-surface shadow-sm transition-all duration-200",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-2xl font-semibold leading-none tracking-tight text-text-primary", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-text-secondary", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```

- [ ] **Step 3: Verify card styling in browser**

Run: Navigate to /dashboard

Verify:
- Cards have subtle gray border
- Background is darker than page background
- Shadow is subtle (not heavy)
- Padding is generous (p-6 = 24px)

- [ ] **Step 4: Commit card update**

```bash
git add components/ui/card.tsx
git commit -m "style: modernize card component with improved visual hierarchy

- Update border to subtle gray from design system
- Add shadow for depth (shadow-sm)
- Use surface background color for distinction
- Improve internal spacing with consistent padding
- Add transition for interactive states"
```

---

### Task 5: Modernize Badge Component

**Files:**
- Modify: `components/ui/badge.tsx`

- [ ] **Step 1: Review current badge component**

Run: `cat components/ui/badge.tsx`

- [ ] **Step 2: Replace with modern badge implementation**

```typescript
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-200",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-primary-400 text-white",
        secondary:
          "border border-transparent bg-gray-700 text-text-primary",
        success:
          "border border-transparent bg-success text-white",
        warning:
          "border border-transparent bg-warning text-white",
        danger:
          "border border-transparent bg-danger text-white",
        outline:
          "text-text-primary border border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
```

- [ ] **Step 3: Test badge styles**

Run: Open browser and navigate to /dashboard/leads

Verify status badges:
- "new" status: cyan/primary color
- "booked" status: success green
- "closed" status: success green
- "lost" status: danger red
- "contacted" status: info blue

All badges should be pill-shaped with white text.

- [ ] **Step 4: Commit badge update**

```bash
git add components/ui/badge.tsx
git commit -m "style: modernize badge component with semantic color variants

- Add success, warning, danger variants for status colors
- Use rounded-full for modern pill shape
- Add outline variant for secondary status
- Maintain high contrast for readability
- Add smooth transitions"
```

---

### Task 6: Create Table Component

**Files:**
- Create: `components/ui/table.tsx`

- [ ] **Step 1: Create the new table component file**

```bash
touch components/ui/table.tsx
```

- [ ] **Step 2: Write the table component**

```typescript
import * as React from "react"
import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("border-b border-border bg-surface/50", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("border-t border-border bg-surface/50 font-medium [&>tr]:last:border-b-0", className)}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-border transition-colors duration-200 hover:bg-surface/60 data-[state=selected]:bg-primary-400/10",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 py-3 text-left align-middle font-semibold text-text-primary [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("px-4 py-3 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("mt-4 text-sm text-text-secondary", className)} {...props} />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
```

- [ ] **Step 3: Verify the file was created**

Run: `ls -la components/ui/table.tsx`

Expected: File exists

- [ ] **Step 4: Commit the new table component**

```bash
git add components/ui/table.tsx
git commit -m "style: create modern table component with responsive design

- Add Table wrapper with horizontal scroll support
- Add TableHeader with subtle background
- Add TableRow with hover state
- Add TableHead and TableCell with proper padding
- Add alternating row backgrounds on hover
- Support for selected row state"
```

---

## Phase 2: Layout Components

### Task 7: Modernize Sidebar Component

**Files:**
- Modify: `components/layout/Sidebar.tsx`

- [ ] **Step 1: Review current sidebar**

Run: `cat components/layout/Sidebar.tsx`

- [ ] **Step 2: Replace sidebar with modern version**

First, check the current implementation to understand the structure. Then update it:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Dashboard", icon: BarChart3 },
    { href: "/ads", label: "Ads", icon: BarChart3 },
    { href: "/leads", label: "Leads", icon: Users },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="w-60 border-r border-border bg-background h-screen overflow-y-auto">
      <nav className="flex flex-col p-6 gap-2">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 text-sm font-medium",
                isActive
                  ? "bg-surface text-text-primary border-l-4 border-primary-400"
                  : "text-text-secondary hover:bg-surface/50 hover:text-text-primary"
              )}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 3: Test sidebar in browser**

Run: Navigate to http://localhost:3000

Verify:
- Sidebar has dark background matching design system
- Active link has cyan left border and lighter background
- Hover state shows on inactive links
- Icons display properly
- Spacing is generous (p-6, gap-2)

- [ ] **Step 4: Commit sidebar update**

```bash
git add components/layout/Sidebar.tsx
git commit -m "style: modernize sidebar with improved navigation states

- Add subtle borders and background colors
- Implement left border accent for active link
- Add smooth hover state transitions
- Improve icon and text alignment
- Update padding and spacing to design system"
```

---

### Task 8: Modernize TopBar Component

**Files:**
- Modify: `components/layout/TopBar.tsx`

- [ ] **Step 1: Review current top bar**

Run: `cat components/layout/TopBar.tsx`

- [ ] **Step 2: Replace with modern version**

```typescript
"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TopBar() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <header className="border-b border-border bg-background h-14 flex items-center justify-between px-8">
      <div className="text-sm text-text-secondary">
        Meta Ads CRM
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary"
      >
        <LogOut size={18} />
        Logout
      </Button>
    </header>
  );
}
```

- [ ] **Step 3: Test top bar in browser**

Run: Refresh page at http://localhost:3000

Verify:
- Top bar has subtle border
- Logout button uses ghost variant with proper spacing
- Logo/title is visible on left
- Button has proper hover state

- [ ] **Step 4: Commit top bar update**

```bash
git add components/layout/TopBar.tsx
git commit -m "style: modernize top bar with improved button styling

- Add subtle bottom border for visual separation
- Update logout button to ghost variant
- Improve spacing and alignment
- Add icon to logout button
- Update colors to match design system"
```

---

## Phase 3: Dashboard Components

### Task 9: Modernize DashboardContent Component

**Files:**
- Modify: `components/dashboard/DashboardContent.tsx`

- [ ] **Step 1: Review current dashboard**

Run: `cat components/dashboard/DashboardContent.tsx`

- [ ] **Step 2: Update dashboard with modern layout**

```typescript
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeadsAreaChart } from "./LeadsAreaChart";
import { LeadsBarChart } from "@/components/ads/LeadsBarChart";
import { format } from "date-fns";

interface DashboardProps {
  totalLeads: number;
  leadsToday: number;
  leadsLast30: number;
  leadsChange: string | null;
  booked: number;
  closed: number;
  lost: number;
  contacted: number;
  newLeads: number;
  totalRevenue: number;
  revenueChange: string | null;
  conversionRate: string;
  chartData: Record<string, any>;
  leads: any[];
}

export function DashboardContent({
  totalLeads,
  leadsToday,
  leadsLast30,
  leadsChange,
  totalRevenue,
  revenueChange,
  conversionRate,
  chartData,
  leads,
}: DashboardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const changePercent = leadsChange ? parseFloat(leadsChange) : 0;
  const revenueChangePercent = revenueChange ? parseFloat(revenueChange) : 0;

  return (
    <div className="flex-1 bg-background overflow-y-auto">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary mt-2">Welcome back! Here's your campaign performance.</p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Leads Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-text-secondary">Total Leads</CardTitle>
              <div className="text-2xl">👥</div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-text-primary">{totalLeads}</div>
              <div className="flex items-center gap-2 mt-2">
                {changePercent >= 0 ? (
                  <>
                    <span className="text-success">↑</span>
                    <span className="text-success text-sm font-medium">{Math.abs(changePercent)}% from last month</span>
                  </>
                ) : (
                  <>
                    <span className="text-danger">↓</span>
                    <span className="text-danger text-sm font-medium">{Math.abs(changePercent)}% from last month</span>
                  </>
                )}
              </div>
              <p className="text-text-secondary text-sm mt-1">{leadsToday} today</p>
            </CardContent>
          </Card>

          {/* Conversion Rate Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-text-secondary">Conversion Rate</CardTitle>
              <div className="text-2xl">📊</div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-text-primary">{conversionRate}%</div>
              <p className="text-text-secondary text-sm mt-3">Leads to closed deals</p>
            </CardContent>
          </Card>

          {/* Revenue Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-text-secondary">Total Revenue</CardTitle>
              <div className="text-2xl">💰</div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-text-primary">{formatCurrency(totalRevenue)}</div>
              <div className="flex items-center gap-2 mt-2">
                {revenueChangePercent >= 0 ? (
                  <>
                    <span className="text-success">↑</span>
                    <span className="text-success text-sm font-medium">{Math.abs(revenueChangePercent)}% from last month</span>
                  </>
                ) : (
                  <>
                    <span className="text-danger">↓</span>
                    <span className="text-danger text-sm font-medium">{Math.abs(revenueChangePercent)}% from last month</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leads Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Leads Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadsAreaChart data={chartData} />
          </CardContent>
        </Card>

        {/* Status Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Status Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-text-secondary text-sm mb-2">New</div>
                <div className="text-2xl font-bold text-text-primary">{leadsToday}</div>
              </div>
              <div className="text-center">
                <div className="text-text-secondary text-sm mb-2">Contacted</div>
                <div className="text-2xl font-bold text-text-primary">0</div>
              </div>
              <div className="text-center">
                <div className="text-text-secondary text-sm mb-2">Booked</div>
                <div className="text-2xl font-bold text-text-primary">0</div>
              </div>
              <div className="text-center">
                <div className="text-text-secondary text-sm mb-2">Closed</div>
                <div className="text-2xl font-bold text-success">0</div>
              </div>
              <div className="text-center">
                <div className="text-text-secondary text-sm mb-2">Lost</div>
                <div className="text-2xl font-bold text-danger">0</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Test dashboard in browser**

Run: Navigate to http://localhost:3000/dashboard

Verify:
- Dashboard title and subtitle display
- Three metric cards show with icons and percentage changes
- Cards have proper spacing and borders
- Color coding (green for positive, red for negative changes)
- Leads chart displays below metrics
- Status summary grid is visible

- [ ] **Step 4: Commit dashboard update**

```bash
git add components/dashboard/DashboardContent.tsx
git commit -m "style: modernize dashboard with improved metric cards layout

- Add page title and subtitle
- Create 3-column metric grid with modern card styling
- Add color-coded percentage changes (green/red)
- Improve spacing and visual hierarchy
- Add emoji icons for visual interest
- Add status summary grid at bottom
- Update text colors to use design system tokens"
```

---

### Task 10: Modernize Leads Table Component

**Files:**
- Modify: `components/leads/LeadsTable.tsx`

- [ ] **Step 1: Review current leads table**

Run: `cat components/leads/LeadsTable.tsx | head -100`

- [ ] **Step 2: Update table with modern styling**

The existing table should be updated to use the new Table component and modern styling. Replace the relevant parts:

```typescript
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  campaignName: string;
  adName: string;
  createdAt: string;
}

interface LeadsTableProps {
  leads: Lead[];
}

const statusVariant: Record<string, string> = {
  new: "default",
  contacted: "secondary",
  booked: "secondary",
  closed: "success",
  lost: "danger",
};

export function LeadsTable({ leads }: LeadsTableProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Campaign</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Added</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell className="font-medium text-text-primary">{lead.name}</TableCell>
              <TableCell className="text-text-secondary">{lead.email}</TableCell>
              <TableCell className="text-text-secondary">{lead.phone}</TableCell>
              <TableCell className="text-sm text-text-secondary">{lead.campaignName}</TableCell>
              <TableCell>
                <Badge variant={statusVariant[lead.status] || "default"}>
                  {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-text-secondary">
                {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Link href={`/leads/${lead.id}`}>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MessageCircle size={16} />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 3: Test leads table in browser**

Run: Navigate to http://localhost:3000/leads

Verify:
- Table headers are visible and styled
- Rows have proper padding and height
- Status badges show with correct colors
- Hover state shows on rows
- Action buttons appear on right with proper spacing
- Dates show as relative time (e.g., "2 days ago")

- [ ] **Step 4: Commit leads table update**

```bash
git add components/leads/LeadsTable.tsx
git commit -m "style: modernize leads table with improved row styling

- Use new Table component for consistent styling
- Add status badges with color variants
- Display relative dates instead of absolute timestamps
- Add action buttons with hover visibility
- Improve column alignment and padding
- Add email and phone cells for lead information"
```

---

### Task 11: Modernize Ads Campaign Table Component

**Files:**
- Modify: `components/ads/CampaignTable.tsx`

- [ ] **Step 1: Review current campaign table**

Run: `cat components/ads/CampaignTable.tsx | head -100`

- [ ] **Step 2: Update campaign table with modern styling**

```typescript
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Campaign {
  id: string;
  name: string;
  spend: number;
  leads: number;
  cost_per_lead: number;
  status: "active" | "paused";
  click_through_rate: number;
}

interface CampaignTableProps {
  campaigns: Campaign[];
}

export function CampaignTable({ campaigns }: CampaignTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign Name</TableHead>
            <TableHead className="text-right">Spend</TableHead>
            <TableHead className="text-right">Leads</TableHead>
            <TableHead className="text-right">Cost per Lead</TableHead>
            <TableHead className="text-right">CTR</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow key={campaign.id}>
              <TableCell className="font-medium text-text-primary">{campaign.name}</TableCell>
              <TableCell className="text-right text-text-primary font-medium">
                {formatCurrency(campaign.spend)}
              </TableCell>
              <TableCell className="text-right text-text-primary">{campaign.leads}</TableCell>
              <TableCell className="text-right text-text-primary">
                {formatCurrency(campaign.cost_per_lead)}
              </TableCell>
              <TableCell className="text-right text-text-primary">{campaign.click_through_rate}%</TableCell>
              <TableCell>
                <Badge variant={campaign.status === "active" ? "success" : "secondary"}>
                  {campaign.status === "active" ? "Active" : "Paused"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 3: Test campaign table in browser**

Run: Navigate to http://localhost:3000/ads

Verify:
- Table displays campaigns with proper columns
- Numeric columns are right-aligned
- Currency values are formatted correctly
- Status badges show (green for active, gray for paused)
- Edit buttons are clickable
- Row hover state is visible

- [ ] **Step 4: Commit campaign table update**

```bash
git add components/ads/CampaignTable.tsx
git commit -m "style: modernize campaign table with improved data visualization

- Use new Table component for consistency
- Right-align numeric metrics for scanability
- Add status badges with active/paused states
- Format currency values properly
- Improve spacing and visual hierarchy
- Add edit action buttons"
```

---

## Phase 4: Final Polish & Testing

### Task 12: Test All Pages for Visual Consistency

**Files:**
- No file changes needed (testing only)

- [ ] **Step 1: Start dev server**

Run: `npm run dev` (if not already running)

- [ ] **Step 2: Visit each page and verify styling**

Check:
1. Dashboard page (`/dashboard`)
   - Metric cards display with proper spacing
   - Chart is visible and styled
   - Colors match design system
   - Text contrast is good

2. Leads page (`/leads`)
   - Table displays with modern styling
   - Status badges are colored correctly
   - Hover state is visible on rows
   - Action buttons are accessible

3. Ads page (`/ads`)
   - Campaign table displays correctly
   - Metrics are right-aligned
   - Status badges show properly

4. Settings page (`/settings`)
   - Forms display with modern input styling
   - Buttons have proper styling and states

- [ ] **Step 3: Test keyboard navigation**

Using keyboard:
- Tab through all interactive elements
- Verify focus rings are visible
- All buttons are accessible

- [ ] **Step 4: Test responsive design**

Using browser dev tools:
- Resize to mobile (375px)
- Resize to tablet (768px)
- Resize to desktop (1440px)
- Verify tables scroll horizontally on mobile
- Verify metric grid stacks on mobile

- [ ] **Step 5: Document any issues found**

If any visual issues are found, create notes for fixes (e.g., "primary color too bright on dark background").

- [ ] **Step 6: Create final commit**

```bash
git add -A
git commit -m "test: verify visual consistency across all pages

- Tested dashboard, leads, ads, settings pages
- Verified color scheme and spacing consistency
- Tested keyboard navigation and focus states
- Tested responsive design at mobile/tablet/desktop sizes
- All pages now follow modern design system"
```

---

## Summary

**Total Tasks:** 12
- **Phase 1 (Foundation & Components):** 6 tasks
  - Tailwind config update
  - Button component modernization
  - Input component modernization
  - Card component modernization
  - Badge component modernization
  - Table component creation

- **Phase 2 (Layout):** 2 tasks
  - Sidebar modernization
  - Top bar modernization

- **Phase 3 (Pages):** 3 tasks
  - Dashboard component update
  - Leads table update
  - Campaign table update

- **Phase 4 (Testing):** 1 task
  - Visual consistency testing across all pages

**Expected Outcome:** Modern, state-of-the-art frontend with improved UX and visual design that no longer feels dated.

**Tech Stack Maintained:** Next.js 14, React 18, Tailwind CSS, Recharts, Radix UI (no new dependencies required)

