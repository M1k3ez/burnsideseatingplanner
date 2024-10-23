$(document).ready(function() {
    // Initialize variables
    const gridSize = 5;
    const CHAIR_WIDTH = 120;
    const CHAIR_HEIGHT = 150;
    let lastScrollTop = 0;
    let lastScrollLeft = 0;
    let chairs = [];
    let students = [];
    let plan_id;
    $("<style>")
    .prop("type", "text/css")
    .html(`
        /* Your existing styles... */

        .chair-context-menu {
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 1000;
            min-width: 120px;
        }

        .chair-context-menu div {
            padding: 8px 12px;
            cursor: pointer;
            transition: background-color 0.2s;
            background: white;  /* Added explicit background */
        }

        .chair-context-menu div:hover {
            background-color: #f0f0f0;
        }
            .grid-canvas.a4-portrait {
            width: 794px;  /* A4 width at 96 DPI */
            height: 1123px; /* A4 height at 96 DPI */
        }

        .grid-canvas.a4-landscape {
            width: 1123px; /* A4 height at 96 DPI */
            height: 794px;  /* A4 width at 96 DPI */
        }

        /* Ensure grid-canvas maintains its background in both layouts */
        .grid-canvas.a4-portrait,
        .grid-canvas.a4-landscape {
            background-image: 
                linear-gradient(to right, rgba(0,0,0,.05) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0,0,0,.05) 1px, transparent 1px);
            background-size: ${gridSize}px ${gridSize}px;
        }
    `)
    
    .appendTo("head");
    $('input[name="layout"]').change(function() {
        const layout = $(this).val();
        applyLayout(layout);
    });
    function initializeData() {
        try {
            const canvasElement = $('#canvas');
            const rawData = canvasElement.data('chairs');
            const rawStudents = canvasElement.data('students');
            plan_id = canvasElement.data('plan-id');
            
            let parsedData;
            if (typeof rawData === 'string') {
                parsedData = JSON.parse(rawData);
            } else {
                parsedData = rawData || { chairs: [], layoutPreference: 'portrait' };
            }
    
            // Handle both old and new data formats
            if (Array.isArray(parsedData)) {
                // Old format - just array of chairs
                chairs = parsedData;
                applyLayout('portrait'); // Default to portrait
            } else {
                // New format with layout preference
                chairs = parsedData.chairs || [];
                const savedLayout = parsedData.layoutPreference || 'portrait';
                applyLayout(savedLayout);
                $(`#layout${savedLayout.charAt(0).toUpperCase() + savedLayout.slice(1)}`).prop('checked', true);
            }
            
            students = typeof rawStudents === 'string' ? JSON.parse(rawStudents) : rawStudents || [];
            
            if (!Array.isArray(chairs)) chairs = [];
            if (!Array.isArray(students)) students = [];
            
            console.log('Data initialized:', {
                plan_id, 
                chairCount: chairs.length, 
                studentCount: students.length,
                layoutPreference: parsedData.layoutPreference
            });
        } catch (e) {
            console.error('Error initializing data:', e);
            chairs = [];
            students = [];
            applyLayout('portrait'); // Default to portrait on error
        }
    }

    function calculateFitZoom() {
        const canvas = $('#canvas');
        const wrapper = $('.canvas-wrapper');
        const wrapperWidth = wrapper.width() - 80; // Account for padding
        const wrapperHeight = wrapper.height() - 80;
        
        const canvasWidth = canvas.width();
        const canvasHeight = canvas.height();
        
        const widthRatio = wrapperWidth / canvasWidth;
        const heightRatio = wrapperHeight / canvasHeight;
        
        return Math.min(widthRatio, heightRatio, 1); // Don't zoom in past 100%
    }
    
    function initializeZoomControls() {
        $('#zoomIn').click(() => updateZoom(currentZoom + ZOOM_STEP));
        $('#zoomOut').click(() => updateZoom(currentZoom - ZOOM_STEP));
        $('#zoomFit').click(() => updateZoom(calculateFitZoom()));
        
        // Add mouse wheel zoom with Ctrl key
        $('.canvas-wrapper').on('wheel', function(e) {
            if (e.ctrlKey) {
                e.preventDefault();
                const delta = e.originalEvent.deltaY;
                updateZoom(currentZoom + (delta > 0 ? -ZOOM_STEP : ZOOM_STEP));
            }
        });
    }
    
    function deleteChair(chairId) {
        const chair = chairs.find(c => c.id === chairId);
        if (chair && chair.studentId) {
            // If there's a student assigned, unassign them first
            const studentElement = $(`.student-card[data-student-id="${chair.studentId}"]`);
            studentElement.removeClass('assigned');
            if (studentElement.hasClass('ui-draggable')) {
                studentElement.draggable('enable');
            }
            console.log(`Unassigned student ${chair.studentId} from chair ${chairId}`);
        }
        
        chairs = chairs.filter(c => c.id !== chairId);
        $(`.chair[data-chair-id="${chairId}"]`).remove();
        console.log(`Deleted chair ${chairId}`);
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
    }
    function applyLayout(layout) {
        const canvas = $('#canvas');
        canvas.removeClass('a4-portrait a4-landscape');
        canvas.addClass(`a4-${layout}`);
        
        // Validate and adjust chair positions
        chairs.forEach(function(chair) {
            const chairElement = $(`.chair[data-chair-id="${chair.id}"]`);
            let needsRepositioning = false;
            
            const maxX = canvas.width() - CHAIR_WIDTH;
            const maxY = canvas.height() - CHAIR_HEIGHT;
            
            if (chair.x > maxX) {
                chair.x = maxX;
                needsRepositioning = true;
            }
            if (chair.y > maxY) {
                chair.y = maxY;
                needsRepositioning = true;
            }
            
            if (needsRepositioning && chairElement.length) {
                chairElement.css({
                    left: chair.x + 'px',
                    top: chair.y + 'px'
                });
            }
        });
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
                            <span class="student-note">Note: this is the latest note</span>
                        </div>
                    </div>
                ` : `
                    <div class="empty-seat">Empty</div>
                `}
            </div>
        `);
    
        $("#canvas").append(chairDiv);
        setupContextMenu(chairDiv, chair);

        chairDiv.draggable({
            containment: "#canvas",
            grid: [gridSize, gridSize],
            stop: function(event, ui) {
                const chairId = $(this).data('chair-id');
                const position = ui.position;
                updateChairPosition(chairId, position.left, position.top);
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

    function getStudentPhoto(studentId) {
        const student = students.find(s => s.student_id === studentId);
        if (student && student.photo) {
            return `<img src="${student.photo}" class="student-photo" alt="${student.first_name} ${student.last_name}">`;
        } else {
            return `<span class="student-initials">${getStudentInitials(studentId)}</span>`;
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

        // Initialize canvas drop zone
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

    function addNewChair(x, y) {
        x += lastScrollLeft;
        y += lastScrollTop;
        const newId = chairs.length > 0 ? Math.max(...chairs.map(c => c.id)) + 1 : 1;
        const newChair = {
            id: newId,
            x: x,
            y: y,
            studentId: null
        };
        chairs.push(newChair);
        renderChair(newChair);
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
                        <span class="student-note">Note: this is the latest note</span>
                    </div>
                </div>
            `);
            chairs = chairs.map(c => c.id === chairId ? chair : c);
            studentElement.addClass('assigned');
            if (studentElement.hasClass('ui-draggable')) {
                studentElement.draggable('disable');
            }
        } else {
            alert('This chair is already occupied.');
        }
    }

    function updateChairPosition(chairId, x, y) {
        x += lastScrollLeft;
        y += lastScrollTop;
        chairs = chairs.map(c => 
            c.id === chairId 
                ? { ...c, x, y } 
                : c
        );
        console.log(`Updated chair ID ${chairId} position to X: ${x}, Y: ${y}`);
    }
    

    function getStudentInitials(studentId) {
        const student = students.find(s => s.student_id === studentId);
        if (student) {
            return `${student.first_name.charAt(0).toUpperCase()}${student.last_name.charAt(0).toUpperCase()}`;
        }
        return '';
    }

    function getStudentName(studentId) {
        const student = students.find(s => s.student_id === studentId);
        if (student) {
            return `${student.first_name} ${student.last_name}`;
        }
        return '';
    }

    function saveLayout() {
        const currentLayout = $('input[name="layout"]:checked').val();
        const layoutData = {
            chairs: chairs,
            layoutPreference: currentLayout
        };
    
        $.ajax({
            url: `/teacher/api/seating_plan/${plan_id}/layout`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ 
                layout_data: layoutData
            }),
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

    $(window).resize(function() {
        const canvas = $("#canvas");
        chairs.forEach(function(chair) {
            const chairElement = $(`.chair[data-chair-id="${chair.id}"]`);
            if (chair.x > canvas.width()) {
                chair.x = canvas.width() - CHAIR_WIDTH;
                chairElement.css('left', chair.x + 'px');
            }
            if (chair.y > canvas.height()) {
                chair.y = canvas.height() - CHAIR_HEIGHT;
                chairElement.css('top', chair.y + 'px');
            }
        });
    });

    $('#canvas').on('contextmenu', function(e) {
        e.preventDefault();
    });
    $(document).click(function(e) {
        if (!$(e.target).closest('.chair-context-menu').length) {
            $('.chair-context-menu').remove();
        }
    });
    initializeData();
    initializeChairs();

    $("#saveChangesBtn").off('click').on('click', saveLayout);

    window.onerror = function(msg, url, lineNo, columnNo, error) {
        console.error('Error: ' + msg + '\nURL: ' + url + '\nLine: ' + lineNo + '\nColumn: ' + columnNo + '\nError object: ' + JSON.stringify(error));
        return false;
    };
});