import firebaseConfig from './core/services/credentials/v1/config/firebaseConfig.js';

firebase.initializeApp(firebaseConfig);

// Функция для парсинга параметров URL
function getQueryParams() {
    const queryParams = new URLSearchParams(window.location.search);
    const testId = queryParams.get('testId');
    const uid = queryParams.get('uid');
    const resultId = queryParams.get('resultId');
    return { testId, uid, resultId };
}

// Когда страница загружается
window.addEventListener('load', () => {
    // Удаление данных из sessionStorage при загрузке страницы
    sessionStorage.removeItem('testId');
    sessionStorage.removeItem('uid');
    sessionStorage.removeItem('lastName');
    sessionStorage.removeItem('firstName');
    sessionStorage.removeItem('classValue');
    console.log("Все данные удалены из sessionStorage");

    // Парсим параметры из URL
    const { testId, uid, resultId } = getQueryParams();

    // Если параметры testId и uid существуют, загружаем данные теста
    if (testId && uid && resultId) {
        localStorage.setItem('resulttestid', testId);
        console.log('установлен resulttestid', localStorage.getItem('resulttestid'))
        load(uid, testId, resultId);
    } else {
        console.error('testId или uid не найдены в URL.');
    }
});

function load(uid, testId, resultId) {
    const resultRef = firebase.database().ref(`/results/${uid}/${testId}/${resultId}`);

    resultRef.once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const resultData = snapshot.val();

                // Подставляем баллы
                const scoreElement = document.getElementById('score');
                scoreElement.textContent = `${resultData.assessment}`;

                // Подставляем имя и фамилию
                const nameElement = document.getElementById('userName');
                nameElement.textContent = `${resultData.userInfo.firstName} ${resultData.userInfo.lastName}`;

                // Изменение текста поздравления в зависимости от оценки
                const congrElement = document.getElementById('congr');
                let congrMessage;
                const resultBox = document.querySelector('.result-box');

                switch (resultData.assessment) {
                    case 5:
                        congrMessage = "Отличный результат! Вы на высоте!";
                        resultBox.style.backgroundColor = "rgba(80, 200, 120, 0.9)";
                        break;
                    case 4:
                        congrMessage = "Хороший результат! Продолжайте в том же духе!";
                        resultBox.style.backgroundColor = "rgba(80, 200, 120, 0.9)";
                        break;
                    case 3:
                        congrMessage = "Неплохо, но есть куда расти!";
                        resultBox.style.backgroundColor = "rgba(255, 165, 0, 0.9)"; // Оранжевый для оценки 3
                        break;
                    case 2:
                        congrMessage = "Не расстраивайтесь, в следующий раз будет лучше!";
                        resultBox.style.backgroundColor = "rgba(255, 99, 71, 0.9)"; // Красный для оценки 2
                        break;
                    default:
                        congrMessage = "Результат не определён.";
                        resultBox.style.backgroundColor = "rgba(211, 211, 211, 0.9)"; // Серый по умолчанию
                        break;
                }
                congrElement.textContent = congrMessage;

                // Подставляем время прохождения теста
                const minutesElement = document.getElementById('minutes');
                const secondsElement = document.getElementById('seconds');
                
                if (resultData.timeSpent) {
                    const minutes = Math.floor(resultData.timeSpent / 60);
                    const seconds = resultData.timeSpent % 60;
                    minutesElement.textContent = minutes;
                    secondsElement.textContent = seconds;
                } else {
                    console.log('Данные о времени отсутствуют.');
                }
            } else {
                console.error('Результат не найден');
            }
        })
        .catch((error) => {
            console.error('Ошибка при загрузке данных результата:', error);
        });
}
