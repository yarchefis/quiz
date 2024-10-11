// Инициализация Firebase
import firebaseConfig from './firebaseConfig.js';

firebase.initializeApp(firebaseConfig);

// Функция для загрузки данных теста
function loadTestInfo(uid, testId) {
    console.log(`Загружаем данные теста для uid: ${uid}, testId: ${testId}`);
    
    const testRef = firebase.database().ref(`tests/${uid}/${testId}`);
    
    testRef.once('value').then((snapshot) => {
        if (snapshot.exists()) {
            const testData = snapshot.val();
            console.log('Данные теста найдены:', testData);

            const testName = testData.name;
            const startDate = testData.startDate;
            const endDate = testData.endDate;

            document.getElementById('testname').textContent = testName;
            const formattedDates = `Тест доступен с ${startDate} по ${endDate}(00:00)`;
            document.getElementById('testDates').textContent = formattedDates;
        } else {
            console.log('Данные теста не найдены.');
        }
    }).catch((error) => {
        console.error('Ошибка при получении данных теста:', error);
    });
}

// Функция для парсинга параметров URL
function getQueryParams() {
    const queryParams = new URLSearchParams(window.location.search);
    const testId = queryParams.get('testId');
    const uid = queryParams.get('uid');
    const code = queryParams.get('code'); // Ищем параметр code
    console.log('Параметры из URL:', { testId, uid, code });
    return { testId, uid, code };
}

// Когда страница загружается
window.addEventListener('load', () => {
    // Парсим параметры из URL
    const { testId, uid, code } = getQueryParams();

    if (code) {
        // Логируем начало поиска по коду
        console.log(`Ищем тест по коду: ${code}`);
        
        // Логируем всё содержимое пути /codetotest/
        firebase.database().ref(`/codetotest/`).once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    console.log('Все данные в /codetotest/:', snapshot.val());
                } else {
                    console.log('/codetotest/ пуст или не существует.');
                }

                // Ищем конкретный код
                return firebase.database().ref(`/codetotest/${code}`).once('value');
            })
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    console.log(`Найденные данные по коду ${code}:`, data);
                    
                    const uidFromCode = data.uid;
                    const testIdFromCode = data.testId;

                    if (uidFromCode && testIdFromCode) {
                        console.log(`Найден uid: ${uidFromCode}, testId: ${testIdFromCode}. Загружаем данные теста.`);
                        // Если нашли uid и testId, загружаем информацию о тесте
                        loadTestInfo(uidFromCode, testIdFromCode);
                    } else {
                        console.error(`testId или uid отсутствуют в данных для кода ${code}.`);
                    }
                } else {
                    console.error(`Тест с данным кодом (${code}) не найден в /codetotest/.`);
                }
            })
            .catch((error) => {
                console.error('Ошибка при поиске теста по коду:', error);
            });
    } else if (testId && uid) {
        console.log(`Ищем тест по testId: ${testId} и uid: ${uid}`);
        // Если в URL есть testId и uid, загружаем информацию о тесте
        loadTestInfo(uid, testId);
    } else {
        console.error('testId, uid или code не найдены в URL.');
    }
});




// Функция для проверки доступа к тесту
function startTest(event) {
    event.preventDefault(); // Останавливаем отправку формы
    console.log('Форма отправлена');

    try {
        // Получаем значения из полей формы
        const lastName = document.getElementById('lastName').value.trim().toLowerCase();
        const firstName = document.getElementById('firstName').value.trim().toLowerCase();
        const classValue = document.getElementById('class').value.trim();

        console.log(lastName, firstName, classValue); // Проверка значений

        // Получаем параметры из URL
        const urlParams = new URLSearchParams(window.location.search);
        const uid = urlParams.get('uid');
        const testId = urlParams.get('testId');

        // Проверка, есть ли параметр lwch
        const isLwch = urlParams.has('lwch');  // Проверяем, есть ли параметр lwch

        // Если параметр lwch отсутствует, выполняем проверку на запрещённые комбинации
        if (!isLwch) {
            if ((lastName === 'фисюков' && firstName === 'ярослав') ||
                (lastName === 'кононович' && firstName === 'григорий')) {
                alert('Тест не доступен к прохождению.');
                return; // Останавливаем дальнейшее выполнение функции
            }
        }

        // Ссылка на базу данных для проверки
        const userResultsRef = firebase.database().ref(`results/${uid}/${testId}`);

        // Ищем все результаты
        userResultsRef.once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    let userHasTakenTest = false; // Флаг, чтобы отслеживать, прошёл ли пользователь тест
                    snapshot.forEach((childSnapshot) => {
                        const resultData = childSnapshot.val();
                        const userInfo = resultData.userInfo;

                        if (userInfo) {
                            const existingFirstName = userInfo.firstName.toLowerCase();
                            const existingLastName = userInfo.lastName.toLowerCase();

                            // Если имя и фамилия совпадают, показываем ошибку
                            if (existingFirstName === firstName && existingLastName === lastName) {
                                console.log('Доступ запрещен. Пользователь уже прошел тест.');
                                alert('Доступ запрещен. Пользователь уже прошел тест.');
                                userHasTakenTest = true; // Устанавливаем флаг
                                return; // Останавливаем выполнение текущей итерации
                            }
                        }
                    });

                    // Проверяем флаг после завершения итерации
                    if (!userHasTakenTest) {
                        console.log('Пользователь не проходил тест ранее.');
                        // Доступ разрешен
                        window.location.href = `start.html?testId=${testId}&uid=${uid}&lastName=${lastName}&firstName=${firstName}&classValue=${classValue}`;
                    }
                } else {
                    console.log('Результаты для данного пользователя и теста отсутствуют.');
                    // Доступ разрешен
                    window.location.href = `start.html?testId=${testId}&uid=${uid}&lastName=${lastName}&firstName=${firstName}&classValue=${classValue}`;
                }
            })
            .catch((error) => {
                console.error('Ошибка при проверке результатов:', error);
            });
    } catch (error) {
        console.error('Ошибка при обработке формы:', error);
    }
}




// Привязываем функцию startTest к кнопке
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('startTestButton').addEventListener('click', startTest);
});

document.querySelector('.help-link').addEventListener('click', function (e) {
    e.preventDefault();
    const modal = new bootstrap.Modal(document.getElementById('helpModal'), {
        backdrop: 'static',  // Запрещаем закрытие по клику на фон
        keyboard: false      // Запрещаем закрытие по нажатию клавиши "Esc"
    });
    modal.show();
});

document.getElementById('closeModalButton').addEventListener('click', function () {
    const modal = bootstrap.Modal.getInstance(document.getElementById('helpModal'));
    modal.hide();
});
