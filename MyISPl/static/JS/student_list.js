document.addEventListener('DOMContentLoaded', function() {
    const classSelect = document.getElementById('classSelect');
    const tableContainer = document.getElementById('studentsTableContainer');
    const notesContainer = document.getElementById('notesModalContainer');
    const classEditModeBtn = document.getElementById('classEditModeBtn');
    const importBtn = document.querySelector('[data-bs-target="#importModal"]');
    const exportBtn = document.querySelector('a[href*="export_csv"]');

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

    function makeAllRowsEditable() {
        const rows = document.querySelectorAll('#studentsTableBody tr');
        rows.forEach(row => {
            const performanceCell = row.querySelector('.performance-cell');
            const proficiencyCell = row.querySelector('.proficiency-cell');
            performanceCell.dataset.original = performanceCell.textContent;
            proficiencyCell.dataset.original = proficiencyCell.textContent;
            const performanceSelect = createSelect(ACADEMIC_PERFORMANCE, performanceCell.textContent);
            const proficiencySelect = createSelect(LANGUAGE_PROFICIENCY, proficiencyCell.textContent);
            performanceCell.textContent = '';
            performanceCell.appendChild(performanceSelect);
            proficiencyCell.textContent = '';
            proficiencyCell.appendChild(proficiencySelect);
        });

        showEditModeButtons();
    }

    async function saveAllChanges() {
        const classId = classSelect.value;
        const updates = {};
        const rows = document.querySelectorAll('#studentsTableBody tr');
        rows.forEach(row => {
            const studentId = row.querySelector('td:first-child').textContent;
            const performanceSelect = row.querySelector('.performance-cell select');
            const proficiencySelect = row.querySelector('.proficiency-cell select');

            if (performanceSelect && proficiencySelect) {
                updates[studentId] = {
                    academic_performance: performanceSelect.value,
                    language_proficiency: proficiencySelect.value
                };
            }
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
            rows.forEach(row => {
                const performanceCell = row.querySelector('.performance-cell');
                const proficiencyCell = row.querySelector('.proficiency-cell');
                const performanceSelect = performanceCell.querySelector('select');
                const proficiencySelect = proficiencyCell.querySelector('select');

                if (performanceSelect && proficiencySelect) {
                    performanceCell.textContent = performanceSelect.options[performanceSelect.selectedIndex].text;
                    proficiencyCell.textContent = proficiencySelect.options[proficiencySelect.selectedIndex].text;
                }
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