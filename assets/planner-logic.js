document.addEventListener("DOMContentLoaded", () => {
  // --- STATE MANAGEMENT ---
  let plannedCourses = []; // Array of objects: { id, delivery }
  let hasUnsavedChanges = false;
  
  const findCourseById = (id) => courseData.find(c => c.id === id);

  // --- DOM ELEMENTS ---
  const grade10Container = document.getElementById("grade-10-courses");
  const grade11Container = document.getElementById("grade-11-courses");
  const grade12Container = document.getElementById("grade-12-courses");
  const creditCountEl = document.getElementById("credit-count");
  const progressBarEl = document.getElementById("progress-bar");
  const requirementsEl = document.getElementById("requirements-checklist");
  const modal = document.getElementById("delivery-modal");
  const modalCourseName = document.getElementById("modal-course-name");

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
    grade10Container.innerHTML = '';
    grade11Container.innerHTML = '';
    grade12Container.innerHTML = '';

    courseData.forEach(course => {
      const card = createCourseCard(course);
      if (course.grade === 10) grade10Container.appendChild(card);
      else if (course.grade === 11) grade11Container.appendChild(card);
      else grade12Container.appendChild(card);
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
    return card;
  }

  function updateUI() {
    updateCourseStates();
    updateGradTracker();
    hasUnsavedChanges = true;
  }

  function updateCourseStates() {
    const plannedIds = plannedCourses.map(pc => pc.id);
    document.querySelectorAll(".course-card").forEach(card => {
      const courseId = card.dataset.id;
      const course = findCourseById(courseId);
      const plannedCourse = plannedCourses.find(pc => pc.id === courseId);

      // Reset states
      card.classList.remove("locked", "available", "planned");
      card.querySelector('.delivery-icon').textContent = '';

      if (plannedCourse) {
        card.classList.add("planned");
        if (plannedCourse.delivery === 'summer') card.querySelector('.delivery-icon').textContent = '☀️';
        if (plannedCourse.delivery === 'elearning') card.querySelector('.delivery-icon').textContent = '💻';
      } else if (arePrerequisitesMet(course, plannedIds)) {
        card.classList.add("available");
      } else {
        card.classList.add("locked");
      }
    });
  }

  function updateGradTracker() {
    // 1. Calculate Credits
    const totalCredits = plannedCourses.reduce((sum, pc) => sum + findCourseById(pc.id).credits, 0);
    creditCountEl.textContent = `${totalCredits}`;
    const progress = Math.min((totalCredits / 100) * 100, 100);
    progressBarEl.style.width = `${progress}%`;
    
    // 2. Check Requirements
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

    // 3. Render Checklist
    requirementsEl.innerHTML = Object.entries(gradRequirements)
        .map(([key, req]) => `<div class="req-item ${req.met ? 'completed' : ''}">✅ ${req.label}</div>`)
        .join('');
  }

  // --- LOGIC ---
  function arePrerequisitesMet(course, plannedIds) {
    if (course.prerequisites.length === 0) return true;
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
    const isAvailable = arePrerequisitesMet(course, plannedCourses.map(pc => pc.id));

    if (isPlanned) {
      if (confirm(`Do you want to remove ${course.name} from your plan?`)) {
        removeCourse(course.id);
      }
    } else if (isAvailable) {
      modalCourseName.textContent = course.name;
      modal.dataset.courseId = course.id;
      modal.style.display = "flex";
    } else {
      alert(`${course.name} is locked. Prerequisites not met.`);
    }
  }

  function attachEventListeners() {
    // Modal buttons
    modal.addEventListener("click", (e) => {
      if (e.target.tagName !== 'BUTTON') return;

      const method = e.target.dataset.method;
      const courseId = modal.dataset.courseId;
      if (method && courseId) {
        addCourse(findCourseById(courseId), method);
      }
      modal.style.display = "none";
    });
    
    document.getElementById("modal-cancel").addEventListener('click', () => {
       modal.style.display = "none";
    });

    // Planner controls
    document.getElementById("save-plan").addEventListener("click", savePlan);
    document.getElementById("load-plan").addEventListener("click", loadPlan);
    document.getElementById("export-pdf").addEventListener("click", exportPlan);
    document.getElementById("reset-plan").addEventListener("click", resetPlan);
    
    // Warn on exit
    window.addEventListener('beforeunload', (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
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
    ['10', '11', '12'].forEach(grade => {
        doc.setFontSize(16);
        doc.text(`Grade ${grade}`, 10, y);
        y += 8;
        doc.setFontSize(10);
        
        const coursesInGrade = plannedCourses
            .map(pc => findCourseById(pc.id))
            .filter(c => c.grade.toString().startsWith(grade.charAt(0)));

        if (coursesInGrade.length > 0) {
            coursesInGrade.forEach(course => {
                const plannedCourse = plannedCourses.find(pc => pc.id === course.id);
                let deliveryText = '';
                if(plannedCourse.delivery === 'summer') deliveryText = ' (Summer)';
                if(plannedCourse.delivery === 'elearning') deliveryText = ' (CBe-learn)';
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

  init();
});