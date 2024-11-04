#!/bin/bash

# Kill any existing node processes
pkill node || true

# Start the backend server which will also serve the frontend
cd backend
PORT=3000 node app.js