
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

firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        currentUser = user;
        
        // Получаем параметры URL
        const urlParams = new URLSearchParams(window.location.search);
        testId = urlParams.get('testId');
        
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
    const questionText = document.getElementById('questionText').value;
    const timeInSeconds = document.getElementById('timeInSeconds').value;
    const questionId = document.getElementById('currentQuestionId').value || firebase.database().ref().child('questions').push().key;
    
    // Получаем тип вопроса
    const questionType = document.getElementById('questionType').value || 
        (document.getElementById('questionChoices').style.display === 'block' ? 'test' : 'yesno');

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
                text: document.getElementById('choice1').value,
                isCorrect: document.getElementById('isCorrect1').checked
            },
            {
                text: document.getElementById('choice2').value,
                isCorrect: document.getElementById('isCorrect2').checked
            },
            {
                text: document.getElementById('choice3').value,
                isCorrect: document.getElementById('isCorrect3').checked
            },
            {
                text: document.getElementById('choice4').value,
                isCorrect: document.getElementById('isCorrect4').checked
            }
        ].filter(choice => choice.text); // Удаление пустых вариантов

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
        questionData.choices = [
            { text: 'Да', isCorrect: document.getElementById('yes').checked },
            { text: 'нет', isCorrect: document.getElementById('no').checked }
        ];
        questionData.choicesDesc = 'Выберите "Да" или "Нет"';
    }

    // Сохранение вопроса
    const updates = {};
    updates['/questions/' + currentUser.uid + '/' + testId + '/' + questionId] = questionData;

    firebase.database().ref().update(updates)
        .then(() => {
            alert('Question saved successfully!');
            const modal = bootstrap.Modal.getInstance(document.getElementById('questionModal'));
            modal.hide();
            loadQuestions();
        })
        .catch((error) => {
            console.error('Error saving question:', error);
            alert('Error: ' + error.message);
        });
}





function loadQuestions() {
    const questionsRef = firebase.database().ref('/questions/' + currentUser.uid + '/' + testId);
    questionsRef.once('value', (snapshot) => {
        const questions = snapshot.val();
        const questionsList = document.getElementById('questionsList');
        questionsList.innerHTML = '';
        let index = 1;
        for (const questionId in questions) {
            const question = questions[questionId];
            const row = document.createElement('tr');
            row.innerHTML = `
                        <td>${index++}</td>
                        <td>${question.text}</td>
                        <td>
                            <button class="btn btn-warning btn-sm" onclick="handleEditQuestion('${questionId}')">Edit</button>
                            <button class="btn btn-danger btn-sm" onclick="deleteQuestion('${questionId}')">Delete</button>
                        </td>
                    `;
            questionsList.appendChild(row);
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
    const testLink = document.getElementById('testLink');
    testLink.href = `login_to_test.html?testId=${testId}&uid=${currentUser.uid}`;
    testLink.textContent = testLink.href;
}

function viewSelectedAnswers(resultKey) {
    const resultRef = firebase.database().ref(`/results/${currentUser.uid}/${testId}/${resultKey}`);
    resultRef.once('value', (snapshot) => {
        const result = snapshot.val();

        // Отладочная информация
        console.log('Snapshot:', snapshot.val());

        if (result && result.userAnswers) {
            const modalBody = document.getElementById('selectedAnswersModalBody');
            modalBody.innerHTML = '';

            // Преобразование userAnswers в массив
            const answersArray = Object.entries(result.userAnswers).map(([questionId, selectedChoice]) => ({
                questionId,
                selectedChoice
            }));

            // Обработка всех ответов
            Promise.all(answersArray.map(async (answer, index) => {
                try {
                    const questionRef = firebase.database().ref(`/questions/${currentUser.uid}/${testId}/${answer.questionId}`);
                    const questionSnapshot = await questionRef.once('value');
                    const question = questionSnapshot.val();

                    // Отладочная информация
                    console.log(`Question ${answer.questionId}:`, question);

                    if (question) {
                        // Создание элемента с ответом
                        const answerElement = document.createElement('div');
                        answerElement.classList.add('mb-3');
                        const correctChoice = question.choices ? question.choices.find(choice => choice.isCorrect) : null;
                        answerElement.innerHTML = `
                            <h5>Вопрос ${index + 1}: ${question.text}</h5>
                            <p>Ваш ответ: ${answer.selectedChoice}</p>
                            <p>Правильный ответ: ${correctChoice ? correctChoice.text : 'Неизвестно'}</p>
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
        const resultsTable = document.getElementById('resultsTable');
        resultsTable.innerHTML = `
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Фамилия</th>
                        <th>Имя</th>
                        <th>Класс</th>
                        <th>Количество выполненных / всего</th>
                        <th>Действие</th>
                    </tr>
                </thead>
                <tbody id="resultsList">
                    <!-- Results will be loaded here -->
                </tbody>
            </table>
        `;

        const resultsList = document.getElementById('resultsList');
        resultsList.innerHTML = '';
        let index = 1;

        if (results) {
            const sortedResults = Object.keys(results)
                .map(key => ({ key, ...results[key] }))
                .sort((a, b) => {
                    // Сортировка по фамилии
                    const lastNameCompare = a.userInfo.lastName.localeCompare(b.userInfo.lastName);
                    if (lastNameCompare !== 0) return lastNameCompare;

                    // Сортировка по классу с отсеиванием ненужных символов
                    const classA = a.userInfo.class.match(/(\d+)[^0-9]*(.*)/);
                    const classB = b.userInfo.class.match(/(\d+)[^0-9]*(.*)/);

                    // Сравниваем цифры
                    const numberCompare = parseInt(classA[1]) - parseInt(classB[1]);
                    if (numberCompare !== 0) return numberCompare;

                    // Сравниваем буквы, убирая лишние символы
                    const letterA = classA[2].replace(/[^А-Яа-яA-Za-z]/g, '').trim();
                    const letterB = classB[2].replace(/[^А-Яа-яA-Za-z]/g, '').trim();

                    return letterA.localeCompare(letterB);
                });

            for (const { key, userInfo, score, totalQuestions } of sortedResults) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index++}</td>
                    <td>${userInfo.lastName}</td>
                    <td>${userInfo.firstName}</td>
                    <td>${userInfo.class}</td>
                    <td>${score} / ${totalQuestions}</td>
                    <td>
                        <button class="btn btn-info btn-sm" onclick="viewSelectedAnswers('${key}')">Посмотреть выбранные</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteResult('${key}')">Удалить</button>
                    </td>
                `;
                resultsList.appendChild(row);
            }
        } else {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="6">No results found</td>`;
            resultsList.appendChild(row);
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
