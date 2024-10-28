function confirmDelete(planId, planName) {
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    document.getElementById('deletePlanName').textContent = planName;
    document.getElementById('deleteForm').action = `/teacher/seating_plan/${planId}/delete`;
    deleteModal.show();
}

$(document).ready(function() {
    $('#classroomSelect').change(function() {
        console.log('Classroom selected:', $(this).val());
        const classroomId = $(this).val();
        if (!classroomId) {
            $('.template-select-container').addClass('d-none');
            return;
        }
        $.ajax({
            url: `/teacher/api/classroom/${classroomId}/templates`,
            method: 'GET',
            success: function(response) {
                console.log('Templates response:', response);
                const templateSelect = $('#templateSelect');
                if (response.success && response.templates && response.templates.length > 0) {
                    templateSelect.html('<option value="">No template</option>');
                    response.templates.forEach(template => {
                        templateSelect.append(`
                            <option value="${template.template_id}">
                                Template (${new Date(template.date_created).toLocaleDateString()})
                            </option>
                        `);
                    });
                    $('.template-select-container').removeClass('d-none');
                } else {
                    $('.template-select-container').addClass('d-none');
                }
            },
            error: function(err) {
                console.error('Error fetching templates:', err);
                $('.template-select-container').addClass('d-none');
            }
        });
    });
    $('#createPlanBtn').click(function(e) {
        e.preventDefault();
        console.log('Create plan button clicked');
        const classId = $('#classSelect').val();
        const classroomId = $('#classroomSelect').val();
        console.log('Selected class:', classId);
        console.log('Selected classroom:', classroomId);
        if (!classId || !classroomId) {
            $('#errorMessage')
                .text('Please select both a class and a classroom')
                .removeClass('d-none');
            return;
        }
        const formData = {
            class_id: classId,
            classroom_id: classroomId,
            template_id: $('#templateSelect').val() || null
        };
        $.ajax({
            url: '/teacher/create_seating_plan',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function(response) {
                console.log('Create plan response:', response);
                if (response.success) {
                    window.location.href = `/teacher/edit_seating_plan/${response.seating_plan_id}`;
                } else {
                    $('#errorMessage')
                        .text(response.error || 'Failed to create seating plan')
                        .removeClass('d-none');
                }
            },
            error: function(xhr, status, error) {
                console.error('Error creating plan:', error);
                console.error('Status:', status);
                console.error('Response:', xhr.responseText);
                $('#errorMessage')
                    .text('Error creating seating plan: ' + error)
                    .removeClass('d-none');
            }
        });
    });
});