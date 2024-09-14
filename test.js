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
let userAnswers = {};
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

            document.getElementById('testDates').textContent = `Тест доступен с ${startDate.toLocaleDateString()} по ${endDate.toLocaleDateString()}`;

            if (!testStarted || testEnded) {
                document.getElementById('startTestButton').disabled = true;
                alert('The test is not currently available.');
            } else {
                document.querySelector('.intro-card').style.display = 'block';
            }
        } else {
            alert('Срок выполнения теста истек!');
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
        alert('Заполните все поля!');
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
            alert('Вы уже сдавали тест, повторно нельзя!');
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
            shuffleArray(questions); // Перемешиваем вопросы
            questions.forEach(q => shuffleArray(q.choices)); // Перемешиваем варианты ответов для каждого вопроса
            startQuestionTimer();
            displayQuestion();
            document.getElementById('nextButton').style.display = 'block';
        } else {
            alert('No questions available.');
        }
    });
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Обмен элементов
    }
}

function startQuestionTimer() {
    clearInterval(timerInterval);
    const question = questions[currentQuestionIndex];
    const timeInSeconds = question.timeInSeconds || 0;
    let timer = timeInSeconds;
    timerInterval = setInterval(() => {
        timer--;
        document.getElementById('timerDisplay').textContent = `Осталось: ${timer} секунд`;
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
    
    // Добавляем описание выбора (choicesDesc) и чекбоксы для вариантов ответов
    card.innerHTML =
        `<div class="card-body">
            <h5 class="card-title">Вопрос ${currentQuestionIndex + 1}: ${question.text}</h5>
            <p id="choicesDesc">${question.choicesDesc}</p>  <!-- Добавляем описание под вопросом -->
            <p id="timerDisplay">Осталось: ${question.timeInSeconds} секунд</p>
            ${question.choices.map((choice, i) =>
            `<div class="form-check">
                <input class="form-check-input" type="checkbox" name="question${question.id}" id="choice${question.id}_${i}" value="${i}">
                <label class="form-check-label" for="choice${question.id}_${i}" ${choice.isCorrect ? 'data-correct="true"' : ''}>
                    ${choice.text}
                </label>
            </div>`
        ).join('')}
        </div>`;
    
    questionContainer.appendChild(card);
    card.style.display = 'block';

    if (currentQuestionIndex === questions.length - 1) {
        document.getElementById('nextButton').textContent = 'Завершить';
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
    const selectedChoices = document.querySelectorAll(`input[name="question${question.id}"]:checked`);

    if (selectedChoices.length > 0) {
        // Собираем выбранные ответы
        const selectedAnswers = Array.from(selectedChoices).map(choice => parseInt(choice.value));

        // Проверяем правильность: сравниваем выбранные ответы с правильными
        let isCorrect = selectedAnswers.every(index => question.choices[index].isCorrect) &&
                        selectedAnswers.length === question.choices.filter(c => c.isCorrect).length;

        if (isCorrect) {
            correctAnswers++;
        }

        // Сохраняем выбранные ответы
        const selectedTextAnswers = selectedAnswers.map(index => question.choices[index].text);
        userAnswers[question.id] = selectedTextAnswers; // Сохраняем выбранные ответы (текст)

    } else {
        userAnswers[question.id] = null; // Если ничего не выбрано
    }

    // Переход к следующему вопросу или завершение теста
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
    const resultData = {
        userInfo,
        score: correctAnswers,
        totalQuestions: questions.length,
        userAnswers,  // Сохраняем текстовые значения выбранных ответов
        timestamp: new Date().toISOString()
    };

    //('Saving results:', resultData); // Логируем данные перед сохранением

    resultsRef.set(resultData)
        .then(() => console.log('Results saved successfully'))
        .catch(error => console.error('Error saving results:', error));
}


function showResults() {
    document.getElementById('questionsContainer').innerHTML = '';
    document.getElementById('nextButton').style.display = 'none';
    const resultCard = document.querySelector('.result-card');
    const resultChart = document.getElementById('resultChart');
    const resultSummary = document.getElementById('resultSummary');
    
    // Создание SVG для круговой диаграммы
    const svgNamespace = "http://www.w3.org/2000/svg";
    const radius = 100;
    const circumference = 2 * Math.PI * radius;
    const strokeWidth = 20;
    const progress = (correctAnswers / questions.length) * 100;

    // Создаем SVG элемент
    const svg = document.createElementNS(svgNamespace, 'svg');
    svg.setAttribute('viewBox', `0 0 ${radius * 2} ${radius * 2}`);
    
    // Создаем круг для прогресса
    const circleBackground = document.createElementNS(svgNamespace, 'circle');
    circleBackground.setAttribute('cx', radius);
    circleBackground.setAttribute('cy', radius);
    circleBackground.setAttribute('r', radius - strokeWidth / 2);
    circleBackground.setAttribute('stroke', '#adb5bd');
    circleBackground.setAttribute('stroke-width', strokeWidth);
    circleBackground.setAttribute('fill', 'none');
    svg.appendChild(circleBackground);
    
    const circleProgress = document.createElementNS(svgNamespace, 'circle');
    circleProgress.setAttribute('cx', radius);
    circleProgress.setAttribute('cy', radius);
    circleProgress.setAttribute('r', radius - strokeWidth / 2);
    circleProgress.setAttribute('stroke', '#28a745');
    circleProgress.setAttribute('stroke-width', strokeWidth);
    circleProgress.setAttribute('fill', 'none');
    circleProgress.setAttribute('stroke-dasharray', circumference);
    circleProgress.setAttribute('stroke-dashoffset', circumference - (progress / 100) * circumference);
    svg.appendChild(circleProgress);
    
    resultChart.appendChild(svg);

    // Устанавливаем текст резульатов
    resultSummary.textContent = `${correctAnswers} из ${questions.length}`;
    resultCard.style.display = 'block';
}
