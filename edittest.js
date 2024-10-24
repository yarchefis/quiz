
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

let currentUser;
let testId;
let testCode;

firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        currentUser = user;
        
        // Получаем параметры URL
        const urlParams = new URLSearchParams(window.location.search);
        testId = urlParams.get('testId');
        
        // Загружаем testCode по пути tests/uid/testid/testCode
        firebase.database().ref(`/tests/${currentUser.uid}/${testId}/testCode`).once('value')
            .then((snapshot) => {
                const testCode = snapshot.val();
                if (testCode) {
                    console.log("Test Code: ", testCode); // Пример использования testCode
                } else {
                    console.log('testCode не найден');
                }
            })
            .catch((error) => {
                console.error('Ошибка при получении testCode:', error);
            });
        
        // Загрузка названия теста по пути tests/uid/testid/name
        firebase.database().ref(`/tests/${currentUser.uid}/${testId}/name`).once('value')
            .then((snapshot) => {
                const testName = snapshot.val();
                if (testName) {
                    document.getElementById('testName').textContent = testName; // Вставляем название теста
                } else {
                    document.getElementById('testName').textContent = 'Название теста не найдено';
                }
            }).catch((error) => {
                console.error('Ошибка при получении данных теста:', error);
                document.getElementById('testName').textContent = 'Ошибка загрузки названия теста';
            });

        loadQuestions();
        generateTestLink();
        loadTestResults(currentUser.uid, testId);
        loadTestDates();
    }
});




function showQuestionModal(type, questionId = null) {
    document.getElementById('questionForm').reset();
    document.getElementById('currentQuestionId').value = questionId;

    document.getElementById('questionChoices').style.display = 'none';
    document.getElementById('yesnoChoices').style.display = 'none';

    if (type === 'test') {
        document.getElementById('questionChoices').style.display = 'block';
    } else if (type === 'yesno') {
        document.getElementById('yesnoChoices').style.display = 'block';
    }

    if (questionId) {
        const questionRef = firebase.database().ref('/questions/' + currentUser.uid + '/' + testId + '/' + questionId);
        questionRef.once('value', (snapshot) => {
            const question = snapshot.val();
            document.getElementById('questionText').value = question.text;

            if (type === 'test') {
                // Заполнение вариантов ответа
                question.choices.forEach((choice, index) => {
                    if (index < 4) { // Предполагается максимум 4 варианта ответа
                        document.getElementById('choice' + (index + 1)).value = choice.text;
                        document.getElementById('isCorrect' + (index + 1)).checked = choice.isCorrect;
                    }
                });
            } else if (type === 'yesno') {
                // Заполнение вариантов ответа для типа yesno
                document.getElementById('yes').checked = question.choices[0].isCorrect;
                document.getElementById('no').checked = !question.choices[0].isCorrect;
            }
            document.getElementById('timeInSeconds').value = question.timeInSeconds || '';
        });
    }

    const modal = new bootstrap.Modal(document.getElementById('questionModal'));
    modal.show();
}






function showQuestionTypeModal(questionId = null) {
    document.getElementById('questionForm').reset();
    document.getElementById('currentQuestionId').value = questionId;

    const modal = new bootstrap.Modal(document.getElementById('questionTypeModal'));
    modal.show();
}

function handleQuestionTypeSelection() {
    const selectedType = document.getElementById('questionType').value;
    showQuestionModal(selectedType, document.getElementById('currentQuestionId').value);
}



