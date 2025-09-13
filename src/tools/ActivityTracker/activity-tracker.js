document.addEventListener("DOMContentLoaded", () => {
  // --- STATE ---
  let state = {
    activities: []
  };
  let activityToDeleteId = null;

  // --- DOM ELEMENTS ---
  const addActivityBtn = document.getElementById("add-activity-btn");
  const exportPdfBtn = document.getElementById("export-pdf-btn");
  const activityListContainer = document.getElementById("activity-list-container");
  
  const modal = document.getElementById("activity-modal");
  const modalForm = document.getElementById("activity-form");
  const modalTitle = document.getElementById("activity-modal-title");
  const cancelBtns = document.querySelectorAll(".modal-cancel-btn");

  const deleteModal = document.getElementById("confirm-delete-modal");
  const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
  const cancelDeleteBtn = document.getElementById("cancel-delete-btn");

  const totalHoursEl = document.getElementById("total-hours-summary");
  const categoryHoursEl = document.getElementById("category-hours-summary");

  // --- INITIALIZATION ---
  function init() {
    loadState();
    renderUI();
    attachEventListeners();
  }

  // --- STATE MANAGEMENT ---
  function saveState() {
    localStorage.setItem("emhsActivityTracker", JSON.stringify(state.activities));
  }

  function loadState() {
    const savedActivities = localStorage.getItem("emhsActivityTracker");
    if (savedActivities) {
      state.activities = JSON.parse(savedActivities);
    }
  }

  // --- RENDERING & UI UPDATES ---
  function renderUI() {
    renderActivityList();
    updateDashboard();
  }

  function renderActivityList() {
    if (state.activities.length === 0) {
      activityListContainer.innerHTML = `<p class="empty-message">No activities logged yet. Click "Add New Activity" to start.</p>`;
      return;
    }

    activityListContainer.innerHTML = state.activities
      .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
      .map(activity => createActivityCard(activity))
      .join('');
  }

  function createActivityCard(activity) {
    const { id, organization, role, category, hours, startDate, endDate, description } = activity;
    const formattedStart = new Date(startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const formattedEnd = new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    return `
      <div class="activity-card">
        <div class="activity-header">
          <h4>${organization} - <em>${role}</em></h4>
          <span class="activity-category">${category}</span>
        </div>
        <div class="activity-details">
          <p><strong>Duration:</strong> ${formattedStart} to ${formattedEnd}</p>
          <p><strong>Commitment:</strong> ~${hours} hours/week</p>
        </div>
        ${description ? `<div class="activity-description"><p>${description.replace(/\n/g, '<br>')}</p></div>` : ''}
        <div class="activity-actions">
          <button class="edit-btn" data-id="${id}">Edit</button>
          <button class="delete-btn danger-btn" data-id="${id}">Delete</button>
        </div>
      </div>
    `;
  }

  function updateDashboard() {
    let totalHours = 0;
    const categoryHours = {};

    state.activities.forEach(activity => {
      const start = new Date(activity.startDate);
      const end = new Date(activity.endDate);
      const weeks = (end - start) / (1000 * 60 * 60 * 24 * 7);
      const activityTotalHours = weeks * activity.hours;
      
      if (!isNaN(activityTotalHours) && activityTotalHours > 0) {
          totalHours += activityTotalHours;
          categoryHours[activity.category] = (categoryHours[activity.category] || 0) + activityTotalHours;
      }
    });

    totalHoursEl.textContent = Math.round(totalHours).toLocaleString();
    
    categoryHoursEl.innerHTML = Object.keys(categoryHours).length > 0 
      ? Object.entries(categoryHours).map(([cat, hrs]) => `<span>${cat}: <strong>${Math.round(hrs)}</strong></span>`).join('')
      : '<span>No hours logged</span>';
  }

  // --- MODAL HANDLING ---
  function showModal(activity = null) {
    modalForm.reset();
    document.getElementById("activity-id").value = '';
    if (activity) {
      modalTitle.textContent = "Edit Activity";
      document.getElementById("activity-id").value = activity.id;
      document.getElementById("activity-organization").value = activity.organization;
      document.getElementById("activity-role").value = activity.role;
      document.getElementById("activity-category").value = activity.category;
      document.getElementById("activity-hours").value = activity.hours;
      document.getElementById("activity-start-date").value = activity.startDate;
      document.getElementById("activity-end-date").value = activity.endDate;
      document.getElementById("activity-description").value = activity.description;
    } else {
      modalTitle.textContent = "Add New Activity";
    }
    modal.style.display = "flex";
  }

  function hideModals() {
    modal.style.display = "none";
    deleteModal.style.display = "none";
  }

  // --- EVENT HANDLERS ---
  function attachEventListeners() {
    addActivityBtn.addEventListener("click", () => showModal());
    cancelBtns.forEach(btn => btn.addEventListener("click", hideModals));
    modal.addEventListener("click", (e) => { if (e.target === modal) hideModals(); });
    deleteModal.addEventListener("click", (e) => { if (e.target === deleteModal) hideModals(); });
    modalForm.addEventListener("submit", handleFormSubmit);

    activityListContainer.addEventListener("click", (e) => {
      if (e.target.matches(".edit-btn")) {
        const activity = state.activities.find(a => a.id === e.target.dataset.id);
        showModal(activity);
      }
      if (e.target.matches(".delete-btn")) {
        activityToDeleteId = e.target.dataset.id;
        deleteModal.style.display = "flex";
      }
    });

    cancelDeleteBtn.addEventListener("click", () => {
      activityToDeleteId = null;
      hideModals();
    });

    confirmDeleteBtn.addEventListener("click", () => {
      if (activityToDeleteId) {
        state.activities = state.activities.filter(a => a.id !== activityToDeleteId);
        activityToDeleteId = null;
        saveState();
        renderUI();
        hideModals();
      }
    });

    exportPdfBtn.addEventListener("click", exportToPdf);
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("activity-id").value;
    const newActivity = {
      organization: document.getElementById("activity-organization").value,
      role: document.getElementById("activity-role").value,
      category: document.getElementById("activity-category").value,
      hours: parseFloat(document.getElementById("activity-hours").value) || 0,
      startDate: document.getElementById("activity-start-date").value,
      endDate: document.getElementById("activity-end-date").value,
      description: document.getElementById("activity-description").value
    };

    if (new Date(newActivity.endDate) < new Date(newActivity.startDate)) {
        alert("End date cannot be before the start date.");
        return;
    }

    if (id) {
      const index = state.activities.findIndex(a => a.id === id);
      state.activities[index] = { ...state.activities[index], ...newActivity };
    } else {
      newActivity.id = `act-${Date.now()}`;
      state.activities.push(newActivity);
    }

    saveState();
    renderUI();
    hideModals();
  }
  
  // --- EXPORT LOGIC ---
  function exportToPdf() {
    if (typeof jspdf === 'undefined' || !jspdf.jsPDF) {
        alert('PDF library not loaded. Please wait a moment and try again.');
        return;
    }
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    let yPos = 20;

    doc.setFontSize(20);
    doc.text("Extracurricular & Volunteer Record", 14, yPos);
    yPos += 15;

    const groupedActivities = state.activities.reduce((acc, activity) => {
        (acc[activity.category] = acc[activity.category] || []).push(activity);
        return acc;
    }, {});

    Object.keys(groupedActivities).forEach(category => {
        doc.setFontSize(16);
        doc.text(category, 14, yPos);
        yPos += 8;

        const tableBody = groupedActivities[category].map(a => {
            const start = new Date(a.startDate).toLocaleDateString('en-CA');
            const end = new Date(a.endDate).toLocaleDateString('en-CA');
            return [
                `${a.organization}\nRole: ${a.role}`,
                `${start} to ${end}\n~${a.hours} hrs/week`,
                a.description || 'N/A'
            ];
        });

        doc.autoTable({
            startY: yPos,
            head: [['Activity', 'Duration & Commitment', 'Description']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [37, 52, 79] },
            styles: { cellPadding: 3, fontSize: 10 }
        });

        yPos = doc.autoTable.previous.finalY + 10;
    });

    doc.save("emhs-activity-record.pdf");
  }

  // --- START THE APP ---
  init();
});