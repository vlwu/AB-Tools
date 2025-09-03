document.addEventListener("DOMContentLoaded", () => {
  // --- STATE MANAGEMENT ---
  let plannedCourses = []; // Array of objects: { id, delivery }
  let hasUnsavedChanges = false;

  const findCourseById = (id) => courseData.find(c => c.id === id);

  // --- DOM ELEMENTS ---
  const gradeContainers = {
    10: document.getElementById("grade-10-courses"),
    11: document.getElementById("grade-11-courses"),
    12: document.getElementById("grade-12-courses"),
  };
  const creditCountEl = document.getElementById("credit-count");
  const gradeCreditEls = {
    10: document.getElementById("grade-10-credits"),
    11: document.getElementById("grade-11-credits"),
    12: document.getElementById("grade-12-credits"),
  };
  const progressBarEl = document.getElementById("progress-bar");
  const requirementsEl = document.getElementById("requirements-checklist");
  
  // Modals & Tooltip
  const deliveryModal = document.getElementById("delivery-modal");
  const detailsModal = document.getElementById("details-modal");
  const tooltip = document.getElementById("tooltip");

  // --- GRADUATION REQUIREMENTS ---
  const gradRequirements = {
    'ELA-30': { label: 'ELA 30-1 or 30-2', met: false },
    'Social-30': { label: 'Social 30-1 or 30-2', met: false },
    'Math-20': { label: 'Math 20-level', met: false },
    'Science-20': { label: 'Science 20-level', met: false },
    'PE10': { label: 'Physical Education 10', met: false },
    'CALM': { label: 'CALM 20', met: false },
    'Option-10': { label: '10 Credits (Options)', met: false },
    'Option-30': { label: '10 Credits (30-level)', met: false },
  };

  // --- INITIALIZATION ---
  function init() {
    renderAllCourses();
    updateUI();
    attachEventListeners();
  }

  // --- RENDERING & UI ---
  function renderAllCourses() {
    Object.values(gradeContainers).forEach(c => c.innerHTML = '');
    courseData.forEach(course => {
      const card = createCourseCard(course);
      gradeContainers[course.grade].appendChild(card);
    });
  }

  function createCourseCard(course) {
    const card = document.createElement("div");
    card.className = "course-card";
    card.dataset.id = course.id;
    card.innerHTML = `
      <span class="name">${course.name}</span>
      <span class="credits">${course.credits} Credits</span>
      <span class="delivery-icon"></span>
    `;
    card.addEventListener("click", () => onCourseClick(course));
    card.addEventListener("mouseover", (e) => onCourseHover(e, course));
    card.addEventListener("mouseout", onCourseMouseOut);
    return card;
  }

  function updateUI() {
    updateCourseStates();
    updateGradTracker();
    updateGradeCredits();
    hasUnsavedChanges = true;
  }

  function updateCourseStates() {
    const plannedIds = plannedCourses.map(pc => pc.id);
    document.querySelectorAll(".course-card").forEach(card => {
      const courseId = card.dataset.id;
      const plannedCourse = plannedCourses.find(pc => pc.id === courseId);
      card.classList.remove("locked", "available", "planned");
      card.querySelector('.delivery-icon').textContent = '';

      if (plannedCourse) {
        card.classList.add("planned");
        if (plannedCourse.delivery === 'summer') card.querySelector('.delivery-icon').textContent = '☀️';
        if (plannedCourse.delivery === 'elearning') card.querySelector('.delivery-icon').textContent = '💻';
      } else if (arePrerequisitesMet(findCourseById(courseId), plannedIds)) {
        card.classList.add("available");
      } else {
        card.classList.add("locked");
      }
    });
  }

  function updateGradTracker() {
    const totalCredits = plannedCourses.reduce((sum, pc) => sum + findCourseById(pc.id).credits, 0);
    creditCountEl.textContent = `${totalCredits}`;
    progressBarEl.style.width = `${Math.min((totalCredits / 100) * 100, 100)}%`;

    const plannedCourseObjects = plannedCourses.map(pc => findCourseById(pc.id));
    gradRequirements['ELA-30'].met = plannedCourseObjects.some(c => c.category === 'ELA-30');
    gradRequirements['Social-30'].met = plannedCourseObjects.some(c => c.category === 'Social-30');
    gradRequirements['Math-20'].met = plannedCourseObjects.some(c => c.category === 'Math' && ['MATH20-1', 'MATH20-2', 'MATH20-3'].includes(c.id));
    gradRequirements['Science-20'].met = plannedCourseObjects.some(c => c.category === 'Science' && ['SCI20', 'BIO20', 'CHEM20', 'PHY20'].includes(c.id));
    gradRequirements['PE10'].met = plannedCourseObjects.some(c => c.id === 'PE10');
    gradRequirements['CALM'].met = plannedCourseObjects.some(c => c.id === 'CALM');
    
    const optionCredits = plannedCourseObjects
        .filter(c => !['ELA', 'Social', 'Math', 'Science', 'PE', 'CALM', 'ELA-30', 'Social-30'].includes(c.category))
        .reduce((sum, c) => sum + c.credits, 0);
    gradRequirements['Option-10'].met = optionCredits >= 10;
    
    const thirtyLevelCredits = plannedCourseObjects
        .filter(c => c.name.includes('30') || c.id.includes('31'))
        .reduce((sum, c) => sum + c.credits, 0);
    gradRequirements['Option-30'].met = thirtyLevelCredits >= 10;

    requirementsEl.innerHTML = Object.entries(gradRequirements)
      .map(([_, req]) => `<div class="req-item ${req.met ? 'completed' : ''}">✅ ${req.label}</div>`)
      .join('');
  }

  function updateGradeCredits() {
    [10, 11, 12].forEach(grade => {
      const credits = plannedCourses
        .map(pc => findCourseById(pc.id))
        .filter(c => c.grade === grade)
        .reduce((sum, c) => sum + c.credits, 0);
      gradeCreditEls[grade].textContent = credits;
      
      const footer = gradeCreditEls[grade].parentElement;
      if (credits > 40) { // CBE standard is 40 credits/year
        footer.classList.add('warning');
      } else {
        footer.classList.remove('warning');
      }
    });
  }

  // --- LOGIC ---
  function arePrerequisitesMet(course, plannedIds) {
    if (!course.prerequisites || course.prerequisites.length === 0) return true;
    return course.prerequisites.every(prereqId => plannedIds.includes(prereqId));
  }

  function addCourse(course, deliveryMethod) {
    if (!plannedCourses.some(pc => pc.id === course.id)) {
      plannedCourses.push({ id: course.id, delivery: deliveryMethod });
      updateUI();
    }
  }

  function removeCourse(courseId) {
    plannedCourses = plannedCourses.filter(pc => pc.id !== courseId);
    updateUI();
  }

  // --- EVENT HANDLERS ---
  function onCourseClick(course) {
    const isPlanned = plannedCourses.some(pc => pc.id === course.id);
    if (isPlanned) {
      showDetailsModal(course);
    } else if (arePrerequisitesMet(course, plannedCourses.map(pc => pc.id))) {
      showDeliveryModal(course);
    }
  }

  function onCourseHover(event, course) {
    const plannedIds = plannedCourses.map(pc => pc.id);
    // Prerequisite Highlighting
    if (course.prerequisites && course.prerequisites.length > 0) {
      course.prerequisites.forEach(prereqId => {
        document.querySelector(`.course-card[data-id="${prereqId}"]`)?.classList.add('highlight-prereq');
      });
    }
    // Tooltip for Locked Courses
    if (!arePrerequisitesMet(course, plannedIds)) {
      const missing = course.prerequisites.filter(p => !plannedIds.includes(p)).map(p => findCourseById(p).name);
      if (missing.length > 0) {
        tooltip.innerHTML = `Requires: ${missing.join(', ')}`;
        tooltip.style.display = 'block';
        tooltip.style.left = `${event.pageX + 10}px`;
        tooltip.style.top = `${event.pageY + 10}px`;
      }
    }
  }

  function onCourseMouseOut() {
    document.querySelectorAll('.highlight-prereq').forEach(card => card.classList.remove('highlight-prereq'));
    tooltip.style.display = 'none';
  }

  function attachEventListeners() {
    // Planner controls
    document.getElementById("save-plan").addEventListener("click", savePlan);
    document.getElementById("load-plan").addEventListener("click", loadPlan);
    document.getElementById("export-pdf").addEventListener("click", exportPlan);
    document.getElementById("reset-plan").addEventListener("click", resetPlan);
    
    // Modals
    setupDeliveryModal();
    setupDetailsModal();

    window.addEventListener('beforeunload', (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }
  
  // --- MODAL MANAGEMENT ---
  function showDeliveryModal(course) {
    deliveryModal.querySelector('#modal-course-name').textContent = course.name;
    deliveryModal.dataset.courseId = course.id;
    deliveryModal.style.display = "flex";
  }
  
  function setupDeliveryModal() {
    deliveryModal.addEventListener("click", (e) => {
      if (e.target.tagName !== 'BUTTON') return;
      const method = e.target.dataset.method;
      const courseId = deliveryModal.dataset.courseId;
      if (method && courseId) {
        addCourse(findCourseById(courseId), method);
      }
      deliveryModal.style.display = "none";
    });
  }

  function showDetailsModal(course) {
    const plannedCourse = plannedCourses.find(pc => pc.id === course.id);
    detailsModal.dataset.courseId = course.id;
    detailsModal.querySelector('#details-modal-course-name').textContent = course.name;
    detailsModal.querySelector('#details-modal-credits').textContent = course.credits;
    let deliveryText = plannedCourse.delivery.charAt(0).toUpperCase() + plannedCourse.delivery.slice(1);
    if (plannedCourse.delivery === 'elearning') deliveryText = 'CBe-learn';
    if (plannedCourse.delivery === 'summer') deliveryText = 'Summer School';
    detailsModal.querySelector('#details-modal-status').textContent = `Planned (${deliveryText})`;
    detailsModal.style.display = 'flex';
  }
  
  function setupDetailsModal() {
      detailsModal.querySelector('#details-modal-remove').addEventListener('click', () => {
          const courseId = detailsModal.dataset.courseId;
          removeCourse(courseId);
          detailsModal.style.display = 'none';
      });
      detailsModal.querySelector('#details-modal-close').addEventListener('click', () => {
          detailsModal.style.display = 'none';
      });
  }

  // --- SAVE, LOAD, EXPORT ---
  function savePlan() {
    if (plannedCourses.length === 0) {
      alert("Your plan is empty. Add some courses before saving.");
      return;
    }
    localStorage.setItem("emhsCoursePlan", JSON.stringify(plannedCourses));
    hasUnsavedChanges = false;
    alert("Plan saved successfully to your browser!");
  }

  function loadPlan() {
    const savedPlan = localStorage.getItem("emhsCoursePlan");
    if (savedPlan) {
      if (confirm("This will overwrite your current plan. Are you sure?")) {
        plannedCourses = JSON.parse(savedPlan);
        renderAllCourses();
        updateUI();
        hasUnsavedChanges = false;
      }
    } else {
      alert("No saved plan found.");
    }
  }

  function resetPlan() {
    if (confirm("Are you sure you want to completely reset your plan? This cannot be undone.")) {
      plannedCourses = [];
      renderAllCourses();
      updateUI();
    }
  }

  function exportPlan() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("EMHS Course Plan", 10, 20);
    let y = 30;
    [10, 11, 12].forEach(grade => {
      doc.setFontSize(16);
      doc.text(`Grade ${grade}`, 10, y);
      y += 8;
      doc.setFontSize(10);
      const coursesInGrade = plannedCourses
        .map(pc => findCourseById(pc.id))
        .filter(c => c.grade === grade);
      if (coursesInGrade.length > 0) {
        coursesInGrade.forEach(course => {
          const plannedCourse = plannedCourses.find(pc => pc.id === course.id);
          let deliveryText = '';
          if (plannedCourse.delivery === 'summer') deliveryText = ' (Summer)';
          if (plannedCourse.delivery === 'elearning') deliveryText = ' (CBe-learn)';
          doc.text(`- ${course.name}${deliveryText}`, 15, y);
          y += 7;
        });
      } else {
        doc.text("No courses planned for this grade.", 15, y);
        y += 7;
      }
      y += 5;
    });
    doc.save("emhs-course-plan.pdf");
  }

  // --- START THE APP ---
  init();
});