function saveQuestion() {
    const questionText = document.getElementById('questionText').value.trim();
    const timeInSeconds = document.getElementById('timeInSeconds').value;
    const questionId = document.getElementById('currentQuestionId').value || firebase.database().ref().child('questions').push().key;

    // Получаем тип вопроса
    const questionType = document.getElementById('questionType').value || 
        (document.getElementById('questionChoices').style.display === 'block' ? 'test' : 'yesno');

    // Проверка на заполнение обязательных полей
    if (!questionText || !timeInSeconds) {
        alert('Пожалуйста, заполните все обязательные поля.');
        return;
    }

    // Структура данных вопроса
    let questionData = {
        text: questionText,
        createdAt: new Date().toISOString(),
        type: questionType,
        timeInSeconds: parseInt(timeInSeconds, 10) || null // Проверка на пустое значение времени
    };

    // Проверяем, если это вопрос типа 'test'
    if (questionType === 'test') {
        const choices = [
            {
                text: document.getElementById('choice1').value.trim(),
                isCorrect: document.getElementById('isCorrect1').checked
            },
            {
                text: document.getElementById('choice2').value.trim(),
                isCorrect: document.getElementById('isCorrect2').checked
            },
            {
                text: document.getElementById('choice3').value.trim(),
                isCorrect: document.getElementById('isCorrect3').checked
            },
            {
                text: document.getElementById('choice4').value.trim(),
                isCorrect: document.getElementById('isCorrect4').checked
            }
        ].filter(choice => choice.text); // Удаление пустых вариантов

        // Проверка, что хотя бы один вариант ответа отмечен как правильный
        if (choices.every(choice => !choice.isCorrect)) {
            alert('Пожалуйста, выберите хотя бы один правильный ответ.');
            return;
        }

        const correctChoices = choices.filter(choice => choice.isCorrect);
        let choicesDesc = '';

        if (correctChoices.length === 1) {
            choicesDesc = 'Выберите один верный ответ';
        } else if (correctChoices.length > 1) {
            choicesDesc = 'Выберите несколько верных ответов';
        }

        questionData.choices = choices;
        questionData.choicesDesc = choicesDesc;

    } else if (questionType === 'yesno') {
        // Обработка типа yes/no
        const isYesChecked = document.getElementById('yes').checked;
        const isNoChecked = document.getElementById('no').checked;

        // Проверка, что хотя бы один из вариантов выбран
        if (!isYesChecked && !isNoChecked) {
            alert('Пожалуйста, выберите "Да" или "Нет".');
            return;
        }

        questionData.choices = [
            { text: 'Да', isCorrect: isYesChecked },
            { text: 'Нет', isCorrect: isNoChecked }
        ];
        questionData.choicesDesc = 'Выберите "Да" или "Нет"';
    }

    // Сохранение вопроса
    const updates = {};
    updates['/questions/' + currentUser.uid + '/' + testId + '/' + questionId] = questionData;

    firebase.database().ref().update(updates)
        .then(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('questionModal'));
            modal.hide();
            loadQuestions();
        })
        .catch((error) => {
            console.error('Ошибка при сохранении вопроса:', error);
            alert('Ошибка: ' + error.message);
        });
}






function loadQuestions() {
    const questionsRef = firebase.database().ref('/questions/' + currentUser.uid + '/' + testId);
    questionsRef.once('value', (snapshot) => {
        const questions = snapshot.val();
        const questionsList = document.getElementById('questionsList');
        questionsList.innerHTML = ''; // Очищаем предыдущие вопросы
        let index = 1;
        for (const questionId in questions) {
            const question = questions[questionId];
            const questionItem = document.createElement('div');
            questionItem.className = 'question-item'; // Применяем стиль для вопроса
            questionItem.innerHTML = `
                <span>${question.text}</span>
                <div class="button-group">
                    <button class="edit-button" onclick="handleEditQuestion('${questionId}')">Изменить</button>
                    <button class="delete-button" onclick="deleteQuestion('${questionId}')">Удалить</button>
                </div>
            `;
            questionsList.appendChild(questionItem);
        }
    });
}

function handleEditQuestion(questionId) {
    const questionRef = firebase.database().ref('/questions/' + currentUser.uid + '/' + testId + '/' + questionId);
    questionRef.once('value', (snapshot) => {
        const question = snapshot.val();
        const type = question.type; // Предполагаем, что у вопроса есть поле 'type' с значением 'test' или 'yesno'
        showQuestionModal(type, questionId);
    });
}


