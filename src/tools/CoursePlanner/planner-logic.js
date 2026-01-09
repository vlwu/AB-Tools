import { courseData } from '../../shared/data/course-data.js';

document.addEventListener("DOMContentLoaded", () => {

  let plannedCourses = [];
  let hasUnsavedChanges = false;
  let targetGradeForAdding = null;
  let directDeliveryMethod = null;
  let universityData = {};
  
  // Default Settings
  let presetSettings = {
    allowSummer: true,
    fillSpares: false
  };

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


  const detailsModal = document.getElementById("details-modal");
  const courseSelectionModal = document.getElementById("course-selection-modal");
  const modalCourseList = document.getElementById("modal-course-list");
  const courseSearchInput = document.getElementById("course-search-input");
  const tooltip = document.getElementById("tooltip");

  const prereqModal = document.getElementById('prereq-visualizer-modal');
  const prereqTreeContainer = document.getElementById('prereq-tree-container');
  const prereqModalTitle = document.getElementById('prereq-modal-title');

  const confirmModal = document.getElementById('confirm-modal');
  const confirmModalTitle = document.getElementById('confirm-modal-title');
  const confirmModalMessage = document.getElementById('confirm-modal-message');
  const confirmModalButton = document.getElementById('confirm-modal-button');
  const confirmModalCancel = document.getElementById('confirm-modal-cancel');

  const infoModal = document.getElementById('info-modal');
  const infoModalTitle = document.getElementById('info-modal-title');
  const infoModalMessage = document.getElementById('info-modal-message');
  const infoModalClose = document.getElementById('info-modal-close');

  const universitySelect = document.getElementById('university-select');
  const programSelect = document.getElementById('program-select');
  const presetActionsDiv = document.getElementById('preset-actions');
  const loadPresetBtn = document.getElementById('load-preset-btn');
  const presetSettingsBtn = document.getElementById('preset-settings-btn');
  
  const presetSettingsModal = document.getElementById('preset-settings-modal');
  const presetSettingsSave = document.getElementById('preset-settings-save');
  const presetSettingsCancel = document.getElementById('preset-settings-cancel');
  const settingAllowSummer = document.getElementById('setting-allow-summer');
  const settingFillSpares = document.getElementById('setting-fill-spares');


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

  async function init() {
    await fetchUniversityData();
    populateUniversities();
    updateUI();
    attachEventListeners();
  }

  function renderPlanner() {
    const regularCourses = plannedCourses.filter(pc => pc.delivery !== 'summer');
    const summerCourses = plannedCourses.filter(pc => pc.delivery === 'summer');

    Object.entries(gradeContainers).forEach(([grade, container]) => {
      container.innerHTML = '';
      const coursesForGrade = regularCourses
        .filter(pc => (pc.placedInGrade || findCourseById(pc.id).grade) === parseInt(grade))
        .map(pc => findCourseById(pc.id));

      coursesForGrade.forEach(course => container.appendChild(createCourseCard(course)));

      const slotsUsed = coursesForGrade.reduce((total, course) => {
        return total + (course.credits >= 10 || course.isFullYear ? 2 : 1);
      }, 0);

      const emptySlots = 8 - slotsUsed;
      for (let i = 0; i < emptySlots; i++) {
        container.appendChild(createPlaceholderCard([parseInt(grade)], 'regular'));
      }
    });

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

    if (course.credits >= 10 || course.isFullYear) {
      card.classList.add("full-year-course");
    }

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
    updateCourseCardStyles();
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
        .filter(pc => (pc.placedInGrade || findCourseById(pc.id).grade) === grade)
        .map(pc => findCourseById(pc.id))
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
    if (!course.prerequisites || course.prerequisites.length === 0) {
      return true;
    }
    return course.prerequisites.every(prereqCondition => {
      if (prereqCondition.includes('|')) {
        const orOptions = prereqCondition.split('|');
        return orOptions.some(optionId => plannedIds.includes(optionId));
      } else {
        return plannedIds.includes(prereqCondition);
      }
    });
  }

  function addCourse(course, deliveryMethod, placementGrade) {
    if (!plannedCourses.some(pc => pc.id === course.id)) {
      plannedCourses.push({ id: course.id, delivery: deliveryMethod, placedInGrade: placementGrade });
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

    universitySelect.addEventListener('change', () => populatePrograms(universitySelect.value));
    programSelect.addEventListener('change', updateCourseCardStyles);

    loadPresetBtn.addEventListener('click', generatePreset);
    presetSettingsBtn.addEventListener('click', showPresetSettingsModal);
    presetSettingsSave.addEventListener('click', savePresetSettings);
    presetSettingsCancel.addEventListener('click', () => presetSettingsModal.style.display = 'none');

    setupDetailsModal();
    setupCourseSelectionModal();
    setupCustomModals();
    setupPrereqVisualizerModal();
  }
  
  // --- UNIVERSITY & PROGRAM INTEGRATION ---
  async function fetchUniversityData() {
    try {
      const response = await fetch('../../shared/data/university_requirements.json');
      if (!response.ok) throw new Error('Network response was not ok.');
      universityData = await response.json();
    } catch (error) {
      console.error('Failed to fetch university data:', error);
    }
  }

  function populateUniversities() {
    universitySelect.innerHTML = '<option value="">-- Select a University --</option>';
    Object.keys(universityData).sort().forEach(uni => {
      const option = document.createElement('option');
      option.value = uni;
      option.textContent = uni;
      universitySelect.appendChild(option);
    });
  }

  function populatePrograms(universityName) {
    programSelect.innerHTML = '<option value="">-- Select a Program --</option>';
    presetActionsDiv.style.display = 'none';

    if (universityName && universityData[universityName]) {
      Object.keys(universityData[universityName].programs).sort().forEach(prog => {
        const option = document.createElement('option');
        option.value = prog;
        option.textContent = prog;
        programSelect.appendChild(option);
      });
      programSelect.disabled = false;
    } else {
      programSelect.disabled = true;
    }
    updateCourseCardStyles();
  }

  function updateCourseCardStyles() {
    const uni = universitySelect.value;
    const prog = programSelect.value;
    
    // Toggle Preset Button Visibility
    if (uni && prog) {
        presetActionsDiv.style.display = 'flex';
    } else {
        presetActionsDiv.style.display = 'none';
    }

    // Clear all existing styles
    document.querySelectorAll('.course-card').forEach(card => {
        card.classList.remove('required', 'recommended', 'unnecessary');
    });

    if (!uni || !prog) return;

    const reqs = universityData[uni]?.programs[prog];
    if (!reqs) return;

    const requiredCourses = new Set(reqs.required_courses || []);
    const recommendedCourses = new Set();
    reqs.group_requirements?.forEach(group => {
        group.courses.forEach(courseId => recommendedCourses.add(courseId));
    });
    if (reqs.notes) {
        courseData.forEach(course => {
            if (reqs.notes.includes(course.id)) {
                recommendedCourses.add(course.id);
            }
        });
    }

    document.querySelectorAll('.course-card.planned').forEach(card => {
        const courseId = card.dataset.id;
        if (requiredCourses.has(courseId)) {
            card.classList.add('required');
        } else if (recommendedCourses.has(courseId)) {
            card.classList.add('recommended');
        } else {
            card.classList.add('unnecessary');
        }
    });
  }

  // --- PRESET GENERATION LOGIC ---

  function showPresetSettingsModal() {
      settingAllowSummer.checked = presetSettings.allowSummer;
      settingFillSpares.checked = presetSettings.fillSpares;
      presetSettingsModal.style.display = 'flex';
  }

  function savePresetSettings() {
      presetSettings.allowSummer = settingAllowSummer.checked;
      presetSettings.fillSpares = settingFillSpares.checked;
      presetSettingsModal.style.display = 'none';
      showInfoModal("Settings Saved", "Your preset preferences have been updated. Load a preset to apply them.");
  }

  function generatePreset() {
      const uni = universitySelect.value;
      const prog = programSelect.value;

      if (!uni || !prog) {
          showInfoModal("Error", "Please select a University and Program first.");
          return;
      }

      showConfirmModal(
          "Load Preset?",
          "This will replace your current course plan with a generated path optimized for this program. This cannot be undone.",
          () => executePresetGeneration(uni, prog)
      );
  }

  function executePresetGeneration(uni, prog) {
      const reqs = universityData[uni]?.programs[prog];
      if (!reqs) return;

      const coursesToAdd = new Set();

      // 1. Add specific required courses and their full prereq chains
      if (reqs.required_courses) {
          reqs.required_courses.forEach(id => resolvePrerequisites(id, coursesToAdd));
      }

      // 2. Handle Group Requirements (Pick first available option for "Best Route")
      if (reqs.group_requirements) {
          reqs.group_requirements.forEach(group => {
              // Pick the first option in the group list
              const bestOption = group.courses[0]; 
              if (bestOption) resolvePrerequisites(bestOption, coursesToAdd);
          });
      }

      // 3. Add Mandatory Graduation Requirements if not already present
      // ELA 30-1 is usually a prereq for Uni, so check ELA chain.
      // ELA 30-1 should trigger 20-1 and 10-1.
      // If program didn't specify ELA (rare for Uni), add standard Uni Prep ELA.
      if (!Array.from(coursesToAdd).some(id => id.includes('ELA30'))) {
          resolvePrerequisites('ELA30-1', coursesToAdd);
      }
      // Social 30-1 for Uni Prep
      if (!Array.from(coursesToAdd).some(id => id.includes('SS30'))) {
          resolvePrerequisites('SS30-1', coursesToAdd);
      }
      // Mandatory Non-Academic
      resolvePrerequisites('PE10', coursesToAdd);
      resolvePrerequisites('CALM', coursesToAdd);
      
      // Science 10 is almost always needed for 30-level sciences, but double check
      if (!coursesToAdd.has('SCI10')) resolvePrerequisites('SCI10', coursesToAdd);
      
      // Math 10C check
      if (!coursesToAdd.has('MATH10C') && !coursesToAdd.has('MATH10-FY')) resolvePrerequisites('MATH10C', coursesToAdd);

      // 4. Build new plan array
      let newPlan = [];
      const courseObjects = Array.from(coursesToAdd).map(id => findCourseById(id)).filter(Boolean);

      // Sort by grade to help with filling logic
      courseObjects.sort((a, b) => a.grade - b.grade);

      // 5. Schedule Courses & Apply Settings
      const gradeLoad = { 10: 0, 11: 0, 12: 0 };
      
      courseObjects.forEach(course => {
          let delivery = 'regular';
          let placement = course.grade;

          // Summer School Logic (Simple Heuristic: Move CALM or single 5-credit options if overloaded)
          if (presetSettings.allowSummer) {
              // Priority candidates for Summer: CALM
              if (course.id === 'CALM') {
                  delivery = 'summer';
                  placement = 10; // Summer after Grade 10
              }
          }

          newPlan.push({ id: course.id, delivery, placedInGrade: placement });
          if (delivery === 'regular') {
              const weight = (course.credits >= 10 || course.isFullYear) ? 2 : 1;
              gradeLoad[placement] += weight;
          }
      });

      // 6. Fill Spares if requested
      if (presetSettings.fillSpares) {
          const fillers = [
              'COMP10', 'ART10', 'DRAMA10', 'SPORTSMED10', 'BIZ10', // Grade 10 Options
              'COMP20', 'ART20', 'DRAMA20', 'SPORTSMED20', 'BIZ20', // Grade 11 Options
              'COMP30', 'ART30', 'DRAMA30', 'SPORTSMED30', 'BIZ30'  // Grade 12 Options
          ];
          
          [10, 11, 12].forEach(grade => {
              while (gradeLoad[grade] < 8) { // Assuming 8 blocks per year
                  // Find a valid filler for this grade that isn't already used
                  const validFillerId = fillers.find(fid => {
                      const c = findCourseById(fid);
                      if (!c || c.grade !== grade) return false;
                      // Check if already in plan
                      if (newPlan.some(p => p.id === fid)) return false;
                      // Check prereqs for 20/30 fillers
                      if (c.prerequisites.length > 0) {
                          return arePrerequisitesMet(c, newPlan.map(p => p.id));
                      }
                      return true;
                  });

                  if (validFillerId) {
                      newPlan.push({ id: validFillerId, delivery: 'regular', placedInGrade: grade });
                      gradeLoad[grade]++;
                  } else {
                      break; // No more valid fillers found
                  }
              }
          });
      }

      plannedCourses = newPlan;
      updateUI();
      showInfoModal("Preset Loaded", `Successfully loaded the best route for ${prog}.`);
  }

  function resolvePrerequisites(courseId, set) {
      if (set.has(courseId)) return;
      
      const course = findCourseById(courseId);
      if (!course) return;

      // Add prerequisites first
      if (course.prerequisites) {
          course.prerequisites.forEach(condition => {
              // Handle OR conditions (e.g. MATH10C|MATH10-FY). 
              // For "Best Route" preset, we default to the first option (Standard route).
              const reqId = condition.split('|')[0];
              resolvePrerequisites(reqId, set);
          });
      }

      // Add the course itself
      set.add(courseId);
  }


  // --- MODAL MANAGEMENT ---
  function showCourseSelectionModal(grades, delivery = null) {
    targetGradeForAdding = grades;
    directDeliveryMethod = delivery;
    courseSearchInput.value = '';
    populateCourseSelectionModal();
    courseSelectionModal.style.display = "flex";
  }

  function populateCourseSelectionModal() {
    modalCourseList.innerHTML = '';
    const plannedIds = plannedCourses.map(pc => pc.id);
    const searchTerm = courseSearchInput.value.toLowerCase();

    const availableCourses = courseData.filter(course => {
      const gradeMatch = targetGradeForAdding.includes(course.grade) || (targetGradeForAdding.includes(12) && course.grade === 11);
      const searchMatch = (course.name.toLowerCase().includes(searchTerm) || course.category.toLowerCase().includes(searchTerm) || course.id.toLowerCase().includes(searchTerm));
      const isAlreadyPlanned = plannedIds.includes(course.id);

      if (isAlreadyPlanned || !gradeMatch || !searchMatch) {
          return false;
      }
      
      if (directDeliveryMethod === 'summer') {
          const isAP = course.id.includes('AP');
          const coreCategories = ['ELA', 'Social', 'Math', 'Science', 'ELA-30', 'Social-30', 'Science-30', 'CALM'];
          const isCore = coreCategories.includes(course.category);
          
          return !isAP && isCore;
      }

      return true;
    });

    if (availableCourses.length === 0) {
        modalCourseList.innerHTML = '<p style="text-align: center; margin-top: 1rem;">No matching courses found.</p>';
        return;
    }

    const groupedCourses = availableCourses.reduce((acc, course) => {
      let category = course.category;
      if (category === 'Science-30') {
        category = 'Science';
      }

      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(course);
      return acc;
    }, {});

    const categoryDisplayNames = {
      'ELA': 'English Language Arts', 'ELA-30': 'English Language Arts (30-Level)',
      'Social': 'Social Studies', 'Social-30': 'Social Studies (30-Level)',
      'Math': 'Mathematics', 'Science': 'Science',
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
          prereqText = 'Requires: ' + course.prerequisites.map(prereqCondition => {
            return prereqCondition.split('|').map(pId => {
              const prereqCourse = findCourseById(pId);
              return prereqCourse ? prereqCourse.name : pId;
            }).join(' or ');
          }).join(', ');
        }
        
        const infoDiv = document.createElement('div');
        infoDiv.innerHTML = `<span class="name">${course.name}</span><span class="prereqs">${prereqText}</span>`;
        item.appendChild(infoDiv);

        if (isMet) {
          item.addEventListener('click', (e) => {
            if (e.target.matches('.visualize-prereq-btn')) {
              return;
            }
            courseSelectionModal.style.display = 'none';
            handleDirectCourseAdd(course, directDeliveryMethod);
          });
        }

        if (course.prerequisites.length > 0) {
            const visualizeBtn = document.createElement('button');
            visualizeBtn.className = 'visualize-prereq-btn';
            visualizeBtn.textContent = 'Visualize';
            visualizeBtn.dataset.courseId = course.id;
            item.appendChild(visualizeBtn);
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
          showInfoModal("Action Denied", "You can only add one course to the summer session after Grade 10.");
          return;
        }
      } else if (course.grade === 11 || course.grade === 12) {
        const summer11_12Exists = plannedCourses.some(pc => pc.delivery === 'summer' && [11, 12].includes(findCourseById(pc.id).grade));
        if (summer11_12Exists) {
          showInfoModal("Action Denied", "You can only add one course to the summer session after Grade 11.");
          return;
        }
      }
    }
    const placementGrade = (deliveryMethod === 'regular') ? targetGradeForAdding[0] : course.grade;
    addCourse(course, deliveryMethod, placementGrade);
  }

  function setupCourseSelectionModal() {
      courseSearchInput.addEventListener('input', populateCourseSelectionModal);
      document.getElementById('modal-cancel-selection').addEventListener('click', () => {
          courseSelectionModal.style.display = 'none';
      });
      modalCourseList.addEventListener('click', (e) => {
        if (e.target.matches('.visualize-prereq-btn')) {
            const courseId = e.target.dataset.courseId;
            showPrerequisiteVisualizer(courseId);
        }
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

    const visualizeBtn = detailsModal.querySelector('#details-modal-visualize');
    if (course.prerequisites && course.prerequisites.length > 0) {
        visualizeBtn.style.display = 'block';
    } else {
        visualizeBtn.style.display = 'none';
    }

    detailsModal.style.display = 'flex';
  }

  function setupDetailsModal() {
      detailsModal.querySelector('#details-modal-remove').addEventListener('click', () => {
          const courseId = detailsModal.dataset.courseId;
          removeCourse(courseId);
          detailsModal.style.display = 'none';
      });
      detailsModal.querySelector('#details-modal-visualize').addEventListener('click', () => {
          const courseId = detailsModal.dataset.courseId;
          showPrerequisiteVisualizer(courseId);
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

  function setupPrereqVisualizerModal() {
    document.getElementById('prereq-modal-close').addEventListener('click', () => {
        prereqModal.style.display = 'none';
    });
  }

  function showPrerequisiteVisualizer(courseId) {
    const course = findCourseById(courseId);
    if (!course) return;

    prereqModalTitle.textContent = `Prerequisite Path for ${course.name}`;
    const plannedIds = plannedCourses.map(pc => pc.id);
    prereqTreeContainer.innerHTML = buildPrereqTree(course, plannedIds, true);
    prereqModal.style.display = 'flex';
  }

  function buildPrereqTree(course, plannedIds, isTarget = false) {
    if (!course) return '';
  
    const statusClass = isTarget ? 'target' : plannedIds.includes(course.id) ? 'met' : 'missing';
    let childrenHtml = '';
  
    if (course.prerequisites && course.prerequisites.length > 0) {
      const childrenContent = course.prerequisites.map(prereqCondition => {
        if (prereqCondition.includes('|')) {
          const orOptions = prereqCondition.split('|');
          const orHtml = orOptions.map(id => buildPrereqTree(findCourseById(id), plannedIds)).join('');
          return `<div class="prereq-node or-group"><div class="or-group-label">OR</div><div class="prereq-children">${orHtml}</div></div>`;
        } else {
          return buildPrereqTree(findCourseById(prereqCondition), plannedIds);
        }
      }).join('');
      childrenHtml = `<div class="prereq-children">${childrenContent}</div>`;
    }
  
    return `
      <div class="prereq-node">
        <div class="prereq-course ${statusClass}">${course.name}</div>
        ${childrenHtml}
      </div>`;
  }

  function setupCustomModals() {
    confirmModalCancel.addEventListener('click', () => confirmModal.style.display = 'none');
    infoModalClose.addEventListener('click', () => infoModal.style.display = 'none');
  }

  function showInfoModal(title, message) {
    infoModalTitle.textContent = title;
    infoModalMessage.textContent = message;
    infoModal.style.display = 'flex';
  }

  function showConfirmModal(title, message, onConfirm) {
    confirmModalTitle.textContent = title;
    confirmModalMessage.textContent = message;
    confirmModal.style.display = 'flex';

    const buttonInDom = document.getElementById('confirm-modal-button');
    const newConfirmButton = buttonInDom.cloneNode(true);
    buttonInDom.parentNode.replaceChild(newConfirmButton, buttonInDom);
    
    newConfirmButton.addEventListener('click', () => {
      onConfirm();
      confirmModal.style.display = 'none';
    });
  }


  function savePlan() {
    if (plannedCourses.length === 0) {
      showInfoModal("Cannot Save", "Your plan is empty. Add some courses before saving.");
      return;
    }
    localStorage.setItem("emhsCoursePlan", JSON.stringify(plannedCourses));
    hasUnsavedChanges = false;
    showInfoModal("Success!", "Plan saved successfully to your browser!");
  }

  function loadPlan() {
    const savedPlan = localStorage.getItem("emhsCoursePlan");
    if (savedPlan) {
      showConfirmModal(
        "Load Plan", 
        "This will overwrite your current plan. Are you sure?", 
        () => {
          plannedCourses = JSON.parse(savedPlan);
          updateUI();
          hasUnsavedChanges = false;
        }
      );
    } else {
      showInfoModal("No Saved Plan", "No saved plan was found in your browser.");
    }
  }

  function resetPlan() {
    showConfirmModal(
      "Reset Plan",
      "Are you sure you want to completely reset your plan? This cannot be undone.",
      () => {
        plannedCourses = [];
        localStorage.removeItem("emhsCoursePlan");
        updateUI();
        hasUnsavedChanges = false;
      }
    );
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
        .filter(pc => (pc.placedInGrade || findCourseById(pc.id).grade) === grade)
        .map(pc => findCourseById(pc.id));
        
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