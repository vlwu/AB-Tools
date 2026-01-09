import { state, findCourseById } from './planner-state.js';
import { getCompletionTime } from './planner-validation.js';
import { courseData } from '../../shared/data/course-data.js';

export function executePresetGeneration(uni, prog, settings) {
    const reqs = state.universityData[uni]?.programs[prog];
    if (!reqs) return [];

    const coursesToAdd = new Set();
    // Add university requirements
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
    let courseObjects = Array.from(coursesToAdd).map(id => findCourseById(id)).filter(Boolean);
    
    // Simple Scheduling Logic: 4 per sem
    const semLoad = { '10-1': 0, '10-2': 0, '11-1': 0, '11-2': 0, '12-1': 0, '12-2': 0 };

    // Function to add a course to the plan
    const scheduleCourse = (course) => {
        if (newPlan.some(pc => pc.id === course.id)) return;

        let delivery = 'regular';
        let placement = course.grade;
        let semester = 1;

        if (settings.allowSummer && course.id === 'CALM') {
            delivery = 'summer';
            placement = 10;
        } else {
            // Check completion of prereqs
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
                targetSem = 2; 
            }
            semester = targetSem;
            
            if (course.isFullYear) {
                semester = 1; 
                semLoad[`${placement}-1`]++; 
                // Full year takes slot in sem 2 as well physically, 
                // but our simple counter just ensures we don't start 5 courses in sem 1.
                // ideally we increment sem 2 as well for logic.
                semLoad[`${placement}-2`]++; 
            } else {
                semLoad[`${placement}-${semester}`]++;
            }
        }
        newPlan.push({ id: course.id, delivery, placedInGrade: placement, semester });
    };

    // 1. Schedule Essentials & Reqs
    courseObjects.sort((a, b) => a.grade - b.grade);
    courseObjects.forEach(course => scheduleCourse(course));

    // 2. Fill Grade 10 Spares (Requirement: No spares in Gr 10)
    // Assuming 8 blocks total for Gr 10 (4 per sem)
    const grade10Count = semLoad['10-1'] + semLoad['10-2'];
    if (grade10Count < 8) {
        const slotsNeeded = 8 - grade10Count;
        const electives = [
            'PE10', 'CALM', // usually already added, but just in case
            'ART10', 'DRAMA10', 'MUSIC10', 'COMP10', 'FOODS10', 'DESIGN10', 'CONSTRUCT10', 'FRENCH10', 'SPANISH10', 'BIZ10'
        ];
        
        let added = 0;
        for (let eleId of electives) {
            if (added >= slotsNeeded) break;
            if (!newPlan.some(pc => pc.id === eleId)) {
                const course = findCourseById(eleId);
                if (course) {
                    scheduleCourse(course);
                    added++;
                }
            }
        }
    }

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