document.addEventListener('DOMContentLoaded', function() {
    const pendingEmployeeData = JSON.parse(localStorage.getItem('pendingEmployeeData') || '{}');
    const employeeInfoDiv = document.getElementById('employeeInfo');
    
    if (!pendingEmployeeData.employeeId) {
        window.location.href = 'employee.html';
        return;
    }

    // Update the employee info display
    employeeInfoDiv.innerHTML = `
        <h3>${pendingEmployeeData.isPasswordReset ? 'Reset Password' : 'Employee Information'}</h3>
        <p><strong>ID:</strong> ${pendingEmployeeData.employeeId}</p>
        <p><strong>Name:</strong> ${pendingEmployeeData.firstName} ${pendingEmployeeData.lastName}</p>
        <p><strong>Current Rank:</strong> ${pendingEmployeeData.currentRank}</p>
        <p><strong>Verification Email:</strong> ${pendingEmployeeData.verificationEmail}</p>
    `;

    // Update section title for password reset
    if (pendingEmployeeData.isPasswordReset) {
        document.querySelector('h2').textContent = 'Reset Your Password';
        document.getElementById('passwordSection').querySelector('h3').textContent = 'Enter New Password';
    }
});

// Handle verification code submission
document.getElementById('verificationForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const code = document.getElementById('verificationCode').value;
    const pendingEmployeeData = JSON.parse(localStorage.getItem('pendingEmployeeData') || '{}');
    const employeeId = pendingEmployeeData.employeeId;

    try {
        showMessage('Verifying code...', 'info');

        const response = await fetch('http://localhost:5000/api/employee/verify-2fa', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ 
                employeeId: employeeId,
                verificationCode: code 
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            showMessage('Verification successful! Please create your password.', 'success');
            document.getElementById('verificationSection').style.display = 'none';
            document.getElementById('passwordSection').style.display = 'block';
        } else {
            throw new Error(data.message || 'Verification failed');
        }
    } catch (error) {
        console.error('Verification error:', error);
        showMessage(error.message, 'error');
    }
});

// Handle password creation
document.getElementById('passwordForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const pendingEmployeeData = JSON.parse(localStorage.getItem('pendingEmployeeData') || '{}');

    if (newPassword !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }

    try {
        const response = await fetch('http://localhost:5000/api/employee/set-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                employeeId: pendingEmployeeData.employeeId,
                password: newPassword,
                employeeData: pendingEmployeeData
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            showMessage('Password set successfully! Redirecting...', 'success');
            localStorage.removeItem('pendingEmployeeData'); // Clean up
            setTimeout(() => window.location.href = 'employee.html', 2000);
        } else {
            throw new Error(data.message || 'Failed to set password');
        }
    } catch (error) {
        console.error('Error setting password:', error);
        showMessage(error.message, 'error');
    }
});

function showMessage(message, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
}
