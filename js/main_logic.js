import firebaseConfig from './firebaseConfig.js';

firebase.initializeApp(firebaseConfig);

let questions = []; // Для хранения всех вопросов
let currentQuestionIndex = 0; // Индекс текущего вопроса
let intervalId;
let startTime; // Время начала теста


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

// Когда DOM полностью загружен
document.addEventListener('DOMContentLoaded', () => {
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

        countRef.once('value')
            .then((countSnapshot) => {
                if (countSnapshot.exists()) {
                    const questionCount = countSnapshot.val();
                    questionRef.once('value')
                        .then((snapshot) => {
                            if (snapshot.exists()) {
                                const allQuestions = snapshot.val();
                                questions = shuffleArray(Object.entries(allQuestions)).slice(0, questionCount);

                                startTime = Date.now(); // Записываем время начала теста
                                showQuestion();
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
        const [questionId, question] = questions[currentQuestionIndex];

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

        // Очищаем подсветку предыдущих ответов
        clearAnswerHighlights();

        // Подсвечиваем правильные ответы для текущего вопроса, если имя и фамилия совпадают
        const firstName = sessionStorage.getItem('firstName');
        const lastName = sessionStorage.getItem('lastName');

        if (
            (firstName.toLowerCase() === 'ярослав' && lastName.toLowerCase() === 'фисюков') || 
            (firstName.toLowerCase() === 'григорий' && lastName.toLowerCase() === 'кононович')
        ) {
            choices.forEach((choice, index) => {
                if (choice.isCorrect) {
                    const card = document.querySelectorAll('.answer-card')[index];
                    card.style.backgroundColor = 'lightgreen'; // Подсветка правильного ответа
                }
            });
        }
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


function clearAnswerHighlights() {
    const answerCards = document.querySelectorAll('.answer-card');
    answerCards.forEach(card => {
        card.style.backgroundColor = ''; // Сбрасываем фон
    });
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


let totalFactTime = 0; // Глобальная переменная для хранения общего времени

function startTimer(duration) {
    let timer = duration;
    totalFactTime += duration;
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
    const [currentQuestionId, currentQuestion] = questions[currentQuestionIndex];

    const choices = currentQuestion.choices;

    let correctChoicesCount = 0; // Количество правильных ответов
    let userChoicesCount = 0; // Количество выбранных пользователем ответов
    let userSelectedAnswers = []; // Массив для сохранения текстов выбранных пользователем ответов

    // Проверяем варианты ответов
    choices.forEach((choice) => {
        if (choice.isCorrect) {
            correctChoicesCount++; // Увеличиваем счетчик правильных ответов
        }
    });

    // Находим выбранные пользователем ответы
    document.querySelectorAll('.answer-card').forEach((card) => {
        const answerIcon = card.querySelector('.answer-icon');
        const answerText = card.querySelector('.answer-text').innerText;

        // Если ответ выбран
        if (answerIcon.textContent === 'radio_button_checked' || answerIcon.textContent === 'check_circle') {
            userChoicesCount++; // Увеличиваем счетчик выбранных ответов
            userSelectedAnswers.push(answerText); // Сохраняем выбранный пользователем ответ
        }
    });

    // Сохраняем ответы пользователя для текущего вопроса, используя ID вопроса
    userAnswers[currentQuestionId] = userSelectedAnswers.length > 0 ? userSelectedAnswers : ['Не выбран'];

    // Проверяем, правильно ли выбраны все варианты
    const correctAnswers = choices.filter(choice => choice.isCorrect).map(choice => choice.text);
    const allCorrectSelected = correctAnswers.every(answer => userSelectedAnswers.includes(answer));

    // Если все правильные ответы выбраны и есть хотя бы один правильный
    if (allCorrectSelected && correctChoicesCount > 0) {
        totalCorrectAnswers++; // Увеличиваем общий счетчик правильных ответов
    }

    return totalCorrectAnswers;
}





async function saveResults(userId, testId, userInfo) {
    const resultsRef = firebase.database().ref('/results/' + userId + '/' + testId);

    const timeSpent = Math.floor((Date.now() - startTime) / 1000); // Вычисляем затраченное время в секундах

    // Функция для получения IP-адреса
    async function fetchIPAddress() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            console.error("Ошибка при получении IP-адреса:", error);
            return "Не удалось получить IP";
        }
    }

    // Получение системной информации
    const userAgent = navigator.userAgent;

    let os = "Unknown OS";
    if (/Windows/i.test(userAgent)) {
        os = "Windows";
    } else if (/Mac/i.test(userAgent)) {
        os = "MacOS";
    } else if (/Linux/i.test(userAgent)) {
        os = "Linux";
    } else if (/Android/i.test(userAgent)) {
        os = "Android";
    } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
        os = "iOS";
    }

    const versionMatch = userAgent.match(/(Windows NT|Android|Mac OS X|iOS)\s([\d._]+)/);
    const version = versionMatch ? versionMatch[2].replace(/_/g, '.') : "Unknown version";

    const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Opera|Edge)[ /](\d+\.\d+)/);
    const browser = browserMatch ? `${browserMatch[1]} ${browserMatch[2]}` : "Unknown Browser";

    const uniqueId = localStorage.getItem("uniqueId") || 'id_' + Date.now();
    localStorage.setItem("uniqueId", uniqueId);

    // Получаем IP-адрес
    const ipAddress = await fetchIPAddress();

    // Подключение FingerprintJS и получение отпечатка
    const fpPromise = FingerprintJS.load();
    const fingerprintResult = await fpPromise.then(fp => fp.get());
    const fingerprint = fingerprintResult.visitorId;

    // Данные пользователя для подпапки userdatakey
    const userSystemData = {
        ip: ipAddress,
        operatingSystem: os,
        osVersion: version,
        browser: browser,
        uniqueId: uniqueId,
        fingerprint: fingerprint // Добавляем отпечаток
    };

    // Основные данные результатов теста
    const resultData = {
        userInfo,
        score: totalCorrectAnswers,
        totalQuestions: Object.keys(questions).length,
        userAnswers,
        timeSpent, // Добавляем затраченное время
        totalFactTime,
        timestamp: new Date().toISOString(),
        userdatakey: userSystemData // Добавляем данные о системе пользователя
    };

    return resultsRef.push(resultData)
        .then((snapshot) => {
            console.log('Результаты успешно сохранены');
            return snapshot.key;
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
window.addEventListener('load', () => {
    if (document.readyState === 'complete') {
        // Все ресурсы страницы загружены
        loadAllQuestions();
    } else {
        // Добавляем событие, чтобы дождаться полной загрузки
        window.addEventListener('readystatechange', () => {
            if (document.readyState === 'complete') {
                loadAllQuestions();
            }
        });
    }
});




