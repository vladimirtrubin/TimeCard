#!/bin/bash

# Kill any existing node processes
pkill node || true

<<<<<<< HEAD
# Start the backend server which will also serve the frontend
cd backend
=======
# Change to the correct directory
cd /timecard/backend

# Start the backend server
>>>>>>> c2ea421738a9bef670c45cd37fc260e8f53b6e39
PORT=3000 node app.js