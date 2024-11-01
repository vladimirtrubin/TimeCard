document.addEventListener('DOMContentLoaded', function() {
    // Load employee data from localStorage
    const employeeData = JSON.parse(localStorage.getItem('currentEmployee'));
    if (!employeeData) {
        window.location.href = 'employee.html';
        return;
    }

    // Populate form fields
    document.getElementById('firstName').value = employeeData.firstName;
    document.getElementById('lastName').value = employeeData.lastName;
    document.getElementById('currentRank').value = employeeData.currentRank;
});

async function saveProfile() {
    const employeeData = JSON.parse(localStorage.getItem('currentEmployee'));
    
    const updatedData = {
        employeeId: employeeData.employeeId,
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        currentRank: document.getElementById('currentRank').value
    };

    try {
        const response = await fetch('http://localhost:5000/api/employee/update-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(updatedData)
        });

        const data = await response.json();

        if (response.ok) {
            // Update stored employee data
            const updatedEmployee = {
                ...employeeData,
                ...updatedData,
                requiresPassword: true // Ensure password section shows on return
            };
            localStorage.setItem('currentEmployee', JSON.stringify(updatedEmployee));

            showMessage('Profile updated successfully', 'success');
            
            // Redirect back to employee page
            setTimeout(() => {
                window.location.href = 'employee.html';
                // Force a refresh of the employee profile
                localStorage.setItem('forceProfileRefresh', 'true');
            }, 1500);
        } else {
            throw new Error(data.message || 'Failed to update profile');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage(error.message, 'error');
    }
}

function showMessage(message, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
} 