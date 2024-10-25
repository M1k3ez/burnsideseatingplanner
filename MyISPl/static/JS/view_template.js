document.addEventListener('DOMContentLoaded', function() {
    const templateForm = document.getElementById('templateForm');
    if (templateForm) {
        templateForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const classroomId = document.getElementById('templateClassroomSelect').value;
            
            if (!classroomId) {
                const errorMessage = document.getElementById('templateErrorMessage');
                errorMessage.textContent = 'Please select a classroom';
                errorMessage.classList.remove('d-none');
                return;
            }
            window.location.href = `/teacher/templates/create/${classroomId}`;
        });
    }

    let templateToDelete = null;
    document.querySelectorAll('.delete-template-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            templateToDelete = this.dataset.templateId;
            const templateName = this.dataset.classroomName;
            document.getElementById('deleteTemplateName').textContent = templateName;
            new bootstrap.Modal(document.getElementById('deleteModal')).show();
        });
    });

    document.getElementById('confirmDelete').addEventListener('click', async function() {
        if (!templateToDelete) return;

        try {
            const response = await fetch(`/teacher/api/templates/${templateToDelete}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                window.location.reload();
            } else {
                alert('Failed to delete template');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to delete template');
        }
    });

    document.querySelectorAll('.use-template-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const templateId = this.dataset.templateId;
            document.getElementById('selectedTemplateId').value = templateId;
            new bootstrap.Modal(document.getElementById('useTemplateModal')).show();
        });
    });

    const useTemplateForm = document.getElementById('useTemplateForm');
    if (useTemplateForm) {
        useTemplateForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const templateId = document.getElementById('selectedTemplateId').value;
            const classId = document.getElementById('classSelect').value;

            if (!classId) {
                alert('Please select a class');
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
                        template_id: templateId,
                        classroom_id: document.querySelector(`[data-template-id="${templateId}"]`).dataset.classroomId
                    })
                });

                if (!response.ok) throw new Error('Failed to create seating plan');
                const data = await response.json();

                if (data.success) {
                    window.location.href = `/teacher/edit_seating_plan/${data.seating_plan_id}`;
                } else {
                    throw new Error(data.error || 'Failed to create seating plan');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Failed to create seating plan: ' + error.message);
            }
        });
    }
});