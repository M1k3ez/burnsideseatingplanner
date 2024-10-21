document.addEventListener('DOMContentLoaded', function() {
    var socket = io.connect(location.protocol + '//' + location.hostname + ':' + location.port);

    document.getElementById('csvImportForm').addEventListener('submit', function(e) {
        e.preventDefault();
        var formData = new FormData(this);
        var importStatus = document.getElementById('import_status');
        var importProgress = document.getElementById('import_progress');
        var importType = document.getElementById('importType').value;
        
        importStatus.innerHTML = `Uploading ${importType} file...`;
        importProgress.innerHTML = '';

        fetch(this.action, {
            method: 'POST',
            body: formData
        })
        .then(response => response.text())
        .then(data => {
            try {
                var jsonData = JSON.parse(data);
                if (jsonData.error) {
                    importStatus.innerHTML = `Error: ${jsonData.error}`;
                    showFlashMessage('danger', jsonData.error);
                } else {
                    importStatus.innerHTML = `${importType} CSV import initiated. Please wait...`;
                }
            } catch (e) {
                document.open();
                document.write(data);
                document.close();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            importStatus.innerHTML = `Error initiating ${importType} CSV import. Please try again.`;
            showFlashMessage('danger', `Error initiating ${importType} CSV import. Please try again.`);
        });
    });

    socket.on('csv_import_status', function(data) {
        console.log('CSV Import Status: ', data.status);
        document.getElementById('import_status').innerHTML = data.status;
        if (data.status === 'Import complete!') {
            showFlashMessage('success', 'CSV imported successfully');
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
    });

    socket.on('csv_import_progress', function(data) {
        console.log('CSV Import Progress: ', data.status);
        document.getElementById('import_progress').innerHTML = data.status;
    });
});

function showFlashMessage(type, message) {
    console.log(`${type} message: ${message}`);
}