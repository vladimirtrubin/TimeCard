document.addEventListener('DOMContentLoaded', function() {
    // Check if we're returning from profile edit
    const forceRefresh = localStorage.getItem('forceProfileRefresh');
    if (forceRefresh) {
        localStorage.removeItem('forceProfileRefresh');
        const currentEmployee = JSON.parse(localStorage.getItem('currentEmployee'));
        if (currentEmployee && currentEmployee.employeeId) {
            // Re-fetch employee data to show updated profile
            document.getElementById('employeeId').value = currentEmployee.employeeId;
            document.getElementById('employeeForm').dispatchEvent(new Event('submit'));
        }
    }

    // Form submission event listener
    document.getElementById('employeeForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const employeeId = document.getElementById('employeeId').value;
        const messageEl = document.getElementById('message');
        const token = localStorage.getItem('token');
        const profileSection = document.getElementById('profileSection');
        const passwordSection = document.getElementById('passwordSection');
        const loadingIndicator = document.getElementById('loadingIndicator');
        const searchButton = document.getElementById('searchButton');

        if (!token) {
            messageEl.textContent = 'Session expired. Please login again.';
            messageEl.style.color = 'red';
            setTimeout(() => window.location.href = 'login.html', 2000);
            return;
        }

        try {
            // Show loading state
            searchButton.disabled = true;
            loadingIndicator.style.display = 'block';
            messageEl.textContent = 'Searching...';
            messageEl.style.color = 'blue';
            profileSection.style.display = 'none';
            passwordSection.style.display = 'none';

            const response = await fetch(`http://localhost:5000/api/employee/${employeeId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            const data = await response.json();
            console.log('API Response:', data);

            if (response.ok && data.employee) {
                messageEl.style.color = 'green';
                messageEl.textContent = data.message;
                displayEmployeeProfile(data.employee);
            } else {
                throw new Error(data.message || 'Error retrieving employee data');
            }
        } catch (error) {
            console.error('Error:', error);
            messageEl.style.color = 'red';
            messageEl.textContent = error.message;
            profileSection.style.display = 'none';
            passwordSection.style.display = 'none';
        } finally {
            loadingIndicator.style.display = 'none';
            searchButton.disabled = false;
        }
    });

    // Remove these event listeners since the elements don't exist yet
    // document.getElementById('editProfileBtn').addEventListener('click', ...);
    // document.getElementById('updateDatabaseBtn').addEventListener('click', ...);
    // document.getElementById('profileEditForm').addEventListener('submit', ...);
});

// Keep the helper functions outside
function displayEmployeeProfile(employee) {
    console.log('Displaying employee profile:', employee);
    const profileSection = document.getElementById('profileSection');
    const passwordSection = document.getElementById('passwordSection');
    
    // Store employee data for later use
    profileSection.dataset.employeeInfo = JSON.stringify(employee);
    
    if (employee.requiresPassword) {
        // Employee exists in database - show password entry and additional buttons
        passwordSection.innerHTML = `
            <div class="profile-info">
                <h3>Password Required</h3>
                <div id="passwordEmployeeInfo" class="employee-details">
                    <p><strong>Employee ID:</strong> ${employee.employeeId}</p>
                    <p><strong>Name:</strong> ${employee.firstName} ${employee.lastName}</p>
                    <p><strong>Current Rank:</strong> ${employee.currentRank || 'FIREFIGHTER'}</p>
                </div>
                <div class="form-group">
                    <label for="password">Enter Password:</label>
                    <input type="password" id="password" required>
                </div>
                <div class="button-group">
                    <button type="button" class="btn-timecard" onclick="handleTimecardGeneration()">
                        Timecard Generator
                    </button>
                    <button type="button" class="btn-admin" onclick="handleAdminAccess()">
                        Administrator
                    </button>
                </div>
                <div class="button-group" style="margin-top: 10px;">
                    <button type="button" class="btn-edit" onclick="handleEditProfile('${employee.employeeId}')">
                        Edit Profile
                    </button>
                    <button type="button" class="btn-reset" onclick="handlePasswordReset('${employee.employeeId}')">
                        Reset Password
                    </button>
                </div>
            </div>
        `;

        passwordSection.style.display = 'block';
        profileSection.style.display = 'none';
    } else {
        // New employee from Kronos - show confirmation first
        const verificationContainer = document.createElement('div');
        verificationContainer.className = 'profile-info';
        verificationContainer.innerHTML = `
            <h3>Is this you?</h3>
            <div class="employee-details">
                <p><strong>Employee ID:</strong> ${employee.employeeId}</p>
                <p><strong>Name:</strong> ${employee.firstName} ${employee.lastName}</p>
                <p><strong>Current Rank:</strong> ${employee.currentRank}</p>
            </div>
            <div class="button-group">
                <button onclick="confirmIdentity('${employee.employeeId}')" class="btn-confirm">
                    Yes, that's me
                </button>
            </div>
        `;

        profileSection.innerHTML = '';
        profileSection.appendChild(verificationContainer);
        profileSection.style.display = 'block';
        passwordSection.style.display = 'none';
    }
}

async function confirmIdentity(employeeId) {
    const profileSection = document.getElementById('profileSection');
    const employeeData = JSON.parse(profileSection.dataset.employeeInfo);

    // Show email input form
    profileSection.innerHTML = `
        <div class="profile-info">
            <h3>Enter Your Email</h3>
            <div class="employee-details">
                <p><strong>Employee ID:</strong> ${employeeData.employeeId}</p>
                <p><strong>Name:</strong> ${employeeData.firstName} ${employeeData.lastName}</p>
            </div>
            <div class="form-group">
                <label for="verificationEmail">Email Address:</label>
                <input type="email" id="verificationEmail" required>
            </div>
            <div class="button-group">
                <button onclick="sendVerificationCode('${employeeId}')" class="btn-confirm">
                    Send Verification Code
                </button>
            </div>
        </div>
    `;
}

async function sendVerificationCode(employeeId) {
    const emailInput = document.getElementById('verificationEmail');
    const email = emailInput.value;

    if (!email) {
        showMessage('Please enter your email address', 'error');
        return;
    }

    try {
        const employeeData = JSON.parse(document.getElementById('profileSection').dataset.employeeInfo);
        
        const response = await fetch('http://localhost:5000/api/employee/send-2fa', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ 
                employeeId,
                email,
                employeeData: {
                    ...employeeData,
                    verificationEmail: email
                }
            })
        });

        if (response.ok) {
            // Store pending employee data with verification email
            const updatedEmployeeData = {
                ...employeeData,
                verificationEmail: email
            };
            localStorage.setItem('pendingEmployeeData', JSON.stringify(updatedEmployeeData));
            
            // Redirect to 2FA verification page
            window.location.href = 'verify-2fa.html';
        } else {
            throw new Error('Failed to send verification code');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage(error.message, 'error');
    }
}

// Add these handler functions
async function handleTimecardGeneration() {
    const password = document.getElementById('password').value;
    if (!password) {
        showMessage('Please enter your password', 'error');
        return;
    }

    const employeeData = JSON.parse(document.getElementById('profileSection').dataset.employeeInfo);
    
    try {
        const response = await fetch('http://localhost:5000/api/employee/verify-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                employeeId: employeeData.employeeId,
                password: password
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            // Store employee data for timecard page
            localStorage.setItem('currentEmployee', JSON.stringify(data.employee));
            window.location.href = 'payperiod.html';
        } else {
            showMessage(data.message || 'Invalid password', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error verifying password', 'error');
    }
}

function showMessage(message, type = 'info') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
    messageEl.style.color = type === 'error' ? 'red' : type === 'success' ? 'green' : 'blue';
}

// Add the handleAdminAccess function
async function handleAdminAccess() {
    const password = document.getElementById('password').value;
    if (!password) {
        showMessage('Please enter your password', 'error');
        return;
    }

    const employeeData = JSON.parse(document.getElementById('profileSection').dataset.employeeInfo);
    
    try {
        const response = await fetch('http://localhost:5000/api/employee/verify-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                employeeId: employeeData.employeeId,
                password: password
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            // Store employee data for admin page
            localStorage.setItem('currentEmployee', JSON.stringify(data.employee));
            window.location.href = 'admin.html';
        } else {
            showMessage(data.message || 'Invalid password', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error verifying password', 'error');
    }
}

// Add these new handler functions
async function handleEditProfile(employeeId) {
    const password = document.getElementById('password').value;
    if (!password) {
        showMessage('Please enter your password to edit profile', 'error');
        return;
    }

    try {
        // Verify password first
        const response = await fetch('http://localhost:5000/api/employee/verify-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                employeeId,
                password
            })
        });

        if (response.ok) {
            // Store current employee data and redirect to edit profile page
            const employeeData = JSON.parse(document.getElementById('profileSection').dataset.employeeInfo);
            localStorage.setItem('currentEmployee', JSON.stringify(employeeData));
            window.location.href = 'edit-profile.html';
        } else {
            throw new Error('Invalid password');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage(error.message, 'error');
    }
}

async function handlePasswordReset(employeeId) {
    try {
        const employeeData = JSON.parse(document.getElementById('profileSection').dataset.employeeInfo);
        
        // Show email confirmation form
        const passwordSection = document.getElementById('passwordSection');
        passwordSection.innerHTML = `
            <div class="profile-info">
                <h3>Reset Password</h3>
                <div class="employee-details">
                    <p><strong>Employee ID:</strong> ${employeeData.employeeId}</p>
                    <p><strong>Name:</strong> ${employeeData.firstName} ${employeeData.lastName}</p>
                </div>
                <div class="form-group">
                    <label for="resetEmail">Confirm Your Email:</label>
                    <input type="email" id="resetEmail" required>
                </div>
                <div class="button-group">
                    <button onclick="startPasswordReset('${employeeId}')" class="btn-confirm">
                        Send Verification Code
                    </button>
                    <button onclick="cancelPasswordReset()" class="btn-cancel">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        showMessage('Please confirm your email to reset password', 'info');
    } catch (error) {
        console.error('Error:', error);
        showMessage(error.message, 'error');
    }
}

async function startPasswordReset(employeeId) {
    const emailInput = document.getElementById('resetEmail');
    const email = emailInput.value;

    if (!email) {
        showMessage('Please enter your email address', 'error');
        return;
    }

    try {
        const employeeData = JSON.parse(document.getElementById('profileSection').dataset.employeeInfo);
        
        const response = await fetch('http://localhost:5000/api/employee/send-2fa', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ 
                employeeId,
                email,
                employeeData: {
                    ...employeeData,
                    verificationEmail: email,
                    isPasswordReset: true // Flag to indicate this is a password reset
                }
            })
        });

        if (response.ok) {
            // Store pending employee data with verification email
            const updatedEmployeeData = {
                ...employeeData,
                verificationEmail: email,
                isPasswordReset: true
            };
            localStorage.setItem('pendingEmployeeData', JSON.stringify(updatedEmployeeData));
            
            // Redirect to 2FA verification page
            window.location.href = 'verify-2fa.html';
        } else {
            throw new Error('Failed to send verification code');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage(error.message, 'error');
    }
}

function cancelPasswordReset() {
    // Restore original password section display
    const employeeData = JSON.parse(document.getElementById('profileSection').dataset.employeeInfo);
    displayEmployeeProfile(employeeData);
    showMessage('Password reset cancelled', 'info');
}

// Keep other helper functions...
