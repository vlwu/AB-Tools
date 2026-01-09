import { courseData } from '../../shared/data/course-data.js';

document.addEventListener("DOMContentLoaded", () => {

  let plannedCourses = [];
  let hasUnsavedChanges = false;
  let targetGradeForAdding = null;
  let targetSemesterForAdding = null; // New: track target semester
  let directDeliveryMethod = null;
  let universityData = {};
  
  // Default Settings
  let presetSettings = {
    allowSummer: true,
    fillSpares: false
  };

  const findCourseById = (id) => courseData.find(c => c.id === id);

  // Updated grade containers mapping to handle semesters
  const gradeContainers = {
    '10-1': document.getElementById("grade-10-sem-1"),
    '10-2': document.getElementById("grade-10-sem-2"),
    '11-1': document.getElementById("grade-11-sem-1"),
    '11-2': document.getElementById("grade-11-sem-2"),
    '12-1': document.getElementById("grade-12-sem-1"),
    '12-2': document.getElementById("grade-12-sem-2"),
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
    loadPlan(); // Autoload plan if exists
    if (plannedCourses.length === 0) {
        updateUI(); // Initial empty render
    }
    attachEventListeners();
  }

  // Helper to determine time value for prerequisite checking
  // Returns a number like 10.1, 10.2, 10.5 (summer), 11.1 ...
  function getCompletionTime(courseId, plannedCourse) {
      const c = findCourseById(courseId);
      if (!plannedCourse || !c) return 0;

      const grade = plannedCourse.placedInGrade || c.grade;
      
      if (plannedCourse.delivery === 'summer') {
          return grade + 0.5;
      }
      
      // If full year, it completes at end of Sem 2 (even if placed in Sem 1)
      if (c.isFullYear) {
          return grade + 0.2;
      }
      
      const sem = plannedCourse.semester || 1;
      return grade + (sem === 1 ? 0.1 : 0.2);
  }

  function getTargetTime(grade, semester, delivery) {
      if (delivery === 'summer') return grade + 0.5;
      return grade + (semester === 1 ? 0.1 : 0.2);
  }

  function renderPlanner() {
    // Clear all containers
    Object.values(gradeContainers).forEach(el => el.innerHTML = '');
    Object.values(summerContainers).forEach(el => el.innerHTML = '');

    const regularCourses = plannedCourses.filter(pc => pc.delivery !== 'summer');
    const summerCourses = plannedCourses.filter(pc => pc.delivery === 'summer');

    // Render Regular Courses
    regularCourses.forEach(pc => {
        const c = findCourseById(pc.id);
        const grade = pc.placedInGrade || c.grade;
        // Default to semester 1 if not set (legacy plan migration)
        const semester = pc.semester || 1; 
        
        const containerKey = `${grade}-${semester}`;
        if (gradeContainers[containerKey]) {
            gradeContainers[containerKey].appendChild(createCourseCard(c));
        }
    });

    // Render Summer Courses
    const summer10 = summerCourses.filter(pc => (pc.placedInGrade || findCourseById(pc.id).grade) === 10);
    const summer11_12 = summerCourses.filter(pc => [11, 12].includes(pc.placedInGrade || findCourseById(pc.id).grade));

    summer10.forEach(pc => summerContainers[10].appendChild(createCourseCard(findCourseById(pc.id))));
    summer11_12.forEach(pc => summerContainers[11].appendChild(createCourseCard(findCourseById(pc.id))));

    // Add Placeholders
    // Logic: 4 slots per semester (standard load)
    [10, 11, 12].forEach(grade => {
        [1, 2].forEach(sem => {
            const container = gradeContainers[`${grade}-${sem}`];
            const coursesInSem = regularCourses.filter(pc => 
                (pc.placedInGrade || findCourseById(pc.id).grade) === grade && 
                (pc.semester || 1) === sem
            );
            
            // Calculate slots used. Full Year courses take 1 visual slot here, logic handles load elsewhere if needed.
            // But visually, if we want to fill up to 4 blocks:
            const slotsUsed = coursesInSem.length;
            const emptySlots = 4 - slotsUsed;
            
            for(let i=0; i<emptySlots; i++) {
                container.appendChild(createPlaceholderCard([grade], 'regular', sem));
            }
        });
    });

    // Summer placeholders
    if (summer10.length === 0) summerContainers[10].appendChild(createPlaceholderCard([10], 'summer'));
    if (summer11_12.length === 0) summerContainers[11].appendChild(createPlaceholderCard([11, 12], 'summer'));
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
    if (course.isFullYear) deliveryIcon += ' (FY)';

    card.innerHTML = `
      <span class="name">${course.name}</span>
      <span class="credits">${course.credits} Credits</span>
      <span class="delivery-icon">${deliveryIcon}</span>
    `;
    card.addEventListener("click", () => onCourseClick(course));
    return card;
  }

  function createPlaceholderCard(gradesToShow, delivery = null, semester = null) {
      const placeholder = document.createElement("div");
      placeholder.className = "add-course-placeholder";
      placeholder.textContent = "+ Add";
      placeholder.addEventListener("click", () => showCourseSelectionModal(gradesToShow, delivery, semester));
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
      if (credits > 45) { // Adjusted warning threshold
        footer.classList.add('warning');
      } else {
        footer.classList.remove('warning');
      }
    });
  }


  function arePrerequisitesMet(course, targetGrade, targetSemester, targetDelivery) {
    if (!course.prerequisites || course.prerequisites.length === 0) {
      return true;
    }

    const targetTime = getTargetTime(targetGrade, targetSemester, targetDelivery);

    return course.prerequisites.every(prereqCondition => {
      // Split OR conditions
      const options = prereqCondition.split('|');
      
      // Check if ANY of the options are met in a time BEFORE targetTime
      return options.some(optionId => {
          const plannedOpt = plannedCourses.find(pc => pc.id === optionId);
          if (!plannedOpt) return false;
          
          const completion = getCompletionTime(optionId, plannedOpt);
          // Strict less than: must finish before this term starts
          return completion < targetTime;
      });
    });
  }

  function addCourse(course, deliveryMethod, placementGrade, semester) {
    if (!plannedCourses.some(pc => pc.id === course.id)) {
      plannedCourses.push({ 
          id: course.id, 
          delivery: deliveryMethod, 
          placedInGrade: placementGrade,
          semester: semester 
      });
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
    document.getElementById("load-plan").addEventListener("click", () => {
         // Manual load button
         const saved = localStorage.getItem("emhsCoursePlan");
         if(saved) {
             showConfirmModal("Load Plan", "Overwrite current plan?", () => {
                 loadPlanLogic(saved);
             });
         } else {
             showInfoModal("No Plan", "No saved plan found.");
         }
    });
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
      if (reqs.required_courses) reqs.required_courses.forEach(id => resolvePrerequisites(id, coursesToAdd));
      if (reqs.group_requirements) reqs.group_requirements.forEach(group => {
          const bestOption = group.courses[0]; 
          if (bestOption) resolvePrerequisites(bestOption, coursesToAdd);
      });

      // Mandatory
      ['ELA30-1', 'SS30-1', 'PE10', 'CALM', 'SCI10', 'MATH10C'].forEach(id => {
          if (!Array.from(coursesToAdd).some(cid => cid.includes(id.substring(0, 4)))) {
               resolvePrerequisites(id, coursesToAdd);
          }
      });

      let newPlan = [];
      const courseObjects = Array.from(coursesToAdd).map(id => findCourseById(id)).filter(Boolean);
      courseObjects.sort((a, b) => a.grade - b.grade);

      // Simple Scheduling Logic: 4 per sem
      const semLoad = { '10-1': 0, '10-2': 0, '11-1': 0, '11-2': 0, '12-1': 0, '12-2': 0 };

      courseObjects.forEach(course => {
          let delivery = 'regular';
          let placement = course.grade;
          let semester = 1;

          // Summer override for CALM
          if (presetSettings.allowSummer && course.id === 'CALM') {
              delivery = 'summer';
              placement = 10;
          } else {
              // Decide semester based on load
              // Check completion of prereqs to determine earliest sem
              let earliestTime = 0;
              if (course.prerequisites.length > 0) {
                   course.prerequisites.forEach(p => {
                       const pid = p.split('|')[0];
                       const plannedPrereq = newPlan.find(pc => pc.id === pid);
                       if(plannedPrereq) {
                           const finish = getCompletionTime(pid, plannedPrereq);
                           if (finish > earliestTime) earliestTime = finish;
                       }
                   });
              }
              
              // Earliest start:
              // if earliestTime is 10.1 (finishes S1), we can start 10.2
              // if earliestTime is 10.2 (finishes S2), we start 11.1
              
              // Default to S1 of the course's grade level, unless pushed
              let targetSem = 1;
              if (earliestTime >= (course.grade + 0.1)) targetSem = 2; // e.g. prereq finishes G.1, start G.2
              if (earliestTime >= (course.grade + 0.2)) {
                   // Prereq finishes end of year? Should have taken prereq earlier.
                   // Simple logic: just put in S2 if possible, or force S1 next year?
                   // For this simple preset generator, we assume prereqs are in previous years usually.
                   // If prereq is same year (e.g. Math 10C -> Math 20-1? No, different years)
                   // But 10C -> 20-1 is Year 10 -> Year 11.
                   // 20-1 -> 30-1 is Year 11 -> Year 12.
                   // So mostly we just balance load.
              }

              // Load Balancing
              if (semLoad[`${placement}-${targetSem}`] >= 4) {
                  targetSem = 2; // Push to sem 2 if full
              }
              semester = targetSem;
              
              if (course.isFullYear) {
                  semester = 1; // Always start S1
                  semLoad[`${placement}-1`]++; 
                  // semLoad[`${placement}-2`]++; // Ideally blocks S2 as well visually?
              } else {
                  semLoad[`${placement}-${semester}`]++;
              }
          }

          newPlan.push({ id: course.id, delivery, placedInGrade: placement, semester });
      });

      plannedCourses = newPlan;
      updateUI();
      showInfoModal("Preset Loaded", `Successfully loaded the best route for ${prog}.`);
  }

  function resolvePrerequisites(courseId, set) {
      if (set.has(courseId)) return;
      const course = findCourseById(courseId);
      if (!course) return;
      if (course.prerequisites) {
          course.prerequisites.forEach(condition => {
              const reqId = condition.split('|')[0];
              resolvePrerequisites(reqId, set);
          });
      }
      set.add(courseId);
  }


  // --- MODAL MANAGEMENT ---
  function showCourseSelectionModal(grades, delivery = null, semester = null) {
    targetGradeForAdding = grades;
    targetSemesterForAdding = semester;
    directDeliveryMethod = delivery;
    courseSearchInput.value = '';
    populateCourseSelectionModal();
    courseSelectionModal.style.display = "flex";
  }

  function populateCourseSelectionModal() {
    modalCourseList.innerHTML = '';
    const plannedIds = plannedCourses.map(pc => pc.id);
    const searchTerm = courseSearchInput.value.toLowerCase();

    // Use specific target grade (e.g. 10) and semester (e.g. 2)
    const tGrade = targetGradeForAdding[0]; 
    const tSem = targetSemesterForAdding || 1;
    const tDelivery = directDeliveryMethod || 'regular';

    const availableCourses = courseData.filter(course => {
      // Basic Grade Filter (Relaxed: allow taking Grade 11 course in Grade 12, etc)
      // But usually user clicks "Grade 10" -> expects Grade 10 courses.
      // Let's stick to the container's grade rule
      const gradeMatch = targetGradeForAdding.includes(course.grade);
      
      const searchMatch = (course.name.toLowerCase().includes(searchTerm) || course.category.toLowerCase().includes(searchTerm) || course.id.toLowerCase().includes(searchTerm));
      const isAlreadyPlanned = plannedIds.includes(course.id);

      if (isAlreadyPlanned || !gradeMatch || !searchMatch) {
          return false;
      }
      
      if (tDelivery === 'summer') {
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
      if (category === 'Science-30') category = 'Science';
      if (!acc[category]) acc[category] = [];
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

        // PREREQUISITE CHECK
        // We pass the specific time we are trying to add this course to.
        const isMet = arePrerequisitesMet(course, tGrade, tSem, tDelivery);
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
            if (e.target.matches('.visualize-prereq-btn')) return;
            courseSelectionModal.style.display = 'none';
            handleDirectCourseAdd(course, tDelivery, tGrade, tSem);
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

  function handleDirectCourseAdd(course, deliveryMethod, grade, semester) {
    if (deliveryMethod === 'summer') {
        // ... (existing summer validation logic)
    }
    addCourse(course, deliveryMethod, grade, semester);
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
    
    // Add semester info
    if (plannedCourse.delivery !== 'summer') {
        deliveryText += ` (Sem ${plannedCourse.semester || 1})`;
    }
    
    detailsModal.querySelector('#details-modal-status').textContent = `Planned: ${deliveryText}`;

    // ... (rest of details modal setup)
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
      // ...
      detailsModal.querySelector('#details-modal-close').addEventListener('click', () => {
          detailsModal.style.display = 'none';
      });
  }

  // ... (rest of helper functions like showPrerequisiteVisualizer, modals, savePlan, exportPlan)
  
  function savePlan() {
    if (plannedCourses.length === 0) {
      showInfoModal("Cannot Save", "Your plan is empty.");
      return;
    }
    localStorage.setItem("emhsCoursePlan", JSON.stringify(plannedCourses));
    hasUnsavedChanges = false;
    showInfoModal("Success!", "Plan saved successfully!");
  }

  function loadPlan() {
      const saved = localStorage.getItem("emhsCoursePlan");
      if(saved) loadPlanLogic(saved);
  }

  function loadPlanLogic(savedPlan) {
      let loaded = JSON.parse(savedPlan);
      // Migration: If no semester, default to 1
      loaded = loaded.map(pc => {
          if (!pc.semester && pc.delivery !== 'summer') {
              pc.semester = 1; 
          }
          return pc;
      });
      plannedCourses = loaded;
      updateUI();
  }

  function resetPlan() {
      showConfirmModal("Reset Plan", "Are you sure?", () => {
          plannedCourses = [];
          localStorage.removeItem("emhsCoursePlan");
          updateUI();
      });
  }
  
  // Basic exports
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
    return `<div class="prereq-node"><div class="prereq-course ${statusClass}">${course.name}</div>${childrenHtml}</div>`;
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
      
      [1, 2].forEach(sem => {
           doc.setFontSize(12);
           doc.text(`Semester ${sem}`, 10, y);
           y += 6;
           doc.setFontSize(10);
           
           const courses = plannedCourses.filter(pc => 
               pc.delivery !== 'summer' && 
               (pc.placedInGrade || findCourseById(pc.id).grade) === grade &&
               (pc.semester || 1) === sem
           );
           
           if(courses.length === 0) {
               doc.text("- No courses", 15, y);
               y += 6;
           } else {
               courses.forEach(pc => {
                   const c = findCourseById(pc.id);
                   doc.text(`- ${c.name}`, 15, y);
                   y += 6;
               });
           }
           y += 2;
      });
      
      const summer = plannedCourses.filter(pc => pc.delivery === 'summer' && (pc.placedInGrade || findCourseById(pc.id).grade) === grade);
      if(summer.length > 0) {
          doc.setFontSize(12);
          doc.text("Summer", 10, y);
          y += 6;
          doc.setFontSize(10);
          summer.forEach(pc => {
               const c = findCourseById(pc.id);
               doc.text(`- ${c.name}`, 15, y);
               y += 6;
          });
      }
      y += 5;
    });
    doc.save("emhs-course-plan.pdf");
  }

  init();
});