console.log('session_management.js loaded');

var socket = io.connect(location.protocol + '//' + location.hostname + ':' + location.port);

socket.on('connect', function() {
    console.log('Connected to server via WebSocket.');
});

socket.on('disconnect', function() {
    console.log('Disconnected from WebSocket.');
});

// Existing event listeners for verification
socket.on('request_verification', function(data) {
    console.log('Received request_verification event from server.');
    showVerificationPrompt();
});

socket.on('verification_success', function(data) {
    console.log('Verification successful.');
    hideVerificationPrompt();
});

socket.on('verification_failed', function(data) {
    console.log(data.message);
    alert(data.message);
    setTimeout(function() {
        window.location.href = '/logout';
    }, 2000); // log out after 2s
});

socket.on('force_logout', function(data) {
    console.log('Server is forcing logout:', data.reason);
    window.location.href = '/logout';
});

// CSV Import Status Listener
socket.on('csv_import_status', function(data) {
    console.log('CSV Import Status: ', data.status);
    document.getElementById('import_status').innerHTML = data.status;
});

// CSV Import Progress Listener
socket.on('csv_import_progress', function(data) {
    console.log('CSV Import Progress: ', data.status);
    document.getElementById('import_progress').innerHTML = data.status;
});

// Handle the form submission for verification (already exists)
document.getElementById('verificationForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var user_id = document.getElementById('verificationUserId').value;
    if (user_id) {
        socket.emit('verify_user', {'user_id': user_id});
    } else {
        window.location.href = '/logout';
    }
});

function showVerificationPrompt() {
    var verificationModal = new bootstrap.Modal(document.getElementById('verificationModal'));
    verificationModal.show();
}

function hideVerificationPrompt() {
    var verificationModal = bootstrap.Modal.getInstance(document.getElementById('verificationModal'));
    if (verificationModal) {
        verificationModal.hide();
        document.getElementById('verificationUserId').value = '';
    }
}
