document.addEventListener('DOMContentLoaded', function() {
    // Create Template Button Handler
    const createTemplateBtn = document.getElementById('createTemplateBtn');
    if (createTemplateBtn) {
        createTemplateBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            const templateName = document.getElementById('templateName').value.trim();
            const classroomId = document.getElementById('classroomSelect').value;
            
            if (!templateName || !classroomId) {
                const errorMessage = document.getElementById('errorMessage');
                errorMessage.textContent = 'Please provide a template name and select a classroom';
                errorMessage.classList.remove('d-none');
                return;
            }

            window.location.href = `/teacher/templates/create/${classroomId}?name=${encodeURIComponent(templateName)}`;
        });
    }

    // Delete Template Handler
    function confirmDelete(templateId, templateName) {
        const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
        document.getElementById('deleteTemplateName').textContent = templateName;
        document.getElementById('deleteForm').action = `/teacher/api/templates/${templateId}`;
        deleteModal.show();
    }

    // Use Template Handler
    let selectedTemplateId = null;

    function useTemplate(templateId, templateName) {
        selectedTemplateId = templateId;
        const useTemplateModal = new bootstrap.Modal(document.getElementById('useTemplateModal'));
        useTemplateModal.show();
    }

    // Confirm Use Template Handler
    const confirmUseTemplateBtn = document.getElementById('confirmUseTemplateBtn');
    if (confirmUseTemplateBtn) {
        confirmUseTemplateBtn.addEventListener('click', async function() {
            const classId = document.getElementById('classSelect').value;
            if (!classId || !selectedTemplateId) {
                const errorElement = document.getElementById('useTemplateError');
                errorElement.textContent = 'Please select a class';
                errorElement.classList.remove('d-none');
                return;
            }

            try {
                const response = await fetch('/teacher/create_seating_plan', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        class_id: classId,
                        template_id: selectedTemplateId
                    })
                });

                const data = await response.json();
                if (data.success) {
                    window.location.href = `/teacher/edit_seating_plan/${data.seating_plan_id}`;
                } else {
                    throw new Error(data.error || 'Failed to create seating plan');
                }
            } catch (error) {
                const errorElement = document.getElementById('useTemplateError');
                errorElement.textContent = 'Failed to create seating plan';
                errorElement.classList.remove('d-none');
            }
        });
    }

    // Modal Clear Handlers
    const newTemplateModal = document.getElementById('newTemplateModal');
    if (newTemplateModal) {
        newTemplateModal.addEventListener('hidden.bs.modal', function() {
            document.getElementById('templateName').value = '';
            document.getElementById('classroomSelect').value = '';
            document.getElementById('errorMessage').classList.add('d-none');
        });
    }

    const useTemplateModal = document.getElementById('useTemplateModal');
    if (useTemplateModal) {
        useTemplateModal.addEventListener('hidden.bs.modal', function() {
            document.getElementById('classSelect').value = '';
            document.getElementById('useTemplateError').classList.add('d-none');
            selectedTemplateId = null;
        });
    }

    // Make functions globally available
    window.confirmDelete = confirmDelete;
    window.useTemplate = useTemplate;
});