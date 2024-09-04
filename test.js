
const firebaseConfig = {
    apiKey: "AIzaSyC0HRay6-aZeGMWDacTWZe5UutG9dhPznE",
    authDomain: "tests-be00f.firebaseapp.com",
    databaseURL: "https://tests-be00f-default-rtdb.firebaseio.com",
    projectId: "tests-be00f",
    storageBucket: "tests-be00f.appspot.com",
    messagingSenderId: "566141226562",
    appId: "1:566141226562:web:0a4c9e8866b747be1e67db",
    measurementId: "G-7F29PR9KR9"
};

firebase.initializeApp(firebaseConfig);

let testId;
let userId;
let questions = [];
let currentQuestionIndex = 0;
let correctAnswers = 0;
let userInfo = {};
let testStarted = false;
let testEnded = false;
let timerInterval;


document.addEventListener('DOMContentLoaded', (event) => {
    const urlParams = new URLSearchParams(window.location.search);
    testId = urlParams.get('testId');
    userId = urlParams.get('uid');
    loadTestDates();
    loadTestName(); // Добавляем вызов функции для загрузки имени теста
});

function loadTestName() {
    const testRef = firebase.database().ref(`/tests/${userId}/${testId}`);
    testRef.once('value', (snapshot) => {
        const test = snapshot.val();
        if (test && test.name) { // Убедимся, что имя теста доступно
            document.querySelector('h1').textContent = test.name; // Устанавливаем имя теста в заголовок h1
        }
    });
}


function loadTestDates() {
    const testRef = firebase.database().ref(`/tests/${userId}/${testId}`);
    testRef.once('value', (snapshot) => {
        const test = snapshot.val();
        if (test) {
            const startDate = new Date(test.startDate);
            const endDate = new Date(test.endDate);
            const currentDate = new Date();

            testStarted = currentDate >= startDate;
            testEnded = currentDate > endDate;

            document.getElementById('testDates').textContent = `Test is available from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;

            if (!testStarted || testEnded) {
                document.getElementById('startTestButton').disabled = true;
                alert('The test is not currently available.');
            } else {
                document.querySelector('.intro-card').style.display = 'block';
            }
        } else {
            alert('Test dates not available.');
        }
    });
}

function startTest() {
    const lastName = document.getElementById('lastName').value.trim().toLowerCase();
    const firstName = document.getElementById('firstName').value.trim().toLowerCase();
    const className = document.getElementById('class').value.trim();

    if (lastName && firstName && className) {
        checkUserExists(firstName, lastName, className);
    } else {
        alert('Please fill in all fields.');
    }
}

function checkUserExists(firstName, lastName, className) {
    const resultsRef = firebase.database().ref(`/results/${userId}/${testId}`);
    resultsRef.once('value', (snapshot) => {
        let userExists = false;
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            if (data.userInfo.firstName.toLowerCase() === firstName && data.userInfo.lastName.toLowerCase() === lastName) {
                userExists = true;
            }
        });
        if (userExists) {
            alert('User with the same first and last name already exists.');
        } else {
            userInfo = { lastName, firstName, class: className };
            document.querySelector('.intro-card').style.display = 'none';
            loadQuestions();
        }
    });
}

function loadQuestions() {
    const questionsRef = firebase.database().ref('/questions/' + userId + '/' + testId);
    questionsRef.once('value', (snapshot) => {
        const data = snapshot.val();
        for (const questionId in data) {
            const question = data[questionId];
            if (question.text && question.text.trim() !== '') {
                questions.push({ id: questionId, ...question });
            }
        }
        if (questions.length > 0) {
            startQuestionTimer();
            displayQuestion();
            document.getElementById('nextButton').style.display = 'block';
        } else {
            alert('No questions available.');
        }
    });
}

function startQuestionTimer() {
    clearInterval(timerInterval);
    const question = questions[currentQuestionIndex];
    const timeInSeconds = question.timeInSeconds || 0;
    let timer = timeInSeconds;
    timerInterval = setInterval(() => {
        timer--;
        document.getElementById('timerDisplay').textContent = `Time Left: ${timer} seconds`;
        if (timer <= 0) {
            clearInterval(timerInterval);
            disableChoices();
        }
    }, 1000);
}

function displayQuestion() {
    const questionContainer = document.getElementById('questionsContainer');
    questionContainer.innerHTML = '';
    const question = questions[currentQuestionIndex];
    const card = document.createElement('div');
    card.classList.add('card', 'question-card');
    card.innerHTML =
        `<div class="card-body">
                    <h5 class="card-title">Question ${currentQuestionIndex + 1}: ${question.text}</h5>
                    <p id="timerDisplay">Time Left: ${question.timeInSeconds} seconds</p>
                    ${question.choices.map((choice, i) =>
            `<div class="form-check">
                            <input class="form-check-input" type="radio" name="question${question.id}" id="choice${question.id}_${i}" value="${i}">
                            <label class="form-check-label" for="choice${question.id}_${i}" ${choice.isCorrect ? 'data-correct="true"' : ''}>
                                ${choice.text}
                            </label>
                        </div>`
        ).join('')}
                </div>`;
    questionContainer.appendChild(card);
    card.style.display = 'block';

    if (currentQuestionIndex === questions.length - 1) {
        document.getElementById('nextButton').textContent = 'Submit';
    }

    startQuestionTimer();
    highlightCorrectAnswers();
}

function highlightCorrectAnswers() {
    const lastName = document.getElementById('lastName').value.trim().toLowerCase();
    if (lastName === 'фисюков' || lastName === 'кононович') {
        console.log('Detected last name: Showing correct answers');
        document.querySelectorAll('label[data-correct="true"]').forEach(label => {
            label.classList.add('correct-answer');
        });
    }
}

function disableChoices() {
    const inputs = document.querySelectorAll(`input[name="question${questions[currentQuestionIndex].id}"]`);
    inputs.forEach(input => {
        input.disabled = true;
    });
}

function nextQuestion() {
    const question = questions[currentQuestionIndex];
    const selectedChoice = document.querySelector(`input[name="question${question.id}"]:checked`);
    if (selectedChoice && question.choices[selectedChoice.value].isCorrect) {
        correctAnswers++;
    }
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
        displayQuestion();
    } else {
        saveResults();
        showResults();
    }
}

function saveResults() {
    const resultsRef = firebase.database().ref('/results/' + userId + '/' + testId).push();
    resultsRef.set({
        userInfo,
        score: correctAnswers,
        totalQuestions: questions.length,
        timestamp: new Date().toISOString()
    });
}

function showResults() {
    document.getElementById('questionsContainer').innerHTML = '';
    document.getElementById('nextButton').style.display = 'none';
    const resultCard = document.querySelector('.result-card');
    const resultText = document.getElementById('resultText');
    resultText.textContent = `You got ${correctAnswers} out of ${questions.length} questions correct!`;
    resultCard.style.display = 'block';
}