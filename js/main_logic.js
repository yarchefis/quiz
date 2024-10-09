import firebaseConfig from './firebaseConfig.js';

firebase.initializeApp(firebaseConfig);

let questions = []; // Для хранения всех вопросов
let currentQuestionIndex = 0; // Индекс текущего вопроса
let intervalId;

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


function getQueryParams() {
    const queryParams = new URLSearchParams(window.location.search);
    const testId = queryParams.get('testId');
    const uid = queryParams.get('uid');
    const lastName = queryParams.get('lastName');
    const firstName = queryParams.get('firstName');
    const classValue = queryParams.get('classValue');
    return { testId, uid, lastName, firstName, classValue };
}

// Когда страница загружается
window.addEventListener('load', () => {
    // Парсим параметры из URL
    const { testId, uid, lastName, firstName, classValue } = getQueryParams();

    // Если параметры testId и uid существуют, сохраняем их в sessionStorage и перенаправляем
    if (testId && uid && lastName && firstName && classValue) {
        // Сохраняем параметры в sessionStorage
        sessionStorage.setItem('testId', testId);
        sessionStorage.setItem('uid', uid);
        sessionStorage.setItem('lastName', lastName);
        sessionStorage.setItem('firstName', firstName);
        sessionStorage.setItem('classValue', classValue);

        // Перенаправляем на start.html
        window.location.href = 'start.html';
    } else {
        console.error('данные не найдены');
    }
});

function loadAllQuestions() {
    const uid = sessionStorage.getItem('uid');
    const testId = sessionStorage.getItem('testId');

    if (uid && testId) {
        const questionRef = firebase.database().ref(`questions/${uid}/${testId}`);
        const countRef = firebase.database().ref(`tests/${uid}/${testId}/questionCount`);

        // Сначала получаем количество вопросов
        countRef.once('value')
            .then((countSnapshot) => {
                if (countSnapshot.exists()) {
                    const questionCount = countSnapshot.val();

                    // Теперь загружаем вопросы
                    questionRef.once('value')
                        .then((snapshot) => {
                            if (snapshot.exists()) {
                                // Получаем все вопросы в массив
                                const allQuestions = snapshot.val();
                                questions = shuffleArray(Object.values(allQuestions)).slice(0, questionCount); // Перемешиваем и берем количество из questionCount
                                //console.log(questions); // DANG
                                showQuestion(); // Показываем первый вопрос
                            } else {
                                console.error('Вопросы не найдены');
                            }
                        })
                        .catch((error) => {
                            console.error('Ошибка при загрузке вопросов:', error);
                        });
                } else {
                    console.error('Количество вопросов не найдено');
                }
            })
            .catch((error) => {
                console.error('Ошибка при загрузке questionCount:', error);
            });
    } else {
        console.error('UID или TestID не найдены в sessionStorage');
    }
}



function showQuestion() {
    // Проверка на существование следующего вопроса
    if (currentQuestionIndex < questions.length) {
        const questionId = Object.keys(questions)[currentQuestionIndex];
        const question = questions[questionId];
        const timeInSeconds = question.timeInSeconds;
        const choices = question.choices || [];

        // Обновляем текст вопроса
        document.getElementById('question_text').innerText = question.text;

        // Обновляем варианты ответов
        updateAnswerChoices(choices);

        // Обновляем номер текущего вопроса и общее количество вопросов
        document.getElementById('question-numbercount').innerText = `Вопрос ${currentQuestionIndex + 1}`; // Номер текущего вопроса
        document.getElementById('total-questionscount').innerText = `/${questions.length}`; // Общее количество вопросов

        // Сбрасываем предыдущий таймер, если он был запущен
        if (intervalId) {
            clearInterval(intervalId);
        }

        // Запускаем таймер для текущего вопроса
        startTimer(timeInSeconds);
    } else {
        // Скрываем карточки с ответами, когда вопросов больше нет
        document.querySelectorAll('.answer-card').forEach(card => {
            card.style.display = 'none';
        });

        const userId = sessionStorage.getItem('uid');  // Получаем текущий userId
        const testId = sessionStorage.getItem('testId');  // Получаем текущий testId
        const userInfo = {
            firstName: sessionStorage.getItem('firstName'),
            lastName: sessionStorage.getItem('lastName'),
            class: sessionStorage.getItem('classValue')
        };

        // Сохраняем результаты и получаем ключ результата
        saveResults(userId, testId, userInfo)
            .then(resultId => {
                if (resultId) {
                    // Перенаправляем на result.html, передавая testId, uid и resultId
                    window.location.href = `result.html?testId=${testId}&uid=${userId}&resultId=${resultId}`;
                } else {
                    console.error('Ошибка при сохранении результата, перенаправление невозможно.');
                }
            })
            .catch(error => {
                console.error('Ошибка при получении ключа результата:', error);
            });
    }
}



