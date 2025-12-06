# Documentation

## Event System Documentation

### Quick Links

- **[EVENT_SYSTEM.md](EVENT_SYSTEM.md)** - Complete event system architecture, lifecycle, and usage guide
- **[EVENT_TROUBLESHOOTING.md](EVENT_TROUBLESHOOTING.md)** - Debugging guide and common issues

### What's Covered

#### EVENT_SYSTEM.md
Comprehensive guide covering:
- Event system architecture and components
- Event lifecycle from loading to execution
- How to add new events
- Trigger conditions and choice effects
- Error handling mechanisms
- Best practices and testing
- Future enhancement ideas

#### EVENT_TROUBLESHOOTING.md
Practical debugging guide with:
- Quick diagnostics commands
- Common error messages and solutions
- Debugging techniques for event loading
- State and validation issues
- Network and performance troubleshooting
- Useful console commands

### Getting Started

If you're new to the event system:
1. Start with **EVENT_SYSTEM.md** to understand the architecture
2. Look at existing events in `public/data/events.json`
3. Use **EVENT_TROUBLESHOOTING.md** when you encounter issues
4. Test changes with `npm run validate:events`

### Related Files

- `public/data/events.json` - Event data definitions
- `src/game/events/` - Event system implementation
- `utils/validate-events.cjs` - Event validation script
- `test-events.html` - Interactive event testing page

### Need Help?

1. Check the troubleshooting guide for your specific error
2. Run validation: `npm run validate:events`
3. Test in browser: Open `test-events.html`
4. Check browser console for detailed error messages
