# Project Context and Guidelines

## Workspace Structure
```
Lovable/
├── mass-contact-whisper/     # Main React/TS app for mass messaging
├── whatsapp-backend/         # Backend service
```

## Technology Stack
- **Frontend**: React 18+, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express/NestJS, Socket.io
- **Styling**: Tailwind CSS, shadcn/ui components
- **State Management**: React hooks, Context API
- **Build Tools**: Vite, TypeScript

## Key Features
- WhatsApp Web integration
- Real-time messaging
- Mass contact management
- Voice note support
- QR code authentication
- Contact filtering and search

## Development Workflow
1. Use TypeScript for all new code
2. Follow component-based architecture
3. Implement proper error handling
4. Add loading states for async operations
5. Test on mobile devices
6. Maintain responsive design

## API Integration
- Use proper authentication
- Implement rate limiting
- Handle API errors gracefully
- Cache responses when appropriate
- Use environment variables for sensitive data

## Code Quality
- Use ESLint and Prettier
- Write meaningful commit messages
- Add JSDoc comments for complex functions
- Keep components small and focused
- Use proper TypeScript types

## Security Considerations
- Validate all user inputs
- Sanitize data before rendering
- Use HTTPS in production
- Implement proper CORS policies
- Store sensitive data securely

## Performance Optimization
- Lazy load components
- Optimize images and assets
- Use React.memo for expensive components
- Implement proper caching strategies
- Monitor bundle size

## Testing Strategy
- Unit tests for utility functions
- Integration tests for API calls
- E2E tests for critical user flows
- Test error scenarios
- Maintain good test coverage 