function deleteQuestion(questionId) {
    if (confirm('Are you sure you want to delete this question?')) {
        firebase.database().ref('/questions/' + currentUser.uid + '/' + testId + '/' + questionId).remove()
            .then(() => {
                alert('Question deleted successfully!');
                loadQuestions();
            })
            .catch((error) => {
                console.error('Error deleting question:', error);
                alert('Error: ' + error.message);
            });
    }
}

function loadTestDates() {
    const testRef = firebase.database().ref(`/tests/${currentUser.uid}/${testId}`);

    testRef.once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const startDate = data.startDate || '';
                const endDate = data.endDate || '';
                const questionCount = data.questionCount || ''; // Загружаем questionCount

                document.getElementById('startDate').value = startDate;
                document.getElementById('endDate').value = endDate;
                document.getElementById('questionCount').value = questionCount; // Устанавливаем значение questionCount
            } else {
                console.log('No data available for this test.');
            }
        })
        .catch((error) => {
            console.error('Error loading test dates:', error);
        });
}


function saveTestDates() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const questionCount = document.getElementById('questionCount').value; // Получаем значение questionCount

    const updates = {};
    updates[`/tests/${currentUser.uid}/${testId}/startDate`] = startDate;
    updates[`/tests/${currentUser.uid}/${testId}/endDate`] = endDate;
    updates[`/tests/${currentUser.uid}/${testId}/questionCount`] = questionCount; // Сохраняем questionCount

    firebase.database().ref().update(updates)
        .then(() => {
            alert('Test dates and question count saved successfully!');
        })
        .catch((error) => {
            console.error('Error saving test dates:', error);
            alert('Error: ' + error.message);
        });
}


function generateTestLink() {
    firebase.database().ref(`/tests/${currentUser.uid}`).once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const tests = snapshot.val();
                const testCode = tests[testId]?.testCode; // Получаем testCode по testId

                // Если testCode существует, формируем ссылку
                if (testCode) {
                    console.log("Test Code: ", testCode); // Пример использования testCode

                    // Получаем домен текущего сайта
                    const domain = window.location.origin;

                    // Сохраняем ссылку с доменом
                    const testLink = `${domain}/quiz/login_to_test.html?code=${testCode}`;
                    
                    // Обновляем текст ссылки
                    const linkElement = document.getElementById('testLink');
                    linkElement.dataset.link = testLink;  // Сохраняем ссылку в data-атрибут для копирования
                    linkElement.textContent = "Нажмите, чтобы скопировать ссылку";
                } else {
                    console.log('testCode не найден для testId:', testId);
                    // Вывод всех доступных кодов
                    console.log('Доступные коды:');
                    for (const key in tests) {
                        console.log(`Test ID: ${key}, Test Code: ${tests[key]?.testCode}`);
                    }
                }
            } else {
                console.log('Нет тестов для данного пользователя');
            }
        })
        .catch((error) => {
            console.error('Ошибка при получении testCode:', error);
        });
}


function copyTestLink(event) {
    event.preventDefault();  // Предотвращаем переход по ссылке

    const testLink = event.target.dataset.link;  // Получаем ссылку из data-атрибута

    // Проверяем, есть ли ссылка перед копированием
    if (testLink) {
        // Создаем временный элемент для копирования
        const tempInput = document.createElement('input');
        tempInput.value = testLink;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);

        // Сообщаем пользователю, что ссылка скопирована
        alert('Ссылка скопирована: ' + testLink);
    } else {
        alert('Ссылка не найдена для копирования.');
    }
}



