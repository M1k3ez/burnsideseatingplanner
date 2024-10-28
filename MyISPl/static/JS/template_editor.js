$(document).ready(function() {
    const gridSize = 30;
    const CHAIR_WIDTH = 120;
    const CHAIR_HEIGHT = 120;
    let chairs = [];
    let lastScrollTop = 0;
    let lastScrollLeft = 0;

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

        const savedLayout = localStorage.getItem('templateLayoutPreference') || 'portrait';
        applyLayout(savedLayout);
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

        localStorage.setItem('templateLayoutPreference', layout);
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

    function deleteChair(chairId) {
        chairs = chairs.filter(c => c.id !== chairId);
        $(`.chair[data-chair-id="${chairId}"]`).remove();
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

            contextMenu.append(deleteOption);
            $('body').append(contextMenu);

            $(document).one('click', function() {
                contextMenu.remove();
            });
        });
    }

    function renderChair(chair) {
        const chairDiv = $(`
            <div class="chair" 
                 data-chair-id="${chair.id}" 
                 style="left: ${chair.x}px; top: ${chair.y}px;">
                <div class="empty-seat">Empty</div>
            </div>
        `);

        $("#canvas").append(chairDiv);
        setupContextMenu(chairDiv, chair);

        chairDiv.draggable({
            containment: "#canvas",
            grid: [gridSize, gridSize],
            stop: function(event, ui) {
                updateChairPosition(chair.id, ui.position.left, ui.position.top);
            }
        });
    }

    function initializeData() {
        try {
            if (window.TEMPLATE_DATA) {
                const layoutData = window.TEMPLATE_DATA.layoutData;
                if (Array.isArray(layoutData)) {
                    chairs = layoutData;
                } else if (layoutData.chairs) {
                    chairs = layoutData.chairs;
                    if (layoutData.layoutPreference) {
                        localStorage.setItem('templateLayoutPreference', layoutData.layoutPreference);
                    }
                }
                console.log('Template data initialized:', {
                    chairCount: chairs.length,
                    layout: localStorage.getItem('templateLayoutPreference')
                });
            }
        } catch (e) {
            console.error('Error initializing template data:', e);
            chairs = [];
        }
    }

    function initializeDraggables() {
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
            accept: "#new-chair",
            drop: function(event, ui) {
                const canvasOffset = $(this).offset();
                let x = event.pageX - canvasOffset.left - (CHAIR_WIDTH / 2);
                let y = event.pageY - canvasOffset.top - (CHAIR_HEIGHT / 2);
                
                x += lastScrollLeft;
                y += lastScrollTop;
                
                const snappedX = Math.round(x / gridSize) * gridSize;
                const snappedY = Math.round(y / gridSize) * gridSize;
                
                addNewChair(snappedX, snappedY);
            }
        });
    }

    function initializeChairs() {
        $('#canvas .chair').remove();
        chairs.forEach(function(chair) {
            renderChair(chair);
        });
    }

    function addNewChair(x, y) {
        const newId = chairs.length > 0 ? Math.max(...chairs.map(c => c.id)) + 1 : 1;
        const newChair = { id: newId, x, y };
        chairs.push(newChair);
        renderChair(newChair);
    }

    function updateChairPosition(chairId, x, y) {
        chairs = chairs.map(c => c.id === chairId ? { ...c, x: x + lastScrollLeft, y: y + lastScrollTop } : c);
    }

    function saveTemplate() {
        const currentLayout = $('#layoutPortrait').hasClass('active') ? 'portrait' : 'landscape';
        const templateId = window.TEMPLATE_DATA.templateId;
        const classroomId = window.TEMPLATE_DATA.classroomId;

        console.log('Saving template with:', {
            templateId,
            classroomId,
            chairCount: chairs.length
        });

        const layoutData = {
            chairs: chairs,
            layoutPreference: currentLayout
        };

        const apiUrl = templateId ? 
            `/teacher/api/templates/${templateId}` : 
            '/teacher/api/templates';

        $.ajax({
            url: apiUrl,
            method: templateId ? 'PUT' : 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                classroom_id: classroomId,
                layout_data: layoutData
            }),
            success: function(response) {
                if (response.success) {
                    alert('Template saved successfully!');
                    window.location.href = '/teacher/templates';
                } else {
                    alert('Failed to save template: ' + (response.message || 'Unknown error'));
                }
            },
            error: function(xhr, status, error) {
                console.error('Error saving template:', error);
                alert('Failed to save template. Please try again.');
            }
        });
    }

    const DEFAULT_TEMPLATE_SEATS = 30;
    function generateDefaultChairs(canvasWidth, canvasHeight, isTemplate = false) {
        const CHAIR_WIDTH = 120;
        const CHAIR_HEIGHT = 120;
        const MARGIN = 20;
        const seatCount = isTemplate ? DEFAULT_TEMPLATE_SEATS : getStudentCount();
        const maxChairsPerRow = Math.floor((canvasWidth - MARGIN) / (CHAIR_WIDTH + MARGIN));
        const numberOfRows = Math.ceil(seatCount / maxChairsPerRow);
        const totalWidth = Math.min(maxChairsPerRow, seatCount) * (CHAIR_WIDTH + MARGIN) - MARGIN;
        const totalHeight = numberOfRows * (CHAIR_HEIGHT + MARGIN) - MARGIN;
        const startX = (canvasWidth - totalWidth) / 2;
        const startY = (canvasHeight - totalHeight) / 2;
        const newChairs = [];
        let chairId = 1;
        
        for (let row = 0; row < numberOfRows; row++) {
            const chairsInThisRow = row === numberOfRows - 1 ? 
                seatCount - (row * maxChairsPerRow) : 
                maxChairsPerRow;
                
            for (let col = 0; col < chairsInThisRow; col++) {
                newChairs.push({
                    id: chairId++,
                    x: startX + col * (CHAIR_WIDTH + MARGIN),
                    y: startY + row * (CHAIR_HEIGHT + MARGIN)
                });
            }
        }
        
        return newChairs;
    }

    function isTemplateEditor() {
        return window.location.pathname.includes('/templates/');
    }

    function getStudentCount() {
        if (isTemplateEditor()) {
            return DEFAULT_TEMPLATE_SEATS;
        }
        const studentsData = $('#canvas').attr('students');
        if (studentsData) {
            const students = JSON.parse(studentsData);
            return students.length;
        }
        return 0;
    }

    function initializeData() {
        try {
            let layoutData;
            const existingLayout = window.TEMPLATE_DATA ? window.TEMPLATE_DATA.layoutData : null;
            if (existingLayout) {
                if (Array.isArray(existingLayout)) {
                    chairs = existingLayout;
                } else if (existingLayout.chairs) {
                    chairs = existingLayout.chairs;
                    if (existingLayout.layoutPreference) {
                        localStorage.setItem('templateLayoutPreference', existingLayout.layoutPreference);
                    }
                }
            }
            if (!chairs || chairs.length === 0) {
                const layout = localStorage.getItem('templateLayoutPreference') || 'portrait';
                const canvasWidth = layout === 'portrait' ? 794 : 1123;
                const canvasHeight = layout === 'portrait' ? 1123 : 794;
                chairs = generateDefaultChairs(canvasWidth, canvasHeight, isTemplateEditor());
            }
            console.log('Layout initialized:', {
                chairCount: chairs.length,
                isTemplate: isTemplateEditor(),
                layout: localStorage.getItem('templateLayoutPreference')
            });
            
        } catch (e) {
            console.error('Error initializing layout:', e);
            chairs = [];
        }
    }

    $('#autoArrangeBtn').click(function() {
        const layout = localStorage.getItem('templateLayoutPreference') || 'portrait';
        const canvasWidth = layout === 'portrait' ? 794 : 1123;
        const canvasHeight = layout === 'portrait' ? 1123 : 794;
        
        chairs = generateDefaultChairs(canvasWidth, canvasHeight, isTemplateEditor());
        initializeChairs();
    });

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

    $(window).on('scroll', function() {
        lastScrollTop = $(window).scrollTop();
        lastScrollLeft = $(window).scrollLeft();
    });

    $(document).click(function(e) {
        if (!$(e.target).closest('.chair-context-menu').length) {
            $('.chair-context-menu').remove();
        }
    });

    $('#canvas').on('contextmenu', function(e) {
        e.preventDefault();
    });

    window.onerror = function(msg, url, lineNo, columnNo, error) {
        console.error('Error: ' + msg + '\nURL: ' + url + '\nLine: ' + lineNo + '\nColumn: ' + columnNo + '\nError object: ' + JSON.stringify(error));
        return false;
    };

    initializeData();
    initializeLayout();
    initializeDraggables();
    initializeChairs();

    $("#saveTemplateBtn").off('click').on('click', saveTemplate);
});