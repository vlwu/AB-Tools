import { courseData } from '../../shared/data/course-data.js';

export const state = {
  plannedCourses: [],
  universityData: {},
  hasUnsavedChanges: false
};

export const findCourseById = (id) => courseData.find(c => c.id === id);

export function addCourseToState(course, deliveryMethod, placementGrade, semester) {
  // Fix: Force full-year courses to always start in Semester 1 to ensure mirroring logic works
  if (course.isFullYear) {
      semester = 1;
  }

  if (!state.plannedCourses.some(pc => pc.id === course.id)) {
    state.plannedCourses.push({ 
        id: course.id, 
        delivery: deliveryMethod, 
        placedInGrade: placementGrade,
        semester: semester 
    });
    state.hasUnsavedChanges = true;
    return true;
  }
  return false;
}

export function removeCourseFromState(courseId) {
  state.plannedCourses = state.plannedCourses.filter(pc => pc.id !== courseId);
  state.hasUnsavedChanges = true;
}

export function savePlanToStorage() {
  if (state.plannedCourses.length === 0) return false;
  localStorage.setItem("emhsCoursePlan", JSON.stringify(state.plannedCourses));
  state.hasUnsavedChanges = false;
  return true;
}

export function loadPlanFromStorage(manualData = null) {
  const data = manualData || localStorage.getItem("emhsCoursePlan");
  if (!data) return false;

  let loaded = JSON.parse(data);
  // Migration: If no semester, default to 1
  loaded = loaded.map(pc => {
      if (!pc.semester && pc.delivery !== 'summer') {
          pc.semester = 1; 
      }
      return pc;
  });
  state.plannedCourses = loaded;
  state.hasUnsavedChanges = true;
  return true;
}

export function resetPlanState() {
  state.plannedCourses = [];
  localStorage.removeItem("emhsCoursePlan");
  state.hasUnsavedChanges = false;
}

export async function fetchUniversityData() {
  try {
    const response = await fetch('../../shared/data/university_requirements.json');
    if (!response.ok) throw new Error('Network response was not ok.');
    state.universityData = await response.json();
  } catch (error) {
    console.error('Failed to fetch university data:', error);
  }
}