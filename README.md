

---

# IndiGo Airlines Roblox Website

## Project Overview
IndiGo Airlines Roblox is a web application designed to manage the operations of an airline in a Roblox gaming environment. This application facilitates user authentication, flight management, and booking through a RESTful API and provides a real-time connection via Socket.IO for live features such as ATC (Air Traffic Control) clearances and voice channels.

## Installation

To get started with the IndiGo Airlines Roblox application, follow these instructions:

1. **Clone the repository**:

   ```bash
   git clone https://github.com/yourusername/indigo-airlines-roblox.git
   cd indigo-airlines-roblox
   ```

2. **Install dependencies**:

   Make sure you have [Node.js](https://nodejs.org/) installed on your machine. Then run:

   ```bash
   npm install
   ```

3. **Set up environment variables**:

   Create a `.env` file in the root directory and configure it according to your environment settings, particularly the secret for JWT tokens.

4. **Run the application**:

   You can start the application using either of the following commands:

   For development mode (with auto-reload):

   ```bash
   npm run dev
   ```

   For production mode:

   ```bash
   npm start
   ```

## Usage

Once the server is running, you can interact with the API or connect via the frontend interface. The server will be accessible at `http://localhost:8000` (or the port you configured in your `.env` file).

### API Endpoints

- **Authentication**:
  - `POST /api/auth/roblox`: Authenticate a user.
  
- **Flights**:
  - `POST /api/flights`: Create a new flight.
  - `GET /api/flights`: Retrieve all flights.

- **Bookings**:
  - `POST /api/bookings`: Create a new booking.
  - `GET /api/bookings/:userId`: Retrieve bookings for a specific user.

- **ATC Clearances**:
  - `POST /api/atc/clearance`: Issue an ATC clearance.

- **Pilot Logs**:
  - `GET /api/pilot/logs/:pilotId`: Retrieve logs for a specific pilot.
  - `POST /api/pilot/logs`: Submit a new pilot log.

### Real-time Features

The application uses Socket.IO for real-time events:
- Listen for ATC clearances by subscribing to the `clearance_issued` event.
- Join voice channels using the `join_voice_channel` feature.

## Features

- User authentication using JWT for secure access.
- RESTful API design for managing flights, bookings, and pilot logs.
- Real-time communication for ATC clearances and voice communication using Socket.IO.
- Static file serving for front-end assets.
- Middleware for enhanced API security and error handling.

## Dependencies

The project uses the following main dependencies:

- **Express**: Web framework for Node.js.
- **CORS**: Middleware for enabling CORS in the application.
- **dotenv**: Module to load environment variables from a `.env` file.
- **jsonwebtoken**: For creating and verifying JSON Web Tokens.
- **Socket.IO**: For real-time web socket communication.
- **Nodemon** (devDependency): Automatically restarts the server during development when file changes are detected.

## Project Structure

The project directory is organized as follows:

```
indigo-airlines-roblox/
│
├── routes/                 # Directory for API route modules
│   ├── auth.js             # Authentication routes
│   ├── flights.js          # Flight management routes (placeholder)
│   ├── bookings.js         # Booking management routes (placeholder)
│   ├── atc.js              # ATC routes (placeholder)
│   └── pilot.js            # Pilot routes (placeholder)
│
├── public/                 # Directory for static assets
│   └── index.html          # Main HTML file served to clients
│
├── .env                    # Environment variables
├── package.json            # Project metadata and dependencies
├── package-lock.json       # Detailed dependency tree
└── server.js               # Entry point for the application
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests to enhance the functionality of the IndiGo Airlines Roblox project.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

```
This README provides comprehensive details about the project, including installation instructions, usage specifics, features, dependencies, and project structure, making it easy for developers to understand and contribute to the IndiGo Airlines Roblox application.