function viewSelectedAnswers(resultKey) {
    const resultRef = firebase.database().ref(`/results/${currentUser.uid}/${testId}/${resultKey}`);
    resultRef.once('value', (snapshot) => {
        const result = snapshot.val();

        console.log('Snapshot:', snapshot.val());

        if (result && result.userAnswers) {
            const modalBody = document.getElementById('selectedAnswersModalBody');
            modalBody.innerHTML = '';

            const answersArray = Object.entries(result.userAnswers).map(([questionId, selectedChoice]) => ({
                questionId,
                selectedChoice
            }));

            Promise.all(answersArray.map(async (answer, index) => {
                try {
                    const questionRef = firebase.database().ref(`/questions/${currentUser.uid}/${testId}/${answer.questionId}`);
                    const questionSnapshot = await questionRef.once('value');
                    const question = questionSnapshot.val();

                    console.log(`Question ${answer.questionId}:`, question);

                    if (question) {
                        // Создание элемента с ответом
                        const answerElement = document.createElement('div');
                        answerElement.classList.add('mb-3');

                        // Получение всех правильных вариантов ответов
                        const correctChoices = question.choices
                            ? question.choices.filter(choice => choice.isCorrect).map(choice => choice.text)
                            : [];

                        answerElement.innerHTML = `
                            <h5>Вопрос ${index + 1}: ${question.text}</h5>
                            <p>Ваш ответ: ${answer.selectedChoice}</p>
                            <p>Правильный ответ: ${correctChoices.length > 0 ? correctChoices.join(', ') : 'Неизвестно'}</p>
                        `;
                        modalBody.appendChild(answerElement);
                    } else {
                        console.warn(`Question with ID ${answer.questionId} not found.`);
                    }
                } catch (error) {
                    console.error(`Error fetching question with ID ${answer.questionId}:`, error);
                }
            })).then(() => {
                const modal = new bootstrap.Modal(document.getElementById('selectedAnswersModal'));
                modal.show();
            }).catch(error => {
                console.error('Error displaying answers:', error);
                alert('Error displaying answers. Check console for details.');
            });

        } else {
            console.log('Result:', result);
            alert('No answers found for this result.');
        }
    }).catch(error => {
        console.error('Error fetching result:', error);
        alert('Error fetching result. Check console for details.');
    });
}




function loadTestResults(userId, testId) {
    const resultsRef = firebase.database().ref(`/results/${userId}/${testId}`);
    resultsRef.once('value', (snapshot) => {
        const results = snapshot.val();
        const resultsList = document.getElementById('resultsTable');
        resultsList.innerHTML = ''; // Очищаем предыдущие результаты
        let index = 1;

        if (results) {
            const sortedResults = Object.keys(results)
                .map(key => ({ key, ...results[key] }))
                .sort((a, b) => {
                    // Сортировка только по фамилии
                    return a.userInfo.lastName.localeCompare(b.userInfo.lastName);
                });

            for (const { key, userInfo, score, totalQuestions, timeSpent, totalFactTime = '?' } of sortedResults) {
                const resultItem = document.createElement('div');
                resultItem.className = 'question-item'; // Применяем стиль для вопроса
                resultItem.innerHTML = `
                    <span>${index++}. ${userInfo.lastName} ${userInfo.firstName} - ${userInfo.class} (${score} / ${totalQuestions})</span>
                    <div class="button-group">
                        <button class="edit-button" onclick="viewSelectedAnswers('${key}')">Посмотреть</button>
                        <button class="delete-button" onclick="deleteResult('${key}')">Удалить</button>
                    </div>
                `;
                resultsList.appendChild(resultItem);
            }

        } else {
            const noResultsItem = document.createElement('div');
            noResultsItem.className = 'question-item';
            noResultsItem.innerHTML = `<span>Нет результатов</span>`;
            resultsList.appendChild(noResultsItem);
        }
    });
}



function deleteResult(resultKey) {
    if (confirm('Вы уверены, что хотите удалить этот результат?')) {
        const resultRef = firebase.database().ref(`/results/${currentUser.uid}/${testId}/${resultKey}`);
        resultRef.remove()
            .then(() => {
                alert('Результат успешно удален!');
                loadTestResults(currentUser.uid, testId); // Обновляем список результатов
            })
            .catch((error) => {
                console.error('Ошибка при удалении результата:', error);
                alert('Ошибка: ' + error.message);
            });
    }
}



function printRes() {
    // Получаем testId из параметров URL
    const urlParams = new URLSearchParams(window.location.search);
    const testId = urlParams.get('testId');

    // Получаем uid текущего пользователя
    const uid = currentUser.uid;

    // Перенаправляем на print.html с передачей uid и testId
    window.location.href = `print.html?uid=${uid}&testId=${testId}`;
}
