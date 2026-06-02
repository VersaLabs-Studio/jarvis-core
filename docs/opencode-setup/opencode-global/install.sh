#!/bin/bash
# =============================================================================
# OpenCode Global Config Installer
# Kidus Abdula — Architectural DNA v1.0.0
# =============================================================================
# Run this once to install global agents and skills.
# Usage: chmod +x install.sh && ./install.sh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GLOBAL_DIR="$HOME/.opencode"
PROJECT_DIR="$(pwd)/.opencode"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   OpenCode Setup — Kidus Abdula Architectural DNA v1.0   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Prompt: global or project install
echo "Install location:"
echo "  [1] Global  (~/.opencode)          — applies to all projects"
echo "  [2] Project (./.opencode)          — applies to this project only"
echo "  [3] Both                            — recommended"
echo ""
read -rp "Choice [1/2/3]: " CHOICE

install_to() {
  local DEST="$1"
  echo ""
  echo "→ Installing to: $DEST"

  mkdir -p "$DEST/agents"
  mkdir -p "$DEST/skills/architectural-dna"
  mkdir -p "$DEST/skills/premium-ui"
  mkdir -p "$DEST/skills/frontend-craft"
  mkdir -p "$DEST/skills/schema-first"
  mkdir -p "$DEST/skills/ui-auditor"

  # Agents
  cp "$SCRIPT_DIR/.opencode/agents/orchestrator.md"  "$DEST/agents/"
  cp "$SCRIPT_DIR/.opencode/agents/plan.md"           "$DEST/agents/"
  cp "$SCRIPT_DIR/.opencode/agents/execute.md"        "$DEST/agents/"
  cp "$SCRIPT_DIR/.opencode/agents/debug.md"          "$DEST/agents/"
  cp "$SCRIPT_DIR/.opencode/agents/tech-lead.md"      "$DEST/agents/"
  cp "$SCRIPT_DIR/.opencode/agents/auditor.md"        "$DEST/agents/"
  cp "$SCRIPT_DIR/.opencode/agents/code-review.md"    "$DEST/agents/"

  # Skills
  cp "$SCRIPT_DIR/.opencode/skills/architectural-dna/SKILL.md" "$DEST/skills/architectural-dna/"
  cp "$SCRIPT_DIR/.opencode/skills/premium-ui/SKILL.md"        "$DEST/skills/premium-ui/"
  cp "$SCRIPT_DIR/.opencode/skills/frontend-craft/SKILL.md"    "$DEST/skills/frontend-craft/"
  cp "$SCRIPT_DIR/.opencode/skills/schema-first/SKILL.md"      "$DEST/skills/schema-first/"
  cp "$SCRIPT_DIR/.opencode/skills/ui-auditor/SKILL.md"        "$DEST/skills/ui-auditor/"

  echo "  ✓ 7 agents installed"
  echo "  ✓ 5 skills installed"
}

# Copy AGENTS.md to project root
install_agents_md() {
  cp "$SCRIPT_DIR/AGENTS.md" "$(pwd)/AGENTS.md"
  echo "  ✓ AGENTS.md copied to project root"
}

case "$CHOICE" in
  1)
    install_to "$GLOBAL_DIR"
    ;;
  2)
    install_to "$PROJECT_DIR"
    install_agents_md
    ;;
  3)
    install_to "$GLOBAL_DIR"
    install_to "$PROJECT_DIR"
    install_agents_md
    ;;
  *)
    echo "Invalid choice. Exiting."
    exit 1
    ;;
esac

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                    Installation Complete                  ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Agents installed:"
echo "  • Orchestrator  — primary entry point, routes all requests"
echo "  • Plan          — architectural planner, schema designer"
echo "  • Execute       — full-stack implementer"
echo "  • Debug         — root cause analyst"
echo "  • Tech Lead     — principal engineer, strategic decisions"
echo "  • Auditor       — compliance scorer (0–10)"
echo "  • Code Review   — PR reviewer"
echo ""
echo "Skills installed:"
echo "  • architectural-dna  — master reference (load always)"
echo "  • premium-ui         — OKLCH + glassmorphism + Framer Motion"
echo "  • schema-first       — SQL → Types → Zod → Config → Factory"
echo "  • frontend-craft     — hooks, TanStack Query, page patterns"
echo "  • ui-auditor         — scoring rubric and audit checklists"
echo ""
echo "Workflow: Orchestrator → Plan → Execute → Code Review → Auditor → Merge"
echo ""
echo "Start with: /orchestrator or mention any agent by name in OpenCode."
echo ""
