import { findCourseById, state } from './planner-state.js';

// Helper to determine time value for prerequisite checking
// Returns a number like 10.1 (Grade 10 Sem 1), 10.5 (Summer), 11.2 (Grade 11 Sem 2)
export function getCompletionTime(courseId, plannedCourse) {
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

export function getTargetTime(grade, semester, delivery) {
    if (delivery === 'summer') return grade + 0.5;
    return grade + (semester === 1 ? 0.1 : 0.2);
}

export function arePrerequisitesMet(course, targetGrade, targetSemester, targetDelivery) {
  if (!course.prerequisites || course.prerequisites.length === 0) {
    return true;
  }

  const targetTime = getTargetTime(targetGrade, targetSemester, targetDelivery);

  return course.prerequisites.every(prereqCondition => {
    // Split OR conditions
    const options = prereqCondition.split('|');
    
    // Check if ANY of the options are met in a time BEFORE targetTime
    return options.some(optionId => {
        const plannedOpt = state.plannedCourses.find(pc => pc.id === optionId);
        if (!plannedOpt) return false;
        
        const completion = getCompletionTime(optionId, plannedOpt);
        // Strict less than: must finish before this term starts
        return completion < targetTime;
    });
  });
}

export function checkGradRequirements() {
  const plannedCourseObjects = state.plannedCourses.map(pc => findCourseById(pc.id));
  
  const reqs = {
    'ELA-30': { label: 'ELA 30-1 or 30-2', met: false },
    'Social-30': { label: 'Social 30-1 or 30-2', met: false },
    'Math-20': { label: 'Math 20-level', met: false },
    'Science-20': { label: 'Science 20-level', met: false },
    'PE10': { label: 'Physical Education 10', met: false },
    'CALM': { label: 'CALM (Career and Life Management)', met: false },
    'Option-10': { label: '10 Credits (Any combination of electives)', met: false },
    'Option-30': { label: '10 Credits (30-level other than ELA 30 & Social Studies 30)', met: false },
  };

  reqs['ELA-30'].met = plannedCourseObjects.some(c => c.category === 'ELA-30');
  reqs['Social-30'].met = plannedCourseObjects.some(c => c.category === 'Social-30');
  reqs['Math-20'].met = plannedCourseObjects.some(c => c.category === 'Math' && ['MATH20-1', 'MATH20-2', 'MATH20-3'].includes(c.id));
  reqs['Science-20'].met = plannedCourseObjects.some(c => c.category === 'Science' && ['SCI20', 'BIO20', 'CHEM20', 'PHY20'].includes(c.id));
  reqs['PE10'].met = plannedCourseObjects.some(c => c.id === 'PE10');
  reqs['CALM'].met = plannedCourseObjects.some(c => c.id === 'CALM');

  const optionCredits = plannedCourseObjects
      .filter(c => !['ELA', 'Social', 'Math', 'Science', 'PE', 'CALM', 'ELA-30', 'Social-30'].includes(c.category))
      .reduce((sum, c) => sum + c.credits, 0);
  reqs['Option-10'].met = optionCredits >= 10;

  const thirtyLevelCredits = plannedCourseObjects
      .filter(c => c.name.includes('30') || c.id.includes('31'))
      .reduce((sum, c) => sum + c.credits, 0);
  reqs['Option-30'].met = thirtyLevelCredits >= 10;

  return reqs;
}

export function calculateCredits() {
    return state.plannedCourses.reduce((sum, pc) => sum + findCourseById(pc.id).credits, 0);
}