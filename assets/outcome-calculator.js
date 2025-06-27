function createCalculator(containerId, outcomes, examWeight = 0) {
  const container = document.getElementById(containerId);
  container.innerHTML = ''; // Clear any existing content

  outcomes.forEach(({ id, label, weight }) => {
    container.innerHTML += `
      <label for="${id}">${label} [${weight}%]</label>
      <input type="number" min="0" max="100" id="${id}" data-weight="${weight}">
    `;
  });

  if (examWeight > 0) {
    container.innerHTML += `
      <label for="finalExam">Final Exam (${examWeight}%)</label>
      <input type="number" min="0" max="100" id="finalExam">
    `;
  }

  container.innerHTML += `
    <button onclick="calculateGrade(${examWeight})">Calculate</button>
    <p id="output"></p>
  `;
}

function calculateGrade(examWeight) {
  const inputs = document.querySelectorAll("input[type='number']");
  let totalWeighted = 0;
  let totalWeight = 0;

  inputs.forEach(input => {
    if (input.id === "finalExam") return; // handled separately
    const value = parseFloat(input.value);
    const weight = parseFloat(input.dataset.weight);
    if (!isNaN(value)) {
      totalWeighted += value * weight;
      totalWeight += weight;
    }
  });

  if (totalWeight === 0) {
    document.getElementById("output").innerText = `Please enter at least one outcome grade.`;
    return;
  }

  const courseAverage = totalWeighted / totalWeight;

  const finalExamInput = document.getElementById("finalExam");
  if (examWeight > 0 && finalExamInput && finalExamInput.value !== "") {
    const finalExamScore = parseFloat(finalExamInput.value);
    if (!isNaN(finalExamScore)) {
      const finalGrade = (
        courseAverage * ((100 - examWeight) / 100) +
        finalExamScore * (examWeight / 100)
      ).toFixed(1);
      document.getElementById("output").innerText = `Final Grade (with Exam): ${finalGrade}%`;
      return;
    }
  }

  document.getElementById("output").innerText = `Course Grade (without Exam): ${courseAverage.toFixed(1)}%`;
}