function showNextQuestion() {
    currentQuestionIndex++; // Увеличиваем индекс вопроса
    showQuestion(currentQuestionIndex); // Отображаем следующий вопрос
}

function updateAnswerChoices(choices) {
    const answerCards = document.querySelectorAll('.answer-card');
    const numberOfChoices = choices.length;

    // Если карточек меньше, чем вариантов ответа, создаем новые карточки
    if (numberOfChoices > answerCards.length) {
        const container = document.querySelector('.answer-container'); // Родительский контейнер для ответов
        for (let i = answerCards.length; i < numberOfChoices; i++) {
            const newCard = document.createElement('div');
            newCard.classList.add('answer-card');
            newCard.innerHTML = `
                <div class="answer-text"></div>
                <i class="material-icons answer-icon">radio_button_unchecked</i>
            `;
            container.appendChild(newCard);
        }
    }

    // Обновляем текст и видимость существующих карточек
    answerCards.forEach((card, index) => {
        const answerIcon = card.querySelector('.answer-icon');

        if (index < numberOfChoices) {
            const choice = choices[index];
            const answerTextDiv = card.querySelector('.answer-text');
            answerTextDiv.innerText = choice.text;
            card.dataset.questionId = currentQuestionIndex; // Устанавливаем атрибут questionId
            card.style.visibility = 'visible'; // Показываем карточку

            // Сбрасываем состояние чекбокса на "radio_button_unchecked"
            answerIcon.textContent = 'radio_button_unchecked';
        } else {
            card.style.visibility = 'hidden'; // Скрываем лишние карточки
        }
    });

}


function startTimer(duration) {
    let timer = duration;
    const counterDiv = document.querySelector('.counter');
    const progressBar = document.querySelector('.progress-bar');

    // Устанавливаем начальные значения
    counterDiv.innerText = timer; // Отображаем начальное время
    progressBar.style.width = '100%'; // Устанавливаем ширину прогресс-бара на 100%
    progressBar.setAttribute('aria-valuenow', 100); // Устанавливаем значение aria для прогресс-бара

    // Запускаем интервал обновления
    intervalId = setInterval(() => { // Сохраняем идентификатор интервала в глобальную переменную
        // Уменьшаем таймер
        timer--;

        // Обновляем счетчик и прогресс-бар
        counterDiv.innerText = timer;
        const progressPercentage = (timer / duration) * 100; // Процент оставшегося времени
        progressBar.style.width = `${progressPercentage}%`;
        progressBar.setAttribute('aria-valuenow', progressPercentage); // Обновляем значение aria

        // Проверяем, закончилось ли время
        if (timer <= 0) {
            clearInterval(intervalId); // Останавливаем интервал
            counterDiv.innerText = '0'; // Обновляем счетчик до 0
            progressBar.style.width = '0%'; // Обнуляем ширину прогресс-бара
            progressBar.setAttribute('aria-valuenow', 0); // Обновляем значение aria


            // Добавляем 3 секунды
            timer = 3;
            counterDiv.innerText = timer; // Обновляем счетчик
            progressBar.style.width = '100%'; // Восстанавливаем ширину прогресс-бара на 100%
            progressBar.setAttribute('aria-valuenow', 100); // Восстанавливаем значение aria

            // Запускаем новый интервал на 3 секунды
            intervalId = setInterval(() => {
                timer--;

                // Обновляем счетчик и прогресс-бар
                counterDiv.innerText = timer;
                const progressPercentage = (timer / 3) * 100; // Процент оставшегося времени
                progressBar.style.width = `${progressPercentage}%`;
                progressBar.setAttribute('aria-valuenow', progressPercentage); // Обновляем значение aria

                // Проверяем, закончилось ли время
                if (timer <= 0) {
                    clearInterval(intervalId); // Останавливаем интервал
                    counterDiv.innerText = '0'; // Обновляем счетчик до 0
                    progressBar.style.width = '0%'; // Обнуляем ширину прогресс-бара
                    progressBar.setAttribute('aria-valuenow', 0); // Обновляем значение aria
                    const correctAnswersCount = checkAnswer(); // Получаем количество правильных ответов
                    //console.log(`Количество правильных ответов: ${correctAnswersCount}`); // Выводим количество правильных ответов
                    showNextQuestion(); // Показываем следующий вопрос
                }
            }, 1000); // Обновляем каждую секунду
        }
    }, 1000); // Обновляем каждую секунду
}




