const API_URL = process.env.NODE_ENV === 'production' 
  ? `https://${window.location.hostname}/api`  // This will work on Replit
  : 'http://localhost:5000/api';

export default API_URL; 