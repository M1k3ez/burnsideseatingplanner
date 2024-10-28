document.addEventListener('DOMContentLoaded', function() {
    const createTemplateBtn = document.getElementById('createTemplateBtn');
    if (createTemplateBtn) {
        createTemplateBtn.addEventListener('click', function() {
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

    const classroomSelect = document.getElementById('classroomSelect');
    const templateSelectContainer = document.querySelector('.template-select-container');
    
    if (classroomSelect) {
        classroomSelect.addEventListener('change', async function() {
            const classroomId = this.value;
            if (!classroomId) {
                templateSelectContainer.classList.add('d-none');
                return;
            }

            try {
                const response = await fetch(`/teacher/api/classroom/${classroomId}/templates`);
                if (!response.ok) throw new Error('Failed to fetch templates');
                const data = await response.json();

                const templateSelect = document.getElementById('templateSelect');
                
                if (data.templates && data.templates.length > 0) {
                    templateSelect.innerHTML = '<option value="">No template</option>';
                    data.templates.forEach(template => {
                        const date = new Date(template.date_created).toLocaleDateString();
                        templateSelect.innerHTML += `
                            <option value="${template.template_id}">
                                Template created on ${date}
                            </option>
                        `;
                    });
                    templateSelectContainer.classList.remove('d-none');
                } else {
                    templateSelectContainer.classList.add('d-none');
                }
            } catch (error) {
                console.error('Error fetching templates:', error);
                templateSelectContainer.classList.add('d-none');
            }
        });
    }

    const seatingPlanForm = document.getElementById('seatingPlanForm');
    if (seatingPlanForm) {
        seatingPlanForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const className = document.getElementById('classSelect').options[document.getElementById('classSelect').selectedIndex].text;
            const defaultPlanName = `Seating Plan - ${className}`;
            const planName = prompt('Enter a name for the seating plan:', defaultPlanName);
            
            if (!planName) return; // User cancelled or entered empty name

            const formData = {
                class_id: document.getElementById('classSelect').value,
                classroom_id: document.getElementById('classroomSelect').value,
                template_id: document.getElementById('templateSelect')?.value || null,
                seating_plan_name: planName.trim()
            };

            try {
                const response = await fetch('/teacher/create_seating_plan', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
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
                const errorMessage = document.getElementById('errorMessage');
                errorMessage.textContent = error.message;
                errorMessage.classList.remove('d-none');
            }
        });
    }

    // Add event listener for plan name editing in edit_seating_plan.html
    const planNameDisplay = document.querySelector('.plan-name-display');
    const planNameEdit = document.querySelector('.plan-name-edit');
    const planNameInput = document.querySelector('.plan-name-input');
    const editNameBtn = document.querySelector('.edit-name-btn');
    const saveNameBtn = document.querySelector('.save-name-btn');
    const cancelNameBtn = document.querySelector('.cancel-name-btn');

    if (editNameBtn && planNameDisplay) {
        editNameBtn.addEventListener('click', function() {
            planNameDisplay.classList.add('d-none');
            planNameEdit.classList.remove('d-none');
            planNameInput.value = planNameDisplay.textContent.trim();
            planNameInput.focus();
        });

        saveNameBtn.addEventListener('click', async function() {
            const newName = planNameInput.value.trim();
            if (!newName) return;

            const planId = planNameInput.dataset.planId;
            try {
                const response = await fetch(`/teacher/api/seating_plan/${planId}/name`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name: newName })
                });

                if (!response.ok) throw new Error('Failed to update name');
                const data = await response.json();

                if (data.success) {
                    planNameDisplay.textContent = newName;
                    planNameDisplay.classList.remove('d-none');
                    planNameEdit.classList.add('d-none');
                }
            } catch (error) {
                console.error('Error updating name:', error);
                alert('Failed to update seating plan name');
            }
        });

        cancelNameBtn.addEventListener('click', function() {
            planNameDisplay.classList.remove('d-none');
            planNameEdit.classList.add('d-none');
        });
    }
});