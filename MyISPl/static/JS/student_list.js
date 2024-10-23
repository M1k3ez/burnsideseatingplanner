document.addEventListener('DOMContentLoaded', function() {
    const classSelect = document.getElementById('classSelect');
    const tableContainer = document.getElementById('studentsTableContainer');
    const tableBody = document.getElementById('studentsTableBody');
    const notesContainer = document.getElementById('notesModalContainer');

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
            
            // Show the table container
            tableContainer.style.display = 'block';
            
            // Clear existing content
            tableBody.innerHTML = '';
            notesContainer.innerHTML = '';
            
            // Populate table with students
            data.students.forEach(student => {
                // Add table row
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
                    <td>${student.academic_performance}</td>
                    <td>${student.language_proficiency}</td>
                    <td>
                        <button type="button" class="btn btn-primary btn-sm" 
                                data-bs-toggle="modal" 
                                data-bs-target="#studentNoteModal${student.student_id}">
                            Add & View Notes
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);

                // Add notes modal for this student
                const modalDiv = document.createElement('div');
                modalDiv.innerHTML = `
                    <div id="studentNoteModal${student.student_id}" class="modal fade notes-modal" 
                         tabindex="-1" aria-labelledby="studentNoteModalLabel${student.student_id}" aria-hidden="true">
                        <div class="modal-dialog modal-lg">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title" id="studentNoteModalLabel${student.student_id}">
                                        Add Note for ${student.first_name} ${student.last_name}
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

                // Initialize the notes component for this student
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