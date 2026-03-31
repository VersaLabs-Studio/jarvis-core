# Chatbot Central

The central control hub for all JARVIS integrations — similar to how Claude is integrating with macOS, but for your entire SWE workflow.

## Vision

Chatbot Central will be the unified interface that controls all integrations:
- GitHub (code management)
- Vercel (deployment)
- Notion (documentation)
- Gmail (email)
- Google Calendar (scheduling)
- VS Code (workspace)

## Architecture

```
Chatbot Central
├── Command Parser    # Parse user commands
├── Workflow Engine   # Execute multi-step workflows
├── MCP Router        # Route to appropriate MCP server
├── State Manager     # Track conversation and task state
└── Response Builder  # Format responses for user
```

## Planned Features

- [ ] Natural language command processing
- [ ] Multi-step workflow automation
- [ ] Context-aware responses
- [ ] Integration status monitoring
- [ ] Scheduled task execution
- [ ] Learning from user patterns

## Usage

Eventually, you'll be able to say:
- "Jarvis, daily audit" → Runs morning standup
- "Jarvis, ship feature X" → Full pipeline: plan → code → deploy
- "Jarvis, generate proposal PPT" → Creates presentation from Notion data

## Status

🚧 Under development — Phase 3 target