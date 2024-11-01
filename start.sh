#!/bin/bash

# Kill any existing node processes
pkill node || true

# Change to the correct directory
cd /timecard/backend

# Start the backend server
PORT=3000 node app.js