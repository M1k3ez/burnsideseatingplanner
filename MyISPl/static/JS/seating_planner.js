$(document).ready(function() {
    // Constants
    const gridSize = 10;
    const CHAIR_WIDTH = 110;
    const CHAIR_HEIGHT = 105;

    let chairs = [];
    let students = [];
    let plan_id;
    let lastScrollTop = 0;
    let lastScrollLeft = 0;
    let selectedChairs = [];
    let isDragging = false;
    let mousePos = { x: 0, y: 0 };
    let studentNotes = {};

    $("<style>")
    .prop("type", "text/css")
    .html(`
        .chair-context-menu {
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 1000;
            min-width: 70px;
        }

        .chair-context-menu div {
            padding: 8px 12px;  
            cursor: pointer;
            transition: background-color 0.2s;
            background: white;
        }

        .chair-context-menu div:hover {
            background-color: #f0f0f0;
        }

        .grid-canvas.a4-portrait {
            width: 794px;
            height: 1123px;
        }

        .grid-canvas.a4-landscape {
            width: 1123px;
            height: 794px;
        }

        .grid-canvas.a4-portrait,
        .grid-canvas.a4-landscape {
            background-image: 
                linear-gradient(to right, rgba(0,0,0,.02) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0,0,0,.02) 1px, transparent 1px);
            background-size: ${gridSize}px ${gridSize}px;
        }
        .chair {
            width: ${CHAIR_WIDTH}px !important;
            height: ${CHAIR_HEIGHT}px !important;
            position: absolute;
            border: 2px solid #ccc;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: move;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: all 0.2s ease;
            border-radius: 8px;
            padding: 6px;
            user-select: none;
        }
        .chair.selected {
            border: 2px solid #000000;
            box-shadow: 0 0 8px rgba(0, 123, 255, 0.5);
            z-index: 100;
        }
            .toolbar-title-container {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .edit-title-form {
            display: flex;
            align-items: center;
        }

        .edit-title-form input {
            width: 300px;
            height: 31px;
            padding: 0.25rem 0.5rem;
        }
        .student-card.assigned {
            display:none;
        }

        .student-list {
            display: flex;
            flex-direction: column;
        }

        .student-card {
            transition: all 0.3s ease;
        }       
    `)
    .appendTo("head");

    function initializeLayout() {
        $('#layoutPortrait, #layoutLandscape').off('click');
        
        $('#layoutPortrait').click(function() {
            applyLayout('portrait');
            $(this).addClass('active').siblings().removeClass('active');
        });
        
        $('#layoutLandscape').click(function() {
            applyLayout('landscape');
            $(this).addClass('active').siblings().removeClass('active');
        });

        const savedLayout = localStorage.getItem('layoutPreference') || 'portrait';
        applyLayout(savedLayout);
    }

    function initializeTitleEditing() {
        const titleContainer = $('.toolbar-title-container');
        const title = titleContainer.find('.toolbar-title');
        const editBtn = titleContainer.find('.edit-title-btn');
        const editForm = titleContainer.find('.edit-title-form');
        const input = editForm.find('input');
        const saveBtn = editForm.find('.save-title-btn');
        const cancelBtn = editForm.find('.cancel-title-btn');

        editBtn.click(function() {
            title.addClass('d-none');
            editBtn.addClass('d-none');
            editForm.removeClass('d-none');
            input.focus();
        });

        saveBtn.click(function() {
            const newTitle = input.val().trim();
            if (!newTitle) return;

            $.ajax({
                url: `/teacher/api/seating_plan/${plan_id}/name`,
                method: 'PUT',
                contentType: 'application/json',
                data: JSON.stringify({ name: newTitle }),
                success: function(response) {
                    if (response.success) {
                        title.text(newTitle);
                        title.removeClass('d-none');
                        editBtn.removeClass('d-none');
                        editForm.addClass('d-none');
                    } else {
                        alert('Failed to save the new name');
                    }
                },
                error: function() {
                    alert('Failed to save the new name');
                }
            });
        });

        cancelBtn.click(function() {
            title.removeClass('d-none');
            editBtn.removeClass('d-none');
            editForm.addClass('d-none');
            input.val(title.text());
        });
    }

    function applyLayout(layout) {
        const canvas = $('#canvas');
        canvas.removeClass('a4-portrait a4-landscape');
        canvas.addClass(`a4-${layout}`);

        if (layout === 'portrait') {
            $('#layoutPortrait').addClass('active');
            $('#layoutLandscape').removeClass('active');
        } else {
            $('#layoutLandscape').addClass('active');
            $('#layoutPortrait').removeClass('active');
        }

        localStorage.setItem('layoutPreference', layout);
        repositionChairs();
    }

    function repositionChairs() {
        const canvas = $('#canvas');
        const maxX = canvas.width() - CHAIR_WIDTH;
        const maxY = canvas.height() - CHAIR_HEIGHT;

        chairs.forEach(function(chair) {
            const chairElement = $(`.chair[data-chair-id="${chair.id}"]`);
            let needsRepositioning = false;
            if (chair.x > maxX) {
                chair.x = maxX;
                needsRepositioning = true;
            }
            if (chair.y > maxY) {
                chair.y = maxY;
                needsRepositioning = true;
            }
            if (needsRepositioning) {
                chairElement.css({
                    left: chair.x + 'px',
                    top: chair.y + 'px'
                });
            }
        });
    }

    function setupChairDragging(chairDiv, chair) {
        chairDiv.draggable({
            containment: "#canvas",
            grid: [gridSize, gridSize],
            start: function(event, ui) {
                // Ensure chair is selected
                if (!selectedChairs.includes(chair)) {
                    selectedChairs = [chair];
                    $('.chair.selected').removeClass('selected');
                    chairDiv.addClass('selected');
                }

                isDragging = true;

                // Store original positions
                selectedChairs.forEach(selectedChair => {
                    const $chair = $(`.chair[data-chair-id="${selectedChair.id}"]`);
                    selectedChair.originalLeft = parseInt($chair.css('left'));
                    selectedChair.originalTop = parseInt($chair.css('top'));
                });

                // Store the initial mouse position
                chair.mouseStartX = event.pageX;
                chair.mouseStartY = event.pageY;
            },
            drag: function(event, ui) {
                // Calculate the movement delta based on mouse movement
                const mouseDeltaX = event.pageX - chair.mouseStartX;
                const mouseDeltaY = event.pageY - chair.mouseStartY;

                // Snap delta to grid
                const snappedDeltaX = Math.round(mouseDeltaX / gridSize) * gridSize;
                const snappedDeltaY = Math.round(mouseDeltaY / gridSize) * gridSize;

                // Move all selected chairs
                selectedChairs.forEach(selectedChair => {
                    const newLeft = selectedChair.originalLeft + snappedDeltaX;
                    const newTop = selectedChair.originalTop + snappedDeltaY;
                    const $chair = $(`.chair[data-chair-id="${selectedChair.id}"]`);
                    $chair.css({
                        left: newLeft + 'px',
                        top: newTop + 'px'
                    });
                });
            },
            stop: function(event, ui) {
                // Update all selected chairs
                selectedChairs.forEach(selectedChair => {
                    const $chair = $(`.chair[data-chair-id="${selectedChair.id}"]`);
                    const newLeft = parseInt($chair.css('left'));
                    const newTop = parseInt($chair.css('top'));
                    selectedChair.x = newLeft;
                    selectedChair.y = newTop;
                });

                isDragging = false;
            }
        });

        chairDiv.droppable({
            accept: ".student-card:not(.assigned)",
            hoverClass: "ui-state-hover",
            drop: function(event, ui) {
                const studentId = ui.draggable.data('student-id');
                assignStudentToSpecificChair(studentId, chair.id, ui.draggable);
            }
        });
    }

    function deleteChair(chairId) {
        const chair = chairs.find(c => c.id === chairId);
        if (chair && chair.studentId) {
            unassignStudent(chair);
        }
        chairs = chairs.filter(c => c.id !== chairId);
        $(`.chair[data-chair-id="${chairId}"]`).remove();
    }
    
    function reorderStudentCards() {
        const studentList = $('.student-list');
        const cards = studentList.children('.student-card').get();
        cards.sort((a, b) => {
            const aAssigned = $(a).hasClass('assigned');
            const bAssigned = $(b).hasClass('assigned');
            if (aAssigned === bAssigned) return 0;
            return aAssigned ? 1 : -1;
        });
        $.each(cards, function(idx, card) {
            studentList.append(card);
        });
    }

    function unassignStudent(chair) {
        if (!chair.studentId) return;
    
        const studentElement = $(`.student-card[data-student-id="${chair.studentId}"]`);
        studentElement.removeClass('assigned');
        if (studentElement.hasClass('ui-draggable')) {
            studentElement.draggable('enable');
        }
    
        chair.studentId = null;
        chairs = chairs.map(c => c.id === chair.id ? chair : c);
    
        const chairDiv = $(`.chair[data-chair-id="${chair.id}"]`);
        chairDiv.removeClass('occupied');
        chairDiv.html('<div class="empty-seat">Empty</div>');
        reorderStudentCards();
    }

    function setupContextMenu(chairDiv, chair) {
        chairDiv.off('contextmenu').on('contextmenu', function(e) {
            e.preventDefault();
            $('.chair-context-menu').remove();
            const contextMenu = $('<div class="chair-context-menu"></div>')
                .css({
                    position: 'absolute',
                    left: e.pageX + 'px',
                    top: e.pageY + 'px',
                    zIndex: 1000
                });
            // Add View Student Details option if a student is assigned
            if (chair.studentId) {
                const viewDetailsOption = $('<div>View Student Details</div>').click(function() {
                    showStudentDetailsModal(chair.studentId);
                    contextMenu.remove();
                });
                contextMenu.append(viewDetailsOption);
            }
            const deleteOption = $('<div>Delete Chair</div>').click(function() {
                deleteChair(chair.id);
                contextMenu.remove();
            });
            const unassignOption = $('<div>Unassign Student</div>').click(function() {
                unassignStudent(chair);
                contextMenu.remove();
            });
            contextMenu.append(deleteOption);
            if (chair.studentId) {
                contextMenu.append(unassignOption);
            }
            $('body').append(contextMenu);
            $(document).one('click', function(e) {
                if (!$(e.target).closest('.chair-context-menu').length) {
                    contextMenu.remove();
                }
            });
        });
    }

    function renderChair(chair) {
        const chairDiv = $(`
            <div class="chair${chair.studentId ? ' occupied' : ''}" 
                 data-chair-id="${chair.id}" 
                 style="left: ${chair.x}px; top: ${chair.y}px;">
                ${chair.studentId ? `
                    <div class="student-assigned" data-student-id="${chair.studentId}">
                        <div class="student-info">
                            <div class="student-id">ID: ${chair.studentId}</div>
                            ${getStudentPhoto(chair.studentId)}
                            <span class="student-name">${getStudentName(chair.studentId)}</span>
                            <span class="student-note" data-student-id="${chair.studentId}">Loading note...</span>
                        </div>
                    </div>
                ` : `
                    <div class="empty-seat">Empty</div>
                `}
            </div>
        `);
    
        $("#canvas").append(chairDiv);
        if (chair.studentId) {
            updateStudentNote(chair.studentId);
        }
        setupContextMenu(chairDiv, chair);
        setupChairDragging(chairDiv, chair);
    }


    function getStudentPhoto(studentId) {
        const student = students.find(s => s.student_id === studentId);
        if (student && student.photo) {
            return `<img src="${student.photo}" class="student-photo" alt="${student.first_name} ${student.last_name}">`;
        }
        return `<span class="student-initials">${getStudentInitials(studentId)}</span>`;
    }

    function getStudentName(studentId) {
        const student = students.find(s => s.student_id === studentId);
        return student ? `${student.first_name} ${student.last_name}` : '';
    }

    function getStudentInitials(studentId) {
        const student = students.find(s => s.student_id === studentId);
        return student ? 
            `${student.first_name.charAt(0).toUpperCase()}${student.last_name.charAt(0).toUpperCase()}` : '';
    }

    function initializeData() {
        try {
            const canvasElement = $('#canvas');
            const rawData = canvasElement.data('chairs');
            const rawStudents = canvasElement.data('students');
            plan_id = canvasElement.data('plan-id');

            let parsedData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData || {};
            
            if (Array.isArray(parsedData)) {
                chairs = parsedData;
            } else {
                chairs = parsedData.chairs || [];
                if (parsedData.layoutPreference) {
                    localStorage.setItem('layoutPreference', parsedData.layoutPreference);
                }
            }

            students = typeof rawStudents === 'string' ? JSON.parse(rawStudents) : rawStudents || [];

            console.log('Data initialized:', {
                plan_id,
                chairCount: chairs.length,
                studentCount: students.length,
                layout: localStorage.getItem('layoutPreference')
            });
        } catch (e) {
            console.error('Error initializing data:', e);
            chairs = [];
            students = [];
        }
    }

    function initializeDraggables() {
        $(".student-card").draggable({
            helper: "clone",
            revert: "invalid",
            cursor: "move",
            start: function(event, ui) {
                if ($(this).hasClass('assigned')) {
                    event.preventDefault();
                    return false;
                }
                lastScrollTop = $(window).scrollTop();
                lastScrollLeft = $(window).scrollLeft();
                ui.helper.css('opacity', 0.7);
            }
        });

        $("#new-chair").draggable({
            helper: "clone",
            revert: "invalid",
            cursor: "move",
            appendTo: "body",
            zIndex: 10000,
            start: function(event, ui) {
                lastScrollTop = $(window).scrollTop();
                lastScrollLeft = $(window).scrollLeft();

                const chairOffsetX = CHAIR_WIDTH / 2;
                const chairOffsetY = CHAIR_HEIGHT / 2;
                ui.helper.css({
                    'position': 'absolute',
                    'left': event.clientX - chairOffsetX,
                    'top': event.clientY - chairOffsetY,
                    'opacity': 0.7
                });
            },
            drag: function(event, ui) {
                const chairOffsetX = CHAIR_WIDTH / 2;
                const chairOffsetY = CHAIR_HEIGHT / 2;
                ui.position.left = event.clientX - chairOffsetX;
                ui.position.top = event.clientY - chairOffsetY;
            }
        });

        $("#canvas").droppable({
            accept: "#new-chair, .student-card:not(.assigned)",
            drop: function(event, ui) {
                const droppedElement = ui.draggable;
                const canvasOffset = $(this).offset();
                let x = event.pageX - canvasOffset.left - (CHAIR_WIDTH / 2);
                let y = event.pageY - canvasOffset.top - (CHAIR_HEIGHT / 2);
                
                const snappedX = Math.round(x / gridSize) * gridSize;
                const snappedY = Math.round(y / gridSize) * gridSize;
                
                if (droppedElement.attr('id') === 'new-chair') {
                    addNewChair(snappedX, snappedY);
                } else if (droppedElement.hasClass('student-card')) {
                    const studentId = droppedElement.data('student-id');
                    assignStudentToNearestChair(studentId, snappedX, snappedY, droppedElement);
                }
            }
        });
    }

    function initializeChairs() {
        $('#canvas .chair').remove();
        initializeDraggables();
        chairs.forEach(function(chair) {
            renderChair(chair);
            if (chair.studentId) {
                const studentElement = $(`.student-card[data-student-id="${chair.studentId}"]`);
                studentElement.addClass('assigned');
                if (studentElement.hasClass('ui-draggable')) {
                    studentElement.draggable('disable');
                }
            }
        });
    }

    // Chair Position Functions
    function addNewChair(x, y) {
        x += lastScrollLeft;
        y += lastScrollTop;
        const newId = chairs.length > 0 ? Math.max(...chairs.map(c => c.id)) + 1 : 1;
        const newChair = { id: newId, x, y, studentId: null };
        chairs.push(newChair);
        renderChair(newChair);
    }

    function updateChairPosition(chairId, x, y) {
        chairs = chairs.map(c => c.id === chairId ? { ...c, x: x + lastScrollLeft, y: y + lastScrollTop } : c);
    }

    function cloneSelectedChairs() {
        const newChairs = selectedChairs.map(function(chair) {
            const newChair = {
                id: chairs.length > 0 ? Math.max(...chairs.map(c => c.id)) + 1 : 1,
                x: chair.x + 20,
                y: chair.y + 20,
                studentId: null
            };
            chairs.push(newChair);
            renderChair(newChair);
            return newChair;
        });
        selectedChairs = [];
        $('.chair.selected').removeClass('selected');
        return newChairs;
    }

    function alignSelectedChairs() {
        if (selectedChairs.length < 2) return;
        const firstChair = selectedChairs[0];
        const lastChair = selectedChairs[selectedChairs.length - 1];
        const xDiff = lastChair.x - firstChair.x;
        const yDiff = lastChair.y - firstChair.y;
        const xStep = xDiff / (selectedChairs.length - 1);
        const yStep = yDiff / (selectedChairs.length - 1);
        selectedChairs.forEach((chair, index) => {
            if (index > 0 && index < selectedChairs.length - 1) {
                const newX = firstChair.x + (xStep * index);
                const newY = firstChair.y + (yStep * index);
                
                chair.x = newX;
                chair.y = newY;
                
                $(`.chair[data-chair-id="${chair.id}"]`).css({
                    left: newX + 'px',
                    top: newY + 'px'
                });
            }
        });

        selectedChairs = [];
        $('.chair.selected').removeClass('selected');
    }

    function assignStudentToNearestChair(studentId, x, y, studentElement) {
        x += lastScrollLeft;
        y += lastScrollTop;

        let minDistance = Infinity;
        let closestChair = null;
        
        chairs.forEach(function(chair) {
            if (!chair.studentId) {
                const distance = Math.sqrt(Math.pow(chair.x - x, 2) + Math.pow(chair.y - y, 2));
                if (distance < minDistance) {
                    minDistance = distance;
                    closestChair = chair;
                }
            }
        });

        if (closestChair) {
            assignStudentToSpecificChair(studentId, closestChair.id, studentElement);
        } else {
            alert('No available chair nearby to assign this student.');
        }
    }

    function assignStudentToSpecificChair(studentId, chairId, studentElement) {
        const chair = chairs.find(c => c.id === chairId);
        if (chair && !chair.studentId) {
            chair.studentId = studentId;
            const chairDiv = $(`.chair[data-chair-id="${chairId}"]`);
            chairDiv.addClass('occupied');
            
            chairDiv.html(`
                <div class="student-assigned" data-student-id="${studentId}">
                    <div class="student-info">
                        <div class="student-id">ID: ${studentId}</div>
                        ${getStudentPhoto(studentId)}
                        <span class="student-name">${getStudentName(studentId)}</span>
                        <span class="student-note" data-student-id="${studentId}">Loading note...</span>
                    </div>
                </div>
            `);
    
            updateStudentNote(studentId);
            
            chairs = chairs.map(c => c.id === chairId ? chair : c);
            studentElement.addClass('assigned').draggable('disable');
            reorderStudentCards();
        } else {
            alert('This chair is already occupied.');
            updateChairDroppable();
        }
    }

    function updateChairDroppable() {
        $('.chair.occupied').droppable({
            accept: '.shoutout',
            drop: function (event, ui) {
                const shoutoutId = ui.draggable.data('shoutout-id');
                const chairId = $(this).data('chair-id');
                const chair = chairs.find(c => c.id === chairId);
                if (chair && chair.studentId) {
                    assignShoutoutToStudent(shoutoutId, chair.studentId);
                }
            }
        });
    }

    function saveLayout() {
        const currentLayout = $('#layoutPortrait').hasClass('active') ? 'portrait' : 'landscape';
        const layoutData = {
            chairs: chairs,
            layoutPreference: currentLayout
        };
        $.ajax({
            url: `/teacher/api/seating_plan/${plan_id}/layout`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ layout_data: layoutData }),
            success: function(response) {
                if (response.success) {
                    alert('Seating plan saved successfully!');
                } else {
                    alert('Failed to save seating plan: ' + response.message);
                }
            },
            error: function(xhr, status, error) {
                alert('Error saving seating plan: ' + error);
            }
        });
    }

    function fetchStudentNotes(studentId) {
        return $.ajax({
            url: `/teacher/api/student/${studentId}/notes`,
            method: 'GET'
        }).then(function(response) {
            if (response.notes && response.notes.length > 0) {
                studentNotes[studentId] = response.notes[0];  // Store the latest note
                return response.notes[0];
            }
            return null;
        }).catch(function(error) {
            console.error('Error fetching notes for student:', studentId, error);
            return null;
        });
    }

    function updateStudentNote(studentId) {
        fetchStudentNotes(studentId).then(function(noteData) {
            const noteText = noteData ? 
                truncateText(noteData.details, 50) : 
                'No notes available';
            $(`.student-note[data-student-id="${studentId}"]`).text(noteText);
        });
    }

    function truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    function fetchShoutoutCategories() {
        return $.ajax({
            url: '/teacher/api/shoutouts/categories',
            method: 'GET'
        });
    }

    function renderShoutouts(shoutouts) {
        const shoutoutList = $('#shoutout-list');
        shoutoutList.empty();
    
        shoutouts.forEach(category => {
            const categoryDiv = $('<div>')
                .addClass('shoutout-category')
                .text(category.category);
            shoutoutList.append(categoryDiv);
    
            category.messages.forEach(message => {
                const shoutoutDiv = $('<div>')
                    .addClass('shoutout')
                    .attr('data-shoutout-id', message.shoutout_id)
                    .text(message.message);
                shoutoutList.append(shoutoutDiv);
            });
        });
        setupShoutoutDragging();
    }

    function setupShoutoutDragging() {
        $('.shoutout').draggable({
            helper: 'clone',
            revert: 'invalid',
            revertDuration: 200,
            zIndex: 1000,
            start: function() {
                $(this).addClass('dragging');
            },
            stop: function() {
                $(this).removeClass('dragging');
            }
        });
    
        // Update to make all occupied chairs droppable
        updateChairDroppable();
    }

        $('.chair.occupied').droppable({
            accept: '.shoutout',
            drop: function (event, ui) {
                const shoutoutId = ui.draggable.data('shoutout-id');
                const chairId = $(this).data('chair-id');
                const chair = chairs.find(c => c.id === chairId);
                if (chair && chair.studentId) {
                    assignShoutoutToStudent(shoutoutId, chair.studentId);
                }
            }
        });
        function assignShoutoutToStudent(shoutoutId, studentId) {
            const classId = $('#canvas').data('class-id');
            $.ajax({
                url: '/teacher/api/shoutouts/assign',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    shoutout_id: shoutoutId,
                    student_id: studentId,
                    class_id: classId
                }),
                success: function(response) {
                    if (response.success) {
                        // Show success feedback
                        const chair = $(`.chair[data-student-id="${studentId}"]`);
                        chair.addClass('shoutout-success');
                        setTimeout(() => chair.removeClass('shoutout-success'), 1500);
                    } else {
                        alert(`Failed to assign shoutout: ${response.error}`);
                    }
                },
                error: function() {
                    alert('Error assigning shoutout. Please try again.');
                }
            });
        }

        function showStudentDetailsModal(studentId) {
            $.ajax({
                url: `/teacher/api/student/${studentId}/details`,
                method: 'GET',
                success: function(studentResponse) {
                    if (studentResponse.success) {
                        $.ajax({
                            url: `/teacher/api/student/${studentId}/notes`,
                            method: 'GET',
                            success: function(notesResponse) {
                                const student = studentResponse;
                                const notes = notesResponse.notes || [];
        
                                $.ajax({
                                    url: `/teacher/api/student/${studentId}/shoutouts`,
                                    method: 'GET',
                                    success: function(shoutoutsResponse) {
                                        const shoutouts = shoutoutsResponse.shoutouts || [];
                                        const modalHtml = `
                                            <div class="modal fade" id="studentDetailsModal" tabindex="-1" aria-hidden="true">
                                                <div class="modal-dialog modal-lg">
                                                    <div class="modal-content">
                                                        <div class="modal-header">
                                                            <h5 class="modal-title">Student Details: ${student.first_name} ${student.last_name}</h5>
                                                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                                        </div>
                                                        <div class="modal-body">
                                                            <div class="row">
                                                                <div class="col-md-6">
                                                                    <h6 class="mb-3">Personal Information</h6>
                                                                    <p><strong>Student ID:</strong> ${student.student_id}</p>
                                                                    <p><strong>NSN:</strong> ${student.nsn}</p>
                                                                    <p><strong>Gender:</strong> ${student.gender}</p>
                                                                    <p><strong>Date of Birth:</strong> ${student.date_of_birth || 'Not specified'}</p>
                                                                    <p><strong>Form Class:</strong> ${student.form_class || 'Not specified'}</p>
                                                                    <p><strong>Level:</strong> ${student.level || 'Not specified'}</p>
                                                                </div>
                                                                <div class="col-md-6">
                                                                    <h6 class="mb-3">Academic Information</h6>
                                                                    <p><strong>Academic Performance:</strong> ${student.academic_performance}</p>
                                                                    <p><strong>Language Proficiency:</strong> ${student.language_proficiency}</p>
                                                                    <p><strong>Ethnicity (L1):</strong> ${student.ethnicity_l1 || 'Not specified'}</p>
                                                                    <p><strong>Ethnicity (L2):</strong> ${student.ethnicity_l2 || 'Not specified'}</p>
                                                                    ${student.sac_status && student.sac_status.length > 0 ? 
                                                                        `<p><strong>SAC Status:</strong> ${student.sac_status.join(', ')}</p>` : 
                                                                        ''}
                                                                </div>
                                                            </div>
        
                                                            <div class="row mt-4">
                                                                <div class="col-12">
                                                                    <h6 class="mb-3">Notes History</h6>
                                                                    ${notes.length > 0 ? `
                                                                        <div class="table-responsive">
                                                                            <table class="table table-hover">
                                                                                <thead>
                                                                                    <tr>
                                                                                        <th style="width: 15%">Date</th>
                                                                                        <th style="width: 65%">Note</th>
                                                                                        <th style="width: 20%">Teacher</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    ${notes.map(note => `
                                                                                        <tr>
                                                                                            <td>${new Date(note.date_created).toLocaleDateString()}</td>
                                                                                            <td>${note.details}</td>
                                                                                            <td>${note.teacher_name}</td>
                                                                                        </tr>
                                                                                    `).join('')}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    ` : '<p>No notes available</p>'}
                                                                </div>
                                                            </div>
        
                                                            <div class="row mt-4">
                                                                <div class="col-12">
                                                                    <h6 class="mb-3">Shoutouts</h6>
                                                                    ${shoutouts.length > 0 ? `
                                                                        <div class="table-responsive">
                                                                            <table class="table table-hover">
                                                                                <thead>
                                                                                    <tr>
                                                                                        <th style="width: 15%">Date</th>
                                                                                        <th style="width: 20%">Category</th>
                                                                                        <th style="width: 65%">Message</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    ${shoutouts.map(shoutout => `
                                                                                        <tr>
                                                                                            <td>${new Date(shoutout.date_assigned).toLocaleDateString()}</td>
                                                                                            <td>${shoutout.category}</td>
                                                                                            <td>${shoutout.message}</td>
                                                                                        </tr>
                                                                                    `).join('')}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    ` : '<p>No shoutouts available</p>'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="modal-footer">
                                                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        `;
                                        $('#studentDetailsModal').remove();
                                        $('body').append(modalHtml);
                                        const modal = new bootstrap.Modal(document.getElementById('studentDetailsModal'));
                                        modal.show();
                                    },
                                    error: function() {
                                        console.error('Failed to fetch student shoutouts');
                                        alert('Failed to fetch student shoutouts');
                                    }
                                });
                            },
                            error: function() {
                                console.error('Failed to fetch student notes');
                                alert('Failed to fetch student notes');
                            }
                        });
                    } else {
                        console.error('Failed to fetch student details');
                        alert('Failed to fetch student details');
                    }
                },
                error: function() {
                    console.error('Failed to fetch student details');
                    alert('Failed to fetch student details');
                }
            });
        }

    $(document).off('mousedown', '.chair').on('mousedown', '.chair', function(e) {
        if (isDragging) return;
        
        const clickedChairId = $(this).data('chair-id');
        const clickedChair = chairs.find(c => c.id === clickedChairId);
        
        if (e.ctrlKey || e.metaKey) {
            const index = selectedChairs.findIndex(c => c.id === clickedChairId);
            if (index === -1) {
                // Add to selection
                selectedChairs.push(clickedChair);
                $(this).addClass('selected');
            } else {
                // Remove from selection
                selectedChairs.splice(index, 1);
                $(this).removeClass('selected');
            }
        } else {
            // Single selection if not already selected
            if (!$(this).hasClass('selected') || selectedChairs.length !== 1) {
                selectedChairs = [clickedChair];
                $('.chair.selected').removeClass('selected');
                $(this).addClass('selected');
            }
        }

        e.stopPropagation();
    });

    $(document).on('click', function(e) {
        if (!$(e.target).closest('.chair, .chair-context-menu').length && !isDragging) {
            selectedChairs = [];
            $('.chair.selected').removeClass('selected');
        }
    });

    $(window).resize(function() {
        repositionChairs();
    });

    $(window).on('scroll', function() {
        lastScrollTop = $(window).scrollTop();
        lastScrollLeft = $(window).scrollLeft();
    });

    $(document).on('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            if (selectedChairs.length > 0) {
                cloneSelectedChairs();
            }
        } else if (e.shiftKey && selectedChairs.length > 1) {
            alignSelectedChairs();
        }
    });

    window.onerror = function(msg, url, lineNo, columnNo, error) {
        console.error('Error: ' + msg + '\nURL: ' + url + '\nLine: ' + lineNo + '\nColumn: ' + columnNo + '\nError object: ' + JSON.stringify(error));
        return false;
    };

    initializeData();
    initializeLayout();
    initializeChairs();
    initializeTitleEditing();
        
    fetchShoutoutCategories().then(function(response) {
        console.log("Fetched shoutout categories:", response);
        if (response.success) {
            renderShoutouts(response.categories);
            setupShoutoutDragging(); // Set up dragging after rendering
        } else {
            console.error('Failed to fetch shoutout categories');
        }
    });
    $('body').on('chairsUpdated', function() {
        console.log("Chairs updated, reinitializing shoutout dragging");
        setupShoutoutDragging();
    });
    $("#saveChangesBtn").off('click').on('click', saveLayout);
    window.onerror = function(msg, url, lineNo, columnNo, error) {
        console.error('Error:', {msg, url, lineNo, columnNo, error});
        showToast('An error occurred. Check console for details.', 'error');
        return false;
    };    
});