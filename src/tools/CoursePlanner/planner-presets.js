import { state, findCourseById } from './planner-state.js';
import { getCompletionTime } from './planner-validation.js';
import { courseData } from '../../shared/data/course-data.js';

export function executePresetGeneration(uni, prog, settings) {
    const reqs = state.universityData[uni]?.programs[prog];
    if (!reqs) return [];

    // Map of Standard Course ID -> AP Course ID
    const AP_ALTERNATIVES = {
        'BIO20': 'AP-BIO20-30',
        'BIO30': 'AP-BIO20-30',
        'PHY20': 'AP-PHYS20-25',
        'MATH30-1': 'MATH30-1-31',
        'MATH31': 'MATH30-1-31',
        'CHEM30': 'AP-CHEM30',
        'ELA30-1': 'ELA30-1-35'
    };

    const coursesToAdd = new Set();
    
    // Helper to add a course ID, swapping for AP if setting is enabled
    const addId = (id) => {
        let finalId = id;
        if (settings.includeAP && AP_ALTERNATIVES[id]) {
            finalId = AP_ALTERNATIVES[id];
        }
        resolvePrerequisites(finalId, coursesToAdd, settings.includeAP ? AP_ALTERNATIVES : {});
    };

    // Add university requirements
    if (reqs.required_courses) reqs.required_courses.forEach(id => addId(id));
    if (reqs.group_requirements) reqs.group_requirements.forEach(group => {
        const bestOption = group.courses[0]; 
        if (bestOption) addId(bestOption);
    });

    // Mandatory High School Courses
    ['ELA30-1', 'SS30-1', 'PE10', 'CALM', 'SCI10', 'MATH10C'].forEach(id => {
        // Check if the base requirement is met by existing set (standard or AP variant)
        const isMet = Array.from(coursesToAdd).some(cid => {
            if (cid === id) return true;
            if (settings.includeAP && AP_ALTERNATIVES[id] === cid) return true;
            return cid.includes(id.substring(0, 4));
        });

        if (!isMet) {
            addId(id);
        }
    });

    let newPlan = [];
    let courseObjects = Array.from(coursesToAdd).map(id => findCourseById(id)).filter(Boolean);
    
    // --- Grade 10 Filling Logic ---
    // 1. Separate Gr10 courses from Gr11/12
    const grade10Courses = courseObjects.filter(c => c.grade === 10);
    const seniorCourses = courseObjects.filter(c => c.grade > 10);

    // 2. Determine Program Type for Smart Electives
    const progLower = prog.toLowerCase();
    let electivePool = [];
    
    // Default Pool (Mixture)
    const defaultPool = ['ART10', 'DRAMA10', 'COMP10', 'BIZ10', 'FOODS10', 'CONSTRUCT10'];

    if (progLower.includes('engineer') || progLower.includes('computer') || progLower.includes('science') || progLower.includes('math')) {
        // STEM Focus
        electivePool = ['COMP10', 'DESIGN10', 'CONSTRUCT10', 'BIZ10', 'SPORTSMED10'];
    } else if (progLower.includes('art') || progLower.includes('design') || progLower.includes('music') || progLower.includes('drama')) {
        // Arts Focus
        electivePool = ['ART10', 'DRAMA10', 'MUSIC10', 'FASHION10', 'DESIGN10'];
    } else if (progLower.includes('business') || progLower.includes('commerce') || progLower.includes('manage')) {
        // Business Focus
        electivePool = ['BIZ10', 'LEGAL10', 'COMP10', 'DESIGN10'];
    } else {
        electivePool = defaultPool;
    }
    // Fallback if specific pool exhausted
    electivePool = [...new Set([...electivePool, ...defaultPool])];

    // 3. Fill Grade 10 to 8 blocks
    // Calculate current blocks: Full Year = 2, Standard = 1
    let currentBlocks = grade10Courses.reduce((sum, c) => sum + (c.isFullYear ? 2 : 1), 0);
    const targetBlocks = 8; // Mandatory full load for Grade 10

    for (let eleId of electivePool) {
        if (currentBlocks >= targetBlocks) break;
        
        // Don't add if already in plan or if it's a variant already there
        const alreadyExists = grade10Courses.some(c => c.id === eleId);
        
        if (!alreadyExists) {
            const eleCourse = findCourseById(eleId);
            if (eleCourse) {
                grade10Courses.push(eleCourse);
                currentBlocks += eleCourse.isFullYear ? 2 : 1;
                // Add to main set for tracking
                coursesToAdd.add(eleId);
            }
        }
    }

    // --- Scheduling Logic ---
    
    // Helper to calculate completion time for prereq checks
    const getFinishedTime = (id) => {
        const p = newPlan.find(pc => pc.id === id);
        return p ? getCompletionTime(id, p) : 0;
    };

    // Helper to schedule a specific list of courses for a specific grade
    const scheduleForGrade = (courses, gradeLevel) => {
        // Sort by prereq depth roughly (10s before 20s usually handled by grade split, 
        // but within grade, just standard sort or specific logic if needed)
        // For simple presets, standard sort is usually fine.
        
        let sem1Load = 0;
        let sem2Load = 0;
        const targetPerSem = Math.ceil(courses.reduce((sum, c) => sum + (c.isFullYear ? 2 : 1), 0) / 2);
        
        courses.forEach(course => {
            let delivery = 'regular';
            let placement = gradeLevel;
            let semester = 1;

            if (settings.allowSummer && course.id === 'CALM' && gradeLevel === 10) {
                delivery = 'summer';
                newPlan.push({ id: course.id, delivery, placedInGrade: 10, semester: null });
                return;
            }

            // Prerequisite check
            let earliestTime = 0;
            if (course.prerequisites.length > 0) {
                course.prerequisites.forEach(p => {
                    const pid = p.split('|')[0];
                    const finish = getFinishedTime(pid);
                    if (finish > earliestTime) earliestTime = finish;
                });
            }

            // Determine Semester
            let targetSem = 1;
            
            // If prereq finishes after start of sem 1 (e.g. 10.2 > 10.1 is false, but 10.2 > 11.1 is false)
            // Time logic: Grade 10 Sem 1 = 10.1. Prereq finish 10.2 means ready for 11.1.
            // If prereq finish (e.g. 10.2) >= Current Grade + 0.1 (11.1), then we can't do Sem 1.
            if (earliestTime >= (gradeLevel + 0.1)) {
                targetSem = 2;
            }

            // Load Balancing
            // If Grade 10, fill Sem 1 to 4 then spill to Sem 2.
            // If Grade 11/12, use the calculated target balance (spread out spares).
            
            if (gradeLevel === 10) {
                // Strict 4-block cap for Sem 1
                if (targetSem === 1 && sem1Load >= 4) targetSem = 2;
            } else {
                // Balanced cap for Sem 1
                if (targetSem === 1 && sem1Load >= targetPerSem) targetSem = 2;
            }

            // Assign
            semester = targetSem;
            
            if (course.isFullYear) {
                semester = 1; // Always start sem 1
                sem1Load++;
                sem2Load++;
            } else {
                if (semester === 1) sem1Load++;
                else sem2Load++;
            }
            
            newPlan.push({ id: course.id, delivery, placedInGrade: placement, semester });
        });
    };

    scheduleForGrade(grade10Courses, 10);
    
    // Sort seniors by grade then name
    const g11 = seniorCourses.filter(c => c.grade === 11);
    const g12 = seniorCourses.filter(c => c.grade === 12);
    
    scheduleForGrade(g11, 11);
    scheduleForGrade(g12, 12);

    return newPlan;
}

function resolvePrerequisites(courseId, set, apMap = {}) {
    if (set.has(courseId)) return;
    const course = findCourseById(courseId);
    if (!course) return;
    
    // Add current course
    set.add(courseId);

    if (course.prerequisites) {
        course.prerequisites.forEach(condition => {
            let reqId = condition.split('|')[0];
            if (apMap[reqId]) {
                reqId = apMap[reqId];
            }
            resolvePrerequisites(reqId, set, apMap);
        });
    }
}