let totalCorrectAnswers = 0; // Общий счетчик правильных ответов
let userAnswers = {}; // Для хранения ответов пользователя

function checkAnswer() {
    const currentQuestionId = Object.keys(questions)[currentQuestionIndex];
    //console.log(`Текущий вопрос ID: ${currentQuestionId}`);

    const currentQuestion = questions[currentQuestionId];
    //console.log('Текущий вопрос:', currentQuestion);

    const choices = currentQuestion.choices;
    //console.log('Варианты ответов:', choices);

    let correctChoicesCount = 0; // Количество правильных ответов
    let userChoicesCount = 0; // Количество выбранных пользователем ответов

    let userSelectedAnswers = []; // Массив для сохранения текстов выбранных пользователем ответов

    // Проверяем варианты ответов
    choices.forEach((choice) => {
        // Проверяем, является ли ответ правильным
        if (choice.isCorrect) {
            correctChoicesCount++; // Увеличиваем счетчик правильных ответов
        }
    });

    // Находим выбранные пользователем ответы
    document.querySelectorAll('.answer-card').forEach((card) => {
        const answerIcon = card.querySelector('.answer-icon');
        const answerText = card.querySelector('.answer-text').innerText;
        //console.log(`Проверяем ответ: ${answerText}, состояние: ${answerIcon.textContent}`);

        // Если ответ выбран
        if (answerIcon.textContent === 'radio_button_checked' || answerIcon.textContent === 'check_circle') {
            userChoicesCount++; // Увеличиваем счетчик выбранных ответов
            //console.log(`Выбран ответ: ${answerText}`);
            userSelectedAnswers.push(answerText); // Сохраняем выбранный пользователем ответ
        }
    });

    // Сохраняем ответы пользователя для текущего вопроса
    userAnswers[currentQuestionId] = userSelectedAnswers.length > 0 ? userSelectedAnswers : 'Не выбран';

    // Проверяем, правильно ли выбраны все варианты
    const correctAnswers = choices.filter(choice => choice.isCorrect).map(choice => choice.text);
    const allCorrectSelected = correctAnswers.every(answer => userSelectedAnswers.includes(answer));

    // Если все правильные ответы выбраны и есть хотя бы один правильный
    if (allCorrectSelected && correctChoicesCount > 0) {
        totalCorrectAnswers++; // Увеличиваем общий счетчик правильных ответов
        //console.log(`Баллы увеличены! Текущий счет: ${totalCorrectAnswers}`);
    }

    //console.log(`Общее количество правильных ответов: ${totalCorrectAnswers}`);
    //console.log('Выбранные ответы пользователем:', userAnswers);
    return totalCorrectAnswers;
}




function saveResults(userId, testId, userInfo) {
    const resultsRef = firebase.database().ref('/results/' + userId + '/' + testId);

    const resultData = {
        userInfo, // Информация о пользователе (имя, класс и т.д.)
        score: totalCorrectAnswers, // Количество правильных ответов
        totalQuestions: Object.keys(questions).length, // Общее количество вопросов
        userAnswers, // Ответы пользователя (что он выбрал)
        timestamp: new Date().toISOString() // Время прохождения теста
    };

    //console.log('Сохраняем результат:', resultData); // Логируем результат перед сохранением

    // Используем push для создания уникального идентификатора для результата
    return resultsRef.push(resultData)
        .then((snapshot) => {
            console.log('Результаты успешно сохранены');
            return snapshot.key; // Возвращаем ключ, который был сгенерирован
        })
        .catch((error) => {
            console.error('Ошибка при сохранении результатов:', error);
            return null;
        });
}





window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('nextButton').addEventListener('click', () => {
        const correctAnswersCount = checkAnswer(); // Получаем количество правильных ответов
        //console.log(`Количество правильных ответов: ${correctAnswersCount}`); // Выводим количество правильных ответов
        showNextQuestion(); // Показываем следующий вопрос
    });
});

// Вызов функции загрузки первого вопроса при загрузке страницы start.html
window.addEventListener('load', loadAllQuestions);



