document.addEventListener("DOMContentLoaded", () => {
  // --- DATA ---
  // Using a hypothetical January 2026 schedule for demonstration
  const diplomaExams = [
    { id: 'ela301a', subject: 'ELA 30-1 Part A (Written)', date: '2026-01-12T09:00:00', duration: '2 hours', calculator: '../OutcomeCalculator/calculator.html?course=ela301' },
    { id: 'ss301a', subject: 'Social 30-1 Part A (Written)', date: '2026-01-13T09:00:00', duration: '2.5 hours', calculator: '../OutcomeCalculator/calculator.html?course=ss301' },
    { id: 'ela301b', subject: 'ELA 30-1 Part B (Multiple Choice)', date: '2026-01-15T09:00:00', duration: '2 hours', calculator: '../OutcomeCalculator/calculator.html?course=ela301' },
    { id: 'ss301b', subject: 'Social 30-1 Part B (Multiple Choice)', date: '2026-01-16T09:00:00', duration: '2.5 hours', calculator: '../OutcomeCalculator/calculator.html?course=ss301' },
    { id: 'math301', subject: 'Mathematics 30-1', date: '2026-01-19T09:00:00', duration: '3 hours', calculator: '../OutcomeCalculator/calculator.html?course=math301' },
    { id: 'phy30', subject: 'Physics 30', date: '2026-01-20T09:00:00', duration: '3 hours', calculator: '../OutcomeCalculator/calculator.html?course=physics30' },
    { id: "chem30", subject: "Chemistry 30", date: "2026-01-22T09:00:00", duration: "3 hours", calculator: "../OutcomeCalculator/calculator.html?course=chem30" },
    { id: 'bio30', subject: 'Biology 30', date: '2026-01-23T09:00:00', duration: '3 hours', calculator: '../OutcomeCalculator/calculator.html?course=bio30' },
    { id: 'sci30', subject: 'Science 30', date: '2026-01-26T09:00:00', duration: '3 hours', calculator: null } // No Science 30 calculator exists
  ];

  // --- STATE ---
  let state = {
    selectedExams: [],
    customEvents: []
  };

  // --- DOM ELEMENTS ---
  const examSelectionList = document.getElementById("exam-selection-list");
  const scheduleTimeline = document.getElementById("schedule-timeline");
  const addStudyBlockBtn = document.getElementById("add-study-block-btn");
  const scheduleControls = document.querySelector(".schedule-controls");
  const modal = document.getElementById("study-block-modal");
  const modalForm = document.getElementById("study-block-form");
  const modalCancelBtn = document.getElementById("modal-cancel-btn");
  const eventTitleInput = document.getElementById("event-title");
  const eventDateInput = document.getElementById("event-date");

  // --- INITIALIZATION ---
  function init() {
    renderExamCheckboxes();
    loadState();
    renderSchedule();
    attachEventListeners();
  }

  // --- STATE MANAGEMENT ---
  function saveState() {
    localStorage.setItem("diplomaPlannerState", JSON.stringify(state));
  }

  function loadState() {
    const savedState = localStorage.getItem("diplomaPlannerState");
    if (savedState) {
      state = JSON.parse(savedState);
      updateCheckboxes();
    }
  }

  // --- RENDERING ---
  function renderExamCheckboxes() {
    examSelectionList.innerHTML = diplomaExams
      .map(exam => `
        <div class="exam-checkbox-item">
          <input type="checkbox" id="exam-${exam.id}" data-exam-id="${exam.id}">
          <label for="exam-${exam.id}">${exam.subject}</label>
        </div>
      `).join('');
  }

  function updateCheckboxes() {
    const checkboxes = examSelectionList.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      if (state.selectedExams.includes(cb.dataset.examId)) {
        cb.checked = true;
      }
    });
  }

  function renderSchedule() {
    const selectedExamDetails = state.selectedExams.map(id => {
      const examData = diplomaExams.find(exam => exam.id === id);
      return { ...examData, type: 'exam' };
    });

    const allEvents = [...selectedExamDetails, ...state.customEvents].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Add or remove the 'Add to Calendar' button based on whether there are events
    let calendarBtn = document.getElementById('export-calendar-btn');
    if (allEvents.length > 0 && !calendarBtn) {
        calendarBtn = document.createElement('button');
        calendarBtn.id = 'export-calendar-btn';
        calendarBtn.textContent = '📅 Add to Calendar';
        calendarBtn.addEventListener('click', () => exportToICS(allEvents));
        scheduleControls.appendChild(calendarBtn);
    } else if (allEvents.length === 0 && calendarBtn) {
        calendarBtn.remove();
    }

    if (allEvents.length === 0) {
      scheduleTimeline.innerHTML = `<div class="empty-schedule-message"><p>Your schedule is empty.</p><p>Select an exam or add a study block to begin.</p></div>`;
      return;
    }

    scheduleTimeline.innerHTML = allEvents.map(event => createTimelineItem(event)).join('');

    // Re-attach delete listeners for custom events after rendering
    document.querySelectorAll('.delete-event-btn').forEach(button => {
        button.addEventListener('click', handleDeleteCustomEvent);
    });
  }

  function createTimelineItem(event) {
    const eventDate = new Date(event.date);
    const today = new Date();
    // Set time to 0 to compare dates only
    today.setHours(0, 0, 0, 0); 
    const eventDay = new Date(event.date);
    eventDay.setHours(0, 0, 0, 0);

    const daysRemaining = Math.ceil((eventDay - today) / (1000 * 60 * 60 * 24));
    
    let countdownText = '';
    if (daysRemaining > 1) {
      countdownText = `${daysRemaining} days away`;
    } else if (daysRemaining === 1) {
      countdownText = 'Tomorrow';
    } else if (daysRemaining === 0) {
      countdownText = 'Today';
    } else {
      countdownText = 'Past Event';
    }
    
    const formattedDate = eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    if (event.type === 'exam') {
      return `
        <div class="timeline-item exam-item">
          <div class="timeline-header">
            <h4>${event.subject}</h4>
            <span class="timeline-countdown">${countdownText}</span>
          </div>
          <div class="timeline-details">
            ${formattedDate} at ${formattedTime} (${event.duration})
          </div>
          <div class="timeline-actions">
            ${event.calculator ? `<a href="${event.calculator}" class="button-link">Grade Calculator</a>` : ''}
          </div>
        </div>
      `;
    } else { // custom study event
      return `
        <div class="timeline-item study-item">
          <div class="timeline-header">
            <h4>${event.title}</h4>
            <span class="timeline-countdown">${countdownText}</span>
          </div>
          <div class="timeline-details">
            ${formattedDate}
          </div>
          <div class="timeline-actions">
            <button class="delete-event-btn" data-event-id="${event.id}">🗑️ Delete</button>
          </div>
        </div>
      `;
    }
  }

  // --- EVENT HANDLERS ---
  function attachEventListeners() {
    examSelectionList.addEventListener('change', handleExamSelection);
    addStudyBlockBtn.addEventListener('click', handleShowModal);
    modalCancelBtn.addEventListener('click', handleHideModal);
    modal.addEventListener('click', (e) => { if(e.target === modal) handleHideModal(); }); // Close on overlay click
    modalForm.addEventListener('submit', handleAddCustomEvent);
  }

  function handleExamSelection(e) {
    if (e.target.matches('input[type="checkbox"]')) {
      const examId = e.target.dataset.examId;
      if (e.target.checked) {
        if (!state.selectedExams.includes(examId)) {
          state.selectedExams.push(examId);
        }
      } else {
        state.selectedExams = state.selectedExams.filter(id => id !== examId);
      }
      saveState();
      renderSchedule();
    }
  }

  function handleShowModal() {
    modalForm.reset();
    modal.style.display = 'flex';
  }

  function handleHideModal() {
    modal.style.display = 'none';
  }

  function handleAddCustomEvent(e) {
    e.preventDefault();
    const title = eventTitleInput.value.trim();
    // The date from input type="date" is YYYY-MM-DD. Need to add time to avoid timezone issues.
    // Using T12:00:00 to place it midday.
    const date = eventDateInput.value + "T12:00:00"; 
    
    if (title && date) {
      state.customEvents.push({
        id: Date.now(),
        type: 'study',
        title,
        date
      });
      saveState();
      renderSchedule();
      handleHideModal();
    }
  }

  function handleDeleteCustomEvent(e) {
      const eventId = parseInt(e.target.dataset.eventId, 10);
      state.customEvents = state.customEvents.filter(event => event.id !== eventId);
      saveState();
      renderSchedule();
  }
  
  // --- CALENDAR EXPORT LOGIC ---
  function exportToICS(events) {
    // Helper to format dates for iCalendar spec (YYYYMMDDTHHMMSSZ)
    const toICSDate = (date) => new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    let icsString = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//EM-Study-Tools//Diploma-Planner//EN'
    ].join('\r\n');

    events.forEach(event => {
        const startDate = new Date(event.date);
        let endDate = new Date(startDate);
        let summary = '';
        let description = '';

        if (event.type === 'exam') {
            const durationHours = parseFloat(event.duration) || 2;
            endDate.setHours(startDate.getHours() + durationHours);
            summary = `${event.subject} Diploma Exam`;
            description = `Duration: ${event.duration}`;
        } else { // Custom study block
            endDate.setHours(startDate.getHours() + 1); // Assume 1-hour block
            summary = `Study: ${event.title}`;
            description = `Custom study block for diploma exams.`;
        }

        const eventString = [
            'BEGIN:VEVENT',
            `UID:${event.id}@emstudy.ca`,
            `DTSTAMP:${toICSDate(new Date())}`,
            `DTSTART:${toICSDate(startDate)}`,
            `DTEND:${toICSDate(endDate)}`,
            `SUMMARY:${summary}`,
            `DESCRIPTION:${description}`,
            'END:VEVENT'
        ].join('\r\n');
        
        icsString += '\r\n' + eventString;
    });

    icsString += '\r\nEND:VCALENDAR';

    // Trigger download
    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Diploma-Schedule.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- START THE APP ---
  init();
});