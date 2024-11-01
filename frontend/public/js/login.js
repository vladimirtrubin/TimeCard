document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    console.log('Login form submitted');
    
    const organization = document.getElementById('organization').value.trim();
    const password = document.getElementById('password').value;
    const messageEl = document.getElementById('message');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const submitButton = document.getElementById('submitButton');
    
    // Use localhost instead of IP
    const API_URL = 'http://localhost:5000';
    
    console.log('Attempting login for organization:', organization);

    try {
        // Disable submit button and show loading
        submitButton.disabled = true;
        loadingIndicator.style.display = 'block';
        messageEl.textContent = 'Connecting to server...';
        messageEl.style.color = 'blue';

        // Test server connection first
        try {
            const healthCheck = await fetch(`${API_URL}/api/health`);
            if (!healthCheck.ok) {
                throw new Error('Server is not responding');
            }
            console.log('Server health check passed');
        } catch (error) {
            throw new Error('Cannot connect to server. Please check if the server is running.');
        }

        // Proceed with login
        console.log('Sending login request to:', `${API_URL}/api/auth/login`);
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ organization, password })
        });

        console.log('Response status:', response.status);
        
        // Log raw response
        const rawResponse = await response.text();
        console.log('Raw response:', rawResponse);
        
        // Parse JSON
        const data = rawResponse ? JSON.parse(rawResponse) : {};
        console.log('Parsed response data:', data);

        if (response.ok) {
            console.log('Login successful, storing token');
            messageEl.style.color = 'green';
            messageEl.textContent = 'Login successful! Redirecting...';
            
            // Store token and organization name
            localStorage.setItem('token', data.token);
            localStorage.setItem('organization', data.organization);
            
            // Delay redirect slightly to show success message
            setTimeout(() => {
                window.location.href = 'employee.html';
            }, 1000);
        } else {
            throw new Error(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        messageEl.style.color = 'red';
        messageEl.textContent = error.message || 'Unable to connect to server. Please try again.';
        
        // Clear password field on error
        document.getElementById('password').value = '';
    } finally {
        // Re-enable submit button and hide loading
        submitButton.disabled = false;
        loadingIndicator.style.display = 'none';
    }
});

// Test API connectivity when the page loads
window.addEventListener('load', async () => {
    const messageEl = document.getElementById('message');
    try {
        const response = await fetch('http://localhost:5000/api/health');
        const data = await response.json();
        console.log('API Health Check:', data);
        if (response.ok) {
            messageEl.textContent = '';  // Clear any previous messages if server is healthy
            console.log('Server is healthy');
        }
    } catch (error) {
        console.error('API Health Check Failed:', error);
        messageEl.style.color = 'red';
        messageEl.textContent = 'Warning: Unable to connect to server';
    }
});
