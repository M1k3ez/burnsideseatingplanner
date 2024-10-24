document.addEventListener('DOMContentLoaded', function() {
    const classSelect = document.getElementById('classSelect');
    const tableContainer = document.getElementById('studentsTableContainer');
    const notesContainer = document.getElementById('notesModalContainer');
    const classEditModeBtn = document.getElementById('classEditModeBtn');
    const importBtn = document.querySelector('[data-bs-target="#importModal"]');
    const exportBtn = document.querySelector('a[href*="export_csv"]');
    let sacOptions = [];

    const ACADEMIC_PERFORMANCE = {
        "NEED TO BE UPDATED BY TEACHER": 0,
        "NOT ACHIEVING": 1,
        "ACHIEVING": 2,
        "ACHIEVING WELL": 3,
        "EXCELLING": 4
    };

    const LANGUAGE_PROFICIENCY = {
        "NEED TO BE UPDATED BY TEACHER": 0,
        "GOOD ENOUGH FOR COMMUNICATION AND LEARNING": 1,
        "NOT GOOD ENOUGH FOR COMMUNICATION AND LEARNING": 2
    };

    function showEditModeButtons() {
        const btnContainer = importBtn.parentElement;
        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'btn btn-success';
        saveBtn.textContent = 'Save Changes';
        saveBtn.id = 'classSaveBtn';
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-danger';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.id = 'classCancelBtn';
        importBtn.style.display = 'none';
        exportBtn.style.display = 'none';
        classEditModeBtn.style.display = 'none';
        btnContainer.appendChild(saveBtn);
        btnContainer.appendChild(cancelBtn);
        saveBtn.addEventListener('click', saveAllChanges);
        cancelBtn.addEventListener('click', cancelAllChanges);
    }

    function restoreOriginalButtons() {
        const saveBtn = document.getElementById('classSaveBtn');
        const cancelBtn = document.getElementById('classCancelBtn');

        if (saveBtn) saveBtn.remove();
        if (cancelBtn) cancelBtn.remove();

        importBtn.style.display = '';
        exportBtn.style.display = '';
        classEditModeBtn.style.display = '';
    }

    function createSelect(options, currentValue) {
        const select = document.createElement('select');
        select.className = 'form-select form-select-sm';
        Object.entries(options).forEach(([label, value]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            if (currentValue === label) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        return select;
    }

 // Modified makeAllRowsEditable function
 function makeAllRowsEditable() {
    const rows = document.querySelectorAll('#studentsTableBody tr');
    rows.forEach(row => {
        // Store original values
        row.querySelectorAll('td').forEach(cell => {
            cell.dataset.original = cell.textContent;
        });

        // Student ID cell
        const idCell = row.querySelector('td:first-child');
        const idInput = document.createElement('input');
        idInput.type = 'text';
        idInput.className = 'form-control form-control-sm';
        idInput.value = idCell.textContent;
        idCell.textContent = '';
        idCell.appendChild(idInput);

        // Name cell
        const nameCell = row.querySelector('td:nth-child(3)');
        const fullName = nameCell.textContent.split(' ');
        const nameContainer = document.createElement('div');
        nameContainer.className = 'd-flex gap-2';
        
        const firstNameInput = document.createElement('input');
        firstNameInput.type = 'text';
        firstNameInput.className = 'form-control form-control-sm';
        firstNameInput.value = fullName[0];
        firstNameInput.placeholder = 'First Name';

        const lastNameInput = document.createElement('input');
        lastNameInput.type = 'text';
        lastNameInput.className = 'form-control form-control-sm';
        lastNameInput.value = fullName[1] || '';
        lastNameInput.placeholder = 'Last Name';

        nameContainer.appendChild(firstNameInput);
        nameContainer.appendChild(lastNameInput);
        nameCell.textContent = '';
        nameCell.appendChild(nameContainer);

        // Gender cell
        const genderCell = row.querySelector('td:nth-child(4)');
        const genderSelect = document.createElement('select');
        genderSelect.className = 'form-select form-select-sm';
        ['M', 'F', 'O'].forEach(gender => {
            const option = document.createElement('option');
            option.value = gender;
            option.textContent = gender === 'M' ? 'Male' : gender === 'F' ? 'Female' : 'Other';
            if (genderCell.textContent === gender) option.selected = true;
            genderSelect.appendChild(option);
        });
        genderCell.textContent = '';
        genderCell.appendChild(genderSelect);

        // SAC Status cell
        const sacCell = row.querySelector('td:nth-child(5)');
        const sacCheckboxes = createSacCheckboxes(sacCell.textContent);
        sacCell.textContent = '';
        sacCell.appendChild(sacCheckboxes);

        // Performance and Proficiency cells (keep existing code)
        const performanceCell = row.querySelector('.performance-cell');
        const proficiencyCell = row.querySelector('.proficiency-cell');
        
        const performanceSelect = createSelect(ACADEMIC_PERFORMANCE, performanceCell.textContent);
        const proficiencySelect = createSelect(LANGUAGE_PROFICIENCY, proficiencyCell.textContent);

        performanceCell.textContent = '';
        performanceCell.appendChild(performanceSelect);
        proficiencyCell.textContent = '';
        proficiencyCell.appendChild(proficiencySelect);
    });

    showEditModeButtons();
}

// Modified saveAllChanges function
    async function saveAllChanges() {
        const classId = classSelect.value;
        const updates = {};
        const rows = document.querySelectorAll('#studentsTableBody tr');
        rows.forEach(row => {
            const studentId = row.querySelector('td:first-child input').value;
            const firstName = row.querySelector('td:nth-child(3) input:first-child').value;
            const lastName = row.querySelector('td:nth-child(3) input:last-child').value;
            const gender = row.querySelector('td:nth-child(4) select').value;
            const sacCheckboxes = row.querySelectorAll('.sac-checkbox-container input:checked');
            const performanceSelect = row.querySelector('.performance-cell select');
            const proficiencySelect = row.querySelector('.proficiency-cell select');
            
            updates[studentId] = {
            student_id: studentId,
            first_name: firstName,
            last_name: lastName,
            gender: gender,
            sac_ids: Array.from(sacCheckboxes).map(cb => cb.value),
            academic_performance: performanceSelect.value,
            language_proficiency: proficiencySelect.value
        };
    });

    try {
        const response = await fetch(`/teacher/api/class/${classId}/students/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        });

        if (!response.ok) throw new Error('Failed to update students');

        // Update display
        rows.forEach(row => {
            const idCell = row.querySelector('td:first-child');
            const nameCell = row.querySelector('td:nth-child(3)');
            const genderCell = row.querySelector('td:nth-child(4)');
            const sacCell = row.querySelector('td:nth-child(5)');
            const performanceCell = row.querySelector('.performance-cell');
            const proficiencyCell = row.querySelector('.proficiency-cell');

            // Update all cells with new values
            const idInput = idCell.querySelector('input');
            const firstNameInput = nameCell.querySelector('input:first-child');
            const lastNameInput = nameCell.querySelector('input:last-child');
            const genderSelect = genderCell.querySelector('select');
            const sacCheckboxes = sacCell.querySelectorAll('input:checked');
            const performanceSelect = performanceCell.querySelector('select');
            const proficiencySelect = proficiencyCell.querySelector('select');

            idCell.textContent = idInput.value;
            nameCell.textContent = `${firstNameInput.value} ${lastNameInput.value}`;
            genderCell.textContent = genderSelect.value;
            sacCell.textContent = Array.from(sacCheckboxes)
                .map(cb => cb.nextElementSibling.textContent)
                .join(', ') || 'No SAC conditions';
            performanceCell.textContent = performanceSelect.options[performanceSelect.selectedIndex].text;
            proficiencyCell.textContent = proficiencySelect.options[proficiencySelect.selectedIndex].text;
        });

        restoreOriginalButtons();

    } catch (error) {
        console.error('Error updating students:', error);
        alert('Failed to update students. Please try again.');
    }
}

    function cancelAllChanges() {
        const rows = document.querySelectorAll('#studentsTableBody tr');
        rows.forEach(row => {
            const performanceCell = row.querySelector('.performance-cell');
            const proficiencyCell = row.querySelector('.proficiency-cell');

            performanceCell.textContent = performanceCell.dataset.original;
            proficiencyCell.textContent = proficiencyCell.dataset.original;
        });

        restoreOriginalButtons();
    }
    async function fetchSacOptions() {
        try {
            const response = await fetch('/teacher/api/sac-options');
            if (!response.ok) throw new Error('Failed to fetch SAC options');
            const data = await response.json();
            sacOptions = data.sac_options;
        } catch (error) {
            console.error('Error fetching SAC options:', error);
            sacOptions = [];
        }
    }

    // Call this when page loads
    fetchSacOptions();
    function createSacCheckboxes(currentSacStatus) {
        const container = document.createElement('div');
        container.className = 'sac-checkbox-container';
        
        const currentSacs = currentSacStatus ? currentSacStatus.split(',').map(s => s.trim()) : [];
        
        sacOptions.forEach(sac => {
            const div = document.createElement('div');
            div.className = 'form-check';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'form-check-input';
            checkbox.value = sac.sac_id;
            checkbox.checked = currentSacs.includes(sac.sac_name);
            checkbox.id = `sac-${sac.sac_id}`;
            
            const label = document.createElement('label');
            label.className = 'form-check-label';
            label.htmlFor = `sac-${sac.sac_id}`;
            label.textContent = sac.sac_name;
            
            div.appendChild(checkbox);
            div.appendChild(label);
            container.appendChild(div);
        });
        
        return container;
    }

    if (classEditModeBtn) {
        classEditModeBtn.addEventListener('click', makeAllRowsEditable);
    }

    if (classEditModeBtn) classEditModeBtn.addEventListener('click', makeAllRowsEditable);
    if (classSaveBtn) classSaveBtn.addEventListener('click', saveAllChanges);
    if (classCancelBtn) classCancelBtn.addEventListener('click', cancelAllChanges);

    classSelect.addEventListener('change', async function() {
        const classId = this.value;
        if (!classId) {
            tableContainer.style.display = 'none';
            return;
        }
        try {
            const response = await fetch(`/teacher/api/class/${classId}/students`);
            if (!response.ok) throw new Error('Failed to fetch students');
            const data = await response.json();
            tableContainer.style.display = 'block';
            const tableBody = document.getElementById('studentsTableBody');
            tableBody.innerHTML = '';
            notesContainer.innerHTML = '';
            data.students.forEach(student => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${student.student_id}</td>
                    <td>
                        <img src="${student.photo || '/static/images/default_avatar.png'}" 
                             alt="${student.student_id}" 
                             class="img-thumbnail" 
                             style="max-width: 50px;">
                    </td>
                    <td>${student.first_name} ${student.last_name}</td>
                    <td>${student.gender}</td>
                    <td>${student.sac_status || 'No SAC conditions'}</td>
                    <td class="performance-cell">${student.academic_performance}</td>
                    <td class="proficiency-cell">${student.language_proficiency}</td>
                    <td>
                        <button type="button" class="btn btn-primary btn-sm" 
                                data-bs-toggle="modal" 
                                data-bs-target="#studentNoteModal${student.student_id}">
                            Add & View Notes
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);

                const modalDiv = document.createElement('div');
                modalDiv.innerHTML = `
                    <div id="studentNoteModal${student.student_id}" class="modal fade notes-modal" 
                         tabindex="-1" aria-labelledby="studentNoteModalLabel${student.student_id}" aria-hidden="true">
                        <div class="modal-dialog modal-lg">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title" id="studentNoteModalLabel${student.student_id}">
                                        Notes for ${student.first_name} ${student.last_name}
                                    </h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div class="modal-body">
                                    <div id="student-notes-root${student.student_id}"
                                         data-student-id="${student.student_id}"
                                         data-student-name="${student.first_name} ${student.last_name}">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                notesContainer.appendChild(modalDiv);

                const root = ReactDOM.createRoot(
                    document.getElementById(`student-notes-root${student.student_id}`)
                );
                root.render(React.createElement(window.StudentNotes, {
                    studentId: student.student_id,
                    studentName: `${student.first_name} ${student.last_name}`
                }));
            });
        } catch (error) {
            console.error('Error fetching students:', error);
            alert('Failed to load students. Please try again.');
        }
    });
});