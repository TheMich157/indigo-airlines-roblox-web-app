# IndiGo Airlines Roblox Integration

A full-stack web application that integrates with Roblox to provide airline management, flight booking, and air traffic control features for IndiGo Airlines' Roblox experience.

## Features

### User Management
- Roblox OAuth integration for secure authentication
- Role-based access control (Passengers, Pilots, ATC, Supervisors, Admins)
- Group rank synchronization with Roblox group
- Gamepass verification for premium features

### Flight Operations
- Real-time flight tracking and management
- Dynamic scheduling system
- Seat booking with class differentiation (Economy/Business)
- Flight plan filing and approval system
- Aircraft and route management

### Air Traffic Control
- Live ATC position management
- Real-time clearance system
- Weather reporting and monitoring
- Voice communication channels
- Flight progress tracking

### Pilot Features
- Flight logging system
- Rank progression tracking
- Aircraft qualification management
- Route assignments
- Performance analytics

### Booking System
- Real-time seat availability
- Class-based booking (Economy/Business)
- Temporary seat holds
- Booking modifications and cancellations
- E-ticket generation with QR codes

## Technical Stack

### Backend
- Node.js with Express
- Socket.IO for real-time communications
- JWT for authentication
- Redis for session management
- Winston for logging
- Express-validator for input validation

### Frontend
- React.js (separate repository)
- Tailwind CSS for styling
- Socket.IO client for real-time updates
- Axios for API requests

### Security
- Helmet for HTTP headers
- Rate limiting
- CORS protection
- Input validation
- JWT token management
- Cookie security

## Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn
- Redis server (optional for development)

### Environment Setup
1. Clone the repository:
\`\`\`bash
git clone https://github.com/your-org/indigo-airlines-roblox.git
cd indigo-airlines-roblox
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Create a .env file:
\`\`\`env
# Server Configuration
PORT=8000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRY=7d

# Roblox Configuration
ROBLOX_GROUP_ID=12345678
ROBLOX_PLACE_ID=87654321
ROBLOX_GAMEPASS_ID=98765432
ROBLOX_OAUTH_CLIENT_ID=your-client-id
ROBLOX_OAUTH_CLIENT_SECRET=your-client-secret
ROBLOX_COOKIE=your-roblox-cookie

# Cookie Configuration
COOKIE_SECRET=another-super-secret-key-change-in-production

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Socket.IO Configuration
SOCKET_PING_TIMEOUT=5000
SOCKET_PING_INTERVAL=10000
\`\`\`

### Running the Application

Development mode:
\`\`\`bash
npm run dev
\`\`\`

Production mode:
\`\`\`bash
npm start
\`\`\`

## API Documentation

### Authentication Endpoints
- POST /api/auth/login - Roblox OAuth login
- POST /api/auth/game-auth - Game server authentication
- POST /api/auth/logout - User logout
- POST /api/auth/refresh-token - Refresh JWT token

### Flight Endpoints
- GET /api/flights - List all flights
- POST /api/flights - Create new flight
- GET /api/flights/:id - Get flight details
- PATCH /api/flights/:id/status - Update flight status
- POST /api/flights/:id/crew - Assign crew

### Booking Endpoints
- GET /api/bookings/user/:userId - Get user bookings
- POST /api/bookings - Create booking
- POST /api/bookings/hold-seat - Hold seat temporarily
- POST /api/bookings/:id/cancel - Cancel booking
- GET /api/bookings/:id/receipt - Get booking receipt

### ATC Endpoints
- GET /api/atc/active-flights - Get active flights
- POST /api/atc/clearance - Issue clearance
- POST /api/atc/position/take - Take ATC position
- POST /api/atc/weather/report - Submit weather report

### Pilot Endpoints
- GET /api/pilot/logs/:pilotId - Get pilot logs
- POST /api/pilot/logs - Add flight log
- POST /api/pilot/flight-plan - File flight plan
- GET /api/pilot/stats/:pilotId - Get pilot statistics

## WebSocket Events

### Flight Events
- flight_created
- flight_updated
- flight_status_updated
- flight_crew_assigned

### ATC Events
- clearance_issued
- position_taken
- weather_updated
- voice_channel_joined

### Booking Events
- booking_created
- booking_cancelled
- seat_hold_expired

## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the branch (\`git push origin feature/AmazingFeature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Roblox Developer Relations team
- IndiGo Airlines Roblox Group members
- Open source community

## Support

For support, please join our [Discord server](https://discord.gg/indigoairlines) or create an issue in the repository.
