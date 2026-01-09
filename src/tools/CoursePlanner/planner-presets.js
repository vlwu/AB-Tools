import { state, findCourseById } from './planner-state.js';
import { getCompletionTime } from './planner-validation.js';

export function executePresetGeneration(uni, prog, settings) {
    const reqs = state.universityData[uni]?.programs[prog];
    if (!reqs) return [];

    const coursesToAdd = new Set();
    if (reqs.required_courses) reqs.required_courses.forEach(id => resolvePrerequisites(id, coursesToAdd));
    if (reqs.group_requirements) reqs.group_requirements.forEach(group => {
        const bestOption = group.courses[0]; 
        if (bestOption) resolvePrerequisites(bestOption, coursesToAdd);
    });

    // Mandatory High School Courses
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
        if (settings.allowSummer && course.id === 'CALM') {
            delivery = 'summer';
            placement = 10;
        } else {
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
            
            let targetSem = 1;
            if (earliestTime >= (course.grade + 0.1)) targetSem = 2; 

            // Load Balancing
            if (semLoad[`${placement}-${targetSem}`] >= 4) {
                targetSem = 2; // Push to sem 2 if full
            }
            semester = targetSem;
            
            if (course.isFullYear) {
                semester = 1; // Always start S1
                semLoad[`${placement}-1`]++; 
            } else {
                semLoad[`${placement}-${semester}`]++;
            }
        }

        newPlan.push({ id: course.id, delivery, placedInGrade: placement, semester });
    });

    return newPlan;
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