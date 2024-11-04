<<<<<<< HEAD
const API_URL =
  process.env.NODE_ENV === "production"
    ? `https://${window.location.hostname}/api` // This will work on Replit
    : "http://localhost:5000/api";

export default API_URL;
=======
const API_URL = process.env.NODE_ENV === 'production' 
  ? `https://${window.location.hostname}/api`  // This will work on Replit
  : 'http://localhost:5000/api';

export default API_URL; 
>>>>>>> c2ea421738a9bef670c45cd37fc260e8f53b6e39
