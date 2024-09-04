
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
        document.getElementById('userEmail').textContent = user.email;
        const urlParams = new URLSearchParams(window.location.search);
        testId = urlParams.get('testId');
        loadQuestions();
        generateTestLink();
        loadTestResults(currentUser.uid, testId);
        loadTestDates();
    }
});

function showQuestionModal(type, questionId = null) {
    document.getElementById('questionForm').reset();
    document.getElementById('currentQuestionId').value = questionId;

    // Убедитесь, что скрыты оба блока, затем покажите нужный
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
                document.getElementById('choice1').value = question.choices[0].text;
                document.getElementById('isCorrect1').checked = question.choices[0].isCorrect;
                document.getElementById('choice2').value = question.choices[1].text;
                document.getElementById('isCorrect2').checked = question.choices[1].isCorrect;
                document.getElementById('choice3').value = question.choices[2].text;
                document.getElementById('isCorrect3').checked = question.choices[2].isCorrect;
                document.getElementById('choice4').value = question.choices[3].text;
                document.getElementById('isCorrect4').checked = question.choices[3].isCorrect;
            } else if (type === 'yesno') {
                if (question.choices[0].isCorrect) {
                    document.getElementById('yes').checked = true;
                } else {
                    document.getElementById('no').checked = true;
                }
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
    const questionType = document.getElementById('questionType').value; // Определяем тип вопроса

    let questionData = {
        text: questionText,
        createdAt: new Date().toISOString(),
        type: questionType,
        timeInSeconds: parseInt(timeInSeconds, 10) // Ensure time in seconds is stored as a number
    };

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
        ];
        questionData.choices = choices;
    } else if (questionType === 'yesno') {
        const yesnoChoices = [
            { text: 'Yes', isCorrect: document.getElementById('yes').checked },
            { text: 'No', isCorrect: document.getElementById('no').checked }
        ];
        questionData.choices = yesnoChoices;
    }

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
    testRef.once('value', (snapshot) => {
        const test = snapshot.val();
        if (test) {
            document.getElementById('startDate').value = test.startDate || '';
            document.getElementById('endDate').value = test.endDate || '';
        }
    });
}

function saveTestDates() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    const updates = {};
    updates[`/tests/${currentUser.uid}/${testId}/startDate`] = startDate;
    updates[`/tests/${currentUser.uid}/${testId}/endDate`] = endDate;

    firebase.database().ref().update(updates)
        .then(() => {
            alert('Test dates saved successfully!');
        })
        .catch((error) => {
            console.error('Error saving test dates:', error);
            alert('Error: ' + error.message);
        });
}

function generateTestLink() {
    const testLink = document.getElementById('testLink');
    testLink.href = `test.html?testId=${testId}&uid=${currentUser.uid}`;
    testLink.textContent = testLink.href;
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
            for (const resultKey in results) {
                const result = results[resultKey];
                const row = document.createElement('tr');
                row.innerHTML = `
                            <td>${index++}</td>
                            <td>${result.userInfo.lastName}</td>
                            <td>${result.userInfo.firstName}</td>
                            <td>${result.userInfo.class}</td>
                            <td>${result.score} / ${result.totalQuestions}</td>
                        `;
                resultsList.appendChild(row);
            }
        } else {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="5">No results found</td>`;
            resultsList.appendChild(row);
        }
    });
}