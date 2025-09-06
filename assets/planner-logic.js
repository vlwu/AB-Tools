document.addEventListener("DOMContentLoaded", () => {

  let plannedCourses = [];
  let hasUnsavedChanges = false;
  let targetGradeForAdding = null;
  let directDeliveryMethod = null;

  const findCourseById = (id) => courseData.find(c => c.id === id);


  const gradeContainers = {
    10: document.getElementById("grade-10-courses"),
    11: document.getElementById("grade-11-courses"),
    12: document.getElementById("grade-12-courses"),
  };
  const summerContainers = {
    10: document.getElementById("summer-after-grade-10"),
    11: document.getElementById("summer-after-grade-11"),
  };
  const creditCountEl = document.getElementById("credit-count");
  const gradeCreditEls = {
    10: document.getElementById("grade-10-credits"),
    11: document.getElementById("grade-11-credits"),
    12: document.getElementById("grade-12-credits"),
  };
  const progressBarEl = document.getElementById("progress-bar");
  const requirementsEl = document.getElementById("requirements-checklist");


  const deliveryModal = document.getElementById("delivery-modal");
  const detailsModal = document.getElementById("details-modal");
  const courseSelectionModal = document.getElementById("course-selection-modal");
  const modalCourseList = document.getElementById("modal-course-list");
  const courseSearchInput = document.getElementById("course-search-input");
  const tooltip = document.getElementById("tooltip");


  const gradRequirements = {
    'ELA-30': { label: 'ELA 30-1 or 30-2', met: false },
    'Social-30': { label: 'Social 30-1 or 30-2', met: false },
    'Math-20': { label: 'Math 20-level', met: false },
    'Science-20': { label: 'Science 20-level', met: false },
    'PE10': { label: 'Physical Education 10', met: false },
    'CALM': { label: 'CALM (Career and Life Management)', met: false },
    'Option-10': { label: '10 Credits (Any combination of electives)', met: false },
    'Option-30': { label: '10 Credits (30-level other than ELA 30 & Social Studies 30)', met: false },
  };


  function init() {
    updateUI();
    attachEventListeners();
  }


  function renderPlanner() {

    const regularCourses = plannedCourses.filter(pc => pc.delivery !== 'summer');
    const summerCourses = plannedCourses.filter(pc => pc.delivery === 'summer');


    Object.entries(gradeContainers).forEach(([grade, container]) => {
      container.innerHTML = '';
      const coursesForGrade = regularCourses
        .map(pc => findCourseById(pc.id))
        .filter(c => c.grade === parseInt(grade));

      coursesForGrade.forEach(course => container.appendChild(createCourseCard(course)));

      const emptySlots = 8 - coursesForGrade.length;
      for (let i = 0; i < emptySlots; i++) {
        container.appendChild(createPlaceholderCard([parseInt(grade)], 'regular'));
      }
    });

    // Render summer columns
    summerContainers[10].innerHTML = '';
    summerContainers[11].innerHTML = '';

    const summer10 = summerCourses.filter(pc => findCourseById(pc.id).grade === 10);
    const summer11_12 = summerCourses.filter(pc => [11, 12].includes(findCourseById(pc.id).grade));

    summer10.forEach(pc => summerContainers[10].appendChild(createCourseCard(findCourseById(pc.id))));
    summer11_12.forEach(pc => summerContainers[11].appendChild(createCourseCard(findCourseById(pc.id))));

    if (summer10.length === 0) {
      summerContainers[10].appendChild(createPlaceholderCard([10, 11], 'summer'));
    }
    if (summer11_12.length === 0) {
      summerContainers[11].appendChild(createPlaceholderCard([11, 12], 'summer'));
    }
  }

  function createCourseCard(course) {
    const card = document.createElement("div");
    card.className = "course-card planned";
    card.dataset.id = course.id;
    const plannedCourse = plannedCourses.find(pc => pc.id === course.id);
    let deliveryIcon = '';
    if (plannedCourse.delivery === 'summer') deliveryIcon = '☀️';
    if (plannedCourse.delivery === 'elearning') deliveryIcon = '💻';

    card.innerHTML = `
      <span class="name">${course.name}</span>
      <span class="credits">${course.credits} Credits</span>
      <span class="delivery-icon">${deliveryIcon}</span>
    `;
    card.addEventListener("click", () => onCourseClick(course));
    return card;
  }

  function createPlaceholderCard(gradesToShow, delivery = null) {
      const placeholder = document.createElement("div");
      placeholder.className = "add-course-placeholder";
      placeholder.textContent = "(+) Add Course";
      placeholder.addEventListener("click", () => showCourseSelectionModal(gradesToShow, delivery));
      return placeholder;
  }

  function updateUI() {
    renderPlanner();
    updateGradTracker();
    updateGradeCredits();
    hasUnsavedChanges = true;
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
      .map(([_, req]) => `<div class="req-item ${req.met ? 'completed' : ''}">${req.met ? '✅' : '❌'} ${req.label}</div>`)
      .join('');
  }

  function updateGradeCredits() {
    [10, 11, 12].forEach(grade => {
      const credits = plannedCourses
        .filter(pc => pc.delivery !== 'summer')
        .map(pc => findCourseById(pc.id))
        .filter(c => c.grade === grade)
        .reduce((sum, c) => sum + c.credits, 0);
      gradeCreditEls[grade].textContent = credits;

      const footer = gradeCreditEls[grade].parentElement;
      if (credits > 40) {
        footer.classList.add('warning');
      } else {
        footer.classList.remove('warning');
      }
    });
  }


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


  function onCourseClick(course) {
    showDetailsModal(course);
  }

  function attachEventListeners() {
    document.getElementById("save-plan").addEventListener("click", savePlan);
    document.getElementById("load-plan").addEventListener("click", loadPlan);
    document.getElementById("export-pdf").addEventListener("click", exportPlan);
    document.getElementById("reset-plan").addEventListener("click", resetPlan);

    setupDeliveryModal();
    setupDetailsModal();
    setupCourseSelectionModal();

    window.addEventListener('beforeunload', (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  // --- MODAL MANAGEMENT ---
  function showCourseSelectionModal(grades, delivery = null) {
    targetGradeForAdding = grades;
    directDeliveryMethod = delivery;
    courseSearchInput.value = '';
    populateCourseSelectionModal();
    courseSelectionModal.style.display = "flex";
  }

  // MODIFICATION: Rewritten to group courses by category into toggle lists.
  function populateCourseSelectionModal() {
    modalCourseList.innerHTML = '';
    const plannedIds = plannedCourses.map(pc => pc.id);
    const searchTerm = courseSearchInput.value.toLowerCase();

    const availableCourses = courseData.filter(course =>
      !plannedIds.includes(course.id) &&
      targetGradeForAdding.includes(course.grade) &&
      (course.name.toLowerCase().includes(searchTerm) || course.category.toLowerCase().includes(searchTerm) || course.id.toLowerCase().includes(searchTerm))
    );

    if (availableCourses.length === 0) {
        modalCourseList.innerHTML = '<p style="text-align: center; margin-top: 1rem;">No matching courses found.</p>';
        return;
    }

    // Group courses by category
    const groupedCourses = availableCourses.reduce((acc, course) => {
      const category = course.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(course);
      return acc;
    }, {});

    // Create a display name mapping for categories
    const categoryDisplayNames = {
      'ELA': 'English Language Arts', 'ELA-30': 'English Language Arts (30-Level)',
      'Social': 'Social Studies', 'Social-30': 'Social Studies (30-Level)',
      'Math': 'Mathematics', 'Science': 'Science', 'Science-30': 'Science (30-Level)',
      'PE': 'Physical Education', 'CALM': 'CALM', 'FineArts': 'Fine Arts',
      'CTS': 'Career & Technology Studies', 'Language': 'Languages', 'SocialScience': 'Social Sciences'
    };


    for (const category in groupedCourses) {
      const categoryContainer = document.createElement('div');
      categoryContainer.className = 'modal-category';

      const categoryHeader = document.createElement('button');
      categoryHeader.className = 'modal-category-toggle';
      const displayName = categoryDisplayNames[category] || category;
      categoryHeader.textContent = `${displayName} (${groupedCourses[category].length})`;

      const courseListDiv = document.createElement('div');
      courseListDiv.className = 'modal-category-content';

      categoryHeader.addEventListener('click', () => {
        const wasActive = categoryHeader.classList.contains('active');


        modalCourseList.querySelectorAll('.modal-category-toggle').forEach(header => {
            header.classList.remove('active');
            header.nextElementSibling.style.display = 'none';
        });


        if (!wasActive) {
            categoryHeader.classList.add('active');
            courseListDiv.style.display = 'block';
        }
      });


      groupedCourses[category].sort((a,b) => a.name.localeCompare(b.name));


      groupedCourses[category].forEach(course => {
        const item = document.createElement('div');
        item.className = 'modal-course-item';

        const isMet = arePrerequisitesMet(course, plannedIds);
        if (!isMet) item.classList.add('locked');

        let prereqText = 'No prerequisites';
        if (course.prerequisites.length > 0) {
          prereqText = 'Requires: ' + course.prerequisites.map(p => findCourseById(p).name).join(', ');
        }

        item.innerHTML = `
          <span class="name">${course.name}</span>
          <span class="prereqs">${prereqText}</span>
        `;

        if (isMet) {
          item.addEventListener('click', () => {
            courseSelectionModal.style.display = 'none';
            if (directDeliveryMethod) {
              handleDirectCourseAdd(course, directDeliveryMethod);
            } else {
              showDeliveryModal(course);
            }
          });
        }
        courseListDiv.appendChild(item);
      });

      categoryContainer.appendChild(categoryHeader);
      categoryContainer.appendChild(courseListDiv);
      modalCourseList.appendChild(categoryContainer);
    }
  }

  function handleDirectCourseAdd(course, deliveryMethod) {
    if (deliveryMethod === 'summer') {
      if (course.grade === 10) {
        const summer10Exists = plannedCourses.some(pc => pc.delivery === 'summer' && findCourseById(pc.id).grade === 10);
        if (summer10Exists) {
          alert("You can only add one course to the summer session after Grade 10.");
          return;
        }
      } else if (course.grade === 11 || course.grade === 12) {
        const summer11_12Exists = plannedCourses.some(pc => pc.delivery === 'summer' && [11, 12].includes(findCourseById(pc.id).grade));
        if (summer11_12Exists) {
          alert("You can only add one course to the summer session after Grade 11.");
          return;
        }
      }
    }
    addCourse(course, deliveryMethod);
  }

  function setupCourseSelectionModal() {
      courseSearchInput.addEventListener('input', populateCourseSelectionModal);
      document.getElementById('modal-cancel-selection').addEventListener('click', () => {
          courseSelectionModal.style.display = 'none';
      });
  }

  function showDeliveryModal(course) {
    deliveryModal.querySelector('#modal-course-name').textContent = course.name;
    deliveryModal.dataset.courseId = course.id;
    deliveryModal.style.display = "flex";
  }

  function setupDeliveryModal() {
    deliveryModal.addEventListener("click", (e) => {
      const target = e.target;
      if (target.tagName !== 'BUTTON') return;

      const method = target.dataset.method;
      const courseId = deliveryModal.dataset.courseId;

      if (method && courseId) {
        if (method === 'summer') {
            const courseToAdd = findCourseById(courseId);
            if (courseToAdd.grade === 10) {
                const summer10Exists = plannedCourses.some(pc => pc.delivery === 'summer' && findCourseById(pc.id).grade === 10);
                if (summer10Exists) {
                    alert("You can only add one course to the summer session after Grade 10.");
                    deliveryModal.style.display = "none";
                    return;
                }
            } else if (courseToAdd.grade === 11 || courseToAdd.grade === 12) {
                const summer11_12Exists = plannedCourses.some(pc => pc.delivery === 'summer' && [11, 12].includes(findCourseById(pc.id).grade));
                if (summer11_12Exists) {
                    alert("You can only add one course to the summer session after Grade 11.");
                    deliveryModal.style.display = "none";
                    return;
                }
            }
        }
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

    const switchDeliveryBtn = detailsModal.querySelector('#details-modal-switch-delivery');
    if (plannedCourse.delivery === 'elearning') {
      switchDeliveryBtn.textContent = 'Switch to In-School';
    } else {
      switchDeliveryBtn.textContent = 'Switch to Online';
    }

    detailsModal.style.display = 'flex';
  }

  function setupDetailsModal() {
      detailsModal.querySelector('#details-modal-remove').addEventListener('click', () => {
          const courseId = detailsModal.dataset.courseId;
          removeCourse(courseId);
          detailsModal.style.display = 'none';
      });
      detailsModal.querySelector('#details-modal-switch-delivery').addEventListener('click', () => {
          const courseId = detailsModal.dataset.courseId;
          const plannedCourse = plannedCourses.find(pc => pc.id === courseId);
          if (plannedCourse) {
              if (plannedCourse.delivery === 'elearning') {
                  plannedCourse.delivery = 'regular';
              } else {
                  plannedCourse.delivery = 'elearning';
              }
              updateUI();
          }
          detailsModal.style.display = 'none';
      });
      detailsModal.querySelector('#details-modal-close').addEventListener('click', () => {
          detailsModal.style.display = 'none';
      });
  }


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
        .filter(pc => pc.delivery !== 'summer')
        .map(pc => findCourseById(pc.id))
        .filter(c => c.grade === grade);
      if (coursesInGrade.length > 0) {
        coursesInGrade.forEach(course => {
          const plannedCourse = plannedCourses.find(pc => pc.id === course.id);
          let deliveryText = plannedCourse.delivery === 'elearning' ? ' (CBe-learn)' : '';
          doc.text(`- ${course.name}${deliveryText}`, 15, y);
          y += 7;
        });
      } else {
        doc.text("No regular courses planned for this grade.", 15, y);
        y += 7;
      }

      const summerCourses = plannedCourses.filter(pc => pc.delivery === 'summer' && findCourseById(pc.id).grade === grade);
      if (summerCourses.length > 0) {
          doc.setFontSize(12);
          doc.text(`Summer (after Grade ${grade})`, 10, y);
          y += 8;
          doc.setFontSize(10);
          summerCourses.map(pc => findCourseById(pc.id)).forEach(course => {
            doc.text(`- ${course.name} (Summer)`, 15, y);
            y+=7;
          });
      }
      y += 5;
    });
    doc.save("emhs-course-plan.pdf");
  }


  init();
});