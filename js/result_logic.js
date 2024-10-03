import firebaseConfig from './firebaseConfig.js';

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
    // Парсим параметры из URL
    const { testId, uid, resultId } = getQueryParams();

    // Если параметры testId и uid существуют, загружаем данные теста
    if (testId && uid && resultId) {
        load(uid, testId, resultId);
    } else {
        console.error('testId или uid не найдены в URL.');
    }
});


function load(uid, testId, resultId) {
    // Ссылка на данные о результате в Firebase
    const resultRef = firebase.database().ref(`/results/${uid}/${testId}/${resultId}`);

    // Чтение данных из Firebase
    resultRef.once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const resultData = snapshot.val(); // Получаем данные результата

                // Подставляем баллы
                const scoreElement = document.getElementById('score');
                scoreElement.textContent = `${resultData.score}/${resultData.totalQuestions}`;

                // Подставляем имя и фамилию
                const nameElement = document.getElementById('userName');
                nameElement.textContent = `${resultData.userInfo.firstName} ${resultData.userInfo.lastName}`;

                // Здесь можно добавить подстановку времени прохождения теста, если оно доступно в resultData
                // Пример (если в resultData есть время прохождения в минутах и секундах):
                const minutesElement = document.getElementById('minutes');
                const secondsElement = document.getElementById('seconds');
                
                // Предположим, что данные о времени в секундах хранятся в resultData.timeSpent
                if (resultData.timeSpent) {
                    const minutes = Math.floor(resultData.timeSpent / 60);
                    const seconds = resultData.timeSpent % 60;
                    minutesElement.textContent = minutes;
                    secondsElement.textContent = seconds;
                } else {
                    console.log('Данные о времени отсутствуют.');
                }

            } else {
                console.error('Результат не найден.');
            }
        })
        .catch((error) => {
            console.error('Ошибка при загрузке данных результата:', error);
        });
}
